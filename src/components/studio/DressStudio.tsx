"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import { DEFAULT_FIT, Estimator, type Fit } from "@/components/product/Estimator";
import { DressFigure } from "@/components/studio/DressFigure";
import { useCart } from "@/lib/cart";
import { PRODUCTS, SWATCH_PRICE, formatPrice, getProduct } from "@/lib/catalog";

export function DressStudio({ initialSlug }: { initialSlug?: string }) {
  const [slug, setSlug] = useState(getProduct(initialSlug ?? "")?.slug ?? PRODUCTS[0].slug);
  const [fit, setFit] = useState<Fit>(DEFAULT_FIT);
  const [notice, setNotice] = useState("");
  const { add, lines } = useCart();
  const p = getProduct(slug)!;
  const hasSwatch = lines.some((l) => l.kind === "swatch" && l.slug === slug);
  const swatches = lines.filter((l) => l.kind === "swatch").length;

  useEffect(() => { window.history.replaceState(null, "", `/studio?fabric=${slug}`); }, [slug]);
  useEffect(() => setNotice(""), [slug]);

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
      <div className="lg:sticky lg:top-32">
        <DressFigure p={p} sil={fit.sil} sleeves={fit.sleeves} />
        <p className="mt-4 text-center text-xs text-mist">Move your pointer over the dress to move the light.</p>
      </div>

      <div className="min-w-0 space-y-10">
        <fieldset className="min-w-0">
          <legend className="eyebrow mb-4">Fabric</legend>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-6">
            {PRODUCTS.map((f) => {
              const on = f.slug === slug;
              return (
                <label key={f.slug} className={`group relative w-24 shrink-0 snap-start cursor-pointer rounded-2xl border p-1.5 sm:w-auto transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${on ? "border-gold" : "border-line hover:border-ivory/40"}`}>
                  <input type="radio" name="fabric" value={f.slug} checked={on} onChange={() => setSlug(f.slug)} className="sr-only" />
                  <span className="relative block aspect-square overflow-hidden rounded-xl">
                    <FabricCanvas look={{ ...f.look, layout: "allover" }} label={f.name} rest={{ x: 0.3, y: 0.25 }} />
                  </span>
                  <span className={`mt-1.5 block truncate px-1 text-center text-xs ${on ? "text-gold" : "text-ivory/80"}`}>{f.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end justify-between gap-4 border-y border-line py-6">
          <div>
            <p className="font-serif text-3xl">{p.name}</p>
            <p className="text-sm text-mist">{p.tagline} · {formatPrice(p.pricePerMetre)} / m <span className="sample-tag ml-1">Sample</span></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button" className="btn btn-line" disabled={hasSwatch || swatches >= 5}
              onClick={() => { add({ kind: "swatch", slug, qty: 1 }); setNotice(`Swatch of ${p.name} added.`); }}
            >
              {hasSwatch ? "Swatch in bag" : `Order a swatch · ${formatPrice(SWATCH_PRICE)}`}
            </button>
            <Link href={`/shop/${slug}`} className="btn btn-line">Fabric details</Link>
          </div>
        </div>

        <Estimator
          p={p} fit={fit} onFit={setFit}
          useLabel={(m) => `Add ${m} to bag`}
          onUse={(m) => { add({ kind: "fabric", slug, qty: m }); setNotice(`${m} m of ${p.name} added to your bag.`); }}
        />
        <p role="status" className="min-h-5 text-sm text-gold">{notice && <>{notice} <Link href="/cart" className="underline underline-offset-4">View bag</Link></>}</p>
      </div>
    </div>
  );
}
