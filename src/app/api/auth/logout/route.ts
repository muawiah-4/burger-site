import { z } from "zod";
import { handle, json, rateLimit, readJson } from "@/server/http";
import {
  assertSameOrigin,
  deleteAllSessions,
  deleteSessionByToken,
  getSession,
  readSessionToken,
  withClearedSession,
} from "@/server/auth";

const logoutSchema = z.strictObject({ everywhere: z.boolean().optional() });

/** POST /api/auth/logout — ends this session; `{ "everywhere": true }` ends all of the account's sessions. */
export async function POST(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "logout", 30);
    const hasBody = (request.headers.get("content-type") ?? "").startsWith("application/json");
    const { everywhere } = hasBody ? await readJson(request, logoutSchema) : { everywhere: false };
    if (everywhere) {
      const session = getSession(request);
      if (session) deleteAllSessions(session.user.id);
    }
    deleteSessionByToken(readSessionToken(request));
    return withClearedSession(json({ ok: true }));
  });
}
