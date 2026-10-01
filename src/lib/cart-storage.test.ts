import { describe, expect, it } from "vitest";
import { parseStoredCart } from "@/lib/cart-storage";

describe("parseStoredCart", () => {
  it("drops malformed input instead of throwing", () => {
    expect(parseStoredCart("not json")).toEqual({
      items: [],
      fulfillment: "delivery",
      pickupLocationId: null,
      promoCode: "",
    });

    // a line missing required fields (quantity, selectedOptions) is dropped,
    // not just the whole cart
    const raw = JSON.stringify({ items: [{ cartItemId: "c1", productId: "b-classic-smash" }] });
    expect(parseStoredCart(raw).items).toEqual([]);
  });

  it("re-prices a known product from the menu instead of trusting the stored unitPrice", () => {
    const raw = JSON.stringify({
      items: [
        {
          cartItemId: "c1",
          productId: "b-classic-smash",
          quantity: 1,
          unitPrice: 999, // stale/tampered — must be ignored
          selectedOptions: [
            { groupId: "patty", groupLabel: "Patty", choiceIds: ["double"], choiceLabels: ["Double Patty"], priceDelta: 999 },
            { groupId: "cheese", groupLabel: "Cheese", choiceIds: ["cheddar"], choiceLabels: ["Classic Cheddar"], priceDelta: 0 },
            { groupId: "sauce", groupLabel: "Sauce", choiceIds: ["signature"], choiceLabels: ["Signature Sauce"], priceDelta: 0 },
          ],
        },
      ],
    });

    const { items } = parseStoredCart(raw);
    expect(items).toHaveLength(1);
    // base 8.49 + double patty's real 2.5 delta, not the tampered 999
    expect(items[0].unitPrice).toBe(10.99);
  });
});
