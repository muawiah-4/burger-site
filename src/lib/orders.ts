import { CartItem, CategoryId, DeliveryArea, OrderStatus, PaymentMethod, PlacedOrder } from "@/types";
import { isFiniteNonNegative, isRecord, isRenderableImage, parseSelectedOption } from "@/lib/cart-storage";
import { MAX_ITEM_QUANTITY } from "@/lib/cart";

export const ORDERS_KEY = "ember.orders.v1";
export const LATEST_KEY = "ember.orders.latest";

/** Retention for order history kept on this device. */
export const MAX_STORED_ORDERS = 20;
export const ORDER_RETENTION_DAYS = 30;
const ORDER_RETENTION_MS = ORDER_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const MAX_TEXT = 120;
const MAX_ITEMS_PER_ORDER = 50;
const ORDER_ID_RE = /^[A-Za-z0-9-]{1,64}$/;
const CATEGORIES: readonly CategoryId[] = [
  "burgers",
  "pizza",
  "chicken",
  "wraps",
  "sandwiches",
  "sides",
  "desserts",
  "drinks",
];
const PAYMENT_METHODS: readonly PaymentMethod[] = ["card", "cash", "wallet"];

function isShortText(value: unknown, max = MAX_TEXT): value is string {
  return typeof value === "string" && value.length <= max;
}

function isMoney(value: unknown): value is number {
  return isFiniteNonNegative(value) && value < 100_000;
}

/** Validates one saved order line. Unlike the cart, it keeps the price paid rather than re-pricing. */
function parseOrderItem(value: unknown): CartItem | null {
  if (!isRecord(value)) return null;
  const { cartItemId, productId, slug, name, image, category, basePrice, unitPrice, quantity, selectedOptions } = value;
  if (!isShortText(cartItemId) || !isShortText(productId) || !isShortText(slug) || !isShortText(name)) return null;
  if (!isRenderableImage(image) || image.length > 500) return null;
  if (!CATEGORIES.includes(category as CategoryId)) return null;
  if (!isMoney(basePrice) || !isMoney(unitPrice)) return null;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
    return null;
  }
  if (!Array.isArray(selectedOptions) || selectedOptions.length > 20) return null;
  const options = selectedOptions.map(parseSelectedOption);
  if (options.some((o) => o === null)) return null;
  return {
    cartItemId,
    productId,
    slug,
    name,
    image,
    category: category as CategoryId,
    basePrice,
    unitPrice,
    quantity,
    selectedOptions: options as CartItem["selectedOptions"],
  };
}

function parseDeliveryArea(value: unknown): DeliveryArea | undefined {
  // Older orders stored the full address as `address`; keep only city + ZIP from it.
  if (!isRecord(value)) return undefined;
  const { city, zip } = value;
  if (!isShortText(city, 60) || typeof zip !== "string" || !/^\d{5}(-\d{4})?$/.test(zip.trim())) return undefined;
  return { city: city.trim(), zip: zip.trim().slice(0, 5) };
}

/**
 * Rebuilds a saved order from untrusted JSON, copying only allowlisted fields.
 * Anything else (including the customer/address PII older versions saved) is dropped.
 */
export function parseStoredOrder(value: unknown): PlacedOrder | null {
  if (!isRecord(value)) return null;
  const { id, displayNumber, items, fulfillment, pickupLocationId, payment, promoCode, placedAt, estimatedMinutes } =
    value;
  if (typeof id !== "string" || !ORDER_ID_RE.test(id)) return null;
  if (fulfillment !== "delivery" && fulfillment !== "pickup") return null;
  if (!PAYMENT_METHODS.includes(payment as PaymentMethod)) return null;
  if (typeof placedAt !== "string" || Number.isNaN(Date.parse(placedAt))) return null;
  if (
    !Array.isArray(estimatedMinutes) ||
    estimatedMinutes.length !== 2 ||
    !estimatedMinutes.every((m) => Number.isInteger(m) && m > 0 && m <= 240) ||
    estimatedMinutes[0] > estimatedMinutes[1]
  ) {
    return null;
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS_PER_ORDER) return null;
  const parsedItems = items.map(parseOrderItem);
  if (parsedItems.some((i) => i === null)) return null;

  const { subtotal, deliveryFee, discount, tax, total } = value;
  if (![subtotal, deliveryFee, discount, tax, total].every(isMoney)) return null;

  const order: PlacedOrder = {
    id,
    items: parsedItems as CartItem[],
    fulfillment,
    payment: payment as PaymentMethod,
    subtotal: subtotal as number,
    deliveryFee: deliveryFee as number,
    discount: discount as number,
    tax: tax as number,
    total: total as number,
    placedAt: new Date(placedAt).toISOString(),
    estimatedMinutes: [estimatedMinutes[0], estimatedMinutes[1]],
  };
  if (typeof displayNumber === "string" && /^\d{1,8}$/.test(displayNumber)) order.displayNumber = displayNumber;
  if (typeof promoCode === "string" && /^[A-Z0-9]{1,20}$/.test(promoCode)) order.promoCode = promoCode;
  if (fulfillment === "pickup" && isShortText(pickupLocationId, 64)) order.pickupLocationId = pickupLocationId;
  if (fulfillment === "delivery") {
    const area = parseDeliveryArea(value.deliveryArea) ?? parseDeliveryArea(value.address);
    if (area) order.deliveryArea = area;
  }
  return order;
}

/** Validates, scrubs and applies retention (newest {@link MAX_STORED_ORDERS}, max {@link ORDER_RETENTION_DAYS} days old). */
export function parseStoredOrders(raw: string | null, now = Date.now()): Record<string, PlacedOrder> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};
  const valid = Object.values(parsed)
    .map(parseStoredOrder)
    .filter((o): o is PlacedOrder => {
      if (!o) return false;
      const age = now - Date.parse(o.placedAt);
      // Allow a little clock skew into the future, nothing more.
      return age <= ORDER_RETENTION_MS && age >= -60 * 60 * 1000;
    })
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt))
    .slice(0, MAX_STORED_ORDERS);
  const out: Record<string, PlacedOrder> = {};
  for (const order of valid) out[order.id] = order;
  return out;
}

function writeOrders(orders: Record<string, PlacedOrder>) {
  if (Object.keys(orders).length === 0) {
    localStorage.removeItem(ORDERS_KEY);
    localStorage.removeItem(LATEST_KEY);
    return;
  }
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  const latest = localStorage.getItem(LATEST_KEY);
  if (latest && !orders[latest]) localStorage.removeItem(LATEST_KEY);
}

export function saveOrder(order: PlacedOrder): void {
  try {
    const clean = parseStoredOrder(order);
    if (!clean) return;
    const all = { ...getAllOrders(), [clean.id]: clean };
    writeOrders(parseStoredOrders(JSON.stringify(all)));
    localStorage.setItem(LATEST_KEY, clean.id);
  } catch {
    // storage unavailable — ignore, order still returned to caller
  }
}

/**
 * Loads saved orders. Malformed, expired and surplus orders are dropped and, if
 * anything changed (including PII scrubbed from older orders), storage is rewritten.
 */
export function getAllOrders(): Record<string, PlacedOrder> {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const orders = parseStoredOrders(raw);
    if (raw !== null && JSON.stringify(orders) !== raw) writeOrders(orders);
    return orders;
  } catch {
    return {};
  }
}

export function getOrder(id: string): PlacedOrder | null {
  const orders = getAllOrders();
  if (id === "latest") {
    const latestId = safeGet(LATEST_KEY);
    return latestId ? orders[latestId] ?? null : null;
  }
  return orders[id] ?? null;
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
