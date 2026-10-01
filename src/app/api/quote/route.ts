import { handle, json, rateLimit, readJson } from "@/server/http";
import { quoteRequestSchema } from "@/server/schemas";
import { quote } from "@/server/orders";

/** POST /api/quote — server-priced breakdown for a cart, including the promo outcome. */
export async function POST(request: Request) {
  return handle(request, async () => {
    rateLimit(request, "quote", 120);
    const input = await readJson(request, quoteRequestSchema);
    return json(quote(input));
  });
}
