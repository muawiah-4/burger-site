import "server-only";
import { randomUUID } from "node:crypto";
import type { ZodType } from "zod";
import type { ApiErrorBody } from "@/lib/api-types";
import { PricingError } from "./pricing";

/** Max accepted request body. A full 30-line order is well under 8 KB. */
export const MAX_BODY_BYTES = 16 * 1024;

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...BASE_HEADERS, ...headers } });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Partial<ApiErrorBody> & { details?: unknown } = {},
  headers: Record<string, string> = {}
): Response {
  const { details, ...rest } = extra;
  const body: ApiErrorBody = { error: { code, message, ...(details !== undefined ? { details } : {}) }, ...rest };
  return json(body, status, headers);
}

/** Reads and validates a JSON body: content type, size cap, syntax, then the zod schema. */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "Send the body as application/json.");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large", "Request body is too large.");
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "Request body is too large.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "Request body isn't valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "validation_failed",
      "The request is invalid.",
      parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.map(String).join("."), message: i.message }))
    );
  }
  return parsed.data;
}

// ---------------------------------------------------------------- rate limiting

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  // Behind a proxy that sets X-Forwarded-For; the first hop is the client.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/**
 * Fixed-window, in-memory, per-process limiter. Good enough for a single-node
 * demo; a multi-instance deployment needs a shared store (e.g. Redis).
 */
export function rateLimit(request: Request, scope: string, limit: number, windowMs = 60_000) {
  if (process.env.RATE_LIMIT_DISABLED === "1") return;
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 10_000) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new HttpError(429, "rate_limited", "Too many requests. Try again shortly.", {
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    });
  }
}

/** Wraps a handler: maps HttpError / PricingError to JSON, logs anything else without leaking it. */
export async function handle(request: Request, fn: () => Promise<Response>): Promise<Response> {
  const requestId = request.headers.get("x-request-id")?.slice(0, 64) || randomUUID();
  try {
    const res = await fn();
    res.headers.set("X-Request-Id", requestId);
    return res;
  } catch (err) {
    if (err instanceof HttpError) {
      const headers: Record<string, string> = { "X-Request-Id": requestId };
      if (err.status === 429) {
        headers["Retry-After"] = String((err.details as { retryAfterSeconds: number }).retryAfterSeconds);
      }
      return errorResponse(err.status, err.code, err.message, { details: err.details }, headers);
    }
    if (err instanceof PricingError) {
      return errorResponse(
        422,
        err.code,
        err.message,
        { details: err.path ? { path: err.path.join(".") } : undefined },
        { "X-Request-Id": requestId }
      );
    }
    console.error(
      JSON.stringify({
        level: "error",
        msg: "unhandled api error",
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return errorResponse(500, "internal_error", "Something went wrong.", {}, { "X-Request-Id": requestId });
  }
}
