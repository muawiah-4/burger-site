# Security

Ember is a **static demo** of a food-ordering site: a Next.js 16 App Router front end with **no backend**.
It has no API, database, accounts, payment processor or kitchen integration. Nothing you do on the site
leaves your browser, except the page and asset requests to the server hosting it and the server-side image
fetches that `next/image` makes to `images.unsplash.com`.

## What is stored, where, and for how long

Everything lives in the browser's `localStorage` on the device you used, apart from the in-progress
checkout draft, which is in `sessionStorage`. There are no cookies.

| Key | Contents | Retention |
| --- | --- | --- |
| `ember.cart.v1` | Cart lines, delivery/pickup choice, pickup location, promo code | Until checkout, "Clear my data", or clearing site data. Removed when the cart is empty. |
| `ember.orders.v1` | Placed demo orders: items, prices, totals, payment *method* (card/cash/wallet), timestamps and, for delivery, **city and ZIP only** | The newest **20** orders, none older than **30 days**. Enforced on every load and save. |
| `ember.orders.latest` | Id of the most recent order (for `/order/latest`) | Removed with the order it points to. |
| `ember.checkout.draft.v1` (sessionStorage) | In-progress checkout: current step, contact details, delivery address, payment *method*, tip choice, scheduled time. **No card details.** | Until the order is placed, "Clear my data", or the tab is closed. |
| `ember.user.v1` | Details you choose to save in Account → Saved Details (name, phone, email, street, city, ZIP) to pre-fill checkout | Until you change it, use "Clear my data", or clear site data. |

What is **never** stored:

- Card number, expiry, CVC and name on card. These exist only in the checkout page's React state, are not
  part of the saved order, and are cleared when the order is placed.
- The name, phone, email, street address and delivery instructions typed at checkout. They are used for the
  review step and are not saved with the order. (Older orders that did contain them are scrubbed on load.)
- Newsletter emails. The form validates the address in the browser and discards it.

**Clear my data** (Account → Saved Details) removes all four keys above after an inline confirmation.

All stored JSON is treated as untrusted. `src/lib/cart-storage.ts`, `src/lib/orders.ts` and
`src/lib/user-profile.ts` rebuild values from an allowlist with type, range and length checks. Cart prices
are recomputed from the menu, and image URLs are restricted to local paths or the configured
`next/image` host. Tampered data is dropped instead of crashing a page.

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
- The proxy skips `_next/static`, `_next/image`, `/videos/`, `favicon.ico` and router prefetches, which
  don't render HTML. The static headers from `next.config.ts` still apply to every path.

`/checkout` and `/order/[id]` also send `<meta name="robots" content="noindex, nofollow">`.

## Known limitations

- **No real payments.** Checkout is simulated. The card form exists for demonstration only, and the UI says
  so: a persistent "Demo: no payment is taken and no food is prepared" notice on checkout and order pages,
  plus a "Don't enter a real card" hint with the test number `4242 4242 4242 4242`. Card data is never
  stored or transmitted, but please don't type a real card into a demo.
- **Client-side pricing and promo codes.** Menu prices, totals and the promo codes (`CRAVE10`, `WELCOME5`,
  `FEAST20`) are in the client bundle, so anyone can read or change them in their own browser. The logic
  caps the discount at the subtotal and never produces a negative total. A real store must price the
  order, validate promo codes (eligibility, expiry, single use) and charge the card **server-side**, never
  trusting client totals.
- **Order status is simulated** from elapsed time. There is no order backend.
- **localStorage is not a secure store.** Any script running on the origin can read it, and it isn't
  encrypted at rest. The CSP reduces the XSS risk, and we minimise what's stored, but don't treat the saved
  profile as private on a shared computer. Use "Clear my data" when you're done.
- **Saved Details has no automatic expiry.** It's kept until you clear it, because you saved it on purpose to
  pre-fill checkout.

## Reporting a vulnerability

Please report security issues privately to the owner of this repository (for example through the hosting
platform's private vulnerability reporting or a direct message) rather than opening a public issue.
Include steps to reproduce and the affected URL or file. There is no bug bounty.
