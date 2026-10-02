# Ember

A fictional burger brand's ordering site — browse the menu, build a burger
(patty, cheese, sauce, extras), add deals and combos, check out through a
multi-step flow, and track a placed order. A demo storefront, not a working
restaurant backend.

## Stack

- **Next.js 16.3** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4** for styling (charcoal / cream / ember design tokens in
  `src/app/globals.css`)
- **Motion** (`motion/react`) for page and component animation
- **Vitest** + **React Testing Library** for unit tests, **Playwright** for
  end-to-end smoke tests
- **ESLint** (`eslint-config-next`) for linting

## Scripts

```bash
npm run dev         # next dev
npm run build         # next build
npm run start          # next start (serves the production build)
npm run lint            # eslint
npm run typecheck        # tsc --noEmit
npm run test              # vitest run (unit tests)
npm run test:e2e           # playwright test (end-to-end smoke tests)
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Home — hero, deals, best sellers, category grid, reviews, app promo |
| `/menu` | Full menu, filterable by category, with the product modal |
| `/checkout` | Multi-step checkout: customer → fulfillment → address (delivery) → payment → review |
| `/order/[id]` | Order tracker; `/order/latest` resolves to the most recently placed order |

`src/proxy.ts` sets a per-request nonce-based Content-Security-Policy on every
document route (see [Security](#security)).

## State

- **Cart** (`src/context/cart-context.tsx`) — a reducer-backed context
  persisted to `localStorage` (`src/lib/cart-storage.ts`). Lines are
  deduplicated by `selectionKey` (product + its selected options), so adding
  the same burger with the same build stacks quantity instead of creating a
  second line. Pricing, totals (tax, delivery fee, discount cap) and promo
  evaluation are pure functions in `src/lib/cart.ts`, so they're unit-tested
  without touching React or the DOM.
- **Orders** (`src/lib/orders.ts`) — placed orders are saved to
  `localStorage`, validated and re-built from an explicit field allowlist on
  every read (so a malformed or tampered entry, or PII an older version
  saved, never resurfaces), with a retention window (30 days, 20 orders max).
  `deriveStatus()` simulates order progress from elapsed time — there's no
  backend tracking a real kitchen.
- Smaller contexts (`fly-to-cart-context`, `product-modal-context`,
  `account-modal-context`) own their own narrow slice of UI state (the
  "fly to cart" animation, the product quick-view modal, and the account
  modal) rather than overloading the cart context.

## Security

See [SECURITY.md](./SECURITY.md) for the reporting policy. In short:
`src/proxy.ts` issues a fresh nonce per request and builds a strict
Content-Security-Policy (`src/lib/csp.ts`) with no unsafe script sources in
production; static headers (nosniff, Referrer-Policy, Permissions-Policy,
X-Frame-Options, HSTS) are set in `next.config.ts` so they also cover static
assets the proxy skips.

## Deploy

Standard Next.js app — deploy to **Vercel** (zero config) or any Node host
that can run `npm run build` followed by `npm run start`. `next.config.ts`
pins the Turbopack workspace root and configures `images.remotePatterns` for
the Unsplash-hosted photography.

## Known limitations

This is a front-end ordering demo, not a working restaurant platform:

- **No payments.** The payment step collects card details for show; there is
  no payment processor integration, and no charge ever happens.
- **No backend.** The menu, deals and locations are static data
  (`src/lib/data/`); there is no inventory, kitchen, or real order queue.
- **Client-side persistence only.** Cart and order history live in
  `localStorage`, scoped to one browser — they don't sync across devices and
  are gone if storage is cleared.
- **Promo codes are evaluated client-side** (`evaluatePromo` in
  `src/lib/cart.ts`); this is expected to move server-side.
