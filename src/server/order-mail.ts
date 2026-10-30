import "server-only";
import { COMPANY, companyAddress } from "@/lib/company";
import { formatMoney } from "@/lib/money";
import { INTL_LOCALE } from "@/i18n/config";
import { fill } from "@/i18n/format";
import { getDict } from "@/i18n/server";
import { getDb } from "./db";
import { invoiceFor, type InvoiceData } from "./invoice";
import { copyAddress, sendMail } from "./mail";

/*
 * The order confirmation: a letterheaded email in the customer's language with the invoice PDF
 * attached, and a copy (bcc) to the shop. Sent once per order: the send is claimed by setting
 * orders.email_sent_at first, and released again if it fails, so a later call can retry.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3100");

export function confirmationEmail(d: InvoiceData) {
  const t = getDict(d.lang).mail;
  const money = (cents: number) => formatMoney(cents / 100, d.currency, d.lang);
  const name = d.buyer.billing.name?.split(" ")[0] || d.buyer.billing.company || "";
  const pct = `${new Intl.NumberFormat(INTL_LOCALE[d.lang], { maximumFractionDigits: 1 }).format(d.vat.rate * 100)}%`;
  const vatLine = d.vat.treatment === "standard" ? fill(t.vat, { rate: pct, amount: money(d.vat.cents) }) : t.noVat;
  const ship = d.buyer.shipping ?? d.buyer.billing;
  const rows = [...d.lines.map((l) => [l.description, money(l.totalCents)]), ...(d.shippingCents ? [[t.shipping, money(d.shippingCents)]] : [])];
  const site = siteUrl();

  const cell = "padding:10px 0;border-bottom:1px solid #e8e1d4;font-size:14px;color:#2a2622";
  const html = `<!doctype html><html lang="${d.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(fill(t.subject, { ref: d.order }))}</title></head>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:Helvetica,Arial,sans-serif;color:#2a2622">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td align="center" style="padding:36px 32px 8px"><img src="${site}/brand/logo-email.png" width="180" alt="Peacotex Atelier" style="display:block;width:180px;height:auto;border:0"></td></tr>
  <tr><td style="padding:16px 40px 0">
    <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;color:#1b1814">${esc(t.title)}</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(fill(t.hello, { name }))}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6">${esc(fill(t.intro, { ref: d.order }))}</p>
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9c7a3e">${esc(t.items)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rows.map(([a, b]) => `<tr><td style="${cell}">${esc(a)}</td><td align="right" style="${cell};white-space:nowrap">${esc(b)}</td></tr>`).join("")}
      <tr><td style="padding:14px 0 2px;font-size:16px;font-weight:bold">${esc(t.total)}</td><td align="right" style="padding:14px 0 2px;font-size:16px;font-weight:bold;white-space:nowrap">${esc(money(d.totalCents))}</td></tr>
      <tr><td colspan="2" align="right" style="padding:0 0 8px;font-size:12px;color:#7a7268">${esc(vatLine)}</td></tr>
    </table>
    <p style="margin:24px 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9c7a3e">${esc(t.shipTo)}</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6">${[ship.name, ...ship.lines].filter(Boolean).map((x) => esc(x!)).join("<br>")}</p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;background:#f8f4ec;border-radius:10px;padding:12px 16px">${esc(fill(t.invoice, { number: d.number }))}</p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6">${esc(t.next)}</p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.6">${esc(fill(t.questions, { email: COMPANY.email }))}</p>
    <p style="margin:0 0 32px;font-size:14px;line-height:1.6">${esc(t.regards)}<br>Peacotex</p>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#1b1814;color:#bdb3a3;font-size:11px;line-height:1.6" align="center">
    ${esc(fill(getDict(d.lang).footer.legal, { trade: COMPANY.tradeName, company: COMPANY.legalName }))} · ${esc(companyAddress)}<br>
    ${esc(getDict(d.lang).footer.vat)} ${esc(COMPANY.vatNumber)} · <a href="mailto:${COMPANY.email}" style="color:#e6d2a2">${COMPANY.email}</a> · <a href="${site}" style="color:#e6d2a2">${COMPANY.web}</a>
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    t.title, "", fill(t.hello, { name }), fill(t.intro, { ref: d.order }), "",
    ...rows.map(([a, b]) => `${a}: ${b}`), `${t.total}: ${money(d.totalCents)} (${vatLine})`, "",
    `${t.shipTo}: ${[ship.name, ...ship.lines].filter(Boolean).join(", ")}`, "",
    fill(t.invoice, { number: d.number }), t.next, fill(t.questions, { email: COMPANY.email }), "", t.regards, "Peacotex", "",
    `${fill(getDict(d.lang).footer.legal, { trade: COMPANY.tradeName, company: COMPANY.legalName })}, ${companyAddress}, ${COMPANY.vatNumber}`,
  ].join("\n");
  return { subject: fill(t.subject, { ref: d.order }), html, text };
}

/**
 * Sends the confirmation for a paid order. `force` sends again even if it went out before (admin
 * "resend"). Returns true when a message was handed to the mail provider.
 */
export async function deliverConfirmation(orderId: string, force = false): Promise<boolean> {
  const db = await getDb();
  const claim = await db.query<{ email: string | null }>(
    `UPDATE orders SET email_sent_at = now() WHERE id = $1 AND (email_sent_at IS NULL OR $2) AND email IS NOT NULL RETURNING email`,
    [orderId, force],
  );
  const to = claim.rows[0]?.email;
  if (!to) return false;
  try {
    const inv = await invoiceFor(orderId);
    if (!inv) throw new Error("no invoice for order");
    const mail = confirmationEmail(inv.data);
    const sent = await sendMail({
      to, bcc: copyAddress(), ...mail,
      attachments: [{ filename: `Peacotex-${inv.number}.pdf`, content: inv.pdf }],
      idempotencyKey: force ? undefined : `confirmation-${orderId}`,
    });
    if (!sent) throw new Error("mail provider not configured");
    return true;
  } catch (err) {
    if (!force) await db.query("UPDATE orders SET email_sent_at = NULL WHERE id = $1", [orderId]);
    throw err;
  }
}
