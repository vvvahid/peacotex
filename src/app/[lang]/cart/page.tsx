"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { linePrice, lineName, useCart } from "@/lib/cart";
import { COMPLEMENTS, SWATCH_SIZE } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalog-client";
import { useI18n } from "@/i18n/client";
import { PaymentMethods } from "@/components/ui/PaymentMethods";
import { BuyerDetails, useBuyer, type VatResult } from "@/components/cart/BuyerDetails";
import { moneyOf } from "@/lib/money";
import { SITE_LIVE } from "@/lib/site";

export default function CartPage() {
  const i18n = useI18n();
  const { t, fill, href, metres: m, lang, rates } = i18n;
  const c = t.cart;
  const { lines, setQty, remove, clear } = useCart();
  const [buyer, setBuyer] = useBuyer();
  const [vatCheck, setVatCheck] = useState<VatResult | null>(null);
  // An EU business outside Belgium (valid VAT number) or a Norwegian business pays without VAT.
  const vatFree = buyer.type === "business" && !!vatCheck?.valid && vatCheck.treatment !== "standard";
  const money = vatFree ? moneyOf(i18n.money.cur, rates, lang, true) : i18n.money;
  const price = money.price;
  const { get: getProduct } = useCatalog();
  const [placed, setPlaced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const fabric = lines.filter((l) => l.kind === "fabric");
  const total = lines.reduce((a, l) => a + linePrice(l, getProduct, money.unit), 0);

  useEffect(() => { setCancelled(new URLSearchParams(window.location.search).has("cancelled")); }, []);

  // The server re-prices the bag from the catalogue and opens Stripe Checkout; we only send what was chosen.
  const checkout = async () => {
    if (buyer.type === "business" && !vatCheck?.valid) { setError(vatCheck?.unavailable ? c.buyer.unavailable : c.buyer.required); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang, currency: money.cur, lines: lines.map(({ kind, slug, qty }) => ({ kind, slug, qty })),
          buyer: buyer.type === "business" ? { type: "business", company: buyer.company, vatId: vatCheck?.vatId ?? buyer.vatId } : { type: "private" },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) { window.location.assign(data.url); return; }
      if (data.error === "not_configured") setPlaced(true);
      else setError(data.error === "stock" ? c.errorStock : data.error === "vat_invalid" ? c.buyer.invalid : data.error === "vat_unavailable" ? c.buyer.unavailable
        : data.error === "business_details" ? c.buyer.required : c.errorGeneric);
    } catch {
      setError(c.errorOffline);
    }
    setBusy(false);
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-44 text-center sm:px-8">
        <p className="eyebrow">{c.demoEyebrow}</p>
        <h1 className="mt-3 text-5xl font-light">{c.demoTitle}</h1>
        <p className="mt-6 text-ivory/75">{c.demoText}</p>
        <button type="button" onClick={() => setPlaced(false)} className="btn btn-line mt-8">{c.back}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-32 pt-40 sm:px-8">
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-3 text-[clamp(2.8rem,6vw,5rem)] font-light">{c.title}</h1>

      {lines.length === 0 ? (
        <div className="card mt-10 p-12 text-center">
          <p className="font-serif text-3xl">{c.emptyTitle}</p>
          <p className="mt-3 text-mist">{fill(c.emptyText, { size: SWATCH_SIZE })}</p>
          <Link href={href("/shop")} className="btn btn-gold mt-6">{c.browse}</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <ul className="divide-y divide-line border-y border-line">
            {lines.map((l) => {
              const p = l.kind === "complement" ? undefined : getProduct(l.slug);
              const comp = l.kind === "complement" ? COMPLEMENTS.find((x) => x.slug === l.slug) : undefined;
              const byMetre = l.kind === "fabric" || (comp?.unit === "m");
              const name = lineName(l, getProduct, i18n);
              return (
                // Every row has the same shape: swatch and name on top, then quantity, price and Remove on one line below.
                <li key={`${l.kind}-${l.slug}`} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-5 gap-y-3 py-6">
                  <span aria-hidden className="row-span-2 h-20 w-16 rounded-xl border border-line" style={{ background: p ? `radial-gradient(circle at 30% 25%, ${p.look.glint}55, ${p.look.ink} 35%, ${p.look.base} 80%)` : "linear-gradient(135deg,#3a332b,#13110e)" }} />
                  <div className="min-w-0">
                    <p className="font-serif text-2xl">{name}</p>
                    <p className="text-sm text-mist">
                      {l.kind === "swatch" ? fill(c.swatchLine, { size: SWATCH_SIZE }) : l.kind === "fabric" ? fill(c.fabricLine, { price: price(p!.pricePerMetre) }) : comp && i18n.complement(comp).note}
                    </p>
                  </div>
                  <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2">
                    {l.kind !== "swatch" && (
                      <label className="flex items-center gap-2 text-sm text-mist">
                        <span className="sr-only sm:not-sr-only">{byMetre ? c.metres : c.qty}</span>
                        <select
                          value={l.qty} onChange={(e) => setQty(l.kind, l.slug, Number(e.target.value))}
                          className="h-10 rounded-full border border-line bg-ink px-3 text-ivory"
                        >
                          {(byMetre ? Array.from({ length: 79 }, (_, i) => 1 + i * 0.5) : [1, 2, 3, 4, 5, 6]).map((v) => <option key={v} value={v}>{byMetre ? m(v) : v}</option>)}
                        </select>
                      </label>
                    )}
                    {/* Price and Remove stay together at the right, even when the line wraps. */}
                    <div className="ml-auto flex items-center gap-5 whitespace-nowrap">
                      <span className="tabular-nums">{money.format(linePrice(l, getProduct, money.unit))}</span>
                      <button type="button" onClick={() => remove(l.kind, l.slug)} className="text-sm text-mist underline underline-offset-4 hover:text-gold">
                        {c.remove}<span className="sr-only"> {name}</span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside aria-labelledby="summary" className="card h-fit p-8">
            <h2 id="summary" className="text-3xl">{c.summary}</h2>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-mist">{c.subtotal}</dt><dd className="tabular-nums">{money.format(total)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-mist">{c.shipping}</dt><dd className="text-right">{fabric.length ? c.shippingRolled : c.shippingSwatch}</dd></div>
            </dl>
            <p className="mt-6 flex justify-between border-t border-line pt-4 font-serif text-2xl"><span>{c.total}</span><span className="tabular-nums">{money.format(total)}</span></p>
            <p className="mt-1 text-xs text-gold/80">{vatFree ? c.buyer.exclVat : t.product.vatIncluded}{SITE_LIVE ? "" : ` · ${c.sampleNote}`}</p>
            <BuyerDetails buyer={buyer} onChange={setBuyer} check={vatCheck} onCheck={setVatCheck} />
            {fabric.length > 0 && (
              <p className="mt-6 rounded-2xl border border-line p-4 text-xs text-ivory/75">
                {c.cutNote}{" "}
                <Link href={href("/service#returns")} className="text-gold underline underline-offset-4">{c.readPolicy}</Link>
              </p>
            )}
            <button type="button" onClick={checkout} disabled={busy} aria-describedby="checkout-msg" className="btn btn-gold mt-6 w-full">
              {busy ? c.opening : c.checkout}
            </button>
            <p id="checkout-msg" role="alert" className="mt-3 min-h-5 text-sm text-gold">{error ?? (cancelled ? c.cancelled : "")}</p>
            <p className="text-xs text-mist">{c.stripeNote}</p>
            <PaymentMethods className="mt-5 border-t border-line pt-5" />
            <button type="button" onClick={clear} className="mt-4 w-full text-sm text-mist underline underline-offset-4">{c.empty}</button>
          </aside>
        </div>
      )}
    </div>
  );
}
