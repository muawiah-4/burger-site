import "server-only";
import type { FulfillmentMethod, OptionGroup, Product } from "@/types";
import type { PricedLine, PricedOption, PromoOutcome, Quote, QuoteRequest } from "@/lib/api-types";
import { productMap, getProductsByCategory } from "@/lib/data/products";
import { COMBO_SOFT_DRINK_IDS, deals } from "@/lib/data/deals";
import { locations } from "@/lib/data/locations";

/**
 * Authoritative pricing. Everything is integer cents; the menu's dollar prices are
 * converted once with {@link toCents}. The browser only ever displays what this
 * module returns (via /api/quote and /api/orders).
 */

export const TAX_RATE_BPS = 825; // 8.25%
export const DELIVERY_FEE_CENTS = 349;
export const FREE_DELIVERY_THRESHOLD_CENTS = 3500;
export const ETA_MINUTES: Record<FulfillmentMethod, { min: number; max: number }> = {
  delivery: { min: 25, max: 35 },
  pickup: { min: 12, max: 18 },
};

export class PricingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly path?: (string | number)[]
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export interface PromoRecord {
  code: string;
  kind: "pct" | "flat";
  /** Percent (1–100) for "pct", cents for "flat". */
  value: number;
  minSubtotalCents: number;
  maxRedemptions: number | null;
  active: boolean;
  description: string;
  /** Redemptions recorded so far. */
  redemptions: number;
}

export type PromoLookup = (code: string) => PromoRecord | null;

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Rounds a non-negative integer ratio half-up without floating-point error. */
function divRoundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((numerator * 2 + denominator) / (denominator * 2));
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------- options

type Selection = Record<string, string[]>;

function assertSelectionShape(options: Selection | undefined, path: (string | number)[]): Selection {
  const selection: Selection = {};
  for (const [groupId, ids] of Object.entries(options ?? {})) {
    if (new Set(ids).size !== ids.length) {
      throw new PricingError("invalid_option", `Duplicate choice in "${groupId}".`, [...path, groupId]);
    }
    selection[groupId] = ids;
  }
  return selection;
}

/**
 * Validates a product's option selection against its groups (known group and
 * choice ids, single = at most one, multi respects max, required groups present)
 * and returns the labelled options with their deltas in cents.
 */
export function priceProductOptions(
  product: Product,
  rawSelection: Selection | undefined,
  path: (string | number)[] = []
): { unitPriceCents: number; options: PricedOption[] } {
  const selection = assertSelectionShape(rawSelection, path);
  const groups = new Map<string, OptionGroup>(product.optionGroups.map((g) => [g.id, g]));

  for (const groupId of Object.keys(selection)) {
    if (!groups.has(groupId)) {
      throw new PricingError("invalid_option", `"${product.name}" has no option group "${groupId}".`, [...path, groupId]);
    }
  }

  let unitPriceCents = toCents(product.price);
  const options: PricedOption[] = [];
  for (const group of product.optionGroups) {
    const ids = selection[group.id] ?? [];
    if (group.required && ids.length === 0) {
      throw new PricingError("missing_option", `Choose a ${group.label.toLowerCase()} for "${product.name}".`, [
        ...path,
        group.id,
      ]);
    }
    if (group.type === "single" && ids.length > 1) {
      throw new PricingError("too_many_choices", `Pick one ${group.label.toLowerCase()} for "${product.name}".`, [
        ...path,
        group.id,
      ]);
    }
    if (group.type === "multi" && group.max !== undefined && ids.length > group.max) {
      throw new PricingError(
        "too_many_choices",
        `Pick up to ${group.max} ${group.label.toLowerCase()} for "${product.name}".`,
        [...path, group.id]
      );
    }
    if (ids.length === 0) continue;
    // Keep the menu's order of choices so equal selections store identically.
    const chosen = group.choices.filter((c) => ids.includes(c.id));
    if (chosen.length !== ids.length) {
      throw new PricingError("invalid_option", `Unknown ${group.label.toLowerCase()} choice for "${product.name}".`, [
        ...path,
        group.id,
      ]);
    }
    const deltaCents = chosen.reduce((sum, c) => sum + toCents(c.priceDelta), 0);
    unitPriceCents += deltaCents;
    options.push({
      groupId: group.id,
      groupLabel: group.label,
      choiceIds: chosen.map((c) => c.id),
      choiceLabels: chosen.map((c) => c.label),
      priceDeltaCents: deltaCents,
    });
  }
  return { unitPriceCents, options };
}

