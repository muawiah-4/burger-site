import { errorResponse, handle, HttpError, json, rateLimit, readJson } from "@/server/http";
import { createOrderSchema, IDEMPOTENCY_KEY_RE } from "@/server/schemas";
import { createOrder } from "@/server/orders";

/**
 * POST /api/orders — re-prices the cart, checks expectedTotalCents, stores the order.
 * Requires an Idempotency-Key header: the same key and body return the same order.
 */
export async function POST(request: Request) {
  return handle(request, async () => {
    rateLimit(request, "orders", 20);
    const key = request.headers.get("idempotency-key") ?? "";
    if (!IDEMPOTENCY_KEY_RE.test(key)) {
      throw new HttpError(400, "invalid_idempotency_key", "Send an Idempotency-Key header (16–128 chars, A-Z a-z 0-9 _ -).");
    }
    const input = await readJson(request, createOrderSchema);
    const result = createOrder(input, key);
    switch (result.kind) {
      case "created":
        return json(result.response, 201, { Location: `/api/orders/${result.response.orderId}` });
      case "replayed":
        return json(result.response, 201, { "Idempotent-Replayed": "true" });
      case "key_reused":
        return errorResponse(
          422,
          "idempotency_key_reused",
          "This Idempotency-Key was already used with a different request body."
        );
      case "total_mismatch":
        return errorResponse(409, "total_mismatch", "Your order total has changed. Please review it.", {
          quote: result.quote,
        });
    }
  });
}
