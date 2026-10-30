import "server-only";
import { randomBytes } from "node:crypto";
import { COMPLEMENTS, SWATCH_PRICE, SWATCH_SIZE, type Product } from "@/lib/catalog";
import { DEFAULT_LOCALE, localePath, type Locale } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { moneyOf, toMinor, type Currency, type Money } from "@/lib/money";
import { getRates } from "./rates";
import { SHIP_COUNTRIES, treatmentFor, vatFor, type Buyer, type VatTreatment } from "./vat";
import { checkVat } from "./vies";
import { issueInvoice } from "./invoice";
import { deliverConfirmation } from "./order-mail";
import { loadRecords, toProduct } from "./catalog";
import { getDb, type Queryable } from "./db";
import { stockFor } from "./stock";
import { retrieveSession, stripeRequest, type CheckoutSession } from "./stripe";

/*
 * Prices, quantities and stock are decided here, on the server, from the catalogue. The browser
 * only says *what* it wants; anything it says about prices is ignored.
 */

export class CheckoutError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

const MAX_METRES = 40;
const MAX_SWATCHES = 5;
const MAX_LINES = 30;
// Sample shipping (euros), to be replaced by real rates (per country / tube length).
const SHIP_ROLLED_EUR = 15;

export interface PricedLine { kind: "fabric" | "swatch" | "complement"; slug: string; name: string; qty: number; unit: string; totalCents: number; description: string }

const isHalfStep = (n: number) => Number.isFinite(n) && Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;

/**
 * Prices the bag against `fabrics` (the fabrics on sale, in the shopper's language), in the
 * shopper's currency (`money`; amounts in its minor units). Names and descriptions are in that
 * language: they show on Stripe and in the order.
 */
export function priceCart(input: unknown, fabrics: Map<string, Product>, money: Money, lang: Locale = DEFAULT_LOCALE): { lines: PricedLine[]; subtotalCents: number; rolled: boolean } {
  const cents = (eurUnit: number, qty: number) => toMinor(money.unit(eurUnit) * qty);
  const { t, fill, complement, metres } = getI18n(lang);
  if (!Array.isArray(input) || input.length === 0) throw new CheckoutError("empty", "Your bag is empty.");
  if (input.length > MAX_LINES) throw new CheckoutError("too_many", "Too many items in one order.");
  const seen = new Set<string>();
  const lines: PricedLine[] = [];
  let swatches = 0;

  for (const raw of input) {
    const { kind, slug, qty } = (raw ?? {}) as { kind?: unknown; slug?: unknown; qty?: unknown };
    if (typeof slug !== "string" || typeof qty !== "number") throw new CheckoutError("invalid", "Invalid item in bag.");
    const key = `${kind}:${slug}`;
    if (seen.has(key)) throw new CheckoutError("invalid", "Duplicate item in bag.");
    seen.add(key);

    if (kind === "fabric") {
      const p = fabrics.get(slug);
      if (!p) throw new CheckoutError("unknown", "A fabric in your bag is no longer available.");
      if (!isHalfStep(qty) || qty < p.minMetres || qty > MAX_METRES) throw new CheckoutError("qty", `${p.name}: order from ${p.minMetres} m in 0.5 m steps.`);
      lines.push({ kind, slug, name: `${p.name} — ${metres(qty)}`, qty, unit: "m", totalCents: cents(p.pricePerMetre, qty), description: fill(t.checkout.fabricDescription, { tagline: p.tagline }) });
    } else if (kind === "swatch") {
      const p = fabrics.get(slug);
      if (!p) throw new CheckoutError("unknown", "A swatch in your bag is no longer available.");
      if (qty !== 1) throw new CheckoutError("qty", "One swatch per fabric.");
      if (++swatches > MAX_SWATCHES) throw new CheckoutError("qty", `Up to ${MAX_SWATCHES} swatches per order.`);
      lines.push({ kind, slug, name: `${p.name} — ${t.cart.swatch}`, qty: 1, unit: "piece", totalCents: cents(SWATCH_PRICE, 1), description: fill(t.cart.swatchLine, { size: SWATCH_SIZE }) });
    } else if (kind === "complement") {
      const found = COMPLEMENTS.find((x) => x.slug === slug);
      if (!found) throw new CheckoutError("unknown", "An item in your bag is no longer available.");
      const c = complement(found);
      const ok = c.unit === "m" ? isHalfStep(qty) && qty >= 0.5 && qty <= MAX_METRES : Number.isInteger(qty) && qty >= 1 && qty <= 10;
      if (!ok) throw new CheckoutError("qty", `${c.name}: invalid quantity.`);
      lines.push({ kind, slug, name: c.unit === "m" ? `${c.name} — ${metres(qty)}` : `${c.name} × ${qty}`, qty, unit: c.unit === "m" ? "m" : "piece", totalCents: cents(c.price, qty), description: c.note });
    } else {
      throw new CheckoutError("invalid", "Invalid item in bag.");
    }
  }
  return {
    lines,
    subtotalCents: lines.reduce((a, l) => a + l.totalCents, 0),
    rolled: lines.some((l) => l.kind !== "swatch"),
  };
}

