// Driver tip maths, kept pure and separate from computeTotals so pricing can
// adopt it later. All amounts are integer cents.

export const TIP_PERCENTS = [10, 15, 20] as const;
export type TipPercent = (typeof TIP_PERCENTS)[number];

export type TipChoice =
  | { kind: "none" }
  | { kind: "percent"; percent: TipPercent }
  | { kind: "custom"; cents: number };

/** Upper bound for a custom tip ($100), so a typo can't add a huge amount. */
export const MAX_TIP_CENTS = 10_000;

export const NO_TIP: TipChoice = { kind: "none" };

/** Tip in cents for a subtotal in cents. Never negative; percentages round to the nearest cent. */
export function computeTip(subtotalCents: number, choice: TipChoice): number {
  switch (choice.kind) {
    case "percent": {
      if (!Number.isFinite(subtotalCents) || subtotalCents <= 0) return 0;
      return Math.round((subtotalCents * choice.percent) / 100);
    }
    case "custom": {
      if (!Number.isFinite(choice.cents) || choice.cents <= 0) return 0;
      return Math.min(Math.round(choice.cents), MAX_TIP_CENTS);
    }
    default:
      return 0;
  }
}

/** Parses a "12.50"-style dollar string into cents; null when it isn't a valid amount. */
export function parseTipDollars(input: string): number | null {
  const trimmed = input.trim().replace(/^\$/, "");
  if (!/^\d{0,4}(\.\d{0,2})?$/.test(trimmed) || trimmed === "" || trimmed === ".") return null;
  return Math.round(parseFloat(trimmed) * 100);
}

/** Validates an untrusted value (e.g. a restored draft) into a TipChoice. */
export function parseTipChoice(value: unknown): TipChoice {
  if (typeof value !== "object" || value === null) return NO_TIP;
  const v = value as Record<string, unknown>;
  if (v.kind === "percent" && TIP_PERCENTS.includes(v.percent as TipPercent)) {
    return { kind: "percent", percent: v.percent as TipPercent };
  }
  if (v.kind === "custom" && typeof v.cents === "number" && Number.isFinite(v.cents) && v.cents >= 0) {
    return { kind: "custom", cents: Math.min(Math.round(v.cents), MAX_TIP_CENTS) };
  }
  return NO_TIP;
}
