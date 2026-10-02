import "server-only";
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { FulfillmentMethod, OrderStatus, PaymentMethod } from "@/types";
import type { CreateOrderResponse, OrderDto, PricedLine, PricedOption, Quote } from "@/lib/api-types";
import { getDb, purgeExpiredOrders, runInTransaction, type Db } from "./db";
import { priceOrder, type PromoLookup, type PromoRecord } from "./pricing";
import { isValidTransition, kitchenSimulationEnabled, pendingSimulatedSteps } from "./kitchen";
import type { CreateOrderInput, QuoteRequestInput } from "./schemas";
import { productMap } from "@/lib/data/products";
import { deals } from "@/lib/data/deals";

/** Images aren't stored; resolve them from the menu (a combo shows its chosen main). */
function imageFor(productId: string | null, dealId: string | null, options: PricedOption[]): string {
  if (productId) return productMap.get(productId)?.image ?? "";
  const main = options.find((o) => o.groupId === "main")?.choiceIds[0];
  return (main && productMap.get(main)?.image) || deals.find((d) => d.id === dealId)?.image || "";
}

// ---------------------------------------------------------------- promotions

interface PromoRow {
  code: string;
  kind: "pct" | "flat";
  value: number;
  min_subtotal_cents: number;
  max_redemptions: number | null;
  active: number;
  description: string;
  redemptions: number;
}

export function promoLookup(db: Db): PromoLookup {
  const stmt = db.prepare(
    `SELECT p.*, (SELECT COUNT(*) FROM promotion_redemptions r WHERE r.code = p.code) AS redemptions
     FROM promotions p WHERE p.code = ?`
  );
  return (code) => {
    const row = stmt.get(code) as PromoRow | undefined;
    if (!row) return null;
    const promo: PromoRecord = {
      code: row.code,
      kind: row.kind,
      value: row.value,
      minSubtotalCents: row.min_subtotal_cents,
      maxRedemptions: row.max_redemptions,
      active: row.active === 1,
      description: row.description,
      redemptions: Number(row.redemptions),
    };
    return promo;
  };
}

export function quote(input: QuoteRequestInput, db = getDb()): Quote {
  return priceOrder(input, promoLookup(db));
}

// ---------------------------------------------------------------- create

/** Stable JSON (sorted keys) so the same logical body always hashes the same. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashRequest(input: CreateOrderInput): string {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

export type CreateOrderResult =
  | { kind: "created"; response: CreateOrderResponse }
  | { kind: "replayed"; response: CreateOrderResponse }
  | { kind: "key_reused" }
  | { kind: "total_mismatch"; quote: Quote };

interface IdemRow {
  id: string;
  display_number: string;
  tracking_token: string;
  request_hash: string;
}

let createsSincePurge = 0;

/**
 * Prices and stores an order in one write transaction. The idempotency check,
 * promo redemption limit and inserts all happen under the same lock, so retries
 * and concurrent submits can't double-create or over-redeem.
 */
