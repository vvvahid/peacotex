# LeoPers Office — plan for an own business system

Goal: one system that does what Odoo would do for us — sales, stock, purchasing, bookkeeping
preparation, appointments, till, staff and projects — for every shop and business we run, built from
the code we already have instead of adopting Odoo.

Scope agreed 2026-10-30: all four groups (bookkeeping, sales & stock, appointments & POS, staff &
projects). Bookkeeping level: **the system records and prepares everything; the accountant files**
VAT returns and annual accounts.

First version written 2026-10-30 (commit `d985994`); this version widens it to the full scope.

## Ground rules

- **Peacotex launches first.** Nothing here starts before its launch list is done, and the first
  phase must not change how the live shop behaves.
- **Build what we use every week; connect the rest.** Payroll, Peppol, bank feeds, card
  terminals and shipping labels go through specialist services that the office talks to.
- **Same stack everywhere:** Next.js + TypeScript on Vercel, PostgreSQL on Neon, plain SQL
  migrations, PGlite for local development and tests.
- **Issued documents never change.** Invoices, credit notes and receipts are frozen at issue
  (data + PDF), as Peacotex `invoices` already are. Corrections are new documents.
- **Every module must earn its place:** if it is not used weekly, it waits.

## What we already have

Two working codebases already contain about a third of this:

| From | What | Becomes |
|---|---|---|
| Peacotex | Orders, Stripe checkout + webhook, 12 languages, local currencies | Sales |
| Peacotex | OSS destination VAT, reverse charge, export, VIES check | Tax core |
| Peacotex | Gap-free invoices with frozen data + PDF, confirmation mails (Resend) | Invoicing |
| Peacotex | Product catalogue + photos, stock in metres | Products & stock |
| Nancy Hair Studio | Booking engine (availability, holds, confirm, manage), services, stylists, opening hours | Appointments |
| Nancy Hair Studio | Admin users with roles (owner, manager, stylist), reminders, Stripe deposits with Bancontact | Users & roles, Appointments |
| Both | `db.ts` with pg + PGlite, SQL migrations, Playwright / Vitest tests | Core |

## Odoo apps → our modules

| Odoo app | Our module | Build or connect |
|---|---|---|
| Contacts | **Contacts**: customers, suppliers, staff, one table with roles | Build |
| Sales, eCommerce | **Sales**: quotes, orders, webshop orders, statuses per shop | Build (exists) |
| Invoicing | **Invoicing**: invoices, credit notes, reminders for unpaid invoices | Build (half exists) |
| Inventory | **Stock**: stock ledger, units (m, pcs, ml), locations, low-stock alerts | Build |
| Purchase | **Purchasing**: suppliers, purchase orders, receiving into stock | Build |
| Accounting | **Books**: purchase invoices, bank, matching, VAT overview, accountant export | Build + connect bank and Peppol |
| Appointments | **Appointments**: online booking, staff calendars, reminders, deposits | Build (exists in Nancy) |
| Point of Sale | **Till**: checkout at the desk, receipts, products and services | Build screen + connect card terminal |
| Employees, Time Off | **Staff**: records, contracts, leave, rosters | Build; payroll connects |
| Timesheets, Project | **Projects**: projects, tasks, hours | Build (small) |
| Payroll | — | Connect: social secretariat (SD Worx, Securex, Partena…) |
| Documents | **Files**: every document attached to its record | Build (small) |
| Email Marketing, CRM pipeline | — | Later, or a service (Resend broadcasts, Klaviyo) |
| Manufacturing, Rental, Fleet… | — | Not needed |

## Target shape

One repository (npm workspaces), several Vercel projects, one Neon database:

```
apps/
  office/          the back office — the only app with staff login (office.<domain>)
  peacotex/        storefront
  nancy/           salon website + online booking
  <next-shop>/     further storefronts
packages/
  core/            db, migrations, contacts, sales, invoicing, VAT/VIES, stock, Stripe, mail, files
  books/           purchase invoices, bank, matching, VAT reports, accountant export
  appointments/    availability engine, bookings, reminders
  ui/              shared admin components
```

Storefronts and the salon site import the packages and use the same database, scoped by
`shop_id`, so there is no internal API to build or secure.

## Core data model

- `companies` — legal entity (LeoPers BV first): address, enterprise/VAT number, register, bank,
  Stripe account, invoice series. Replaces `COMPANY` in Peacotex `src/lib/company.ts`.
- `shops` — a sales channel of a company: webshop, salon, till. Domain, languages, currencies,
  sender email, branding, order statuses.
- `contacts` — people and businesses with roles (customer, supplier, employee), VAT id, addresses.
- `products` — goods and services per shop: price, VAT category, unit, stock-tracked yes/no,
  duration (for salon services).
- `sales_orders` + lines — webshop, quote, booking or till sale; all end in the same invoicing.
- `invoices`, `credit_notes`, `receipts` — frozen data + PDF, gap-free series per company.
- `stock_moves` — every stock change as a row (sale, return, purchase receipt, correction).
- `purchase_orders`, `purchase_invoices` — what we buy and what suppliers bill.
- `bank_transactions` — imported statement lines, matched to invoices, purchase invoices or payouts.
- `appointments`, `resources` (staff, chairs), `schedules`, `leave`.
- `projects`, `tasks`, `time_entries`.
- `files` — attachments on any record (object storage: Vercel Blob or Cloudflare R2).
- `users` — staff logins with roles: owner, manager, staff, stylist, accountant (read-only);
  `audit_log` records who changed what.

