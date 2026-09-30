import { CartItem, FulfillmentMethod, SelectedOption } from "@/types";

// Storage keys, shapes and generic validators shared by the cart, order and profile
// stores. Kept free of menu data so the shared client bundle doesn't pull in the
// catalogue; only the cart re-pricing parser (cart-storage.ts) needs products.ts.

export const CART_STORAGE_KEY = "ember.cart.v1";

export interface StoredCartState {
  items: CartItem[];
  fulfillment: FulfillmentMethod;
  pickupLocationId: string | null;
  promoCode: string;
}

export const EMPTY_CART_STATE: StoredCartState = {
  items: [],
  fulfillment: "delivery",
  pickupLocationId: null,
  promoCode: "",
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** next/image throws on hosts not listed in next.config.ts, so only accept local paths and the configured host. */
export function isRenderableImage(value: unknown): value is string {
  return typeof value === "string" && (/^\/(?!\/)/.test(value) || value.startsWith("https://images.unsplash.com/"));
}

export function parseSelectedOption(value: unknown): SelectedOption | null {
  if (!isRecord(value)) return null;
  const { groupId, groupLabel, choiceIds, choiceLabels, priceDelta } = value;
  if (typeof groupId !== "string" || typeof groupLabel !== "string") return null;
  if (!isStringArray(choiceIds) || !isStringArray(choiceLabels)) return null;
  if (typeof priceDelta !== "number" || !Number.isFinite(priceDelta)) return null;
  return { groupId, groupLabel, choiceIds, choiceLabels, priceDelta };
}
