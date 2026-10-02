import { errorResponse, handle, json, rateLimit } from "@/server/http";
import { ORDER_ID_RE, TRACKING_TOKEN_RE } from "@/server/schemas";
import { getOrderForCustomer } from "@/server/orders";
import { getSession } from "@/server/auth";

/**
 * GET /api/orders/:id?t=<trackingToken> — the order, with its kitchen-advanced status.
 * The token may be omitted by the signed-in account that owns the order.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    rateLimit(request, "order-read", 240);
    const { id } = await ctx.params;
    const token = new URL(request.url).searchParams.get("t") ?? "";
    if (!ORDER_ID_RE.test(id)) return errorResponse(404, "not_found", "Order not found.");
    const viewer = getSession(request)?.user.id ?? null;
    if (!viewer && !TRACKING_TOKEN_RE.test(token)) {
      return errorResponse(403, "forbidden", "A valid tracking token is required.");
    }
    const result = getOrderForCustomer(id, token, undefined, undefined, viewer);
    if (result.kind === "not_found") return errorResponse(404, "not_found", "Order not found.");
    if (result.kind === "forbidden") return errorResponse(403, "forbidden", "A valid tracking token is required.");
    return json(result.order);
  });
}
