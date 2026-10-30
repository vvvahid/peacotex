# Launch checklist

Everything is prepared while the site stays in demo mode. On launch day one setting
(`NEXT_PUBLIC_SITE_LIVE=true`) removes the demo banner and notes and lets search engines in.

Status 2026-10-30: the VAT registration is submitted and takes about a week to become active.

Keys and passwords are entered by you in the provider's own screens and in Vercel → Settings →
Environment Variables (Production). Never paste them into a chat or commit them.

## This week (in any order)

### 1. Real photos — you
- `/admin` → each fabric → upload your own photos (the site still shows 60 stock photos).
- Check prices, names and descriptions per fabric while you are there.

### 2. Email (Resend) — you, then me
1. Create an account on resend.com → **Domains → Add domain** → `peacotex.com`, region EU.
2. Resend shows DNS records (DKIM and a `send` subdomain for SPF/MX). Add exactly those in
   Cloudflare → peacotex.com → DNS, with the proxy **off** (grey cloud). They don't touch the
   IONOS mail records on the main domain, so sales@peacotex.com keeps working.
3. When Resend says **Verified**: API Keys → create a key with "Sending access".
4. In Vercel (Production): `RESEND_API_KEY` = that key, `MAIL_FROM` = `Peacotex <orders@peacotex.com>`.
5. Tell me; I send a test order confirmation.

### 3. Domain — you, then me
1. Vercel → project → Settings → **Domains** → add `peacotex.com` and `www.peacotex.com`
   (redirect www → peacotex.com).
2. Vercel shows the records to create (usually an A record for `@` and a CNAME for `www`).
   Add them in Cloudflare with the proxy **off** (grey cloud). Keep the IONOS MX and SPF records.
3. In Vercel (Production): `NEXT_PUBLIC_SITE_URL` = `https://peacotex.com`.
4. Tell me; I check the certificate, redirects and that mail still arrives.

### 4. Stripe live — you, then me
1. Stripe → activate the account for LeoPers BV (company details, bank account).
2. Settings → **Payment methods**: turn on Bancontact, iDEAL, Przelewy24, MobilePay, Swish and
   Google Pay where Stripe allows them.
3. Developers → API keys (live): put the secret key in Vercel as `STRIPE_SECRET_KEY` (Production).
4. Developers → Webhooks → add endpoint `https://peacotex.com/api/stripe/webhook` with the events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`;
   put its signing secret in Vercel as `STRIPE_WEBHOOK_SECRET`.
5. Tell me which methods Stripe accepted; I turn them on in `src/lib/payments.ts`.

### 5. Vercel plan — you
The free Hobby plan is for non-commercial use; a shop needs **Pro** before launch.

### 6. Accountant
- VAT number active in VIES (submitted, ~1 week).
- Invoice numbering: one series for LeoPers BV, or a prefix per shop (needed before LeoPers Office
  issues invoices too).

## Launch day

1. I check the VAT number in VIES.
2. You set `NEXT_PUBLIC_SITE_LIVE` = `true` in Vercel (Production) and **Redeploy**.
3. Together: a real order with a small amount → payment, confirmation email, invoice PDF and the
   order in `/admin` → refund it in Stripe.
4. Submit `https://peacotex.com` in Google Search Console.

## After launch
Connect Peacotex to LeoPers Office (orders, invoices and stock into the office), then Phase 4 (books).
