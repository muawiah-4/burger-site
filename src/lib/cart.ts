import { CartItem, Deal, OptionGroup, Product, SelectedOption } from "@/types";

export interface SelectionState {
  [groupId: string]: string[];
}

export function defaultSelection(optionGroups: OptionGroup[]): SelectionState {
  const state: SelectionState = {};
  for (const group of optionGroups) {
    const defaults = group.choices.filter((c) => c.default).map((c) => c.id);
    state[group.id] = defaults;
  }
  return state;
}

export function computeUnitPrice(product: Product, selection: SelectionState): number {
  let total = product.price;
  for (const group of product.optionGroups) {
    const chosenIds = selection[group.id] ?? [];
    for (const choiceId of chosenIds) {
      const choice = group.choices.find((c) => c.id === choiceId);
      if (choice) total += choice.priceDelta;
    }
  }
  return Math.round(total * 100) / 100;
}

export function buildSelectedOptions(product: Product, selection: SelectionState): SelectedOption[] {
  const result: SelectedOption[] = [];
  for (const group of product.optionGroups) {
    const chosenIds = selection[group.id] ?? [];
    if (chosenIds.length === 0) continue;
    const choices = group.choices.filter((c) => chosenIds.includes(c.id));
    result.push({
      groupId: group.id,
      groupLabel: group.label,
      choiceIds: choices.map((c) => c.id),
      choiceLabels: choices.map((c) => c.label),
      priceDelta: Math.round(choices.reduce((sum, c) => sum + c.priceDelta, 0) * 100) / 100,
    });
  }
  return result;
}

export function selectionKey(productId: string, selection: SelectionState): string {
  const parts = Object.keys(selection)
    .sort()
    .map((groupId) => `${groupId}:${[...selection[groupId]].sort().join(",")}`);
  return `${productId}__${parts.join("|")}`;
}

/** Upper bound for a single cart line's quantity (matches QuantityStepper's max). */
export const MAX_ITEM_QUANTITY = 20;

/** Cart productId prefix for deals/combos, which aren't entries in products.ts. */
export const DEAL_PRODUCT_PREFIX = "deal-";

/**
 * Builds the cart line for a fixed deal. The "includes" choice id is the deal id —
 * stable, so adding the same deal twice stacks into one line instead of two.
 */
export function buildDealCartItem(deal: Deal): Omit<CartItem, "cartItemId"> {
  return {
    productId: `${DEAL_PRODUCT_PREFIX}${deal.id}`,
    slug: deal.slug,
    name: deal.name,
    image: deal.image,
    category: "sides",
    basePrice: deal.price,
    unitPrice: deal.price,
    quantity: 1,
    selectedOptions: [
      { groupId: "includes", groupLabel: "Includes", choiceIds: [deal.id], choiceLabels: deal.includes, priceDelta: 0 },
    ],
  };
}

export function isSelectionComplete(product: Product, selection: SelectionState): boolean {
  for (const group of product.optionGroups) {
    if (group.required && (selection[group.id]?.length ?? 0) === 0) {
      return false;
    }
  }
  return true;
}

export interface PromoResult {
  valid: boolean;
  message: string;
  /** Dollars, as quoted by the server (/api/quote). */
  discount: number;
}

// Display-only estimates. Promo codes are validated and every order is priced by
// the server (src/server/pricing.ts); these mirror its integer-cent rules so the
// cart shows the same numbers before a quote comes back. Nothing here is trusted.
export const TAX_RATE = 0.0825;
export const DELIVERY_FEE = 3.49;
export const FREE_DELIVERY_THRESHOLD = 35;

export interface Totals {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  total: number;
}

const cents = (dollars: number) => Math.round(dollars * 100);

/** Display estimate of the order totals for a server-quoted discount (dollars). */
export function computeTotals(
  items: CartItem[],
  fulfillment: "delivery" | "pickup",
  discount: number
): Totals {
  const subtotalC = items.reduce((sum, item) => sum + cents(item.unitPrice) * item.quantity, 0);
  const feeC =
    fulfillment === "delivery" && subtotalC > 0 && subtotalC < cents(FREE_DELIVERY_THRESHOLD) ? cents(DELIVERY_FEE) : 0;
  const discountC = Math.min(cents(discount), subtotalC);
  const taxableC = subtotalC - discountC;
  // Half-up on integer cents, as the server does.
  const taxC = Math.floor((taxableC * 825 * 2 + 10_000) / 20_000);
  return {
    subtotal: subtotalC / 100,
    deliveryFee: feeC / 100,
    discount: discountC / 100,
    tax: taxC / 100,
    total: (taxableC + feeC + taxC) / 100,
  };
}

/** Totals from a server quote (authoritative). */
export function totalsFromQuote(q: {
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}): Totals {
  return {
    subtotal: q.subtotalCents / 100,
    deliveryFee: q.deliveryFeeCents / 100,
    discount: q.discountCents / 100,
    tax: q.taxCents / 100,
    total: q.totalCents / 100,
  };
}