// ---------------------------------------------------------------- deals & combos

interface ComboSlot {
  groupId: string;
  label: string;
  choices: () => { id: string; name: string }[];
}

const softDrinks = () =>
  COMBO_SOFT_DRINK_IDS.map((id) => productMap.get(id)).filter((p): p is Product => Boolean(p));

/** Build-your-own combos: the customer picks one choice per slot; the deal price is fixed. */
const COMBO_SLOTS: Record<string, { slots: ComboSlot[]; fixed?: PricedOption }> = {
  "deal-burger-fries-drink": {
    slots: [
      { groupId: "main", label: "Burger", choices: () => getProductsByCategory("burgers") },
      { groupId: "drink", label: "Drink", choices: softDrinks },
    ],
    fixed: { groupId: "side", groupLabel: "Side", choiceIds: ["side"], choiceLabels: ["Classic Fries"], priceDeltaCents: 0 },
  },
  "deal-pizza-drink": {
    slots: [
      { groupId: "main", label: "Pizza", choices: () => getProductsByCategory("pizza") },
      { groupId: "drink", label: "Drink", choices: softDrinks },
    ],
  },
};

export function priceDeal(
  dealId: string,
  rawSelection: Selection | undefined,
  path: (string | number)[] = []
): { name: string; image: string; unitPriceCents: number; options: PricedOption[] } {
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) throw new PricingError("unknown_deal", "That deal is no longer available.", path);
  const selection = assertSelectionShape(rawSelection, path);
  const combo = COMBO_SLOTS[deal.id];
  let image = deal.image;

  if (!combo) {
    // Fixed deal. The cart sends { includes: [dealId] }; nothing else is allowed.
    for (const [groupId, ids] of Object.entries(selection)) {
      if (groupId !== "includes" || ids.length > 1 || (ids.length === 1 && ids[0] !== deal.id)) {
        throw new PricingError("invalid_option", `"${deal.name}" has no options to choose.`, [...path, groupId]);
      }
    }
    return {
      name: deal.name,
      image,
      unitPriceCents: toCents(deal.price),
      options: [
        { groupId: "includes", groupLabel: "Includes", choiceIds: [deal.id], choiceLabels: deal.includes, priceDeltaCents: 0 },
      ],
    };
  }

  const allowed = new Set([...combo.slots.map((s) => s.groupId), ...(combo.fixed ? [combo.fixed.groupId] : [])]);
  for (const groupId of Object.keys(selection)) {
    if (!allowed.has(groupId)) {
      throw new PricingError("invalid_option", `"${deal.name}" has no option "${groupId}".`, [...path, groupId]);
    }
  }
  if (combo.fixed) {
    const ids = selection[combo.fixed.groupId];
    if (ids && (ids.length !== 1 || ids[0] !== combo.fixed.choiceIds[0])) {
      throw new PricingError("invalid_option", `"${deal.name}" comes with ${combo.fixed.choiceLabels[0]}.`, [
        ...path,
        combo.fixed.groupId,
      ]);
    }
  }

  const options: PricedOption[] = [];
  for (const slot of combo.slots) {
    const ids = selection[slot.groupId] ?? [];
    if (ids.length !== 1) {
      throw new PricingError("missing_option", `Choose one ${slot.label.toLowerCase()} for "${deal.name}".`, [
        ...path,
        slot.groupId,
      ]);
    }
    const choice = slot.choices().find((c) => c.id === ids[0]);
    if (!choice) {
      throw new PricingError("invalid_option", `That ${slot.label.toLowerCase()} isn't part of "${deal.name}".`, [
        ...path,
        slot.groupId,
      ]);
    }
    if (slot.groupId === "main") image = productMap.get(choice.id)?.image ?? image;
    options.push({
      groupId: slot.groupId,
      groupLabel: slot.label,
      choiceIds: [choice.id],
      choiceLabels: [choice.name],
      priceDeltaCents: 0,
    });
    if (slot.groupId === "main" && combo.fixed) options.push(combo.fixed);
  }
  return { name: deal.name, image, unitPriceCents: toCents(deal.price), options };
}

// ---------------------------------------------------------------- promos & totals

