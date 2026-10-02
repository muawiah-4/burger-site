import { describe, expect, it } from "vitest";
import { computeTip, MAX_TIP_CENTS, parseTipChoice, parseTipDollars } from "@/lib/tip";

describe("computeTip", () => {
  it("is zero for no tip", () => {
    expect(computeTip(2599, { kind: "none" })).toBe(0);
  });

  it("applies percentages and rounds to the nearest cent", () => {
    expect(computeTip(2000, { kind: "percent", percent: 10 })).toBe(200);
    expect(computeTip(2000, { kind: "percent", percent: 15 })).toBe(300);
    expect(computeTip(2000, { kind: "percent", percent: 20 })).toBe(400);
    expect(computeTip(1999, { kind: "percent", percent: 15 })).toBe(300); // 299.85
    expect(computeTip(1233, { kind: "percent", percent: 10 })).toBe(123); // 123.3
  });

  it("returns zero for an empty or invalid subtotal", () => {
    expect(computeTip(0, { kind: "percent", percent: 20 })).toBe(0);
    expect(computeTip(-500, { kind: "percent", percent: 20 })).toBe(0);
    expect(computeTip(Number.NaN, { kind: "percent", percent: 20 })).toBe(0);
  });

  it("uses a custom amount independent of the subtotal, clamped", () => {
    expect(computeTip(1000, { kind: "custom", cents: 450 })).toBe(450);
    expect(computeTip(0, { kind: "custom", cents: 300 })).toBe(300);
    expect(computeTip(1000, { kind: "custom", cents: -50 })).toBe(0);
    expect(computeTip(1000, { kind: "custom", cents: 999_999 })).toBe(MAX_TIP_CENTS);
    expect(computeTip(1000, { kind: "custom", cents: 12.6 })).toBe(13);
  });
});

describe("parseTipDollars", () => {
  it("parses dollar strings into cents", () => {
    expect(parseTipDollars("4.50")).toBe(450);
    expect(parseTipDollars("$3")).toBe(300);
    expect(parseTipDollars(" 0.1 ")).toBe(10);
  });

  it("rejects malformed input", () => {
    expect(parseTipDollars("")).toBeNull();
    expect(parseTipDollars("abc")).toBeNull();
    expect(parseTipDollars("1.234")).toBeNull();
    expect(parseTipDollars("-2")).toBeNull();
  });
});

describe("parseTipChoice", () => {
  it("accepts valid choices and falls back to none", () => {
    expect(parseTipChoice({ kind: "percent", percent: 15 })).toEqual({ kind: "percent", percent: 15 });
    expect(parseTipChoice({ kind: "percent", percent: 50 })).toEqual({ kind: "none" });
    expect(parseTipChoice({ kind: "custom", cents: 200 })).toEqual({ kind: "custom", cents: 200 });
    expect(parseTipChoice(null)).toEqual({ kind: "none" });
    expect(parseTipChoice("15%")).toEqual({ kind: "none" });
  });
});
