import { CartItem, OptionGroup, Product, SelectedOption } from "@/types";

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
  discount: number;
}

const PROMO_CODES: Record<string, { discountPct?: number; flat?: number; minSubtotal?: number; label: string }> = {
  CRAVE10: { discountPct: 0.1, label: "10% off your order" },
  WELCOME5: { flat: 5, minSubtotal: 20, label: "$5 off orders over $20" },
  FEAST20: { discountPct: 0.2, minSubtotal: 40, label: "20% off orders over $40" },
};

export function evaluatePromo(code: string, subtotal: number): PromoResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, message: "", discount: 0 };
  const promo = PROMO_CODES[trimmed];
  if (!promo) {
    return { valid: false, message: "That code isn't valid.", discount: 0 };
  }
  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return {
      valid: false,
      message: `Add $${(promo.minSubtotal - subtotal).toFixed(2)} more to use this code.`,
      discount: 0,
    };
  }
  const discount = promo.flat ?? Math.round(subtotal * (promo.discountPct ?? 0) * 100) / 100;
  return { valid: true, message: promo.label, discount };
}

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

export function computeTotals(
  items: CartItem[],
  fulfillment: "delivery" | "pickup",
  discount: number
): Totals {
  const subtotal = Math.round(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100
  ) / 100;

  const deliveryFee =
    fulfillment === "delivery" && subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD
      ? DELIVERY_FEE
      : 0;

  const cappedDiscount = Math.min(discount, subtotal);
  const taxable = Math.max(subtotal - cappedDiscount, 0);
  const tax = Math.round(taxable * TAX_RATE * 100) / 100;
  const total = Math.round((taxable + deliveryFee + tax) * 100) / 100;

  return { subtotal, deliveryFee, discount: cappedDiscount, tax, total };
}