const newReference = () => `PTX-${randomBytes(4).toString("hex").toUpperCase()}`;

/** Checks a business buyer's VAT number and decides how VAT applies (see server/vat.ts). */
async function businessTerms(buyer: Buyer) {
  const company = (buyer.company ?? "").trim().slice(0, 120);
  if (!company || !buyer.vatId) throw new CheckoutError("business_details", "Enter your company name and VAT number.");
  const check = await checkVat(buyer.vatId);
  if (check.unavailable) throw new CheckoutError("vat_unavailable", "The EU VAT check is unavailable. Please try again.", 503);
  if (!check.valid) throw new CheckoutError("vat_invalid", "This VAT number is not valid.");
  return { company, vatId: check.vatId, country: check.country, treatment: treatmentFor(check) };
}

/** Validates the bag, records a pending order and opens a Stripe Checkout session for it. */
export async function startCheckout(input: unknown, origin: string, lang: Locale = DEFAULT_LOCALE, currency: Currency = "EUR", buyer: Buyer = { type: "private" }): Promise<{ url: string; reference: string }> {
  const { t } = getI18n(lang);
  const db = await getDb();
  const business = buyer.type === "business" ? await businessTerms(buyer) : null;
  const treatment: VatTreatment = business?.treatment ?? "standard";
  // VAT-free sales (reverse charge, export) pay the catalogue price without Belgian VAT.
  const money = moneyOf(currency, await getRates(), lang, treatment !== "standard");
  // Prices straight from the database (not the page cache), so an admin price change applies at once.
  const fabrics = new Map((await loadRecords(db)).filter((r) => r.active).map((r) => [r.slug, toProduct(r, lang)]));
  const priced = priceCart(input, fabrics, money, lang);

  const fabric = priced.lines.filter((l) => l.kind === "fabric");
  const stock = await stockFor(db, fabric.map((l) => l.slug));
  for (const l of fabric) {
    const have = stock.get(l.slug) ?? 0;
    if (have < l.qty) throw new CheckoutError("stock", `Only ${have} m of ${fabrics.get(l.slug)!.name} left. Please reduce the length.`, 409);
  }

  const shippingCents = priced.rolled ? toMinor(money.unit(SHIP_ROLLED_EUR)) : 0;
  const reference = newReference();
  const orderId = await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO orders (reference, subtotal_cents, shipping_cents, currency, fx_rate, lang, customer_type, company_name, vat_id, vat_treatment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [reference, priced.subtotalCents, shippingCents, currency.toLowerCase(), money.rate, lang, buyer.type === "business" ? "business" : "private",
        business?.company ?? null, business?.vatId ?? null, treatment],
    );
    const id = rows[0].id;
    for (const [i, l] of priced.lines.entries()) {
      await tx.query(
        "INSERT INTO order_lines (order_id, line_no, kind, slug, name, qty, unit, total_cents) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [id, i + 1, l.kind, l.slug, l.name, l.qty, l.unit, l.totalCents],
      );
    }
    return id;
  });

  const session = await stripeRequest<CheckoutSession>("POST", "/checkout/sessions", {
    mode: "payment",
    locale: lang, // Stripe's page speaks every language the site does
    line_items: priced.lines.map((l) => ({
      quantity: 1,
      price_data: { currency: currency.toLowerCase(), unit_amount: l.totalCents, product_data: { name: l.name, description: l.description } },
    })),
    client_reference_id: orderId,
    metadata: { order_id: orderId, reference },
    payment_intent_data: { metadata: { order_id: orderId, reference }, description: `Peacotex order ${reference}` },
    // A VAT-free business sale must ship to the country of the buyer's VAT number.
    shipping_address_collection: { allowed_countries: treatment === "standard" ? SHIP_COUNTRIES : [business!.country] },
    phone_number_collection: { enabled: true },
    shipping_options: [{
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: priced.rolled ? t.checkout.shipRolled : t.checkout.shipSwatch,
        fixed_amount: { amount: shippingCents, currency: currency.toLowerCase() },
      },
    }],
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    success_url: `${origin}${localePath(lang, "/checkout/success")}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${localePath(lang, "/cart")}?cancelled=1`,
  }, `checkout-${orderId}`);

  await db.query("UPDATE orders SET stripe_session_id = $1 WHERE id = $2", [session.id, orderId]);
  if (!session.url) throw new CheckoutError("stripe", "Payment page could not be opened.", 502);
  return { url: session.url, reference };
}

export interface OrderView {
  reference: string; status: string; totalCents: number | null; shippingCents: number; email: string | null; currency: Currency;
  invoiceNumber: string | null;
  lines: { name: string; totalCents: number }[];
}

