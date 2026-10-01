// Promo code evaluation, isolated in its own file: a backend agent is moving
// promo codes server-side in parallel, so these tests — and nothing else —
// should need to change (or move to an API-contract test) when that lands.
import { describe, expect, it } from "vitest";
import { evaluatePromo } from "@/lib/cart";

describe("evaluatePromo", () => {
  it("rejects an unknown code", () => {
    const result = evaluatePromo("NOTREAL", 50);
    expect(result.valid).toBe(false);
    expect(result.discount).toBe(0);
  });

  it("rejects a code below its minimum subtotal", () => {
    const result = evaluatePromo("WELCOME5", 10);
    expect(result.valid).toBe(false);
    expect(result.discount).toBe(0);
  });

  it("accepts a code once the minimum subtotal is met, case-insensitively, as a flat discount", () => {
    const result = evaluatePromo("welcome5", 20);
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(5);
  });
});