## Bookkeeping: what “prepare, accountant files” means

The office keeps complete, matched records; the accountant books and files from them.

1. **Sales:** every invoice, credit note and till receipt, with VAT per rate and country.
2. **Purchases:** supplier invoices arrive by Peppol (received through our access point), email
   forwarding or upload; amounts and VAT are read from UBL, or from the PDF and checked by hand.
3. **Bank:** daily statement import — CODA files from Argenta, or a PSD2 service such as Ponto.
4. **Matching:** bank lines matched to sales invoices, purchase invoices and Stripe payouts
   (a Stripe payout is many orders minus fees; fees become a purchase document).
5. **VAT overview** per quarter: Belgian sales and purchases per rate, OSS sales per country (in
   EUR at the ECB rate the OSS rules require), intra-EU reverse-charge sales per customer.
6. **Export** to the accountant's software (Yuki, Exact Online, Octopus… whichever they use),
   by API or monthly files: documents + UBL + CSV.
7. **Peppol** both ways through one access point (e.g. Billit): send B2B invoices to Belgian
   businesses (required since 1 January 2026), receive supplier invoices.

Not built: general ledger, chart of accounts, closing entries, VAT return filing, annual accounts.

## Phases

Each phase ends with something used in daily work.

### Phase 1 — One repository, no visible change (after Peacotex launch)
Move Peacotex and Nancy into the monorepo; extract their server code into `core` and
`appointments`. Both sites keep their URLs and data. **Done when** both deploy from the monorepo
and their existing tests pass.

### Phase 2 — Shared data and the office app
`companies`, `shops`, `contacts`, `users` with roles (Nancy's user model), `audit_log`;
`shop_id` everywhere, backfilled. Office app with sign-in, an orders list across shops, products
and photos per shop. Peacotex `/admin` and Nancy `/admin` move into the office.
**Done when** Peacotex orders and Nancy bookings are managed in one place.

### Phase 3 — Sales and stock
Quotes, credit notes, payment reminders, stock ledger with units and locations, low-stock alerts,
customer history, revenue dashboard per shop/country/month. **Done when** a refund produces a
credit note and stock returns automatically.

### Phase 4 — Books
Purchase invoices, bank import, matching, Stripe payout reconciliation, VAT overview, accountant
export, Peppol send/receive. **Done when** the accountant receives a complete quarter from the
office and confirms they need nothing else.

### Phase 5 — Purchasing
Suppliers, purchase orders, receiving into stock, purchase invoice linked to its order.

### Phase 6 — Till and appointments everywhere
Till screen in the office (tablet-friendly): sell services and products, take card payment through
a connected terminal (Stripe Terminal or SumUp), print or email a receipt, close the day.
Appointments from Nancy become a shared module: walk-in → booking → till → invoice.
**First check the certified cash register (GKS) rules for this business with the accountant**: if
a certified system is required, use a certified till and import its sales instead of building one.

### Phase 7 — Staff and projects
Staff records, contracts on file, leave requests and approval, rosters that feed appointment
availability, timesheets, projects and tasks. Hours and leave exported to the social secretariat
for payroll (no payroll calculation in our system; Dimona stays with them).

### Phase 8 — Next shop
Storefront template from Peacotex with the fabric parts (estimator, dress studio, metres) as
optional modules; onboarding checklist per shop (domain, DNS, sender, Stripe methods, legal texts).

### Later, only when needed
Shipping labels (Sendcloud), marketplace sync, email marketing, CRM pipeline, multiple warehouses.

## Rough size

Estimates for one developer working with Claude; they move with how much each phase is used and
reviewed.

| Phase | Size |
|---|---|
| 1 Monorepo | 1–2 weeks |
| 2 Shared data + office | 3–4 weeks |
| 3 Sales and stock | 3–4 weeks |
| 4 Books | 5–7 weeks |
| 5 Purchasing | 2 weeks |
| 6 Till + appointments | 3–5 weeks (excluding GKS certification) |
| 7 Staff and projects | 3–4 weeks |
| 8 Next shop | 1–2 weeks per shop |

## Decisions to make

1. **Nancy Hair Studio:** is it run by LeoPers BV, another company of ours, or a client? The model
   supports several companies; a client would need its own login scope and agreement.
2. Invoice series: one per company, or one prefixed series per shop? (accountant)
3. The accountant's software, and whether they accept API delivery.
4. Peppol access point, and bank feed (CODA via Argenta or a PSD2 service).
5. Whether a certified cash register applies to the salon or any shop.
6. Social secretariat for payroll.
7. Office domain and name.

## Risks

- **Legal documents:** gap-free numbering, frozen invoices and receipts, VAT treatment. Keep the
  advisory-lock pattern from Peacotex `issueInvoice`; test that a failed payment never leaves a gap.
- **One database for several shops and companies:** a query without `shop_id` or `company_id` leaks
  data. Make them required arguments in every package function; use Postgres row-level security.
- **Personal data (GDPR):** staff records, customer history and salon notes need roles, an audit
  log and a deletion process.
- **Size:** this is several months of work. The phase order makes each step useful on its own, so
  stopping after any phase still leaves a working system.
