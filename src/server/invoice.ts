import "server-only";
import { companyAddress, COMPANY } from "@/lib/company";
import type { Currency } from "@/lib/money";
import { INTL_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { getDb, type Queryable } from "./db";
import { renderInvoicePdf } from "./invoice-pdf";
import type { VatTreatment } from "./vat";

/*
 * Invoices: one per paid order, issued in the payment transaction, numbered per calendar year
 * without gaps (2026-0001…). What is printed is frozen in `data`, and the PDF is stored as sent,
 * so a later change to prices, names or company details never alters an issued invoice.
 */

export interface Address { name?: string; company?: string; lines: string[]; country?: string }

export interface InvoiceData {
  number: string;
  issuedAt: string;
  lang: Locale;
  currency: Currency;
  /** Units of `currency` per euro at the time of the order. */
  fxRate: number;
  order: string;
  paidAt: string;
  seller: { tradeName: string; legalName: string; address: string; vatNumber: string; register: string; email: string; bank: string; iban: string; bic: string };
  buyer: { type: "private" | "business"; email: string | null; phone: string | null; vatId: string | null; billing: Address; shipping: Address | null };
  /** Amounts in minor units of `currency`, as charged (VAT included for standard sales). */
  lines: { description: string; totalCents: number }[];
  shippingCents: number;
  totalCents: number;
  vat: { treatment: VatTreatment; country: string | null; rate: number; cents: number };
}

type StripeAddress = { line1?: string | null; line2?: string | null; postal_code?: string | null; city?: string | null; state?: string | null; country?: string | null } | null | undefined;

/** Address lines with the country written out in the customer's language ("PL" → "Polska"). */
function addressLines(a: StripeAddress, lang: Locale) {
  if (!a) return [];
  let country = a.country ?? null;
  try { if (country) country = new Intl.DisplayNames([INTL_LOCALE[lang]], { type: "region" }).of(country) ?? country; } catch {}
  return [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.state, country].filter((x): x is string => !!x && x.trim() !== "");
}

/** Gives a just-paid order its invoice (call inside the payment transaction). Returns the number. */
export async function issueInvoice(tx: Queryable, orderId: string): Promise<string> {
  const existing = await tx.query<{ number: string }>("SELECT number FROM invoices WHERE order_id = $1", [orderId]);
  if (existing.rows[0]) return existing.rows[0].number;

  const { rows } = await tx.query<{
    reference: string; currency: string; fx_rate: string; lang: string; customer_type: "private" | "business"; company_name: string | null;
    vat_id: string | null; vat_treatment: VatTreatment; vat_country: string | null; vat_rate: string | null; vat_cents: number | null;
    total_cents: number | null; subtotal_cents: number; shipping_cents: number; paid_at: string; email: string | null; customer: unknown;
  }>("SELECT * FROM orders WHERE id = $1", [orderId]);
  const o = rows[0];
  const lines = await tx.query<{ name: string; total_cents: number }>("SELECT name, total_cents FROM order_lines WHERE order_id = $1 ORDER BY line_no", [orderId]);
  const customer = (typeof o.customer === "string" ? JSON.parse(o.customer) : o.customer) as {
    details?: { name?: string | null; email?: string | null; phone?: string | null; address?: StripeAddress } | null;
    shipping?: { name?: string | null; address?: StripeAddress } | null;
  } | null;

  // Gap-free numbering: one invoice is numbered at a time.
  await tx.query("SELECT pg_advisory_xact_lock(724202)");
  const year = Number(new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "Europe/Brussels" }).format(new Date()));
  const seq = Number((await tx.query<{ n: string }>("SELECT coalesce(max(seq), 0) + 1 AS n FROM invoices WHERE year = $1", [year])).rows[0].n);
  const number = `${year}-${String(seq).padStart(4, "0")}`;

  const lang: Locale = isLocale(o.lang) ? o.lang : "en";
  const billingLines = addressLines(customer?.details?.address, lang);
  const shipping: Address | null = customer?.shipping?.address
    ? { name: customer.shipping.name ?? undefined, lines: addressLines(customer.shipping.address, lang), country: customer.shipping.address?.country ?? undefined }
    : null;
  const data: InvoiceData = {
    number,
    issuedAt: new Date().toISOString(),
    lang,
    currency: o.currency.toUpperCase() as Currency,
    fxRate: Number(o.fx_rate),
    order: o.reference,
    paidAt: new Date(o.paid_at).toISOString(),
    seller: {
      tradeName: COMPANY.tradeName, legalName: COMPANY.legalName, address: companyAddress, vatNumber: COMPANY.vatNumber,
      register: COMPANY.register, email: COMPANY.email, bank: COMPANY.bank, iban: COMPANY.iban, bic: COMPANY.bic,
    },
    buyer: {
      type: o.customer_type,
      email: o.email,
      phone: customer?.details?.phone ?? null,
      vatId: o.vat_id,
      // Without a separate billing address, Stripe only has the shipping one.
      billing: {
        name: customer?.details?.name ?? shipping?.name,
        company: o.company_name ?? undefined,
        lines: billingLines.length ? billingLines : shipping?.lines ?? [],
      },
      shipping,
    },
    lines: lines.rows.map((l) => ({ description: l.name, totalCents: l.total_cents })),
    shippingCents: o.shipping_cents,
    totalCents: o.total_cents ?? o.subtotal_cents + o.shipping_cents,
    vat: { treatment: o.vat_treatment, country: o.vat_country, rate: Number(o.vat_rate ?? 0), cents: o.vat_cents ?? 0 },
  };
  const pdf = await renderInvoicePdf(data);
  await tx.query(
    "INSERT INTO invoices (number, year, seq, order_id, data, pdf) VALUES ($1, $2, $3, $4, $5, $6)",
    [number, year, seq, orderId, JSON.stringify(data), Buffer.from(pdf)],
  );
  return number;
}

export async function invoiceFor(orderId: string): Promise<{ number: string; data: InvoiceData; pdf: Uint8Array } | null> {
  const db = await getDb();
  const { rows } = await db.query<{ number: string; data: InvoiceData | string; pdf: Uint8Array }>("SELECT number, data, pdf FROM invoices WHERE order_id = $1", [orderId]);
  const r = rows[0];
  return r ? { number: r.number, data: typeof r.data === "string" ? JSON.parse(r.data) : r.data, pdf: r.pdf } : null;
}
