import { handle, json, rateLimit, readJson } from "@/server/http";
import { claimOrdersSchema } from "@/server/schemas";
import { assertSameOrigin, requireSession } from "@/server/auth";
import { claimOrders } from "@/server/orders";

/**
 * POST /api/account/claim-orders — body: [{ orderId, trackingToken }, …] (max 50).
 * Links guest orders placed on this device to the account; each needs its tracking
 * token, and orders that already belong to an account are left alone.
 */
export async function POST(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "claim", 20);
    const { user } = requireSession(request);
    const refs = await readJson(request, claimOrdersSchema);
    return json({ claimed: claimOrders(user.id, refs) });
  });
}
