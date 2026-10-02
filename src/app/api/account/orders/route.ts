import { handle, json, rateLimit } from "@/server/http";
import { requireSession } from "@/server/auth";
import { listOrdersForUser } from "@/server/orders";

/** GET /api/account/orders — the signed-in account's orders, newest first. */
export async function GET(request: Request) {
  return handle(request, async () => {
    rateLimit(request, "account-read", 120);
    const { user } = requireSession(request);
    return json({ orders: listOrdersForUser(user.id) });
  });
}
