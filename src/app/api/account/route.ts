import { handle, json, rateLimit, readJson } from "@/server/http";
import { deleteAccountSchema, profileUpdateSchema } from "@/server/schemas";
import { getDb, runInTransaction } from "@/server/db";
import { assertSameOrigin, findUserById, requireSession, toPublicUser, withClearedSession } from "@/server/auth";
import { assertCurrentPassword } from "@/server/account";
import { anonymizeOrders } from "@/server/orders";

/** PATCH /api/account — update name and/or phone. */
export async function PATCH(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "account", 60);
    const { user } = requireSession(request);
    const input = await readJson(request, profileUpdateSchema);
    getDb()
      .prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?")
      .run(input.name ?? user.name, input.phone ?? user.phone, user.id);
    return json({ user: toPublicUser(findUserById(user.id)!) });
  });
}

/**
 * DELETE /api/account — needs the password. Deletes the user, their sessions and
 * saved address (cascade) and detaches their orders, which stay only as anonymous
 * orders until normal order retention removes them.
 */
export async function DELETE(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "account", 60);
    const { user } = requireSession(request);
    const { password } = await readJson(request, deleteAccountSchema);
    await assertCurrentPassword(request, user, password);
    const db = getDb();
    runInTransaction(db, () => {
      anonymizeOrders(user.id, db);
      db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
    });
    return withClearedSession(json({ deleted: true }));
  });
}
