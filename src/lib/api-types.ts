import type { FulfillmentMethod, OrderStatus, PaymentMethod } from "@/types";

// Wire types for the /api routes. Shared by the route handlers and the browser
// client; contains no pricing rules or promo data. All money is integer cents.

export interface QuoteItemInput {
  /** A menu product id (products.ts). Exactly one of productId / dealId. */
  productId?: string;
  /** A deal or combo id (deals.ts). */
  dealId?: string;
  qty: number;
  /** Selected choices per option group: { [groupId]: choiceId[] }. */
  options?: Record<string, string[]>;
}

export interface QuoteRequest {
  fulfillment: FulfillmentMethod;
  /** Required for pickup; optional for delivery. */
  locationId?: string | null;
  items: QuoteItemInput[];
  promoCode?: string;
}

export interface CreateOrderRequest extends QuoteRequest {
  paymentMethod: PaymentMethod;
  /** Delivery only: city + ZIP. The street address is never sent. */
  deliveryArea?: { city: string; zip: string };
  /** The total the customer saw; the order is refused (409) if the server total differs. */
  expectedTotalCents: number;
}

export interface PricedOption {
  groupId: string;
  groupLabel: string;
  choiceIds: string[];
  choiceLabels: string[];
  priceDeltaCents: number;
}

export interface PricedLine {
  productId: string | null;
  dealId: string | null;
  name: string;
  image: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  options: PricedOption[];
}

export interface PromoOutcome {
  code: string;
  applied: boolean;
  message: string;
}

export interface Quote {
  fulfillment: FulfillmentMethod;
  locationId: string | null;
  lines: PricedLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  promo: PromoOutcome | null;
  eta: { min: number; max: number };
}

export interface CreateOrderResponse {
  orderId: string;
  displayNumber: string;
  trackingToken: string;
}

export interface OrderEventDto {
  status: OrderStatus;
  at: string;
}

export interface OrderDto {
  id: string;
  displayNumber: string;
  createdAt: string;
  fulfillment: FulfillmentMethod;
  locationId: string | null;
  deliveryArea: { city: string; zip: string } | null;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  history: OrderEventDto[];
  items: PricedLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  promoCode: string | null;
  eta: { min: number; max: number };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** Present on 409 total_mismatch: the fresh server quote. */
  quote?: Quote;
}
