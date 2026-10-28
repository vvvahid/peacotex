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
- **Cart is front-end only** (`src/lib/cart.tsx`, browser storage); checkout takes no payment.
- Service terms (swatch price, return window, reservations) on `/service` are examples to confirm.

## Pages

- `/` — intro curtain, scroll-lit fabric hero (4 scenes), collections by occasion, swatch how-to, CTA
- `/shop` — filters: occasion, technique, base fabric, edge, layout, colour (shareable URL)
- `/shop/[slug]` — light slider, macro detail, specs, order by the metre (0.5 m steps), swatch,
  metreage estimator by silhouette (repeat + border aware), complete the look
- `/cart`, `/service`

Respects `prefers-reduced-motion` (no pinning, static light, no intro). The site sends `noindex`.
