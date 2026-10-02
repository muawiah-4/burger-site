import { handle, json, rateLimit } from "@/server/http";
import { getSession, readSessionToken, toPublicUser, withClearedSession, withSessionCookie } from "@/server/auth";
import { getSavedAddress } from "@/server/account";

/** GET /api/auth/me — the signed-in user (or null). Also slides the session cookie's expiry. */
export async function GET(request: Request) {
  return handle(request, async () => {
    rateLimit(request, "me", 240);
    const session = getSession(request);
    if (!session) {
      const res = json({ user: null, address: null });
      // A stale or malformed cookie: tell the browser to drop it.
      return readSessionToken(request) || /(?:^|;\s*)ember_session=/.test(request.headers.get("cookie") ?? "")
        ? withClearedSession(res)
        : res;
    }
    const res = json({ user: toPublicUser(session.user), address: getSavedAddress(session.user.id) });
    return session.refreshed ? withSessionCookie(res, session.token) : res;
  });
}
