import { describe, expect, it } from "vitest";
import { Product } from "@/types";
import {
  DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  SelectionState,
  computeTotals,
  computeUnitPrice,
  isSelectionComplete,
  selectionKey,
} from "@/lib/cart";
import { CartItem } from "@/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    slug: "test-product",
    name: "Test Product",
    category: "burgers",
    description: "a product",
    price: 10,
    image: "/test.jpg",
    rating: 5,
    reviewCount: 1,
    allergens: [],
    calories: 500,
    ingredients: [],
    optionGroups: [
      {
        id: "size",
        label: "Size",
        type: "single",
        required: true,
        choices: [
          { id: "small", label: "Small", priceDelta: 0, default: true },
          { id: "large", label: "Large", priceDelta: 2 },
        ],
      },
      {
        id: "extras",
        label: "Extras",
        type: "multi",
        choices: [
          { id: "bacon", label: "Bacon", priceDelta: 1.5 },
          { id: "cheese", label: "Cheese", priceDelta: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

function cartItem(unitPrice: number, quantity: number): CartItem {
  return {
    cartItemId: `${unitPrice}-${quantity}-${Math.random()}`,
    productId: "p-1",
    slug: "test-product",
    name: "Test Product",
    image: "/test.jpg",
    category: "burgers",
    basePrice: unitPrice,
    unitPrice,
    quantity,
    selectedOptions: [],
  };
}

describe("computeUnitPrice", () => {
  it("adds the priceDelta of each selected choice across groups to the base price", () => {
    const selection: SelectionState = { size: ["large"], extras: ["bacon", "cheese"] };
    expect(computeUnitPrice(product(), selection)).toBe(10 + 2 + 1.5 + 1);
  });
});

describe("selectionKey", () => {
  it("is independent of group and choice ordering", () => {
    const a = selectionKey("p-1", { size: ["large"], extras: ["bacon", "cheese"] });
    const b = selectionKey("p-1", { extras: ["cheese", "bacon"], size: ["large"] });
    expect(a).toBe(b);
  });
});

describe("isSelectionComplete", () => {
  it("is false when a required group has no selection, true once it does", () => {
    expect(isSelectionComplete(product(), { extras: ["bacon"] })).toBe(false);
    expect(isSelectionComplete(product(), { size: ["small"] })).toBe(true);
  });
});

describe("computeTotals", () => {
  it("charges the delivery fee below the free-delivery threshold and waives it at/above it", () => {
    expect(computeTotals([cartItem(20, 1)], "delivery", 0).deliveryFee).toBe(DELIVERY_FEE);
    expect(computeTotals([cartItem(FREE_DELIVERY_THRESHOLD, 1)], "delivery", 0).deliveryFee).toBe(0);
  });

  it("caps the discount at the subtotal instead of taxing or totaling negative", () => {
    const totals = computeTotals([cartItem(10, 1)], "pickup", 50);
    expect(totals.discount).toBe(10);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(0);
  });
});
