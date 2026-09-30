import { OrderStatus, PlacedOrder } from "@/types";

const ORDERS_KEY = "ember.orders.v1";
const LATEST_KEY = "ember.orders.latest";

export function saveOrder(order: PlacedOrder): void {
  try {
    const all = getAllOrders();
    all[order.id] = order;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    localStorage.setItem(LATEST_KEY, order.id);
  } catch {
    // storage unavailable — ignore, order still returned to caller
  }
}

function isStoredOrder(value: unknown): value is PlacedOrder {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Partial<PlacedOrder>;
  return (
    typeof o.id === "string" &&
    typeof o.placedAt === "string" &&
    Array.isArray(o.items) &&
    Array.isArray(o.estimatedMinutes) &&
    typeof o.total === "number"
  );
}

export function getAllOrders(): Record<string, PlacedOrder> {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    // Skip malformed entries rather than crashing the tracker / account list.
    const orders: Record<string, PlacedOrder> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isStoredOrder(value)) orders[key] = value;
    }
    return orders;
  } catch {
    return {};
  }
}

export function getOrder(id: string): PlacedOrder | null {
  if (id === "latest") {
    const latestId = safeGet(LATEST_KEY);
    if (!latestId) return null;
    return getAllOrders()[latestId] ?? null;
  }
  return getAllOrders()[id] ?? null;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Unique id used as the storage key and in /order/[id] URLs. */
export function generateOrderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // randomUUID is only available in secure contexts (https / localhost).
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Short, human-friendly order number for display only — not guaranteed unique. */
export function generateDisplayNumber(): string {
  return `${Math.floor(10000 + Math.random() * 90000)}`;
}

/** The number to show the customer; older orders used their id as the number. */
export function orderDisplayNumber(order: PlacedOrder): string {
  return order.displayNumber ?? order.id;
}

// Fractions of the order's timeline at which each stage ends. The timeline spans
// the ETA's upper bound for both delivery and pickup, so the tracker never reports
// an order as delivered / picked up before the ETA shown to the customer has elapsed.
const PREPARING_END_FRACTION = 0.25;
const COOKING_END_FRACTION = 0.65;

/** Derives a live order status from elapsed time so the tracker progresses without a backend. */
export function deriveStatus(order: PlacedOrder): {
  status: OrderStatus;
  progress: number;
} {
  const placedAt = new Date(order.placedAt).getTime();
  const elapsedMin = (Date.now() - placedAt) / 60000;
  const [, maxEta] = order.estimatedMinutes;
  const totalSpan = maxEta;

  const preparingEnd = totalSpan * PREPARING_END_FRACTION;
  const cookingEnd = totalSpan * COOKING_END_FRACTION;
  const onTheWayEnd = totalSpan;

  if (elapsedMin >= onTheWayEnd) return { status: "delivered", progress: 100 };
  if (order.fulfillment === "pickup" && elapsedMin >= cookingEnd) {
    return { status: "ready", progress: 90 };
  }
  if (elapsedMin >= cookingEnd) return { status: "on-the-way", progress: 75 };
  if (elapsedMin >= preparingEnd) return { status: "cooking", progress: 45 };
  return { status: "preparing", progress: 15 };
}
