import { describe, expect, it } from "vitest";
import { ORDER_RETENTION_DAYS, parseStoredOrder, parseStoredOrders } from "@/lib/orders";

function rawOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    items: [
      {
        cartItemId: "c1",
        productId: "b-classic-smash",
        slug: "classic-smash-burger",
        name: "Classic Smash Burger",
        image: "/burgers/classic.jpg",
        category: "burgers",
        basePrice: 8.49,
        unitPrice: 8.49,
        quantity: 1,
        selectedOptions: [],
      },
    ],
    fulfillment: "pickup",
    pickupLocationId: "loc-1",
    payment: "card",
    subtotal: 8.49,
    deliveryFee: 0,
    discount: 0,
    tax: 0.7,
    total: 9.19,
    placedAt: new Date().toISOString(),
    estimatedMinutes: [15, 25],
    ...overrides,
  };
}

describe("parseStoredOrder: PII scrub", () => {
  it("keeps only city + ZIP from a delivery address, dropping name/phone/street", () => {
    const order = parseStoredOrder(
      rawOrder({
        fulfillment: "delivery",
        pickupLocationId: undefined,
        address: {
          name: "Jane Doe",
          phone: "555-123-4567",
          line1: "123 Main St",
          city: "Austin",
          zip: "78701",
        },
      })
    );
    expect(order?.deliveryArea).toEqual({ city: "Austin", zip: "78701" });
    expect(JSON.stringify(order)).not.toContain("Jane Doe");
    expect(JSON.stringify(order)).not.toContain("555-123-4567");
    expect(JSON.stringify(order)).not.toContain("123 Main St");
  });

  it("drops fields outside the allowlist entirely (e.g. a saved customer block)", () => {
    const order = parseStoredOrder(
      rawOrder({ customer: { name: "Jane Doe", email: "jane@example.com" } })
    );
    expect(order).not.toBeNull();
    expect(order).not.toHaveProperty("customer");
  });
});

describe("parseStoredOrders: retention", () => {
  it("drops an order older than the retention window", () => {
    const now = Date.now();
    const old = new Date(now - (ORDER_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    const fresh = new Date(now).toISOString();
    const raw = JSON.stringify({
      stale: rawOrder({ id: "stale", placedAt: old }),
      current: rawOrder({ id: "current", placedAt: fresh }),
    });

    const result = parseStoredOrders(raw, now);
    expect(Object.keys(result)).toEqual(["current"]);
  });
});
