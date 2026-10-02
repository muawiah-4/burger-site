import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests, getDb } from "@/server/db";
import { EMAIL_FREE_FAILURES } from "@/server/auth";
import { POST as signupPOST } from "./signup/route";
import { POST as loginPOST } from "./login/route";
import { POST as logoutPOST } from "./logout/route";
import { GET as meGET } from "./me/route";
import { PATCH as accountPATCH, DELETE as accountDELETE } from "../account/route";
import { PUT as addressPUT } from "../account/address/route";
import { POST as passwordPOST } from "../account/password/route";
import { GET as accountOrdersGET } from "../account/orders/route";
import { POST as claimPOST } from "../account/claim-orders/route";
import { POST as quotePOST } from "../quote/route";
import { POST as ordersPOST } from "../orders/route";
import { GET as orderGET } from "../orders/[id]/route";

const ORIGIN = "http://localhost";
const PASSWORD = "grilled onion stack";

function req(method: string, url: string, opts: { body?: unknown; cookie?: string; origin?: string | null; ip?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  if (opts.ip) headers["x-forwarded-for"] = opts.ip;
  return new Request(`${ORIGIN}${url}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

/** "ember_session=<token>" from a response's Set-Cookie. */
function cookieFrom(res: Response): string {
  const set = res.headers.get("set-cookie") ?? "";
  const m = /ember_session=([^;]*)/.exec(set);
  if (!m) throw new Error(`no session cookie in: ${set}`);
  return `ember_session=${m[1]}`;
}

async function signup(email = "Alex@Example.com", password = PASSWORD) {
  const res = await signupPOST(req("POST", "/api/auth/signup", { body: { email, password, name: "Alex" } }));
  expect(res.status).toBe(201);
  return { res, cookie: cookieFrom(res), body: await res.json() };
}

const ORDER = {
  fulfillment: "pickup",
  locationId: undefined as string | undefined,
  items: [{ productId: "b-classic-smash", qty: 1, options: { patty: ["single"], cheese: ["cheddar"], sauce: ["signature"] } }],
  paymentMethod: "card",
};

let keyN = 0;
async function placeOrder(cookie?: string) {
  const { locations } = await import("@/lib/data/locations");
  const body = { ...ORDER, locationId: locations[0].id };
  const q = await quotePOST(req("POST", "/api/quote", { body: { fulfillment: body.fulfillment, locationId: body.locationId, items: body.items } }));
  const total = (await q.json()).totalCents;
  const res = await ordersPOST(
    req("POST", "/api/orders", {
      body: { ...body, expectedTotalCents: total },
      cookie,
      headers: { "idempotency-key": `auth-test-key-${String(++keyN).padStart(8, "0")}` },
    })
  );
  expect(res.status).toBe(201);
  const { orderId, trackingToken } = (await res.json()) as { orderId: string; trackingToken: string };
  return { orderId, trackingToken };
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  resetDbForTests(":memory:");
});

describe("signup / login / logout", () => {
  it("signs up with a lowercased email, sets a hardened cookie, and stores only the token hash", async () => {
    const { res, body, cookie } = await signup();
    expect(body.user).toMatchObject({ email: "alex@example.com", name: "Alex" });
    expect(body.user.password_hash).toBeUndefined();
    const set = res.headers.get("set-cookie")!;
    expect(set).toMatch(/HttpOnly/);
    expect(set).toMatch(/SameSite=Lax/);
    expect(set).toMatch(/Path=\//);
    expect(set).toMatch(/Max-Age=2592000/);
    expect(set).not.toMatch(/Secure/); // tests run with NODE_ENV=test; Secure is added in production
    const token = cookie.split("=")[1];
    const ids = getDb().prepare("SELECT id FROM sessions").all() as { id: string }[];
    expect(ids).toHaveLength(1);
    expect(ids[0].id).not.toBe(token);
    expect(ids[0].id).toMatch(/^[0-9a-f]{64}$/);
    const hash = (getDb().prepare("SELECT password_hash FROM users").get() as { password_hash: string }).password_hash;
    expect(hash.startsWith("scrypt$32768$8$1$")).toBe(true);

    const me = await (await meGET(req("GET", "/api/auth/me", { cookie }))).json();
    expect(me.user.email).toBe("alex@example.com");
  });

  it("refuses weak passwords and duplicate emails", async () => {
    const weak = await signupPOST(req("POST", "/api/auth/signup", { body: { email: "a@b.co", password: "password123" } }));
    expect(weak.status).toBe(400);
    expect((await weak.json()).error.code).toBe("weak_password");
    await signup();
    const dup = await signupPOST(req("POST", "/api/auth/signup", { body: { email: "ALEX@example.com", password: PASSWORD } }));
    expect(dup.status).toBe(409);
  });

  it("rejects cross-site requests (Origin check)", async () => {
    const res = await signupPOST(
      req("POST", "/api/auth/signup", { body: { email: "x@y.co", password: PASSWORD }, origin: "https://evil.example" })
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("bad_origin");
    const none = await loginPOST(req("POST", "/api/auth/login", { body: { email: "x@y.co", password: PASSWORD }, origin: null }));
    expect(none.status).toBe(403);
  });

  it("logs in with the same message for unknown email and wrong password, rotating the session", async () => {
    const { cookie: first } = await signup();
    const unknown = await loginPOST(req("POST", "/api/auth/login", { body: { email: "nobody@example.com", password: PASSWORD } }));
    const wrong = await loginPOST(req("POST", "/api/auth/login", { body: { email: "alex@example.com", password: "wrong password!" } }));
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await unknown.json()).toEqual(await wrong.json());

    const ok = await loginPOST(req("POST", "/api/auth/login", { body: { email: "ALEX@example.com", password: PASSWORD }, cookie: first }));
    expect(ok.status).toBe(200);
    const second = cookieFrom(ok);
    expect(second).not.toBe(first);
    // The pre-login session was rotated out.
    expect((await (await meGET(req("GET", "/api/auth/me", { cookie: first }))).json()).user).toBeNull();
    expect((await (await meGET(req("GET", "/api/auth/me", { cookie: second }))).json()).user).not.toBeNull();

    const out = await logoutPOST(req("POST", "/api/auth/logout", { cookie: second }));
    expect(out.headers.get("set-cookie")).toMatch(/ember_session=;.*Max-Age=0/);
    expect((await (await meGET(req("GET", "/api/auth/me", { cookie: second }))).json()).user).toBeNull();
  });

  it("locks an email out after repeated failures, even with the right password", async () => {
    await signup();
    for (let i = 0; i < EMAIL_FREE_FAILURES; i++) {
      const r = await loginPOST(req("POST", "/api/auth/login", { body: { email: "alex@example.com", password: "nope nope nope" }, ip: `10.0.0.${i}` }));
      expect(r.status).toBe(401);
    }
    const locked = await loginPOST(req("POST", "/api/auth/login", { body: { email: "alex@example.com", password: PASSWORD }, ip: "10.0.1.1" }));
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    // Unknown emails lock the same way (no enumeration through the lockout).
    for (let i = 0; i < EMAIL_FREE_FAILURES; i++) {
      await loginPOST(req("POST", "/api/auth/login", { body: { email: "ghost@example.com", password: "nope nope nope" }, ip: `10.0.2.${i}` }));
    }
    const ghost = await loginPOST(req("POST", "/api/auth/login", { body: { email: "ghost@example.com", password: "nope nope nope" }, ip: "10.0.3.1" }));
    expect(ghost.status).toBe(429);
  });

  it("log out everywhere ends every session", async () => {
    const { cookie: a } = await signup();
    const b = cookieFrom(await loginPOST(req("POST", "/api/auth/login", { body: { email: "alex@example.com", password: PASSWORD } })));
    await logoutPOST(req("POST", "/api/auth/logout", { cookie: a, body: { everywhere: true } }));
    expect((await (await meGET(req("GET", "/api/auth/me", { cookie: b }))).json()).user).toBeNull();
  });
});

describe("account", () => {
  it("updates profile and address, and changes the password (revoking other sessions)", async () => {
    const { cookie } = await signup();
    const other = cookieFrom(await loginPOST(req("POST", "/api/auth/login", { body: { email: "alex@example.com", password: PASSWORD } })));
    const p = await accountPATCH(req("PATCH", "/api/account", { cookie, body: { name: "Alex M", phone: "555 123 4567" } }));
    expect((await p.json()).user).toMatchObject({ name: "Alex M", phone: "555 123 4567" });
    const a = await addressPUT(req("PUT", "/api/account/address", { cookie, body: { line1: "1 Main St", city: "San Francisco", zip: "94103" } }));
    expect((await a.json()).address).toMatchObject({ line1: "1 Main St", zip: "94103", line2: "" });

    const bad = await passwordPOST(req("POST", "/api/account/password", { cookie, body: { currentPassword: "wrong one!!", newPassword: "fresh new secret" } }));
    expect(bad.status).toBe(403);
    const ok = await passwordPOST(req("POST", "/api/account/password", { cookie, body: { currentPassword: PASSWORD, newPassword: "fresh new secret" } }));
    expect(ok.status).toBe(200);
    const fresh = cookieFrom(ok);
    expect((await (await meGET(req("GET", "/api/auth/me", { cookie: other }))).json()).user).toBeNull();
    expect((await (await meGET(req("GET", "/api/auth/me", { cookie: fresh }))).json()).user).not.toBeNull();
  });

  it("requires a session", async () => {
    const res = await accountOrdersGET(req("GET", "/api/account/orders"));
    expect(res.status).toBe(401);
  });

  it("deletes the account, its sessions and address, and anonymises its orders", async () => {
    const { cookie } = await signup();
    await addressPUT(req("PUT", "/api/account/address", { cookie, body: { line1: "1 Main St", city: "SF", zip: "94103" } }));
    const order = await placeOrder(cookie);
    const wrong = await accountDELETE(req("DELETE", "/api/account", { cookie, body: { password: "not my password" } }));
    expect(wrong.status).toBe(403);
    const res = await accountDELETE(req("DELETE", "/api/account", { cookie, body: { password: PASSWORD } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    const db = getDb();
    expect(db.prepare("SELECT COUNT(*) AS n FROM users").get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT COUNT(*) AS n FROM saved_addresses").get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT user_id FROM orders WHERE id = ?").get(order.orderId)).toEqual({ user_id: null });
  });
});

describe("orders and accounts", () => {
  it("links orders placed while signed in and lists them; other users get 403 without the token", async () => {
    const { cookie } = await signup();
    const order = await placeOrder(cookie);
    const list = await (await accountOrdersGET(req("GET", "/api/account/orders", { cookie }))).json();
    expect(list.orders.map((o: { id: string }) => o.id)).toEqual([order.orderId]);
    expect(list.orders[0].trackingToken).toBe(order.trackingToken);

    // Owner can read without the token.
    const own = await orderGET(req("GET", `/api/orders/${order.orderId}`, { cookie }), params(order.orderId));
    expect(own.status).toBe(200);
    // Another account cannot.
    const { cookie: bob } = await signup("bob@example.com");
    const theirs = await orderGET(req("GET", `/api/orders/${order.orderId}`, { cookie: bob }), params(order.orderId));
    expect(theirs.status).toBe(403);
    // Anyone with the token still can.
    const withToken = await orderGET(
      req("GET", `/api/orders/${order.orderId}?t=${order.trackingToken}`, { cookie: bob }),
      params(order.orderId)
    );
    expect(withToken.status).toBe(200);
  });

  it("refuses a cookie-authenticated order from another origin", async () => {
    const { cookie } = await signup();
    const res = await ordersPOST(
      req("POST", "/api/orders", {
        body: { ...ORDER, expectedTotalCents: 1 },
        cookie,
        origin: "https://evil.example",
        headers: { "idempotency-key": "auth-test-key-evil-0001" },
      })
    );
    expect(res.status).toBe(403);
  });

  it("claims guest orders only with the right token, and never steals another account's order", async () => {
    const guest1 = await placeOrder();
    const guest2 = await placeOrder();
    const { cookie } = await signup();
    const res = await claimPOST(
      req("POST", "/api/account/claim-orders", {
        cookie,
        body: [
          guest1,
          { orderId: guest2.orderId, trackingToken: guest1.trackingToken }, // wrong token
        ],
      })
    );
    expect(await res.json()).toEqual({ claimed: 1 });
    const { cookie: bob } = await signup("bob@example.com");
    const steal = await claimPOST(req("POST", "/api/account/claim-orders", { cookie: bob, body: [guest1] }));
    expect(await steal.json()).toEqual({ claimed: 0 });
    const list = await (await accountOrdersGET(req("GET", "/api/account/orders", { cookie }))).json();
    expect(list.orders.map((o: { id: string }) => o.id)).toEqual([guest1.orderId]);
  });
});
