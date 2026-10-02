// Display-only loyalty maths from the order history on this device.

export const POINTS_PER_DOLLAR = 10;

export const REWARD_TIERS = [
  { id: "ember", name: "Ember", min: 0 },
  { id: "flame", name: "Flame", min: 500 },
  { id: "inferno", name: "Inferno", min: 1500 },
] as const;

export type RewardTier = (typeof REWARD_TIERS)[number];

export interface RewardsSummary {
  points: number;
  tier: RewardTier;
  tierIndex: number;
  nextTier: RewardTier | null;
  /** Points still needed for the next tier (0 at the top tier). */
  toNext: number;
  /** 0–1 progress from the current tier's floor to the next tier. */
  progress: number;
}

/** 10 points per whole dollar of each order's subtotal (before fees, tax and discounts). */
export function pointsForSubtotal(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return Math.floor(subtotal) * POINTS_PER_DOLLAR;
}

export function summarizeRewards(orders: { subtotal: number }[]): RewardsSummary {
  const points = orders.reduce((sum, o) => sum + pointsForSubtotal(o.subtotal), 0);
  let tierIndex = 0;
  REWARD_TIERS.forEach((t, i) => {
    if (points >= t.min) tierIndex = i;
  });
  const tier = REWARD_TIERS[tierIndex];
  const nextTier = REWARD_TIERS[tierIndex + 1] ?? null;
  const toNext = nextTier ? nextTier.min - points : 0;
  const progress = nextTier ? (points - tier.min) / (nextTier.min - tier.min) : 1;
  return { points, tier, tierIndex, nextTier, toNext, progress };
}
