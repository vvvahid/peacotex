# Back office for all shops — plan

Goal: one back office for every webshop LeoPers BV (and any later company) runs, built by growing
the Peacotex admin instead of adopting a full ERP. Each new shop then only needs its own storefront.

Written 2026-10-30, from the Peacotex code at commit `bf6f834`.

## Ground rules

- **Peacotex launches first.** Nothing here starts before the launch list (photos, VAT number,
  Resend, Stripe live, domain) is done. Phase 1 must not change how the live shop behaves.
- **Build what is used weekly; integrate the rest.** Accounting, Peppol, shipping labels and payments
  stay with specialist services. The back office holds the data and sends it to them.
- **Same stack:** Next.js + TypeScript on Vercel, PostgreSQL on Neon, plain SQL migrations,
  PGlite for local development (as in `src/server/db.ts`).
- **Issued documents never change.** Invoices and credit notes are frozen at issue, as
  `invoices.data` + `invoices.pdf` already are.

## What Peacotex already gives us

| Area | Today | Reusable as is? |
|---|---|---|
| Database layer | `src/server/db.ts` (pg + PGlite), `db/migrations/*.sql` | Yes |
| Orders | `orders`, `order_lines`, statuses incl. fabric-only `cut` | Needs `shop_id`, generic statuses |
| Catalogue | `products` (slug PK, fabric JSON), `media` (bytea) | Needs `shop_id`, generic product shape |
| Stock | `fabric_stock` (metres, overwritten in place) | Replace with a stock ledger |
| VAT | OSS destination VAT, reverse charge, export, VIES (`vat.ts`, `vies.ts`) | Yes |
| Invoices | Gap-free per year, frozen data + PDF, 12 languages | Needs seller from DB, not `COMPANY` |
| Email | Resend, confirmation mails (`mail.ts`, `order-mail.ts`) | Needs per-shop sender and branding |
| Admin | One password, signed cookie, lockout, `admin_log` | Needs users and roles |

## Target shape

One repository (monorepo with npm workspaces), several Vercel projects, one Neon database:

```
apps/
  office/        back office (office.leopers.be or similar) — the only place with admin login
  peacotex/      storefront (today's site, minus /admin)
  <next-shop>/   further storefronts
packages/
  core/          db, migrations, orders, invoices, VAT/VIES, Stripe, mail, stock
  ui/            shared admin and checkout components (optional)
```

Storefronts import `@leopers/core` directly and talk to the same database, so there is no extra
API to build or secure between shop and back office. A storefront only reads its own `shop_id`.

### Data model changes

- `sellers` — legal entity: name, address, enterprise/VAT number, register, bank, Stripe account,
  invoice series. Replaces the `COMPANY` constant in `src/lib/company.ts`. LeoPers BV is row 1.
- `shops` — trade name, domain, seller, languages, currencies, countries shipped to, sender email,
  logo, order statuses used.
- `shop_id` on `products`, `media`, `orders`, `customers`; product key becomes `(shop_id, slug)`.
- **Invoice numbering per seller, not per shop.** Belgian rules want one unbroken series per
  company (several series are allowed, if each is unbroken). Keep `2026-0001` per seller, or one
  prefixed series per shop (`PTX-2026-0001`) — decide with the accountant before shop 2.
- `customers` — real rows (email, type, company, VAT id, addresses) instead of only `orders.customer` JSON.
- `stock_moves` — every change as a row (sale, return, correction, delivery) with a unit (`m`, `pcs`);
  stock on hand is the sum. Shows *why* stock changed, which an overwrite does not.
- `credit_notes` — same frozen-data + PDF pattern as invoices, own gap-free series, linked to an invoice.
- `users` — email, role (`owner`, `staff`, `accountant` read-only), passkey or password hash;
  `admin_log` gets a `user_id`.
- Media moves from `bytea` to object storage (Vercel Blob or Cloudflare R2) once photos grow;
  keep the `/api/media/<id>` URLs working.

## Phases

### Phase 1 — Split without changing behaviour (after launch)
1. Move to a monorepo; `src/server/*` becomes `packages/core`.
2. Peacotex keeps working exactly as before (same URLs, same database). Check with the
   existing Playwright tests and one test order end to end.

**Done when:** live Peacotex is deployed from the monorepo and nothing visible has changed.

### Phase 2 — Multi-shop data
1. Migration: add `sellers`, `shops`; add `shop_id` everywhere, backfilled with Peacotex.
2. Invoices and emails read seller and shop from the database instead of `COMPANY`.
3. Order statuses become per-shop lists (Peacotex keeps `cut`; a general shop uses `packed`).

**Done when:** a second, test-only shop on the same database places an order with its own invoice
and email, and Peacotex orders are untouched.

### Phase 3 — The office app
1. Move `/admin` into `apps/office`; add `users` and roles; sign-in by passkey or email link.
2. Orders across all shops with a shop filter; the existing “To do” view stays the home screen.
3. Products and photos per shop; generic product form with shop-specific extra fields.
4. Stock ledger with low-stock alerts (email).
5. Customers: order history, B2B/VAT status.
6. Dashboard: revenue per shop, country and month, in EUR (orders keep `fx_rate`).

### Phase 4 — Money and tax
1. **Credit notes** for refunds and cancellations after invoicing, linked to Stripe refunds.
2. **OSS report** per quarter: VAT per country and rate, in EUR (OSS uses the ECB rate of the
   quarter's last day — not the order's `fx_rate`; confirm with the accountant).
3. **Intra-EU listing** of reverse-charge sales per customer VAT number, per quarter.
4. **Accountant export:** monthly invoices + credit notes as PDF/UBL and CSV, or direct to the
   accountant's software (Yuki, Exact Online, Octopus… ask which one they use).
5. **Peppol e-invoicing** for Belgian B2B buyers (required in Belgium since 1 Jan 2026), through an
   access point such as Billit, by API from the office. Do not build Peppol ourselves.

### Phase 5 — Next shop
1. Storefront template from the Peacotex app (checkout, cart, i18n, legal pages) with the fabric
   parts (estimator, dress studio, metres) as optional modules.
2. Onboarding checklist per shop: domain, DNS, Resend sender, Stripe methods, languages, legal texts.

### Later, only when needed
- Shipping labels and tracking (Sendcloud API) instead of typing tracking numbers.
- Suppliers and purchase orders feeding `stock_moves`.
- Marketplace sync (Etsy, Amazon) if a shop sells there.
- At that point compare again with running Odoo Community as the back office.

## Decisions to make
1. Invoice series: one per seller, or one prefixed series per shop? (accountant)
2. Office domain and name.
3. Which accounting software the accountant uses (decides the export format).
4. Peppol provider.
5. What the second shop sells (decides how generic the product form must be in Phase 3).

## Risks
- **Invoice numbering mistakes are legal problems**, not bugs: keep the advisory-lock pattern from
  `issueInvoice` and test that a failed payment transaction never leaves a gap.
- **One database for all shops:** a bug in a query without `shop_id` shows one shop's data in
  another. Make `shop_id` a required argument in every `core` function; consider Postgres row-level security.
- **Scope creep toward an ERP.** Every new module must answer: is it used every week?