export function createOrder(
  input: CreateOrderInput,
  idempotencyKey: string,
  db = getDb(),
  now = new Date()
): CreateOrderResult {
  const requestHash = hashRequest(input);
  const findByKey = db.prepare(
    "SELECT id, display_number, tracking_token, request_hash FROM orders WHERE idempotency_key = ?"
  );

  const result = runInTransaction(db, (): CreateOrderResult => {
    const existing = findByKey.get(idempotencyKey) as IdemRow | undefined;
    if (existing) {
      if (existing.request_hash !== requestHash) return { kind: "key_reused" };
      return {
        kind: "replayed",
        response: {
          orderId: existing.id,
          displayNumber: existing.display_number,
          trackingToken: existing.tracking_token,
        },
      };
    }

    const priced = priceOrder(input, promoLookup(db), now);
    if (priced.totalCents !== input.expectedTotalCents) return { kind: "total_mismatch", quote: priced };

    const orderId = randomUUID();
    const displayNumber = String(randomInt(10000, 100000));
    const trackingToken = randomBytes(32).toString("base64url");
    const createdAt = now.toISOString();
    const promoCode = priced.promo?.applied ? priced.promo.code : null;

    db.prepare(
      `INSERT INTO orders (id, display_number, created_at, updated_at, fulfillment, location_id, city, zip,
         payment_method, status, subtotal_cents, delivery_fee_cents, discount_cents, tax_cents, total_cents,
         promo_code, eta_min, eta_max, tracking_token, idempotency_key, request_hash, tip_cents, scheduled_for)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'preparing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      orderId,
      displayNumber,
      createdAt,
      createdAt,
      priced.fulfillment,
      priced.locationId,
      input.fulfillment === "delivery" ? input.deliveryArea!.city : null,
      input.fulfillment === "delivery" ? input.deliveryArea!.zip : null,
      input.paymentMethod,
      priced.subtotalCents,
      priced.deliveryFeeCents,
      priced.discountCents,
      priced.taxCents,
      priced.totalCents,
      promoCode,
      priced.eta.min,
      priced.eta.max,
      trackingToken,
      idempotencyKey,
      requestHash,
      priced.tipCents,
      priced.scheduledFor
    );

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, position, product_id, deal_id, name, qty, unit_price_cents, options_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    priced.lines.forEach((line, i) =>
      insertItem.run(
        orderId,
        i,
        line.productId,
        line.dealId,
        line.name,
        line.qty,
        line.unitPriceCents,
        JSON.stringify(line.options)
      )
    );

    if (promoCode) {
      db.prepare(
        "INSERT INTO promotion_redemptions (code, order_id, discount_cents, redeemed_at) VALUES (?, ?, ?, ?)"
      ).run(promoCode, orderId, priced.discountCents, createdAt);
    }
    db.prepare("INSERT INTO order_events (order_id, status, at, source) VALUES (?, 'preparing', ?, 'order')").run(
      orderId,
      createdAt
    );

    return { kind: "created", response: { orderId, displayNumber, trackingToken } };
  });

  if (result.kind === "created" && ++createsSincePurge >= 100) {
    createsSincePurge = 0;
    purgeExpiredOrders(db);
  }
  return result;
}

// ---------------------------------------------------------------- read

interface OrderRow {
  id: string;
  display_number: string;
  created_at: string;
  fulfillment: FulfillmentMethod;
  location_id: string | null;
  city: string | null;
  zip: string | null;
  payment_method: PaymentMethod;
  status: OrderStatus;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  promo_code: string | null;
  eta_min: number;
  eta_max: number;
  tracking_token: string;
  tip_cents: number;
  scheduled_for: string | null;
}

interface ItemRow {
  product_id: string | null;
  deal_id: string | null;
  name: string;
  qty: number;
  unit_price_cents: number;
  options_json: string;
}

function tokensMatch(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * When the simulated kitchen starts on an order. ASAP orders start when placed.
 * A scheduled order starts one full ETA (prep + delivery/pickup window) before its
 * slot, so it's delivered / ready at the chosen time, but never before it was placed.
 */
export function kitchenStartMs(row: { created_at: string; scheduled_for: string | null; eta_max: number }): number {
  const created = Date.parse(row.created_at);
  if (!row.scheduled_for) return created;
  return Math.max(created, Date.parse(row.scheduled_for) - row.eta_max * 60_000);
}

/** Applies the simulated kitchen's due steps (if any) and returns the current status. */
function advanceBySimulation(db: Db, row: OrderRow, nowMs: number): OrderStatus {
  if (!kitchenSimulationEnabled()) return row.status;
  const steps = pendingSimulatedSteps(row.fulfillment, row.status, kitchenStartMs(row), row.eta_max, nowMs);
  if (steps.length === 0) return row.status;
  return runInTransaction(db, () => {
    // Re-read under the lock: another request may have advanced it already.
    const fresh = db.prepare("SELECT status FROM orders WHERE id = ?").get(row.id) as { status: OrderStatus };
    const due = pendingSimulatedSteps(row.fulfillment, fresh.status, kitchenStartMs(row), row.eta_max, nowMs);
    if (due.length === 0) return fresh.status;
    const last = db.prepare("SELECT at FROM order_events WHERE order_id = ? ORDER BY id DESC LIMIT 1").get(row.id) as
      | { at: string }
      | undefined;
    let floor = last ? Date.parse(last.at) : 0;
    const insert = db.prepare("INSERT INTO order_events (order_id, status, at, source) VALUES (?, ?, ?, 'kitchen-sim')");
    for (const step of due) {
      floor = Math.max(floor, step.atMs);
      insert.run(row.id, step.status, new Date(floor).toISOString());
    }
    const final = due[due.length - 1].status;
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(final, new Date(nowMs).toISOString(), row.id);
    return final;
  });
}

function toDto(db: Db, row: OrderRow, status: OrderStatus): OrderDto {
  const items = db
    .prepare(
      "SELECT product_id, deal_id, name, qty, unit_price_cents, options_json FROM order_items WHERE order_id = ? ORDER BY position"
    )
    .all(row.id) as unknown as ItemRow[];
  const history = db
    .prepare("SELECT status, at FROM order_events WHERE order_id = ? ORDER BY id")
    .all(row.id) as unknown as { status: OrderStatus; at: string }[];
  return {
    id: row.id,
    displayNumber: row.display_number,
    createdAt: row.created_at,
    fulfillment: row.fulfillment,
    locationId: row.location_id,
    deliveryArea: row.city && row.zip ? { city: row.city, zip: row.zip } : null,
    paymentMethod: row.payment_method,
    status,
    history: history.map((h) => ({ status: h.status, at: h.at })),
    items: items.map((it): PricedLine => {
      const options = JSON.parse(it.options_json) as PricedOption[];
      return {
        productId: it.product_id,
        dealId: it.deal_id,
        name: it.name,
        image: imageFor(it.product_id, it.deal_id, options),
        qty: it.qty,
        unitPriceCents: it.unit_price_cents,
        lineTotalCents: it.unit_price_cents * it.qty,
        options,
      };
    }),
    subtotalCents: row.subtotal_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    discountCents: row.discount_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    promoCode: row.promo_code,
    tipCents: row.tip_cents,
    scheduledFor: row.scheduled_for,
    eta: { min: row.eta_min, max: row.eta_max },
  };
}

function loadRow(db: Db, id: string): OrderRow | undefined {
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
}

export type GetOrderResult = { kind: "ok"; order: OrderDto } | { kind: "not_found" } | { kind: "forbidden" };

export function getOrderForCustomer(id: string, token: string, db = getDb(), nowMs = Date.now()): GetOrderResult {
  const row = loadRow(db, id);
  if (!row) return { kind: "not_found" };
  if (!tokensMatch(row.tracking_token, token)) return { kind: "forbidden" };
  const status = advanceBySimulation(db, row, nowMs);
  return { kind: "ok", order: toDto(db, row, status) };
}

export type AdvanceResult =
  | { kind: "ok"; order: OrderDto }
  | { kind: "not_found" }
  | { kind: "invalid_transition"; from: OrderStatus };

/** Admin ("kitchen") control: moves an order to the next stage only. */
export function adminSetStatus(id: string, to: OrderStatus, db = getDb(), nowMs = Date.now()): AdvanceResult {
  const row = loadRow(db, id);
  if (!row) return { kind: "not_found" };
  advanceBySimulation(db, row, nowMs);
  const outcome = runInTransaction(db, (): AdvanceResult | null => {
    const fresh = db.prepare("SELECT status FROM orders WHERE id = ?").get(id) as { status: OrderStatus };
    if (!isValidTransition(row.fulfillment, fresh.status, to)) return { kind: "invalid_transition", from: fresh.status };
    const at = new Date(nowMs).toISOString();
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(to, at, id);
    db.prepare("INSERT INTO order_events (order_id, status, at, source) VALUES (?, ?, ?, 'admin')").run(id, to, at);
    return null;
  });
  if (outcome) return outcome;
  return { kind: "ok", order: toDto(db, row, to) };
}