export function normalizePromoCode(code: string | undefined | null): string {
  return (code ?? "").trim().toUpperCase();
}

/** Applies a promotion to a subtotal. The discount is capped at the subtotal. */
export function evaluatePromotion(
  promo: PromoRecord | null,
  code: string,
  subtotalCents: number
): { discountCents: number; outcome: PromoOutcome } {
  const none = (message: string) => ({ discountCents: 0, outcome: { code, applied: false, message } });
  if (!promo) return none("That code isn't valid.");
  if (!promo.active) return none("That code has expired.");
  if (promo.maxRedemptions !== null && promo.redemptions >= promo.maxRedemptions) {
    return none("That code has reached its redemption limit.");
  }
  if (subtotalCents < promo.minSubtotalCents) {
    return none(`Add ${formatCents(promo.minSubtotalCents - subtotalCents)} more to use this code.`);
  }
  const raw = promo.kind === "pct" ? divRoundHalfUp(subtotalCents * promo.value, 100) : promo.value;
  const discountCents = Math.min(raw, subtotalCents);
  return { discountCents, outcome: { code: promo.code, applied: true, message: promo.description } };
}

export function computeTaxCents(taxableCents: number): number {
  return divRoundHalfUp(taxableCents * TAX_RATE_BPS, 10_000);
}

export function computeDeliveryFeeCents(fulfillment: FulfillmentMethod, subtotalCents: number): number {
  return fulfillment === "delivery" && subtotalCents > 0 && subtotalCents < FREE_DELIVERY_THRESHOLD_CENTS
    ? DELIVERY_FEE_CENTS
    : 0;
}

/** Prices a whole order. Throws {@link PricingError} for anything the menu doesn't allow. */
export function priceOrder(input: QuoteRequest, findPromo: PromoLookup): Quote {
  if (input.items.length === 0) throw new PricingError("empty_order", "Your cart is empty.", ["items"]);

  const locationId = input.locationId ?? null;
  const location = locationId ? locations.find((l) => l.id === locationId) : undefined;
  if (locationId && !location) throw new PricingError("invalid_location", "Unknown location.", ["locationId"]);
  if (input.fulfillment === "pickup" && !location) {
    throw new PricingError("invalid_location", "Choose a pickup location.", ["locationId"]);
  }
  if (input.fulfillment === "delivery" && location && !location.deliveryAvailable) {
    throw new PricingError("delivery_unavailable", `${location.name} doesn't deliver.`, ["locationId"]);
  }

  const lines: PricedLine[] = input.items.map((item, i) => {
    const path = ["items", i];
    if (item.productId) {
      const product = productMap.get(item.productId);
      if (!product) throw new PricingError("unknown_product", "An item in your cart is no longer on the menu.", path);
      const { unitPriceCents, options } = priceProductOptions(product, item.options, [...path, "options"]);
      return {
        productId: product.id,
        dealId: null,
        name: product.name,
        image: product.image,
        qty: item.qty,
        unitPriceCents,
        lineTotalCents: unitPriceCents * item.qty,
        options,
      };
    }
    if (!item.dealId) throw new PricingError("invalid_item", "Each item needs a productId or dealId.", path);
    const { name, image, unitPriceCents, options } = priceDeal(item.dealId, item.options, [...path, "options"]);
    return {
      productId: null,
      dealId: item.dealId,
      name,
      image,
      qty: item.qty,
      unitPriceCents,
      lineTotalCents: unitPriceCents * item.qty,
      options,
    };
  });

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const code = normalizePromoCode(input.promoCode);
  let discountCents = 0;
  let promo: PromoOutcome | null = null;
  if (code) {
    const result = evaluatePromotion(findPromo(code), code, subtotalCents);
    discountCents = result.discountCents;
    promo = result.outcome;
  }
  const deliveryFeeCents = computeDeliveryFeeCents(input.fulfillment, subtotalCents);
  const taxable = subtotalCents - discountCents;
  const taxCents = computeTaxCents(taxable);

  return {
    fulfillment: input.fulfillment,
    locationId: location?.id ?? null,
    lines,
    subtotalCents,
    deliveryFeeCents,
    discountCents,
    taxCents,
    totalCents: taxable + deliveryFeeCents + taxCents,
    promo,
    eta: ETA_MINUTES[input.fulfillment],
  };
}
