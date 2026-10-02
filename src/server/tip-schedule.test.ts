import { describe, expect, it } from "vitest";
import { priceOrder, PricingError } from "./pricing";

// San Francisco wall-clock times (PDT, UTC-7); locations[0] is open 10 AM – 12 AM there.
const laTime = (h: number, m: number) =>
  new Date(`2026-10-01T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-07:00`);
const NOON = laTime(12, 0);
const at = (h: number, m: number) => laTime(h, m).toISOString();
const delivery = { fulfillment: "delivery" as const, items: [{ dealId: "deal-2for1", qty: 2 }] };

function expectInvalidSchedule(scheduledFor: string) {
  expect(() => priceOrder({ ...delivery, scheduledFor }, () => null, NOON)).toThrow(PricingError);
  try {
    priceOrder({ ...delivery, scheduledFor }, () => null, NOON);
  } catch (err) {
    expect((err as PricingError).code).toBe("invalid_schedule");
  }
}

describe("server tip", () => {
  it("adds the server-computed tip to the total, untaxed", () => {
    const none = priceOrder(delivery, () => null, NOON);
    const tipped = priceOrder({ ...delivery, tip: { kind: "percent", percent: 15 } }, () => null, NOON);
    // 15% of 1698 = 254.7 -> 255
    expect(tipped.tipCents).toBe(255);
    expect(tipped.taxCents).toBe(none.taxCents);
    expect(tipped.totalCents).toBe(none.totalCents + 255);
    expect(priceOrder({ ...delivery, tip: { kind: "custom", cents: 400 } }, () => null, NOON).tipCents).toBe(400);
  });

  it("is delivery only", () => {
    const pickup = priceOrder(
      { ...delivery, fulfillment: "pickup", locationId: "loc-downtown", tip: { kind: "percent", percent: 20 } },
      () => null,
      NOON
    );
    expect(pickup.tipCents).toBe(0);
  });
});

describe("server schedule validation", () => {
  it("accepts today's 15-minute slots at least 30 minutes ahead", () => {
    expect(priceOrder({ ...delivery, scheduledFor: at(13, 0) }, () => null, NOON).scheduledFor).toBe(at(13, 0));
    expect(priceOrder(delivery, () => null, NOON).scheduledFor).toBeNull();
  });

  it("rejects too-soon, off-grid and out-of-hours times", () => {
    expectInvalidSchedule(at(12, 15));
    expectInvalidSchedule(at(13, 7));
    expectInvalidSchedule(at(9, 0));
  });
});
