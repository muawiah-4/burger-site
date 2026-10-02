import { errorResponse, handle, json, rateLimit, readJson } from "@/server/http";
import { loginSchema } from "@/server/schemas";
import { getDb } from "@/server/db";
import {
  assertNotLocked,
  assertSameOrigin,
  clearLoginFailures,
  createSession,
  deleteSessionByToken,
  findUserByEmail,
  readSessionToken,
  recordLoginFailure,
  toPublicUser,
  withSessionCookie,
} from "@/server/auth";
import { getDummyHash, hashPassword, needsRehash, verifyPassword } from "@/server/passwords";
import { getSavedAddress } from "@/server/account";

/**
 * POST /api/auth/login — one message for an unknown email and a wrong password,
 * and the same scrypt work either way, so responses don't reveal which emails exist.
 */
export async function POST(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "login", 30);
    const { email, password } = await readJson(request, loginSchema);
    assertNotLocked(request, email);
    const user = findUserByEmail(email);
    const ok = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()));
    if (!user || !ok) {
      recordLoginFailure(request, email);
      return errorResponse(401, "invalid_credentials", "Email or password is incorrect.");
    }
    clearLoginFailures(request, email);
    if (needsRehash(user.password_hash)) {
      getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(password), user.id);
    }
    // Rotate: never reuse a session id that existed before authentication.
    deleteSessionByToken(readSessionToken(request));
    const token = createSession(user.id, request);
    return withSessionCookie(json({ user: toPublicUser(user), address: getSavedAddress(user.id) }), token);
  });
}
