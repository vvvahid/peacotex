"use client";

import Link from "next/link";
import { useState } from "react";
import { linePrice, lineName, useCart } from "@/lib/cart";
import { COMPLEMENTS, formatPrice, getProduct, SWATCH_SIZE } from "@/lib/catalog";

export default function CartPage() {
  const { lines, total, setQty, remove, clear } = useCart();
  const [placed, setPlaced] = useState(false);
  const fabric = lines.filter((l) => l.kind === "fabric");

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-44 text-center sm:px-8">
        <p className="eyebrow">Demo</p>
        <h1 className="mt-3 text-5xl font-light">This is where checkout would begin.</h1>
        <p className="mt-6 text-ivory/75">No order was placed and no payment taken: this site is a front-end demo. Your bag has been kept.</p>
        <button type="button" onClick={() => setPlaced(false)} className="btn btn-line mt-8">Back to bag</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-32 pt-40 sm:px-8">
      <p className="eyebrow">Your bag</p>
      <h1 className="mt-3 text-[clamp(2.8rem,6vw,5rem)] font-light">Bag</h1>

      {lines.length === 0 ? (
        <div className="card mt-10 p-12 text-center">
          <p className="font-serif text-3xl">Your bag is empty.</p>
          <p className="mt-3 text-mist">Start with swatches: up to five, {SWATCH_SIZE}.</p>
          <Link href="/shop" className="btn btn-gold mt-6">Browse fabrics</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <ul className="divide-y divide-line border-y border-line">
            {lines.map((l) => {
              const p = l.kind === "complement" ? undefined : getProduct(l.slug);
              const c = l.kind === "complement" ? COMPLEMENTS.find((x) => x.slug === l.slug) : undefined;
              const metres = l.kind === "fabric" || (c?.unit === "m");
              return (
                <li key={`${l.kind}-${l.slug}`} className="flex flex-wrap items-center gap-5 py-6">
                  <span aria-hidden className="h-20 w-16 shrink-0 rounded-xl border border-line" style={{ background: p ? `radial-gradient(circle at 30% 25%, ${p.look.glint}55, ${p.look.ink} 35%, ${p.look.base} 80%)` : "linear-gradient(135deg,#3a332b,#13110e)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-2xl">{lineName(l)}</p>
                    <p className="text-sm text-mist">
                      {l.kind === "swatch" ? `${SWATCH_SIZE} swatch` : l.kind === "fabric" ? `${formatPrice(p!.pricePerMetre)} per metre · ships rolled` : c?.note}
                    </p>
                  </div>
                  {l.kind !== "swatch" && (
                    <label className="flex items-center gap-2 text-sm text-mist">
                      {metres ? "Metres" : "Qty"}
                      <select
                        value={l.qty} onChange={(e) => setQty(l.kind, l.slug, Number(e.target.value))}
                        className="h-10 rounded-full border border-line bg-ink px-3 text-ivory"
                      >
                        {(metres ? Array.from({ length: 79 }, (_, i) => 1 + i * 0.5) : [1, 2, 3, 4, 5, 6]).map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>
                  )}
                  <span className="w-24 text-right tabular-nums">{formatPrice(linePrice(l))}</span>
                  <button type="button" onClick={() => remove(l.kind, l.slug)} className="text-sm text-mist underline underline-offset-4 hover:text-gold">
                    Remove<span className="sr-only"> {lineName(l)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <aside aria-labelledby="summary" className="card h-fit p-8">
            <h2 id="summary" className="text-3xl">Summary</h2>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd className="tabular-nums">{formatPrice(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-mist">Shipping</dt><dd>{fabric.length ? "Rolled, insured · at checkout" : "Swatch envelope · free"}</dd></div>
            </dl>
            <p className="mt-6 flex justify-between border-t border-line pt-4 font-serif text-2xl"><span>Total</span><span className="tabular-nums">{formatPrice(total)}</span></p>
            <p className="mt-1 text-xs text-gold/80">Sample prices · demo only</p>
            {fabric.length > 0 && (
              <p className="mt-6 rounded-2xl border border-line p-4 text-xs text-ivory/75">
                Fabric is cut to your length. Cut fabric can only be returned if it is faulty.{" "}
                <Link href="/service#returns" className="text-gold underline underline-offset-4">Read the policy</Link>
              </p>
            )}
            <button type="button" onClick={() => setPlaced(true)} className="btn btn-gold mt-6 w-full">Checkout (demo)</button>
            <button type="button" onClick={clear} className="mt-4 w-full text-sm text-mist underline underline-offset-4">Empty bag</button>
          </aside>
        </div>
      )}
    </div>
  );
}
