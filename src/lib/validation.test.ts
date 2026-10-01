import { describe, expect, it } from "vitest";
import {
  isValidCardNumber,
  isValidEmail,
  isValidExpiry,
  isValidPhone,
  isValidZip,
} from "@/lib/validation";

describe("isValidExpiry", () => {
  it("accepts the current month as not yet expired", () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear() % 100).padStart(2, "0");
    expect(isValidExpiry(`${mm}/${yy}`)).toBe(true);
  });

  it("rejects a card that rolled over into last month", () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mm = String(lastMonth.getMonth() + 1).padStart(2, "0");
    const yy = String(lastMonth.getFullYear() % 100).padStart(2, "0");
    expect(isValidExpiry(`${mm}/${yy}`)).toBe(false);
  });

  it("rejects an out-of-range month", () => {
    expect(isValidExpiry("13/30")).toBe(false);
  });
});

describe("isValidCardNumber", () => {
  it("accepts 15-16 digits, ignoring spaces, and rejects too few", () => {
    expect(isValidCardNumber("4242 4242 4242 4242")).toBe(true);
    expect(isValidCardNumber("1234")).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("accepts a normal address and rejects one with no domain", () => {
    expect(isValidEmail("person@example.com")).toBe(true);
    expect(isValidEmail("person@")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts a plausible phone number and rejects a too-short one", () => {
    expect(isValidPhone("(555) 123-4567")).toBe(true);
    expect(isValidPhone("555")).toBe(false);
  });
});

describe("isValidZip", () => {
  it("accepts a 5-digit ZIP and a ZIP+4, rejecting non-numeric input", () => {
    expect(isValidZip("90210")).toBe(true);
    expect(isValidZip("90210-1234")).toBe(true);
    expect(isValidZip("ABCDE")).toBe(false);
  });
});