async function orderView(db: Queryable, sessionId: string): Promise<OrderView | null> {
  const { rows } = await db.query<{ id: string; reference: string; status: string; total_cents: number | null; shipping_cents: number; email: string | null; currency: string; invoice: string | null }>(
    "SELECT o.id, o.reference, o.status, o.total_cents, o.shipping_cents, o.email, o.currency, i.number AS invoice FROM orders o LEFT JOIN invoices i ON i.order_id = o.id WHERE o.stripe_session_id = $1", [sessionId],
  );
  const o = rows[0];
  if (!o) return null;
  const lines = await db.query<{ name: string; total_cents: number }>("SELECT name, total_cents FROM order_lines WHERE order_id = $1 ORDER BY line_no", [o.id]);
  return {
    reference: o.reference, status: o.status, totalCents: o.total_cents, shippingCents: o.shipping_cents, email: o.email, currency: o.currency.toUpperCase() as Currency,
    invoiceNumber: o.invoice,
    lines: lines.rows.map((l) => ({ name: l.name, totalCents: l.total_cents })),
  };
}

/**
 * Marks an order paid once Stripe confirms it, and takes the metres off stock. Called from the
 * webhook and from the success page; safe to run any number of times (only the first one acts).
 * Payment status is always read back from Stripe, never taken from the caller.
 */
export async function fulfil(sessionId: string): Promise<OrderView | null> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  const db = await getDb();
  const session = await retrieveSession(sessionId);

  if (session.status === "expired") {
    await db.query("UPDATE orders SET status = 'expired' WHERE stripe_session_id = $1 AND status = 'pending'", [sessionId]);
  }
  if (session.payment_status === "paid") {
    await db.transaction(async (tx) => {
      const { rows } = await tx.query<{ id: string; subtotal_cents: number; shipping_cents: number; vat_treatment: VatTreatment; customer_type: string }>(
        `UPDATE orders SET status = 'paid', paid_at = now(), payment_intent = $2, total_cents = $3, email = $4, customer = $5
         WHERE stripe_session_id = $1 AND id::text = $6 AND status IN ('pending', 'expired')
         RETURNING id, subtotal_cents, shipping_cents, vat_treatment, customer_type`,
        [
          sessionId, session.payment_intent, session.amount_total, session.customer_details?.email ?? null,
          JSON.stringify({ details: session.customer_details ?? null, shipping: session.collected_information?.shipping_details ?? session.shipping_details ?? null }),
          session.client_reference_id ?? "",
        ],
      );
      const order = rows[0];
      if (!order) return; // already fulfilled, or not ours
      // VAT included in what was paid (none for reverse charge and export).
      const shipping = session.collected_information?.shipping_details ?? session.shipping_details;
      const country = (shipping as { address?: { country?: string } } | null)?.address?.country;
      const vat = vatFor(session.amount_total ?? 0, order.vat_treatment, order.customer_type, country);
      if (vat) await tx.query("UPDATE orders SET vat_country = $2, vat_rate = $3, vat_cents = $4 WHERE id = $1", [order.id, vat.country, vat.rate, vat.cents]);
      const problems: string[] = [];
      if (session.amount_total !== order.subtotal_cents + order.shipping_cents) problems.push(`Amount paid ${session.amount_total} differs from order total ${order.subtotal_cents + order.shipping_cents}.`);
      const fabric = await tx.query<{ slug: string; qty: string }>("SELECT slug, qty FROM order_lines WHERE order_id = $1 AND kind = 'fabric'", [order.id]);
      for (const l of fabric.rows) {
        const res = await tx.query("UPDATE fabric_stock SET metres = metres - $2, updated_at = now() WHERE slug = $1 AND metres >= $2 RETURNING slug", [l.slug, l.qty]);
        if (!res.rows.length) problems.push(`Not enough stock for ${l.slug} (${l.qty} m) at payment time.`);
      }
      if (problems.length) await tx.query("UPDATE orders SET status = 'needs_attention', note = $2 WHERE id = $1", [order.id, problems.join(" ")]);
      // The invoice is part of the payment: numbered in this transaction, so a number is never lost or reused.
      await issueInvoice(tx, order.id);
    });
    // Confirmation email with the invoice; a later call retries if it did not go out.
    const { rows } = await db.query<{ id: string }>(
      "SELECT id FROM orders WHERE stripe_session_id = $1 AND status IN ('paid', 'needs_attention', 'cut', 'shipped') AND email_sent_at IS NULL", [sessionId],
    );
    if (rows[0]) await deliverConfirmation(rows[0].id).catch((err) => console.error("confirmation email failed", err));
  }
  return orderView(db, sessionId);
}

export async function markExpired(sessionId: string) {
  const db = await getDb();
  await db.query("UPDATE orders SET status = 'expired' WHERE stripe_session_id = $1 AND status = 'pending'", [sessionId]);
}
