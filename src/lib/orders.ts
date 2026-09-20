import { PlacedOrder } from "@/types";

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

export function getAllOrders(): Record<string, PlacedOrder> {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlacedOrder>) : {};
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

export function generateOrderId(): string {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `${n}`;
}

/** Derives a live order status from elapsed time so the tracker progresses without a backend. */
export function deriveStatus(order: PlacedOrder): {
  status: "preparing" | "cooking" | "on-the-way" | "ready" | "delivered";
  progress: number;
} {
  const placedAt = new Date(order.placedAt).getTime();
  const elapsedMin = (Date.now() - placedAt) / 60000;
  const [minEta] = order.estimatedMinutes;
  const totalSpan = order.fulfillment === "delivery" ? minEta : Math.max(minEta - 5, 6);

  const preparingEnd = totalSpan * 0.25;
  const cookingEnd = totalSpan * 0.65;
  const onTheWayEnd = totalSpan;

  if (elapsedMin >= onTheWayEnd) return { status: "delivered", progress: 100 };
  if (order.fulfillment === "pickup" && elapsedMin >= cookingEnd) {
    return { status: "ready", progress: 90 };
  }
  if (elapsedMin >= cookingEnd) return { status: "on-the-way", progress: 75 };
  if (elapsedMin >= preparingEnd) return { status: "cooking", progress: 45 };
  return { status: "preparing", progress: 15 };
}
