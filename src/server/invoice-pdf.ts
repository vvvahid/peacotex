import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatMoney } from "@/lib/money";
import { fill } from "@/i18n/format";
import { INTL_LOCALE } from "@/i18n/config";
import type { InvoiceData } from "./invoice";
import { INVOICE_TEXT, bilingual } from "./invoice-i18n";

/*
 * The invoice as an A4 PDF: logo letterhead, seller and buyer, the items, VAT and totals, the
 * legal VAT note where one applies, and the company's registration and bank details at the foot.
 * Manrope (assets/fonts, SIL Open Font License) carries every European letter the shop needs.
 */

const ASSETS = path.join(process.cwd(), "assets");
const INK = rgb(0.09, 0.08, 0.07);
const MUTED = rgb(0.42, 0.39, 0.35);
const GOLD = rgb(0.62, 0.48, 0.24);
const RULE = rgb(0.85, 0.82, 0.76);

let cached: Promise<{ regular: Uint8Array; semi: Uint8Array; logo: Uint8Array }> | null = null;
const assets = () =>
  (cached ??= Promise.all([
    readFile(path.join(ASSETS, "fonts", "Manrope-Regular.ttf")),
    readFile(path.join(ASSETS, "fonts", "Manrope-SemiBold.ttf")),
    readFile(path.join(ASSETS, "brand", "logo-invoice.png")),
  ]).then(([regular, semi, logo]) => ({ regular, semi, logo })));

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

