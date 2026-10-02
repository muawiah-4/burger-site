# Security

Ember is a demo food-ordering site: a Next.js 16 App Router front end plus a small order API (route handlers
under `src/app/api`, logic in `src/server`) backed by a local SQLite file. There is **no payment processor
and no kitchen integration**. The server prices orders, stores them and simulates their progress. Customers
can optionally create an email + password account (below); guest checkout works without one.

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
| `GET /api/orders/:id?t=<token>` | Track an order | Needs the order's tracking token (32 random bytes, base64url), compared in constant time, **or** a session for the account that owns the order. 403 otherwise (including for a different signed-in account). |
| `PATCH /api/orders/:id/status` | Demo kitchen control | Needs `X-Admin-Token` equal to `ADMIN_TOKEN` (constant-time compare). Disabled (503) when `ADMIN_TOKEN` is unset or shorter than 16 characters. Only moves an order to its next stage. |

All inputs are validated with zod (unknown keys rejected; ids, quantities 1–20, 30 lines and 100 items per
order capped), bodies are limited to 16 KB and must be `application/json`, and every error is a JSON
`{ "error": { "code", "message", "details"? } }` with `Cache-Control: no-store` and an `X-Request-Id`.
Unexpected errors are logged as structured JSON without request bodies and return a generic 500.

Order status is authoritative on the server. When an order is read, a deterministic "simulated kitchen"
(`src/server/kitchen.ts`) moves it forward on a fixed schedule (cooking at 25% of the ETA's upper bound,
out for delivery / ready at 65%, delivered at 100%), storing an event per step. Status never moves backwards.
A scheduled order starts one ETA before its slot (never before it was placed). The driver tip (delivery only)
is computed by the server with the same `computeTip` the checkout displays and is included in the total;
`scheduledFor` must be one of the slots the checkout offers (`src/lib/schedule.ts`). "Today", the opening
hours and the slots are computed in the location's own time zone (`America/Los_Angeles` for all four
kitchens), never the server's or the browser's.

## Accounts

Email + password accounts, implemented with Node built-ins only (no external identity provider, no email
service). Code: `src/server/auth.ts` (sessions, cookie, CSRF, throttling), `src/server/passwords.ts`,
`src/server/account.ts`, routes under `src/app/api/auth` and `src/app/api/account`.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/signup` | `{ email, password, name?, phone? }` → 201 `{ user, address }` and a session cookie |
| `POST /api/auth/login` | `{ email, password }` → 200 `{ user, address }` and a fresh session cookie |
| `POST /api/auth/logout` | Ends this session; `{ "everywhere": true }` ends every session of the account |
| `GET /api/auth/me` | `{ user, address }` (both `null` when signed out); slides the session expiry |
| `PATCH /api/account` | `{ name?, phone? }` → `{ user }` |
| `PUT` / `DELETE /api/account/address` | Save (replace) or forget the default delivery address |
| `POST /api/account/password` | `{ currentPassword, newPassword }`; ends all other sessions and issues a new one |
| `DELETE /api/account` | `{ password }`; deletes the account (see retention below) |
| `GET /api/account/orders` | `{ orders }`: the account's orders, newest first, each with its tracking token |
| `POST /api/account/claim-orders` | `[{ orderId, trackingToken }, …]` (max 50) → `{ claimed }` |

- **Passwords** are hashed with **scrypt** (`N = 2^15`, `r = 8`, `p = 1`, 32-byte key, random 16-byte salt per
  hash), stored as `scrypt$N$r$p$salt$hash` so the cost can be raised later (old hashes are re-hashed at the
  next sign-in), and compared with `timingSafeEqual`. Passwords must be 10–200 characters, may not equal the
  email, and are checked against an embedded list of common passwords.
- **Sessions.** A random 32-byte token in the `ember_session` cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`,
  `Secure` in production, `Max-Age` 30 days. The database stores only `SHA-256(token)` as the session id,
  plus the user id, created / last-seen / expiry times and a SHA-256 of the User-Agent. Expiry slides: the
  first request after an hour pushes it out to 30 days again (`GET /api/auth/me` re-sends the cookie). The
  session is rotated on sign-in and sign-up (any pre-existing session cookie is deleted), deleted on sign-out,
  and all of an account's sessions are deleted by "Log out everywhere", a password change (except the new
  one) and account deletion.
- **CSRF.** `SameSite=Lax` plus an `Origin` check on every state-changing account route (`POST`, `PATCH`,
  `PUT`, `DELETE`): the `Origin` host must equal the request's `Host` (or `X-Forwarded-Host`), or be listed
  in `TRUSTED_ORIGINS`; a request without `Origin` is refused unless `Sec-Fetch-Site: same-origin`.
  `POST /api/orders` applies the same check whenever a session cookie is present, because the cookie then
  links the order to the account.
- **Brute force.** Every failed sign-in (or wrong current password on the password / delete routes) is
  recorded in `login_attempts`, keyed by the client IP and by `SHA-256(lowercased email)`. After **5**
  failures for an email it is locked for 30 s, doubling per further failure up to 15 minutes (the counter
  resets 24 h after the first failure or on success); an IP is locked for 15 minutes after **30** failures in
  15 minutes. Locked requests get **429** with `Retry-After`. The in-memory per-IP request limits apply too.
