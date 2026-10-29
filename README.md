# Peacotex — demo shop

Demo website for an online shop selling embellished fabrics for evening and bridal dresses.
Next.js (App Router) + TypeScript + Tailwind v4, GSAP ScrollTrigger, Lenis.

```bash
npm install
npm run dev        # http://localhost:3000
```

## What is demo content

- **Fabrics are procedural illustrations** (`src/lib/fabric/render.ts`), labelled on every page. Replace with
  real footage/photos when available; the scroll-driven hero (`src/components/home/FabricHero.tsx`) is built so a
  video or image sequence can take over from the canvas.
- **Products, names, prices and specs are sample data** (`src/lib/catalog.ts`).
- **Cart** lives in browser storage (`src/lib/cart.tsx`). Without Stripe keys, checkout shows a demo screen.
- Service terms (swatch price, return window, reservations) on `/service` are examples to confirm.

## Pages

- `/` — intro curtain, scroll-lit fabric hero (4 scenes), collections by occasion, swatch how-to, CTA
- `/shop` — filters: occasion, technique, base fabric, edge, layout, colour (shareable URL)
- `/shop/[slug]` — light slider, macro detail, specs, order by the metre (0.5 m steps), swatch,
  metreage estimator by silhouette (repeat + border aware), complete the look
- `/cart`, `/service`

## Languages

English, Dutch, German, French, Polish, Romanian, Czech and Hungarian. English lives at the
plain URLs (`/shop`); the others have a prefix (`/nl/shop`, `/de/shop`…). The middleware sends a
first visit to the visitor's browser language, and the language menu remembers a choice in the
`ptx_lang` cookie. Stripe Checkout opens in the same language.

- All texts: `src/i18n/dict/<lang>.ts`. `en.ts` is the source; every other file must have the
  same keys, so a missing translation fails the build.
- Product texts in other languages sit under `catalog.products` by slug; English stays in
  `src/lib/catalog.ts`.
- The translations were machine-made for the demo: have a native speaker review them before launch.

## Payments (Stripe Checkout)

Copy `.env.example` to `.env.local`, set `STRIPE_SECRET_KEY` (test key `sk_test_…`) and keep
`DATABASE_URL=pglite://.data/peacotex` for local development.

- `POST /api/checkout` re-prices the bag on the server from the catalogue (0.5 m steps, minimum, max 5
  swatches, stock in metres), records a pending order and opens a hosted Stripe Checkout page. Card data
  never reaches this server.
- Payment is confirmed by the signed webhook `POST /api/stripe/webhook` (needs `STRIPE_WEBHOOK_SECRET`) and by
  the success page, both reading the status back from Stripe. Fulfilment runs once: order → `paid`, metres
  taken off `fabric_stock`; amount or stock mismatches mark the order `needs_attention`.
- Schema: `db/migrations`. Sample stock is 30 m per fabric. Shipping (€15 rolled / free swatches) is a sample rate.
- Test card: `4242 4242 4242 4242`, any future date, any CVC.

Production needs a managed PostgreSQL `DATABASE_URL` (PGlite does not persist on Vercel), the Stripe keys
and webhook secret in the Vercel project settings, and `NEXT_PUBLIC_SITE_URL`.

Respects `prefers-reduced-motion` (no pinning, static light, no intro). The site sends `noindex`.
