import { CartItem, FulfillmentMethod, SelectedOption } from "@/types";
import { productMap } from "@/lib/data/products";
import { deals } from "@/lib/data/deals";
import {
  DEAL_PRODUCT_PREFIX,
  MAX_ITEM_QUANTITY,
  SelectionState,
  buildSelectedOptions,
  computeUnitPrice,
  isSelectionComplete,
} from "@/lib/cart";

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

function isStringArray(value: unknown): value is string[] {
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

/**
 * Validates one stored cart line and re-prices it from the menu data, never
 * trusting the stored unitPrice for known products. Returns null for lines that
 * are malformed or no longer match the menu, so they are dropped.
 */
function parseCartItem(value: unknown): CartItem | null {
  if (!isRecord(value)) return null;
  const { cartItemId, productId, slug, name, image, category, basePrice, unitPrice, quantity, selectedOptions } = value;
  if (typeof cartItemId !== "string" || typeof productId !== "string") return null;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) return null;
  if (!Array.isArray(selectedOptions)) return null;
  const options = selectedOptions.map(parseSelectedOption);
  if (options.some((o) => o === null)) return null;
  const validOptions = options as SelectedOption[];
  const cappedQuantity = Math.min(quantity, MAX_ITEM_QUANTITY);

  const product = productMap.get(productId);
  if (product) {
    const selection: SelectionState = {};
    for (const opt of validOptions) {
      const group = product.optionGroups.find((g) => g.id === opt.groupId);
      if (!group || selection[group.id]) return null;
      if (!opt.choiceIds.every((id) => group.choices.some((c) => c.id === id))) return null;
      if (group.type === "single" && opt.choiceIds.length > 1) return null;
      if (group.max && opt.choiceIds.length > group.max) return null;
      selection[group.id] = opt.choiceIds;
    }
    if (!isSelectionComplete(product, selection)) return null;
    return {
      cartItemId,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      category: product.category,
      basePrice: product.price,
      unitPrice: computeUnitPrice(product, selection),
      quantity: cappedQuantity,
      selectedOptions: buildSelectedOptions(product, selection),
    };
  }

  // Deals and combos aren't in products.ts; they're keyed as `deal-<deal id>`.
  if (!productId.startsWith(DEAL_PRODUCT_PREFIX)) return null;
  if (typeof slug !== "string" || typeof name !== "string" || !isRenderableImage(image)) return null;
  if (typeof category !== "string" || !isFiniteNonNegative(basePrice) || !isFiniteNonNegative(unitPrice)) {
    return null;
  }
  const deal = deals.find((d) => `${DEAL_PRODUCT_PREFIX}${d.id}` === productId);
  // Deal lines are priced at the deal price (their options carry no price delta);
  // an unknown deal keeps its stored price.
  const price = deal ? deal.price : unitPrice;
  return {
    cartItemId,
    productId,
    slug,
    name,
    image,
    category: category as CartItem["category"],
    basePrice: deal ? deal.price : basePrice,
    unitPrice: price,
    quantity: cappedQuantity,
    selectedOptions: validOptions,
  };
}

/** Parses the persisted cart JSON, dropping anything malformed instead of throwing. */
export function parseStoredCart(raw: string | null): StoredCartState {
  if (!raw) return EMPTY_CART_STATE;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_CART_STATE;
  }
  if (!isRecord(parsed)) return EMPTY_CART_STATE;

  const items = Array.isArray(parsed.items)
    ? parsed.items.map(parseCartItem).filter((i): i is CartItem => i !== null)
    : [];
  return {
    items,
    fulfillment: parsed.fulfillment === "pickup" ? "pickup" : "delivery",
    pickupLocationId: typeof parsed.pickupLocationId === "string" ? parsed.pickupLocationId : null,
    promoCode: typeof parsed.promoCode === "string" ? parsed.promoCode.trim().toUpperCase() : "",
  };
}
