import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDb, runInTransaction, type Db } from "./db";
import { HttpError } from "./http";

// ---------------------------------------------------------------- cookie

export const SESSION_COOKIE = "ember_session";
export const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
/** Sliding expiry is refreshed at most this often per session (saves a write per request). */
const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

function secureCookies(): boolean {
  return process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";
}

export function sessionCookie(token: string, maxAgeSeconds = SESSION_TTL_MS / 1000): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(secureCookies() ? ["Secure"] : []),
  ].join("; ");
}

export function clearSessionCookie(): string {
  return sessionCookie("", 0);
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      const value = part.slice(eq + 1).trim();
      return TOKEN_RE.test(value) ? value : null;
    }
  }
  return null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// ---------------------------------------------------------------- CSRF

/**
 * CSRF defence for cookie-authenticated, state-changing requests (on top of
 * SameSite=Lax): the browser-set Origin header must name this host. Requests
 * with no Origin are refused unless Sec-Fetch-Site says same-origin.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  const trusted = (process.env.TRUSTED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (origin) {
    if (trusted.includes(origin)) return;
    try {
      if (new URL(origin).host === host) return;
    } catch {
      // fall through
    }
  } else if (request.headers.get("sec-fetch-site") === "same-origin") {
    return;
  }
  throw new HttpError(403, "bad_origin", "This request must come from the Ember site.");
}

// ---------------------------------------------------------------- users

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string;
  created_at: string;
  password_changed_at: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
}

export function toPublicUser(u: UserRow): PublicUser {
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, createdAt: u.created_at };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findUserByEmail(email: string, db: Db = getDb()): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(normalizeEmail(email)) as UserRow | undefined;
}

export function findUserById(id: string, db: Db = getDb()): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function insertUser(
  input: { email: string; passwordHash: string; name: string; phone: string },
  db: Db = getDb()
): UserRow | null {
  const now = new Date().toISOString();
  const id = randomUUID();
  const res = db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, password_hash, name, phone, created_at, password_changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, normalizeEmail(input.email), input.passwordHash, input.name, input.phone, now, now);
  return Number(res.changes) === 1 ? (findUserById(id, db) ?? null) : null;
}

// ---------------------------------------------------------------- sessions

export interface Session {
  id: string;
  user: UserRow;
  /** The raw cookie token (needed to re-set the cookie when sliding the expiry). */
  token: string;
  /** True when this lookup extended the expiry, so the cookie should be re-sent. */
  refreshed: boolean;
}

/** Creates a session and returns the raw token (only its SHA-256 is stored). */
export function createSession(userId: string, request: Request, db: Db = getDb(), nowMs = Date.now()): string {
  const token = randomBytes(32).toString("base64url");
  const now = new Date(nowMs).toISOString();
  db.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent_hash) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    sha256(token),
    userId,
    now,
    new Date(nowMs + SESSION_TTL_MS).toISOString(),
    now,
    sha256(request.headers.get("user-agent") ?? "")
  );
  return token;
}

/** Looks up the request's session; slides its expiry (at most hourly). */
export function getSession(request: Request, db: Db = getDb(), nowMs = Date.now()): Session | null {
  const token = readSessionToken(request);
  if (!token) return null;
  const id = sha256(token);
  const row = db.prepare("SELECT user_id, expires_at, last_seen_at FROM sessions WHERE id = ?").get(id) as
    | { user_id: string; expires_at: string; last_seen_at: string }
    | undefined;
  if (!row) return null;
  if (Date.parse(row.expires_at) <= nowMs) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }
  const user = findUserById(row.user_id, db);
  if (!user) return null;
  let refreshed = false;
  if (nowMs - Date.parse(row.last_seen_at) >= SESSION_TOUCH_INTERVAL_MS) {
    db.prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?").run(
      new Date(nowMs).toISOString(),
      new Date(nowMs + SESSION_TTL_MS).toISOString(),
      id
    );
    refreshed = true;
  }
  return { id, user, token, refreshed };
}

