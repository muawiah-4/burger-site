import { timingSafeEqual } from "node:crypto";
import { errorResponse, handle, json, rateLimit, readJson } from "@/server/http";
import { ORDER_ID_RE, statusUpdateSchema } from "@/server/schemas";
import { adminSetStatus } from "@/server/orders";

function adminTokenOk(given: string | null): boolean {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (!given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * PATCH /api/orders/:id/status — demo "kitchen" control. Needs the X-Admin-Token
 * header to equal ADMIN_TOKEN (disabled when ADMIN_TOKEN is unset or under 16 chars).
 * Only moves an order to its next stage.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    rateLimit(request, "admin", 60);
    if ((process.env.ADMIN_TOKEN ?? "").length < 16) {
      return errorResponse(503, "admin_disabled", "The kitchen control is disabled on this server.");
    }
    if (!adminTokenOk(request.headers.get("x-admin-token"))) {
      return errorResponse(401, "unauthorized", "A valid X-Admin-Token header is required.");
    }
    const { id } = await ctx.params;
    if (!ORDER_ID_RE.test(id)) return errorResponse(404, "not_found", "Order not found.");
    const { status } = await readJson(request, statusUpdateSchema);
    const result = adminSetStatus(id, status);
    if (result.kind === "not_found") return errorResponse(404, "not_found", "Order not found.");
    if (result.kind === "invalid_transition") {
      return errorResponse(409, "invalid_transition", `Can't move an order from "${result.from}" to "${status}".`);
    }
    return json(result.order);
  });
}
