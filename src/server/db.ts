import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * SQLite persistence via Node's built-in `node:sqlite` (synchronous API, no native
 * addon to build). One connection per server process, reused across requests and
 * hot reloads through `globalThis`.
 *
 * The file lives at ./data/ember.db unless EMBER_DB_PATH says otherwise
 * (":memory:" is used by the tests).
 */

export type Db = DatabaseSync;

/** Orders older than this are deleted (matches the 30-day order retention in SECURITY.md). */
export const ORDER_RETENTION_DAYS = 30;

const MIGRATIONS: string[] = [
  // v1: initial schema. Money is always integer cents. No customer PII beyond city + ZIP.
  `
  CREATE TABLE promotions (
    code                TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 1 AND 20),
    kind                TEXT NOT NULL CHECK (kind IN ('pct', 'flat')),
    value               INTEGER NOT NULL CHECK (value > 0),
    min_subtotal_cents  INTEGER NOT NULL DEFAULT 0 CHECK (min_subtotal_cents >= 0),
    max_redemptions     INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    active              INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    description         TEXT NOT NULL,
    CHECK (kind <> 'pct' OR value <= 100)
  );

  CREATE TABLE orders (
    id                  TEXT PRIMARY KEY,
    display_number      TEXT NOT NULL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    fulfillment         TEXT NOT NULL CHECK (fulfillment IN ('delivery', 'pickup')),
    location_id         TEXT,
    city                TEXT,
    zip                 TEXT,
    payment_method      TEXT NOT NULL CHECK (payment_method IN ('card', 'cash', 'wallet')),
    status              TEXT NOT NULL CHECK (status IN ('preparing', 'cooking', 'on-the-way', 'ready', 'delivered')),
    subtotal_cents      INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    delivery_fee_cents  INTEGER NOT NULL CHECK (delivery_fee_cents >= 0),
    discount_cents      INTEGER NOT NULL CHECK (discount_cents >= 0 AND discount_cents <= subtotal_cents),
    tax_cents           INTEGER NOT NULL CHECK (tax_cents >= 0),
    total_cents         INTEGER NOT NULL CHECK (total_cents >= 0),
    promo_code          TEXT REFERENCES promotions(code),
    eta_min             INTEGER NOT NULL CHECK (eta_min > 0),
    eta_max             INTEGER NOT NULL CHECK (eta_max >= eta_min),
    tracking_token      TEXT NOT NULL UNIQUE,
    idempotency_key     TEXT NOT NULL UNIQUE,
    request_hash        TEXT NOT NULL,
    CHECK (fulfillment <> 'pickup' OR location_id IS NOT NULL)
  );
  CREATE INDEX idx_orders_created_at ON orders(created_at);

  CREATE TABLE order_items (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    position            INTEGER NOT NULL,
    product_id          TEXT,
    deal_id             TEXT,
    name                TEXT NOT NULL,
    qty                 INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 20),
    unit_price_cents    INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    options_json        TEXT NOT NULL DEFAULT '[]',
    CHECK ((product_id IS NULL) <> (deal_id IS NULL))
  );
  CREATE INDEX idx_order_items_order ON order_items(order_id, position);

  CREATE TABLE promotion_redemptions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    code                TEXT NOT NULL REFERENCES promotions(code),
    order_id            TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    discount_cents      INTEGER NOT NULL CHECK (discount_cents >= 0),
    redeemed_at         TEXT NOT NULL
  );
  CREATE INDEX idx_redemptions_code ON promotion_redemptions(code);

  CREATE TABLE order_events (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status              TEXT NOT NULL,
    at                  TEXT NOT NULL,
    source              TEXT NOT NULL CHECK (source IN ('order', 'kitchen-sim', 'admin'))
  );
  CREATE INDEX idx_order_events_order ON order_events(order_id, id);
  `,
];

/** Seed promotions (idempotent). max_redemptions NULL = unlimited. */
const SEED_PROMOTIONS = [
  { code: "CRAVE10", kind: "pct", value: 10, min: 0, max: null, description: "10% off your order" },
  { code: "WELCOME5", kind: "flat", value: 500, min: 2000, max: null, description: "$5 off orders over $20" },
  { code: "FEAST20", kind: "pct", value: 20, min: 4000, max: 1000, description: "20% off orders over $40" },
] as const;

function migrate(db: DatabaseSync) {
  const { user_version: current } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = current; v < MIGRATIONS.length; v++) {
    runInTransaction(db, () => {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  const seed = db.prepare(
    `INSERT OR IGNORE INTO promotions (code, kind, value, min_subtotal_cents, max_redemptions, active, description)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  );
  for (const p of SEED_PROMOTIONS) seed.run(p.code, p.kind, p.value, p.min, p.max, p.description);
}

/** Deletes orders past retention; their items, events and redemptions cascade. */
export function purgeExpiredOrders(db: DatabaseSync, now = Date.now()) {
  const cutoff = new Date(now - ORDER_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM orders WHERE created_at < ?").run(cutoff);
}

export function openDatabase(file: string): DatabaseSync {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  if (file !== ":memory:") db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
  migrate(db);
  purgeExpiredOrders(db);
  return db;
}

const globalForDb = globalThis as unknown as { __emberDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__emberDb) {
    const file = process.env.EMBER_DB_PATH || path.join(process.cwd(), "data", "ember.db");
    globalForDb.__emberDb = openDatabase(file);
  }
  return globalForDb.__emberDb;
}

/** Test hook: swap in a fresh database (e.g. ":memory:"). */
export function resetDbForTests(file = ":memory:") {
  globalForDb.__emberDb?.close();
  globalForDb.__emberDb = openDatabase(file);
  return globalForDb.__emberDb;
}

/**
 * Runs `fn` inside BEGIN IMMEDIATE … COMMIT (write lock taken up front, so the
 * read-then-write logic inside can't race another connection). Rolls back on throw.
 */
export function runInTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    if (db.isTransaction) db.exec("ROLLBACK");
    throw err;
  }
}