export function requireSession(request: Request, db: Db = getDb()): Session {
  const session = getSession(request, db);
  if (!session) throw new HttpError(401, "unauthenticated", "Please sign in.");
  return session;
}

export function deleteSessionByToken(token: string | null, db: Db = getDb()) {
  if (token) db.prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
}

export function deleteAllSessions(userId: string, db: Db = getDb()) {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

// ---------------------------------------------------------------- sign-in throttling

/** Per-email: free failures before the backoff starts, then 30 s doubling up to 15 min. */
export const EMAIL_FREE_FAILURES = 5;
const EMAIL_BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;
/** Per-IP: failures allowed per window before a fixed lock. */
export const IP_MAX_FAILURES = 30;
const IP_WINDOW_MS = 15 * 60_000;

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function attemptKeys(request: Request, email: string) {
  // Hash the email so the throttle table doesn't hold a plaintext list of attempted addresses.
  return { ip: `ip:${clientIp(request)}`, email: `email:${sha256(normalizeEmail(email))}` };
}

const LOCKED = () =>
  new HttpError(429, "too_many_attempts", "Too many sign-in attempts. Please wait a few minutes and try again.", {
    retryAfterSeconds: 60,
  });

/** Throws 429 if either the IP or the email is currently locked out. */
export function assertNotLocked(request: Request, email: string, db: Db = getDb(), nowMs = Date.now()) {
  const keys = attemptKeys(request, email);
  const rows = db
    .prepare("SELECT key, locked_until FROM login_attempts WHERE key IN (?, ?)")
    .all(keys.ip, keys.email) as { key: string; locked_until: number }[];
  const until = Math.max(0, ...rows.map((r) => r.locked_until));
  if (until > nowMs) {
    const err = LOCKED();
    (err.details as { retryAfterSeconds: number }).retryAfterSeconds = Math.ceil((until - nowMs) / 1000);
    throw err;
  }
}

export function recordLoginFailure(request: Request, email: string, db: Db = getDb(), nowMs = Date.now()) {
  const keys = attemptKeys(request, email);
  runInTransaction(db, () => {
    const get = db.prepare("SELECT failures, window_started_at FROM login_attempts WHERE key = ?");
    const upsert = db.prepare(
      `INSERT INTO login_attempts (key, failures, window_started_at, locked_until) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, window_started_at = excluded.window_started_at,
         locked_until = excluded.locked_until`
    );
    // Email: exponential backoff after EMAIL_FREE_FAILURES, reset 24 h after the first failure.
    const e = get.get(keys.email) as { failures: number; window_started_at: number } | undefined;
    const eFresh = !e || nowMs - e.window_started_at > 24 * 60 * 60_000;
    const eFailures = eFresh ? 1 : e.failures + 1;
    const over = eFailures - EMAIL_FREE_FAILURES;
    const eLock = over >= 0 ? nowMs + Math.min(MAX_LOCK_MS, EMAIL_BASE_LOCK_MS * 2 ** over) : 0;
    upsert.run(keys.email, eFailures, eFresh ? nowMs : e.window_started_at, eLock);
    // IP: fixed window.
    const i = get.get(keys.ip) as { failures: number; window_started_at: number } | undefined;
    const iFresh = !i || nowMs - i.window_started_at > IP_WINDOW_MS;
    const iFailures = iFresh ? 1 : i.failures + 1;
    upsert.run(keys.ip, iFailures, iFresh ? nowMs : i.window_started_at, iFailures >= IP_MAX_FAILURES ? nowMs + MAX_LOCK_MS : 0);
  });
}

export function clearLoginFailures(request: Request, email: string, db: Db = getDb()) {
  db.prepare("DELETE FROM login_attempts WHERE key = ?").run(attemptKeys(request, email).email);
}

// ---------------------------------------------------------------- responses

export function withSessionCookie(res: Response, token: string): Response {
  res.headers.append("Set-Cookie", sessionCookie(token));
  return res;
}

export function withClearedSession(res: Response): Response {
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
}
