import { describe, expect, it } from "vitest";
import { productMap } from "@/lib/data/products";
import {
  computeTaxCents,
  evaluatePromotion,
  priceDeal,
  priceOrder,
  priceProductOptions,
  PricingError,
  type PromoRecord,
} from "./pricing";

const classic = productMap.get("b-classic-smash")!;
const DEFAULT_BURGER = { patty: ["single"], cheese: ["cheddar"], sauce: ["signature"] };

const promo = (over: Partial<PromoRecord> = {}): PromoRecord => ({
  code: "TEST",
  kind: "pct",
  value: 10,
  minSubtotalCents: 0,
  maxRedemptions: null,
  active: true,
  description: "10% off",
  redemptions: 0,
  ...over,
});

function expectPricingError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(PricingError);
    expect((err as PricingError).code).toBe(code);
    return;
  }
  throw new Error(`expected PricingError ${code}`);
}

describe("option validation", () => {
  it("prices base + deltas in cents", () => {
    const r = priceProductOptions(classic, { ...DEFAULT_BURGER, patty: ["double"], extras: ["bacon", "pickles"] });
    // 8.49 + 2.50 (double) + 1.50 (bacon) + 0 (pickles)
    expect(r.unitPriceCents).toBe(1249);
    expect(r.options.find((o) => o.groupId === "extras")?.choiceLabels).toEqual(["Crispy Bacon", "Pickles"]);
  });

  it("rejects a missing required group", () => {
    expectPricingError(() => priceProductOptions(classic, { patty: ["single"], cheese: ["cheddar"] }), "missing_option");
  });

  it("rejects two choices in a single-choice group", () => {
    expectPricingError(
      () => priceProductOptions(classic, { ...DEFAULT_BURGER, patty: ["single", "double"] }),
      "too_many_choices"
    );
  });

  it("enforces a multi group's max", () => {
    const tenders = [...productMap.values()].find((p) => p.optionGroups.some((g) => g.id === "dip" && g.max === 2))!;
    const sel: Record<string, string[]> = {};
    for (const g of tenders.optionGroups) if (g.required) sel[g.id] = [g.choices[0].id];
    const dip = tenders.optionGroups.find((g) => g.id === "dip")!;
    expect(() => priceProductOptions(tenders, { ...sel, dip: dip.choices.slice(0, 2).map((c) => c.id) })).not.toThrow();
    expectPricingError(
      () => priceProductOptions(tenders, { ...sel, dip: dip.choices.slice(0, 3).map((c) => c.id) }),
      "too_many_choices"
    );
  });

  it("rejects unknown groups, unknown choices and duplicates", () => {
    expectPricingError(() => priceProductOptions(classic, { ...DEFAULT_BURGER, crust: ["thin"] }), "invalid_option");
    expectPricingError(() => priceProductOptions(classic, { ...DEFAULT_BURGER, extras: ["gold-leaf"] }), "invalid_option");
    expectPricingError(() => priceProductOptions(classic, { ...DEFAULT_BURGER, extras: ["bacon", "bacon"] }), "invalid_option");
  });
});

describe("deals and combos", () => {
  it("prices a fixed deal at the deal price", () => {
    expect(priceDeal("deal-2for1", { includes: ["deal-2for1"] }).unitPriceCents).toBe(849);
  });

  it("validates combo slots", () => {
    const ok = priceDeal("deal-burger-fries-drink", { main: ["b-classic-smash"], side: ["side"], drink: ["dr-cola"] });
    expect(ok.unitPriceCents).toBe(1199);
    expect(ok.options.map((o) => o.groupId)).toEqual(["main", "side", "drink"]);
    expectPricingError(() => priceDeal("deal-burger-fries-drink", { main: ["b-classic-smash"] }), "missing_option");
    expectPricingError(
      () => priceDeal("deal-burger-fries-drink", { main: ["dr-cola"], drink: ["dr-cola"] }),
      "invalid_option"
    );
    expectPricingError(() => priceDeal("deal-nope", {}), "unknown_deal");
  });
});

describe("promotions", () => {
  it("applies percent and flat discounts", () => {
    expect(evaluatePromotion(promo(), "TEST", 2000).discountCents).toBe(200);
    expect(evaluatePromotion(promo({ kind: "flat", value: 500 }), "TEST", 2000).discountCents).toBe(500);
  });

  it("rounds percent discounts half-up", () => {
    // 10% of 1005 = 100.5 -> 101
    expect(evaluatePromotion(promo(), "TEST", 1005).discountCents).toBe(101);
  });

  it("enforces the minimum subtotal", () => {
    const r = evaluatePromotion(promo({ minSubtotalCents: 2000 }), "TEST", 1999);
    expect(r.discountCents).toBe(0);
    expect(r.outcome).toMatchObject({ applied: false, message: "Add $0.01 more to use this code." });
    expect(evaluatePromotion(promo({ minSubtotalCents: 2000 }), "TEST", 2000).outcome.applied).toBe(true);
  });

  it("enforces max redemptions and active flag", () => {
    expect(evaluatePromotion(promo({ maxRedemptions: 3, redemptions: 3 }), "TEST", 5000).outcome.applied).toBe(false);
    expect(evaluatePromotion(promo({ maxRedemptions: 3, redemptions: 2 }), "TEST", 5000).outcome.applied).toBe(true);
    expect(evaluatePromotion(promo({ active: false }), "TEST", 5000).outcome.applied).toBe(false);
    expect(evaluatePromotion(null, "NOPE", 5000).outcome.message).toBe("That code isn't valid.");
  });

  it("caps the discount at the subtotal", () => {
    expect(evaluatePromotion(promo({ kind: "flat", value: 5000 }), "TEST", 849).discountCents).toBe(849);
    const q = priceOrder(
      { fulfillment: "pickup", locationId: "loc-downtown", items: [{ dealId: "deal-2for1", qty: 1 }], promoCode: "BIG" },
      () => promo({ code: "BIG", kind: "flat", value: 5000 })
    );
    expect(q.discountCents).toBe(q.subtotalCents);
    expect(q.taxCents).toBe(0);
    expect(q.totalCents).toBe(0);
  });
});

describe("totals", () => {
  it("rounds tax half-up on integer cents", () => {
    expect(computeTaxCents(1000)).toBe(83); // 82.5 -> 83
    expect(computeTaxCents(1200)).toBe(99); // 99.0
    expect(computeTaxCents(849)).toBe(70); // 70.0425 -> 70
    expect(computeTaxCents(0)).toBe(0);
  });

  it("charges delivery under the free threshold only", () => {
    const base = { fulfillment: "delivery" as const, promoCode: undefined };
    const small = priceOrder({ ...base, items: [{ dealId: "deal-2for1", qty: 1 }] }, () => null);
    expect(small.deliveryFeeCents).toBe(349);
    expect(small.totalCents).toBe(849 + 349 + computeTaxCents(849));
    const big = priceOrder({ ...base, items: [{ dealId: "deal-family-feast", qty: 1 }] }, () => null);
    expect(big.deliveryFeeCents).toBe(0);
  });

  it("requires a pickup location", () => {
    expectPricingError(
      () => priceOrder({ fulfillment: "pickup", items: [{ dealId: "deal-2for1", qty: 1 }] }, () => null),
      "invalid_location"
    );
  });
});
