import "server-only";
import { randomBytes } from "node:crypto";
import { COMPLEMENTS, getProduct, SWATCH_PRICE, SWATCH_SIZE } from "@/lib/catalog";
import { DEFAULT_LOCALE, localePath, type Locale } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
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
// Sample shipping, to be replaced by real rates (per country / tube length).
const SHIP_ROLLED_CENTS = 1500;
const COUNTRIES = ["NL", "BE", "LU", "DE", "FR", "AT", "IT", "ES", "PT", "IE", "DK", "SE", "FI"];

export interface PricedLine { kind: "fabric" | "swatch" | "complement"; slug: string; name: string; qty: number; unit: string; totalCents: number; description: string }

const isHalfStep = (n: number) => Number.isFinite(n) && Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;

/** Prices the bag; names and descriptions are in the shopper's language (they show on Stripe and in the order). */
export function priceCart(input: unknown, lang: Locale = DEFAULT_LOCALE): { lines: PricedLine[]; subtotalCents: number; rolled: boolean } {
  const { t, fill, product, complement, metres } = getI18n(lang);
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
      const raw = getProduct(slug);
      if (!raw) throw new CheckoutError("unknown", "A fabric in your bag is no longer available.");
      const p = product(raw);
      if (!isHalfStep(qty) || qty < p.minMetres || qty > MAX_METRES) throw new CheckoutError("qty", `${p.name}: order from ${p.minMetres} m in 0.5 m steps.`);
      lines.push({ kind, slug, name: `${p.name} — ${metres(qty)}`, qty, unit: "m", totalCents: Math.round(p.pricePerMetre * 100 * qty), description: fill(t.checkout.fabricDescription, { tagline: p.tagline }) });
    } else if (kind === "swatch") {
      const p = getProduct(slug);
      if (!p) throw new CheckoutError("unknown", "A swatch in your bag is no longer available.");
      if (qty !== 1) throw new CheckoutError("qty", "One swatch per fabric.");
      if (++swatches > MAX_SWATCHES) throw new CheckoutError("qty", `Up to ${MAX_SWATCHES} swatches per order.`);
      lines.push({ kind, slug, name: `${p.name} — ${t.cart.swatch}`, qty: 1, unit: "piece", totalCents: SWATCH_PRICE * 100, description: fill(t.cart.swatchLine, { size: SWATCH_SIZE }) });
    } else if (kind === "complement") {
      const found = COMPLEMENTS.find((x) => x.slug === slug);
      if (!found) throw new CheckoutError("unknown", "An item in your bag is no longer available.");
      const c = complement(found);
      const ok = c.unit === "m" ? isHalfStep(qty) && qty >= 0.5 && qty <= MAX_METRES : Number.isInteger(qty) && qty >= 1 && qty <= 10;
      if (!ok) throw new CheckoutError("qty", `${c.name}: invalid quantity.`);
      lines.push({ kind, slug, name: c.unit === "m" ? `${c.name} — ${metres(qty)}` : `${c.name} × ${qty}`, qty, unit: c.unit === "m" ? "m" : "piece", totalCents: Math.round(c.price * 100 * qty), description: c.note });
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

/** Validates the bag, records a pending order and opens a Stripe Checkout session for it. */
export async function startCheckout(input: unknown, origin: string, lang: Locale = DEFAULT_LOCALE): Promise<{ url: string; reference: string }> {
  const priced = priceCart(input, lang);
  const { t } = getI18n(lang);
  const db = await getDb();

  const fabric = priced.lines.filter((l) => l.kind === "fabric");
  const stock = await stockFor(db, fabric.map((l) => l.slug));
  for (const l of fabric) {
    const have = stock.get(l.slug) ?? 0;
    if (have < l.qty) throw new CheckoutError("stock", `Only ${have} m of ${getProduct(l.slug)!.name} left. Please reduce the length.`, 409);
  }

  const shippingCents = priced.rolled ? SHIP_ROLLED_CENTS : 0;
  const reference = newReference();
  const orderId = await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      "INSERT INTO orders (reference, subtotal_cents, shipping_cents) VALUES ($1, $2, $3) RETURNING id",
      [reference, priced.subtotalCents, shippingCents],
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
      price_data: { currency: "eur", unit_amount: l.totalCents, product_data: { name: l.name, description: l.description } },
    })),
    client_reference_id: orderId,
    metadata: { order_id: orderId, reference },
    payment_intent_data: { metadata: { order_id: orderId, reference }, description: `Peacotex order ${reference}` },
    shipping_address_collection: { allowed_countries: COUNTRIES },
    phone_number_collection: { enabled: true },
    shipping_options: [{
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: priced.rolled ? t.checkout.shipRolled : t.checkout.shipSwatch,
        fixed_amount: { amount: shippingCents, currency: "eur" },
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
  reference: string; status: string; totalCents: number | null; shippingCents: number; email: string | null;
  lines: { name: string; totalCents: number }[];
}

async function orderView(db: Queryable, sessionId: string): Promise<OrderView | null> {
  const { rows } = await db.query<{ id: string; reference: string; status: string; total_cents: number | null; shipping_cents: number; email: string | null }>(
    "SELECT id, reference, status, total_cents, shipping_cents, email FROM orders WHERE stripe_session_id = $1", [sessionId],
  );
  const o = rows[0];
  if (!o) return null;
  const lines = await db.query<{ name: string; total_cents: number }>("SELECT name, total_cents FROM order_lines WHERE order_id = $1 ORDER BY line_no", [o.id]);
  return {
    reference: o.reference, status: o.status, totalCents: o.total_cents, shippingCents: o.shipping_cents, email: o.email,
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
      const { rows } = await tx.query<{ id: string; subtotal_cents: number; shipping_cents: number }>(
        `UPDATE orders SET status = 'paid', paid_at = now(), payment_intent = $2, total_cents = $3, email = $4, customer = $5
         WHERE stripe_session_id = $1 AND id::text = $6 AND status IN ('pending', 'expired')
         RETURNING id, subtotal_cents, shipping_cents`,
        [
          sessionId, session.payment_intent, session.amount_total, session.customer_details?.email ?? null,
          JSON.stringify({ details: session.customer_details ?? null, shipping: session.collected_information?.shipping_details ?? session.shipping_details ?? null }),
          session.client_reference_id ?? "",
        ],
      );
      const order = rows[0];
      if (!order) return; // already fulfilled, or not ours
      const problems: string[] = [];
      if (session.amount_total !== order.subtotal_cents + order.shipping_cents) problems.push(`Amount paid ${session.amount_total} differs from order total ${order.subtotal_cents + order.shipping_cents}.`);
      const fabric = await tx.query<{ slug: string; qty: string }>("SELECT slug, qty FROM order_lines WHERE order_id = $1 AND kind = 'fabric'", [order.id]);
      for (const l of fabric.rows) {
        const res = await tx.query("UPDATE fabric_stock SET metres = metres - $2, updated_at = now() WHERE slug = $1 AND metres >= $2 RETURNING slug", [l.slug, l.qty]);
        if (!res.rows.length) problems.push(`Not enough stock for ${l.slug} (${l.qty} m) at payment time.`);
      }
      if (problems.length) await tx.query("UPDATE orders SET status = 'needs_attention', note = $2 WHERE id = $1", [order.id, problems.join(" ")]);
    });
  }
  return orderView(db, sessionId);
}

export async function markExpired(sessionId: string) {
  const db = await getDb();
  await db.query("UPDATE orders SET status = 'expired' WHERE stripe_session_id = $1 AND status = 'pending'", [sessionId]);
}