export async function renderInvoicePdf(d: InvoiceData): Promise<Uint8Array> {
  const { regular, semi, logo } = await assets();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${INVOICE_TEXT.nl.invoice} ${d.number}`);
  doc.setAuthor(d.seller.legalName);
  const font = await doc.embedFont(regular, { subset: true });
  const bold = await doc.embedFont(semi, { subset: true });
  const image = await doc.embedPng(logo);

  const L = bilingual(d.lang);
  const t = INVOICE_TEXT[d.lang];
  const money = (cents: number) => formatMoney(cents / 100, d.currency, d.lang);
  const date = (iso: string) => new Intl.DateTimeFormat(INTL_LOCALE[d.lang], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Brussels" }).format(new Date(iso));

  const W = 595.28, H = 841.89, M = 48;
  let page: PDFPage = doc.addPage([W, H]);
  const text = (s: string, x: number, y: number, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; right?: boolean } = {}) => {
    const size = o.size ?? 9, f = o.f ?? font;
    page.drawText(s, { x: o.right ? x - f.widthOfTextAtSize(s, size) : x, y, size, font: f, color: o.color ?? INK });
  };
  const rule = (y: number) => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: RULE });

  // Letterhead
  const logoW = 150, logoH = (image.height / image.width) * logoW;
  page.drawImage(image, { x: M, y: H - M - logoH, width: logoW, height: logoH });
  let y = H - M - 4;
  text(L("invoice"), W - M, y - 14, { size: 18, f: bold, right: true });
  y -= 40;
  for (const [k, v] of [[L("number"), d.number], [L("date"), date(d.issuedAt)], [L("order"), d.order]] as const) {
    text(k, W - M - 150, y, { color: MUTED, right: true });
    text(v, W - M, y, { f: bold, right: true });
    y -= 14;
  }

  // Seller / bill to / ship to
  y = H - M - logoH - 28;
  const col = (x: number, title: string, rows: string[]) => {
    let yy = y;
    text(title.toUpperCase(), x, yy, { size: 7, f: bold, color: GOLD });
    yy -= 13;
    rows.filter(Boolean).forEach((r, i) => { text(r, x, yy, { f: i === 0 ? bold : font }); yy -= 12; });
    return yy;
  };
  const b = d.buyer;
  const colW = (W - 2 * M) / 3;
  const bottoms = [
    col(M, L("seller"), [`${d.seller.tradeName} – ${d.seller.legalName}`, ...d.seller.address.split(", "), `${INVOICE_TEXT.nl.vatNo}: ${d.seller.vatNumber}`, d.seller.register, d.seller.email]),
    col(M + colW, L("billTo"), [b.billing.company ?? b.billing.name ?? "", ...(b.billing.company && b.billing.name ? [b.billing.name] : []), ...b.billing.lines, b.vatId ? `${t.vatNo}: ${b.vatId}` : "", b.email ?? ""]),
    b.shipping ? col(M + 2 * colW, L("shipTo"), [b.shipping.name ?? "", ...b.shipping.lines]) : y,
  ];
  y = Math.min(...bottoms) - 18;

  // Items
  const standard = d.vat.treatment === "standard";
  const amountLabel = standard ? L("amountIncl") : L("amountExcl");
  rule(y + 12);
  text(L("description"), M, y, { size: 8, f: bold, color: MUTED });
  text(amountLabel, W - M, y, { size: 8, f: bold, color: MUTED, right: true });
  y -= 8;
  rule(y);
  y -= 16;
  const items = [...d.lines.map((l) => ({ label: l.description, cents: l.totalCents })), ...(d.shippingCents ? [{ label: t.shipping, cents: d.shippingCents }] : [])];
  for (const it of items) {
    for (const [i, ln] of wrap(it.label, font, 9.5, W - 2 * M - 120).entries()) {
      text(ln, M, y, { size: 9.5 });
      if (i === 0) text(money(it.cents), W - M, y, { size: 9.5, right: true });
      y -= 13;
    }
    y -= 3;
    if (y < 190) { page = doc.addPage([W, H]); y = H - M; }
  }
  rule(y + 6);

  // Totals
  y -= 12;
  const totalRow = (label: string, value: string, strong = false) => {
    text(label, W - M - 120, y, { size: strong ? 11 : 9.5, f: strong ? bold : font, right: true, color: strong ? INK : MUTED });
    text(value, W - M, y, { size: strong ? 11 : 9.5, f: strong ? bold : font, right: true });
    y -= strong ? 18 : 14;
  };
  const vatPct = `${new Intl.NumberFormat(INTL_LOCALE[d.lang], { maximumFractionDigits: 1 }).format(d.vat.rate * 100)}%`;
  totalRow(L("totalExcl"), money(d.totalCents - d.vat.cents));
  totalRow(`${L("vat")} ${vatPct}${d.vat.country ? ` (${d.vat.country})` : ""}`, money(d.vat.cents));
  totalRow(L("totalIncl"), money(d.totalCents), true);
  if (d.currency !== "EUR" && d.vat.cents > 0) {
    // A foreign-currency invoice states its VAT in euros too.
    const eur = formatMoney(Math.round(d.vat.cents / d.fxRate) / 100, "EUR", d.lang);
    text(fill(INVOICE_TEXT.nl.vatInEur, { rate: String(d.fxRate), amount: eur }), W - M, y, { size: 8, color: MUTED, right: true });
    y -= 11;
    if (d.lang !== "nl") { text(fill(t.vatInEur, { rate: String(d.fxRate), amount: eur }), W - M, y, { size: 8, color: MUTED, right: true }); y -= 11; }
  }

  // Notes: legal VAT wording (Dutch and the customer's language), payment
  y -= 14;
  const note = (s: string, f = font, color = INK) => { for (const ln of wrap(s, f, 8.5, W - 2 * M)) { text(ln, M, y, { size: 8.5, f, color }); y -= 11.5; } };
  if (!standard) {
    const key = d.vat.treatment === "export" ? "export" : "reverseCharge";
    note(INVOICE_TEXT.nl[key], bold);
    if (d.lang !== "nl") note(t[key], bold);
    y -= 4;
  }
  note(fill(INVOICE_TEXT.nl.paid, { date: date(d.paidAt) }), font, MUTED);
  if (d.lang !== "nl") note(fill(t.paid, { date: date(d.paidAt) }), font, MUTED);
  y -= 4;
  note(d.lang === "nl" ? t.thanks : `${INVOICE_TEXT.nl.thanks} ${t.thanks}`, font, MUTED);

  // Foot of every page: legal and bank details
  for (const p of doc.getPages()) {
    page = p;
    page.drawLine({ start: { x: M, y: 62 }, end: { x: W - M, y: 62 }, thickness: 0.6, color: RULE });
    const foot1 = `${d.seller.tradeName} is een handelsnaam van ${d.seller.legalName} · ${d.seller.address}`;
    const foot2 = `${INVOICE_TEXT.nl.vatNo} ${d.seller.vatNumber} · ${d.seller.register} · ${INVOICE_TEXT.nl.bank} ${d.seller.bank} · IBAN ${d.seller.iban} · BIC ${d.seller.bic} · ${d.seller.email}`;
    for (const [i, s] of [foot1, foot2].entries()) {
      const size = 7;
      text(s, (W - font.widthOfTextAtSize(s, size)) / 2, 48 - i * 10, { size, color: MUTED });
    }
  }
  return doc.save();
}
