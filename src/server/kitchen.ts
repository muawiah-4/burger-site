import "server-only";
import type { FulfillmentMethod, OrderStatus } from "@/types";

/**
 * Order state machine plus a deterministic "simulated kitchen".
 *
 * There is no real kitchen, so when an order is read the server advances its
 * stored status to wherever a fixed schedule says it should be by now:
 * cooking at 25% of the ETA's upper bound, out for delivery / ready at 65%,
 * delivered / picked up at 100%. The result is persisted with an event per step,
 * so the status is authoritative on the server and never moves backwards. The
 * admin endpoint can push an order forward ahead of the schedule.
 */

export const STAGES: Record<FulfillmentMethod, readonly OrderStatus[]> = {
  delivery: ["preparing", "cooking", "on-the-way", "delivered"],
  pickup: ["preparing", "cooking", "ready", "delivered"],
};

/** Fraction of eta_max at which each stage (by index) begins. */
const STAGE_START_FRACTION = [0, 0.25, 0.65, 1];

export function stageIndex(fulfillment: FulfillmentMethod, status: OrderStatus): number {
  return STAGES[fulfillment].indexOf(status);
}

/** The only valid transition is to the next stage for the order's fulfillment. */
export function isValidTransition(fulfillment: FulfillmentMethod, from: OrderStatus, to: OrderStatus): boolean {
  const i = stageIndex(fulfillment, from);
  return i >= 0 && stageIndex(fulfillment, to) === i + 1;
}

/** When each stage is scheduled to begin, in ms since the epoch. */
export function schedule(
  fulfillment: FulfillmentMethod,
  createdAtMs: number,
  etaMaxMin: number
): { status: OrderStatus; atMs: number }[] {
  return STAGES[fulfillment].map((status, i) => ({
    status,
    atMs: createdAtMs + Math.round(STAGE_START_FRACTION[i] * etaMaxMin * 60_000),
  }));
}

/**
 * The steps the simulation should apply now: every stage after `current` whose
 * scheduled start has passed. Pure and deterministic for a given `nowMs`.
 */
export function pendingSimulatedSteps(
  fulfillment: FulfillmentMethod,
  current: OrderStatus,
  createdAtMs: number,
  etaMaxMin: number,
  nowMs: number
): { status: OrderStatus; atMs: number }[] {
  const from = stageIndex(fulfillment, current);
  return schedule(fulfillment, createdAtMs, etaMaxMin).filter((s, i) => i > from && s.atMs <= nowMs);
}

export function kitchenSimulationEnabled(): boolean {
  return process.env.KITCHEN_SIMULATION !== "off";
}
