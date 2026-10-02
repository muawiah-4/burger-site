import { handle, json, rateLimit, readJson } from "@/server/http";
import { addressSchema } from "@/server/schemas";
import { getDb } from "@/server/db";
import { assertSameOrigin, requireSession } from "@/server/auth";
import { getSavedAddress } from "@/server/account";

/** PUT /api/account/address — save (replace) the account's default delivery address. */
export async function PUT(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "account", 60);
    const { user } = requireSession(request);
    const a = await readJson(request, addressSchema);
    getDb()
      .prepare(
        `INSERT INTO saved_addresses (user_id, line1, line2, city, zip, instructions, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET line1 = excluded.line1, line2 = excluded.line2, city = excluded.city,
           zip = excluded.zip, instructions = excluded.instructions, updated_at = excluded.updated_at`
      )
      .run(user.id, a.line1, a.line2, a.city, a.zip.slice(0, 5), a.instructions, new Date().toISOString());
    return json({ address: getSavedAddress(user.id) });
  });
}

/** DELETE /api/account/address — forget the saved address. */
export async function DELETE(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "account", 60);
    const { user } = requireSession(request);
    getDb().prepare("DELETE FROM saved_addresses WHERE user_id = ?").run(user.id);
    return json({ address: null });
  });
}
