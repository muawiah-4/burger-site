import type { CartItem, FulfillmentMethod, OrderStatus, PlacedOrder } from "@/types";
import type {
  ApiErrorBody,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderDto,
  Quote,
  QuoteItemInput,
  QuoteRequest,
} from "@/lib/api-types";
import { DEAL_PRODUCT_PREFIX } from "@/lib/cart";
import { isRecord } from "@/lib/storage-shared";

// Browser side of the order API: request helpers plus the device's list of
// order references (id + tracking token). Orders themselves live on the server.

export const ORDER_REFS_KEY = "ember.orders.v2";
const MAX_REFS = 20;
const REF_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface OrderRef {
  orderId: string;
  trackingToken: string;
  displayNumber: string;
  placedAt: string;
}

function parseRefs(raw: string | null, now = Date.now()): OrderRef[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((r): r is OrderRef => {
      if (!isRecord(r)) return false;
      const { orderId, trackingToken, displayNumber, placedAt } = r;
      if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/.test(orderId)) return false;
      if (typeof trackingToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(trackingToken)) return false;
      if (typeof displayNumber !== "string" || !/^\d{1,8}$/.test(displayNumber)) return false;
      if (typeof placedAt !== "string" || Number.isNaN(Date.parse(placedAt))) return false;
      return now - Date.parse(placedAt) <= REF_RETENTION_MS;
    })
    .map(({ orderId, trackingToken, displayNumber, placedAt }) => ({ orderId, trackingToken, displayNumber, placedAt }))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt))
    .slice(0, MAX_REFS);
}

/** Newest first; malformed and expired entries are dropped. */
export function getOrderRefs(): OrderRef[] {
  try {
    return parseRefs(localStorage.getItem(ORDER_REFS_KEY));
  } catch {
    return [];
  }
}

export function getOrderRef(id: string): OrderRef | null {
  const refs = getOrderRefs();
  if (id === "latest") return refs[0] ?? null;
  return refs.find((r) => r.orderId === id) ?? null;
}

export function saveOrderRef(ref: OrderRef): void {
  try {
    const refs = [ref, ...getOrderRefs().filter((r) => r.orderId !== ref.orderId)];
    localStorage.setItem(ORDER_REFS_KEY, JSON.stringify(parseRefs(JSON.stringify(refs))));
  } catch {
    // storage unavailable: the order still exists; the link carries the token
  }
}

export function orderHref(ref: Pick<OrderRef, "orderId" | "trackingToken">): string {
  return `/order/${ref.orderId}?t=${encodeURIComponent(ref.trackingToken)}`;
}

// ---------------------------------------------------------------- requests

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly body?: ApiErrorBody
  ) {
    super(message);
  }
}

export async function request<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store" });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "network_error", "We couldn't reach Ember. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const e = body as ApiErrorBody | null;
    throw new ApiError(res.status, e?.error?.code ?? "http_error", e?.error?.message ?? "Something went wrong.", e ?? undefined);
  }
  return body as T;
}

/** Maps cart lines to the API's item shape (deal lines are keyed `deal-<dealId>`). */
export function cartToQuoteItems(items: CartItem[]): QuoteItemInput[] {
  return items.map((item) => {
    const options: Record<string, string[]> = {};
    for (const o of item.selectedOptions) options[o.groupId] = o.choiceIds;
    return item.productId.startsWith(DEAL_PRODUCT_PREFIX)
      ? { dealId: item.productId.slice(DEAL_PRODUCT_PREFIX.length), qty: item.quantity, options }
      : { productId: item.productId, qty: item.quantity, options };
  });
}

export function buildQuoteRequest(
  items: CartItem[],
  fulfillment: FulfillmentMethod,
  pickupLocationId: string | null,
  promoCode: string
): QuoteRequest {
  return {
    fulfillment,
    locationId: fulfillment === "pickup" ? pickupLocationId : null,
    items: cartToQuoteItems(items),
    ...(promoCode ? { promoCode } : {}),
  };
}

export function fetchQuote(body: QuoteRequest, signal?: AbortSignal): Promise<Quote> {
  return request<Quote>("/api/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export function placeOrderRequest(body: CreateOrderRequest, idempotencyKey: string): Promise<CreateOrderResponse> {
  return request<CreateOrderResponse>("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
}

export function fetchOrder(id: string, token: string, signal?: AbortSignal): Promise<OrderDto> {
  return request<OrderDto>(`/api/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`, {
    method: "GET",
    signal,
  });
}

/** Random key for Idempotency-Key (crypto.randomUUID needs a secure context). */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- display mapping

/** Adapts a server order to the PlacedOrder shape the existing order UI renders. */
export function orderDtoToPlacedOrder(dto: OrderDto): PlacedOrder & { status: OrderStatus } {
  return {
    id: dto.id,
    displayNumber: dto.displayNumber,
    items: dto.items.map((line, i) => ({
      cartItemId: `${dto.id}-${i}`,
      productId: line.productId ?? `${DEAL_PRODUCT_PREFIX}${line.dealId}`,
      slug: "",
      name: line.name,
      image: line.image || "/favicon.ico",
      category: "sides",
      basePrice: line.unitPriceCents / 100,
      unitPrice: line.unitPriceCents / 100,
      quantity: line.qty,
      selectedOptions: line.options.map((o) => ({
        groupId: o.groupId,
        groupLabel: o.groupLabel,
        choiceIds: o.choiceIds,
        choiceLabels: o.choiceLabels,
        priceDelta: o.priceDeltaCents / 100,
      })),
    })),
    fulfillment: dto.fulfillment,
    deliveryArea: dto.deliveryArea ?? undefined,
    pickupLocationId: dto.locationId ?? undefined,
    payment: dto.paymentMethod,
    subtotal: dto.subtotalCents / 100,
    deliveryFee: dto.deliveryFeeCents / 100,
    discount: dto.discountCents / 100,
    tax: dto.taxCents / 100,
    total: dto.totalCents / 100,
    promoCode: dto.promoCode ?? undefined,
    ...(dto.tipCents > 0 ? { tip: dto.tipCents / 100 } : {}),
    ...(dto.scheduledFor ? { scheduledFor: dto.scheduledFor } : {}),
    placedAt: dto.createdAt,
    estimatedMinutes: [dto.eta.min, dto.eta.max],
    status: dto.status,
  };
}
