# Security

Ember is a demo food-ordering site: a Next.js 16 App Router front end plus a small order API (route handlers
under `src/app/api`, logic in `src/server`) backed by a local SQLite file. There is **no payment processor,
no accounts and no kitchen integration**. The server prices orders, stores them and simulates their progress.

## Server-side pricing and orders

The browser never decides what an order costs. `src/server/pricing.ts` prices every request from the menu
data in integer cents: product base price plus option deltas (each option group is validated: known
group/choice ids, one choice for single groups, `max` for multi groups, required groups present), fixed deals
and build-your-own combos (each slot must be one of the allowed products), the delivery fee, promo codes and
tax (8.25%, rounded half-up on cents). Promo codes and their rules live only in the database; the client
bundle no longer contains them (the codes still appear in marketing copy, which is fine; their rules don't).

| Endpoint | Purpose | Notes |
| --- | --- | --- |
| `POST /api/quote` | Price a cart, check a promo code | Read-only. 120 requests/min per client. |
| `POST /api/orders` | Place an order | Requires an `Idempotency-Key` header (16–128 chars). The server re-prices and refuses with **409** plus a fresh quote if `expectedTotalCents` differs from its total. The same key and body return the same order; the same key with a different body returns 422. The idempotency check, promo redemption limit and inserts run in one `BEGIN IMMEDIATE` transaction. 20/min per client. |
| `GET /api/orders/:id?t=<token>` | Track an order | Needs the order's tracking token (32 random bytes, base64url), compared in constant time. 403 without it. |
| `PATCH /api/orders/:id/status` | Demo kitchen control | Needs `X-Admin-Token` equal to `ADMIN_TOKEN` (constant-time compare). Disabled (503) when `ADMIN_TOKEN` is unset or shorter than 16 characters. Only moves an order to its next stage. |

All inputs are validated with zod (unknown keys rejected; ids, quantities 1–20, 30 lines and 100 items per
order capped), bodies are limited to 16 KB and must be `application/json`, and every error is a JSON
`{ "error": { "code", "message", "details"? } }` with `Cache-Control: no-store` and an `X-Request-Id`.
Unexpected errors are logged as structured JSON without request bodies and return a generic 500.

Order status is authoritative on the server. When an order is read, a deterministic "simulated kitchen"
(`src/server/kitchen.ts`) moves it forward on a fixed schedule (cooking at 25% of the ETA's upper bound,
out for delivery / ready at 65%, delivered at 100%), storing an event per step. Status never moves backwards.

## What is stored, where, and for how long

### On the server (`./data/ember.db`, SQLite)

| Table | Contents |
| --- | --- |
| `orders` | Id, display number, timestamps, delivery/pickup, pickup location id, **city and ZIP only** for delivery, payment *method* (card/cash/wallet), status, the priced amounts in cents, promo code, ETA, tracking token, idempotency key and a SHA-256 hash of the request body |
| `order_items` | Product or deal id, name, quantity, unit price, chosen options |
| `order_events` | Status changes with timestamps and their source (order, kitchen-sim, admin) |
| `promotions` / `promotion_redemptions` | Promo rules; which order redeemed which code and for how much |

No name, phone, email, street address, delivery instructions or card data is sent to or stored by the
server. Orders older than **30 days** are deleted (with their items, events and redemptions) when the
server starts and periodically as new orders arrive. The database file is git-ignored. Tracking tokens are
stored as-is so an idempotent retry can return the same token; treat the database file as sensitive.

### In the browser (`localStorage`)

There are no cookies.

| Key | Contents | Retention |
| --- | --- | --- |
| `ember.cart.v1` | Cart lines, delivery/pickup choice, pickup location, promo code | Until checkout, "Clear my data", or clearing site data. Removed when the cart is empty. |
| `ember.orders.v2` | For each order placed on this device: order id, tracking token, display number, time placed. Nothing else. | The newest **20**, none older than **30 days**. |
| `ember.orders.v1` | Orders saved on-device before the API existed (read-only now): items, prices, payment method, timestamps, city and ZIP | The newest **20** orders, none older than **30 days**. Enforced on every load. |
| `ember.orders.latest` | Id of the most recent legacy order (for `/order/latest`) | Removed with the order it points to. |
| `ember.user.v1` | Details you choose to save in Account → Saved Details (name, phone, email, street, city, ZIP) to pre-fill checkout | Until you change it, use "Clear my data", or clear site data. |

What is **never** stored or sent:

- Card number, expiry, CVC and name on card. These exist only in the checkout page's React state, are not
  sent to the server, and are cleared when the order is placed.
- The name, phone, email, street address and delivery instructions typed at checkout. They are used for the
  review step only; the order request carries just the city and ZIP.
- Newsletter emails. The form validates the address in the browser and discards it.

**Clear my data** (Account → Saved Details) removes all the keys above after an inline confirmation. It
doesn't delete orders on the server (they expire after 30 days); without the token they can't be read.

The tracking token is in the order page URL (`/order/<id>?t=<token>`). Anyone with that link can see the
order's items, totals, status and city/ZIP. `Referrer-Policy: strict-origin-when-cross-origin` keeps it out
of cross-origin referrers.

All stored JSON is treated as untrusted. `src/lib/cart-storage.ts`, `src/lib/orders.ts`,
`src/lib/order-client.ts` and `src/lib/user-profile.ts` rebuild values from an allowlist with type, range
and length checks. Tampered data is dropped instead of crashing a page, and a tampered cart can't change
what an order costs, because the server prices it.

## HTTP security headers

| Header | Value | Set in |
| --- | --- | --- |
| `Content-Security-Policy` | Per-request nonce policy (below) | `src/proxy.ts` (policy built in `src/lib/csp.ts`) |
| `X-Content-Type-Options` | `nosniff` | `next.config.ts` → `headers()` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | `next.config.ts` |
| `X-Frame-Options` | `DENY` | `next.config.ts` |
| `Permissions-Policy` | `camera=(), microphone=(), payment=(), geolocation=(self), usb=(), browsing-topics=()` | `next.config.ts` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (production builds only) | `next.config.ts` |
| `X-Powered-By` | removed (`poweredByHeader: false`) | `next.config.ts` |

Geolocation is allowed for our own origin because the home page's location finder uses it.

### Content-Security-Policy

Production:

```
default-src 'self';
script-src 'self' 'nonce-<per request>' 'strict-dynamic';
style-src 'self' 'nonce-<per request>';
style-src-attr 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
media-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
worker-src 'self';
manifest-src 'self';
upgrade-insecure-requests
```

Development (`next dev`) adds `'unsafe-eval'` to `script-src` (React uses it for debugging), uses
`style-src 'self' 'unsafe-inline'` (the dev runtime injects un-nonced styles), adds `ws: wss:` to
`connect-src` for hot reload, and omits `upgrade-insecure-requests`.

Design notes:

- **Why nonces.** App Router pages include inline bootstrap and flight-data scripts. A nonce is the approach
  in the Next.js CSP guide that allows those scripts without `'unsafe-inline'`. The experimental SRI mode
  hashes script files but does not cover the inline scripts. Next.js reads the nonce from the request's CSP
  header and applies it to its own scripts. The root layout also passes it to Motion's `MotionConfig`.
- **Cost.** A nonce must be unique per response, so every route is rendered dynamically: the root layout
  reads `headers()`, and no pages are prerendered or CDN-cacheable. That's acceptable for a demo; a
  high-traffic deployment should reconsider it.
- **`style-src-attr 'unsafe-inline'`.** Server-rendered `style="…"` attributes (Motion's initial animation
  states, progress widths, `next/image`) can't carry a nonce. This relaxation covers attributes only, not
  `<style>` elements, and attribute CSS cannot run script.
- **Images.** Remote photos are fetched server-side by `/_next/image`, so the browser only loads same-origin
  images (plus `data:`/`blob:` placeholders). No third-party image host is allowed.
- The proxy skips `/api/` (JSON only), `_next/static`, `_next/image`, `/videos/`, `favicon.ico` and router prefetches, which
  don't render HTML. The static headers from `next.config.ts` still apply to every path.

`/checkout` and `/order/[id]` also send `<meta name="robots" content="noindex, nofollow">`.

## Known limitations

- **No real payments.** Checkout is simulated. The card form exists for demonstration only, and the UI says
  so: a persistent "Demo: no payment is taken and no food is prepared" notice on checkout and order pages,
  plus a "Don't enter a real card" hint with the test number `4242 4242 4242 4242`. Card data is never
  stored or transmitted, but please don't type a real card into a demo.
- **No accounts.** Orders are reachable by anyone holding their tracking link. There is no login and no way
  to list orders except from the tokens kept on this device.
- **Order status is simulated** by the server's kitchen schedule (and the optional admin endpoint). Nothing
  is cooked or delivered.
- **Rate limits are in memory and per process**, keyed by the first `X-Forwarded-For` address. That's only
  meaningful behind a proxy that sets the header; a multi-instance deployment needs a shared store.
- **SQLite on local disk.** One file, one server. It isn't encrypted at rest and isn't backed up. A real
  deployment would use a managed database with backups and keep tracking tokens hashed.
- **localStorage is not a secure store.** Any script running on the origin can read it, and it isn't
  encrypted at rest. The CSP reduces the XSS risk, and we minimise what's stored, but don't treat the saved
  profile as private on a shared computer. Use "Clear my data" when you're done.
- **Saved Details has no automatic expiry.** It's kept until you clear it, because you saved it on purpose to
  pre-fill checkout.

## Reporting a vulnerability

Please report security issues privately to the owner of this repository (for example through the hosting
platform's private vulnerability reporting or a direct message) rather than opening a public issue.
Include steps to reproduce and the affected URL or file. There is no bug bounty.
