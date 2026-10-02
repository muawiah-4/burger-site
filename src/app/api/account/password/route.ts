import { errorResponse, handle, json, rateLimit, readJson } from "@/server/http";
import { changePasswordSchema } from "@/server/schemas";
import { getDb, runInTransaction } from "@/server/db";
import { assertSameOrigin, createSession, deleteAllSessions, requireSession, withSessionCookie } from "@/server/auth";
import { assertCurrentPassword } from "@/server/account";
import { hashPassword, passwordProblem } from "@/server/passwords";

/**
 * POST /api/account/password — needs the current password. Signs out every other
 * session and issues this browser a fresh one.
 */
export async function POST(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "account", 60);
    const { user } = requireSession(request);
    const { currentPassword, newPassword } = await readJson(request, changePasswordSchema);
    await assertCurrentPassword(request, user, currentPassword);
    const problem = passwordProblem(newPassword, user.email);
    if (problem) return errorResponse(400, "weak_password", problem);
    const hash = await hashPassword(newPassword);
    const db = getDb();
    const token = runInTransaction(db, () => {
      db.prepare("UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?").run(
        hash,
        new Date().toISOString(),
        user.id
      );
      deleteAllSessions(user.id, db);
      return createSession(user.id, request, db);
    });
    return withSessionCookie(json({ ok: true }), token);
  });
}