- **No account enumeration at sign-in.** An unknown email and a wrong password return the same 401 body,
  and an unknown email is still checked against a dummy scrypt hash so both take the same time. Lockout
  works the same for emails with and without an account. Sign-up necessarily reports an email that's
  already registered (there is no email verification step to hide it behind); it's rate-limited to 10 per
  15 minutes per IP.
- **Order linking.** Orders placed while signed in get `orders.user_id`. At sign-in / sign-up the browser
  sends the `{orderId, trackingToken}` pairs it holds in `ember.orders.v2`; the server links each order only
  if the token matches (constant time) and the order isn't already linked to an account.

## What is stored, where, and for how long

### On the server (`./data/ember.db`, SQLite)

| Table | Contents |
| --- | --- |
| `orders` | Id, display number, timestamps, delivery/pickup, pickup location id, **city and ZIP only** for delivery, payment *method* (card/cash/wallet), status, the priced amounts in cents (including the driver tip), promo code, ETA, scheduled time (order for later), tracking token, idempotency key and a SHA-256 hash of the request body |
| `order_items` | Product or deal id, name, quantity, unit price, chosen options |
| `order_events` | Status changes with timestamps and their source (order, kitchen-sim, admin) |
| `promotions` / `promotion_redemptions` | Promo rules; which order redeemed which code and for how much |
| `users` | Account id, **email** (lowercased), scrypt password hash, optional name and phone, created and password-changed times |
| `sessions` | SHA-256 of the session token, user id, created / last-seen / expiry times, SHA-256 of the User-Agent |
| `saved_addresses` | Only for signed-in users who save one in Account → Profile: street, apt, city, ZIP, delivery instructions |
| `login_attempts` | Failed sign-in counters and lock times per client IP and per SHA-256 of the email |

`orders.user_id` links an order to the account that placed or claimed it (null for guest orders).

For guests, no name, phone, email, street address, delivery instructions or card data is sent to or stored
by the server. For account holders, the server stores only what's listed above: the email and password hash,
and the name, phone and address they choose to save. Checkout contact details still aren't sent with the
order (they pre-fill from the account instead). Orders older than **30 days** are deleted (with their items, events and redemptions) when the
server starts and periodically as new orders arrive. Expired sessions and stale sign-in counters are removed
at the same time. Accounts, their name/phone and saved address are kept until the user deletes the account
(Account → Security → Delete account, which needs the password): that deletes the user row, every session
and the saved address, and sets `user_id` to null on their orders, which then remain only as anonymous
orders until the 30-day order retention removes them. The database file is git-ignored. Tracking tokens are
stored as-is so an idempotent retry can return the same token; treat the database file as sensitive.

### In the browser (`localStorage`, `sessionStorage`)

Everything is in `localStorage`, apart from the in-progress checkout draft, which is in `sessionStorage`.
The only cookie is the `ember_session` cookie described under Accounts, set only when you sign in.

| Key | Contents | Retention |
| --- | --- | --- |
| `ember.cart.v1` | Cart lines, delivery/pickup choice, pickup location, promo code | Until checkout, "Clear my data", or clearing site data. Removed when the cart is empty. |
| `ember.orders.v2` | For each order placed on this device: order id, tracking token, display number, time placed. Nothing else. | The newest **20**, none older than **30 days**. |
| `ember.orders.v1` | Orders saved on-device before the API existed (read-only now): items, prices, payment method, timestamps, city and ZIP | The newest **20** orders, none older than **30 days**. Enforced on every load. |
| `ember.orders.latest` | Id of the most recent legacy order (for `/order/latest`) | Removed with the order it points to. |
| `ember.checkout.draft.v1` (sessionStorage) | In-progress checkout: current step, contact details, delivery address, payment *method*, tip choice, scheduled time. **No card details.** | Until the order is placed, "Clear my data", or the tab is closed. |
| `ember.user.v1` | Details you choose to save in Account → Saved Details (name, phone, email, street, city, ZIP) to pre-fill checkout | Until you change it, use "Clear my data", or clear site data. |

What is **never** stored or sent:

- Card number, expiry, CVC and name on card. These exist only in the checkout page's React state, are not
  sent to the server, and are cleared when the order is placed.
- The name, phone, email, street address and delivery instructions typed at checkout. They are used for the
  review step only; the order request carries just the city and ZIP.
- Newsletter emails. The form validates the address in the browser and discards it.

**Clear my data** (Account → Saved Details, or Profile when signed in) removes all the keys above after an
inline confirmation. It doesn't delete orders on the server (they expire after 30 days); without the token
they can't be read. It doesn't touch your account or sign you out; signed-in users get a separate "Sign out"
button there (and "Delete account" under Security).

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
- **Accounts have no email verification or password reset.** There's no email service, so anyone can sign
  up with any address, and a forgotten password can't be recovered. Orders are still reachable by anyone
  holding their tracking link. No MFA.
- **Sign-in throttling is per IP and per email**, stored in SQLite. A distributed attacker spread over many
  IPs is slowed only by the per-email backoff.
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

Please report security issues privately through GitHub's private vulnerability reporting:
https://github.com/muawiah-4/burger-site/security/advisories/new

Don't open a public issue. Include steps to reproduce and the affected URL or file. There is no bug bounty.
