"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import { DEFAULT_FIT, Estimator, type Fit } from "@/components/product/Estimator";
import { DressFigure } from "@/components/studio/DressFigure";
import { useCart } from "@/lib/cart";
import { SWATCH_PRICE } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalog-client";
import { useI18n } from "@/i18n/client";
import { photoUrl } from "@/lib/photos";

export function DressStudio({ initialSlug }: { initialSlug?: string }) {
  const { products: PRODUCTS, get } = useCatalog();
  const [slug, setSlug] = useState(get(initialSlug ?? "")?.slug ?? PRODUCTS[0].slug);
  const [fit, setFit] = useState<Fit>(DEFAULT_FIT);
  const [notice, setNotice] = useState("");
  const { add, lines } = useCart();
  const { t, fill, href, price, metres } = useI18n();
  const ts = t.studio;
  const p = get(slug) ?? PRODUCTS[0];
  const hasSwatch = lines.some((l) => l.kind === "swatch" && l.slug === slug);
  const swatches = lines.filter((l) => l.kind === "swatch").length;

  useEffect(() => { window.history.replaceState(null, "", href(`/studio?fabric=${slug}`)); }, [slug, href]);
  useEffect(() => setNotice(""), [slug]);

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
      <div className="lg:sticky lg:top-32">
        <DressFigure p={p} sil={fit.sil} sleeves={fit.sleeves} />
        <p className="mt-4 text-center text-xs text-mist">{p.photo ? (p.photo.own ? ts.captionOwn : ts.captionPhoto) : ts.captionIllustration}</p>
      </div>

      <div className="min-w-0 space-y-10">
        <fieldset className="min-w-0">
          <legend className="eyebrow mb-4">{ts.fabric}</legend>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-6">
            {PRODUCTS.map((f) => {
              const on = f.slug === slug;
              return (
                <label key={f.slug} className={`group relative w-24 shrink-0 snap-start cursor-pointer rounded-2xl border p-1.5 sm:w-auto transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${on ? "border-gold" : "border-line hover:border-ivory/40"}`}>
                  <input type="radio" name="fabric" value={f.slug} checked={on} onChange={() => setSlug(f.slug)} className="sr-only" />
                  <span className="relative block aspect-square overflow-hidden rounded-xl">
                    {f.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(f.photo, 240)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <FabricCanvas look={{ ...f.look, layout: "allover" }} label={f.name} rest={{ x: 0.3, y: 0.25 }} />
                    )}
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
            <p className="text-sm text-mist">{p.tagline} · {price(p.pricePerMetre)} / m <span className="sample-tag ml-1">{t.product.sample}</span></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button" className="btn btn-line" disabled={hasSwatch || swatches >= 5}
              onClick={() => { add({ kind: "swatch", slug, qty: 1 }); setNotice(fill(t.product.swatchAdded, { name: p.name })); }}
            >
              {hasSwatch ? t.product.swatchInBag : fill(t.product.orderSwatch, { price: price(SWATCH_PRICE) })}
            </button>
            <Link href={href(`/shop/${slug}`)} className="btn btn-line">{ts.details}</Link>
          </div>
        </div>

        <Estimator
          p={p} fit={fit} onFit={setFit}
          useLabel={(m) => fill(t.product.addToBag, { m })}
          onUse={(m) => { add({ kind: "fabric", slug, qty: m }); setNotice(fill(ts.added, { m: metres(m), name: p.name })); }}
        />
        <p role="status" className="min-h-5 text-sm text-gold">{notice && <>{notice} <Link href={href("/cart")} className="underline underline-offset-4">{t.product.viewBag}</Link></>}</p>
      </div>
    </div>
  );
}
