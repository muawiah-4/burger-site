# Ember

An ordering site for **Ember**, a fictional burger, pizza and fried-chicken brand with four
kitchens in San Francisco. You can browse the menu, customise items, build combos, check out
for delivery or pickup (now or scheduled), track the order, and keep a customer account with
order history and rewards.

The brand, founder and reviews are fictional. **No payment is ever taken** and no food is
prepared. Orders are real records in a local SQLite database, and their status is advanced by
a simulated kitchen.

## Features

- **Menu**: 8 categories, search, Popular/Veg/Spicy filters, an allergen filter, and calories
  on every item.
- **Product options**: patty, cheese, sauce, extras and so on, validated on the server.
- **Deals and combos**: a combo builder and a deals grid that stack correctly in the cart.
- **Cart**: an add-to-cart toast, a mobile "View cart" bar, sync across tabs, and promo codes
  checked by the server.
- **Checkout**: five steps (fulfilment, details, address or pickup location, payment, review),
  with a sessionStorage draft that survives a refresh. Card fields are never saved.
- **Order options**: a driver tip and order-for-later time slots, both priced and validated on
  the server. Slots use each kitchen's time zone (America/Los_Angeles).
- **Order tracking** with tokenised links. Status comes from the server and changes are
  announced to screen readers.
- **Accounts**: email and password sign-up and login, server-side profile, saved address and
  order history, rewards tiers, change password, log out everywhere, and delete account.
  Orders placed as a guest are linked to the account on sign-in.
- **Accessibility**: WCAG AA contrast, focus-trapped dialogs that return focus (Safari
  included), form autocomplete, and focus moved to the first error.

## Getting started

Requires **Node 22.18 or newer** for the built-in `node:sqlite` module.

```bash
npm install
cp .env.example .env.local   # optional: every variable has a safe default
npm run dev                  # http://localhost:3000
```

The SQLite database is created at `data/ember.db` on first use and is git-ignored.

### Environment variables (all optional)

| Variable | Purpose |
| --- | --- |
| `ADMIN_TOKEN` | Enables `PATCH /api/orders/:id/status` (demo kitchen control). Leave it empty to disable. At least 16 characters |
| `EMBER_DB_PATH` | SQLite file location (default `./data/ember.db`) |
| `KITCHEN_SIMULATION` | Set to `off` to stop status advancing over time |
| `TRUSTED_ORIGINS` | Extra origins allowed by the CSRF Origin check (e.g. behind a proxy) |
| `INSECURE_COOKIES` | `1` drops the `Secure` cookie flag. Only for testing a production build over plain http (Safari won't keep Secure cookies on `http://localhost`) |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: pricing, promos, tip and schedule, cart storage, validation, order API, auth |
| `npm run test:e2e` | Playwright smoke, account and cross-browser tests in Chromium and WebKit |

For local end-to-end runs against your installed Chrome, set `PLAYWRIGHT_CHROME=1`.

## Routes

| Route | Description |
| --- | --- |
| `/` | Home: hero, categories, best sellers, deals and combos, about, reviews, locations, app promo |
| `/menu` | Full menu with filters (`?category=` is validated and kept in the URL) |
| `/checkout` | Five-step checkout (not indexed) |
| `/order/[id]` | Order tracker. Needs the tracking token or the signed-in owner (not indexed) |

## API

All money is in integer cents. Inputs are validated with zod, and errors look like
`{ error: { code, message, details? } }`.

| Route | Description |
| --- | --- |
| `POST /api/quote` | Server-priced breakdown (lines, fee, discount, tax, tip, total, ETA) for a cart |
| `POST /api/orders` | Needs an `Idempotency-Key` header. Re-prices everything, and returns `409` with a fresh quote if `expectedTotalCents` doesn't match. Returns `{ orderId, displayNumber, trackingToken }` |
| `GET /api/orders/:id?t=token` | The order and its status history (token or owner only) |
| `PATCH /api/orders/:id/status` | Demo kitchen control. Needs `X-Admin-Token` |
| `POST /api/auth/signup` · `login` · `logout` · `GET /api/auth/me` | Accounts and sessions |
| `PATCH /api/account` · `PUT/DELETE /api/account/address` · `POST /api/account/password` · `DELETE /api/account` | Profile, address, password, account deletion |
| `GET /api/account/orders` · `POST /api/account/claim-orders` | Order history and linking guest orders |

## Project structure

```
src/
  app/          routes, API route handlers (app/api), error and not-found pages
  components/   home, menu/product, cart, checkout, account, layout, ui
  context/      cart (split actions/state/open), fly-to-cart, product modal, account modal
  hooks/        useDialog (focus trap + return), useScrollLock
  lib/          client logic: cart, tip, schedule, rewards, validation, csp, API clients, data/
  server/       db + migrations, pricing, orders, kitchen simulation, auth, passwords
  proxy.ts      per-request nonce Content-Security-Policy
e2e/            Playwright specs
```

## Security

- **Content-Security-Policy**: nonce-based, issued per request by `src/proxy.ts`, plus static
  security headers in `next.config.ts`.
- **Passwords**: hashed with scrypt (N=2^15) and a per-user salt.
- **Sessions**: an HttpOnly, SameSite=Lax cookie that is Secure in production. Only a hash of
  the session token is stored.
- **Abuse protection**: CSRF Origin checks, login lockout and rate limiting.
- **Server-authoritative pricing**: prices, promos, tip and schedule are all computed on the
  server, so a tampered cart can't change what's charged.
- **Minimal data storage**: no street address, phone or email is stored with orders (city and
  ZIP only). Orders are kept for 30 days.
- **Reporting**: use GitHub's
  [private vulnerability reporting](https://github.com/muawiah-4/burger-site/security/advisories/new).

See [SECURITY.md](./SECURITY.md) for exactly what is stored and for how long.

## Deploying

Run it on any Node host with `npm run build` and `npm start`, behind HTTPS. Two things the
host needs:

- **A persistent disk for `data/`**, because SQLite is a local file. Serverless platforms
  without persistent storage need a hosted database instead.
- **No static export.** Every page renders dynamically because of the per-request CSP nonce.

## Known limitations

- Demo only: there are no payments and no real kitchen or delivery.
- Sign-up reveals whether an email is already registered, because there's no email
  verification service. Sign-up is rate limited.
- Product photography comes from Unsplash.
