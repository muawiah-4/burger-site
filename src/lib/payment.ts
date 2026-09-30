import { FulfillmentMethod, PaymentMethod } from "@/types";

/** Customer-facing name for a payment method; cash depends on how the order is fulfilled. */
export function paymentLabel(method: PaymentMethod, fulfillment: FulfillmentMethod): string {
  if (method === "card") return "Card";
  if (method === "wallet") return "Digital Wallet";
  return fulfillment === "pickup" ? "Pay at pickup" : "Cash on Delivery";
}
