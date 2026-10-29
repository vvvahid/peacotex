"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import { LightStage } from "@/components/product/LightStage";
import { DEFAULT_FIT, Estimator, type Fit } from "@/components/product/Estimator";
import { DressFigure } from "@/components/studio/DressFigure";
import { useCart } from "@/lib/cart";
import { photoUrl } from "@/lib/photos";
import { SWATCH_PRICE, SWATCH_SIZE, completeTheLook, getProduct } from "@/lib/catalog";
import { useI18n } from "@/i18n/client";

const STEP = 0.5;
const MAX = 40;

export function ProductView({ slug }: { slug: string }) {
  const { t, fill, href, price, metres: m, product, complement } = useI18n();
  const tp = t.product;
  const p = product(getProduct(slug)!);
  const { add, lines } = useCart();
  const [metres, setMetres] = useState(Math.max(p.minMetres, 2));
  const [fit, setFit] = useState<Fit>(DEFAULT_FIT);
  const [lens, setLens] = useState({ x: 50, y: 50 });
  const [flash, setFlash] = useState("");
  const qtyRef = useRef<HTMLInputElement>(null);
  const qtyId = useId();
  const swatches = lines.filter((l) => l.kind === "swatch").length;
  const hasSwatch = lines.some((l) => l.kind === "swatch" && l.slug === p.slug);

  const clamp = (v: number) => Math.min(MAX, Math.max(p.minMetres, Math.round(v / STEP) * STEP));
  const notice = (s: string) => { setFlash(s); window.setTimeout(() => setFlash(""), 3500); };

  const sp = tp.specs;
  const specs: [string, string][] = [
    [sp.technique, p.techniques.map((x) => t.terms.techniques[x]).join(", ")],
    [sp.base, t.terms.bases[p.base]],
    [sp.edge, t.terms.edges[p.edge]],
    [sp.layout, t.terms.layouts[p.layout]],
    [sp.colour, p.colour.name],
    [sp.width, `${p.widthCm} cm`],
    [sp.weight, `${p.weightGsm} g/m²`],
    [sp.repeat, p.repeatCm ? fill(sp.repeatValue, { cm: p.repeatCm }) : sp.repeatNone],
    [sp.stretch, p.stretch],
    [sp.motifs, p.detachableMotifs ? sp.motifsYes : sp.motifsNo],
    [sp.care, p.care],
    [sp.soldBy, fill(sp.soldByValue, { min: m(p.minMetres) })],
  ];

  const looks = completeTheLook(p).map(complement);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-36 sm:px-8">
      <nav aria-label={tp.breadcrumb} className="mb-8 text-sm text-mist">
        <ol className="flex flex-wrap gap-2">
          <li><Link href={href("/shop")} className="hover:text-gold">{t.nav.shop}</Link> /</li>
          <li aria-current="page" className="text-ivory">{p.name}</li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
        <LightStage p={p} />

        <div className="lg:pt-4">
          <div className="flex flex-wrap gap-2">
            <span className="sample-tag">{tp.sampleListing}</span>
            {p.edge === "scalloped" && <span className="chip">{t.card.scalloped}</span>}
            {p.layout === "border" && <span className="chip">{t.terms.layouts.border}</span>}
          </div>
          <h1 className="mt-5 text-[clamp(3rem,6vw,5.5rem)] font-light">{p.name}</h1>
          <p className="mt-2 text-lg text-ivory/80">{p.tagline}</p>
          <p className="mt-6 text-ivory/70">{p.description}</p>

          <p className="mt-8 text-3xl font-serif">
            {price(p.pricePerMetre)} <span className="text-base font-sans text-mist">{tp.perMetre}</span>
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-gold/80">{tp.samplePrice}</p>

          <div className="mt-8 rounded-[1.75rem] border border-line p-6">
            <label htmlFor={qtyId} className="eyebrow">{tp.length}</label>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-line">
                <button type="button" className="grid h-12 w-12 place-items-center text-xl hover:text-gold disabled:opacity-30" aria-label={tp.decrease} disabled={metres <= p.minMetres} onClick={() => setMetres((v) => clamp(v - STEP))}>−</button>
                <input
                  ref={qtyRef} id={qtyId} type="number" inputMode="decimal" min={p.minMetres} max={MAX} step={STEP} value={metres}
                  onChange={(e) => setMetres(Number(e.target.value) || p.minMetres)}
                  onBlur={() => setMetres((v) => clamp(v))}
                  className="h-12 w-20 bg-transparent text-center text-lg tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  aria-describedby={`${qtyId}-hint`}
                />
                <button type="button" className="grid h-12 w-12 place-items-center text-xl hover:text-gold disabled:opacity-30" aria-label={tp.increase} disabled={metres >= MAX} onClick={() => setMetres((v) => clamp(v + STEP))}>+</button>
              </div>
              <span className="text-mist">{tp.metres}</span>
              <span className="ml-auto font-serif text-2xl tabular-nums">{price(p.pricePerMetre * metres)}</span>
            </div>
            <p id={`${qtyId}-hint`} className="mt-2 text-xs text-mist">{fill(tp.lengthHint, { min: m(p.minMetres) })}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" className="btn btn-gold" onClick={() => { add({ kind: "fabric", slug: p.slug, qty: clamp(metres) }); notice(fill(tp.fabricAdded, { m: m(clamp(metres)), name: p.name })); }}>
                {fill(tp.addToBag, { m: m(clamp(metres)) })}
              </button>
              <button
                type="button" className="btn btn-line" disabled={hasSwatch || swatches >= 5}
                onClick={() => { add({ kind: "swatch", slug: p.slug, qty: 1 }); notice(fill(tp.swatchAdded, { name: p.name })); }}
              >
                {hasSwatch ? tp.swatchInBag : fill(tp.orderSwatch, { price: price(SWATCH_PRICE) })}
              </button>
            </div>
            <p className="mt-3 text-xs text-mist">
              {fill(tp.swatchNote, { size: SWATCH_SIZE })}
              {swatches >= 5 && !hasSwatch && ` ${tp.swatchMax}`}
            </p>
            <p role="status" className="mt-3 min-h-5 text-sm text-gold">{flash && <>{flash} <Link href={href("/cart")} className="underline underline-offset-4">{tp.viewBag}</Link></>}</p>
          </div>

          <ul className="mt-6 grid gap-3 text-sm text-ivory/75 sm:grid-cols-2">
            <li className="rounded-2xl border border-line p-4"><strong className="block font-medium text-ivory">{tp.rolledTitle}</strong>{tp.rolledText}</li>
            <li className="rounded-2xl border border-line p-4"><strong className="block font-medium text-ivory">{tp.cutTitle}</strong>{tp.cutText} <Link href={href("/service#returns")} className="text-gold underline underline-offset-4">{tp.policy}</Link></li>
          </ul>
        </div>
      </div>

      <section aria-labelledby="detail-title" className="mt-28 grid gap-12 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="eyebrow">{tp.macroEyebrow}</p>
          <h2 id="detail-title" className="mt-3 text-[clamp(2rem,3.5vw,3rem)] font-light">{tp.macroTitle}</h2>
          {p.photo ? (
            <>
              {/* Macro lens: the full-resolution photo at 3×, panned by the pointer. */}
              <div
                role="img" aria-label={fill(tp.macroMagnified, { alt: p.photo.alt })}
                className="card relative mt-6 aspect-square touch-pan-y"
                style={{ backgroundImage: `url("${photoUrl(p.photo, 2400)}")`, backgroundSize: "300%", backgroundPosition: `${lens.x}% ${lens.y}%` }}
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setLens({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) });
                }}
              >
                <span className="chip absolute left-4 top-4">{tp.macroChipPhoto}</span>
              </div>
              <p className="mt-3 text-xs text-mist">{tp.macroHintPhoto}</p>
            </>
          ) : (
            <>
              <div className="card relative mt-6 aspect-square">
                <FabricCanvas look={{ ...p.look, layout: "allover" }} label={fill(tp.macroLabel, { name: p.name })} scale={3} followPointer rest={{ x: 0.35, y: 0.3 }} />
                <span className="chip absolute left-4 top-4">{tp.macroChipIllustration}</span>
              </div>
              <p className="mt-3 text-xs text-mist">{tp.macroHintIllustration}</p>
            </>
          )}
        </div>
        <div>
          <p className="eyebrow">{tp.specsEyebrow}</p>
          <h2 className="mt-3 text-[clamp(2rem,3.5vw,3rem)] font-light">{tp.specsTitle}</h2>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[10rem_1fr] gap-4 py-3.5 text-sm">
                <dt className="text-mist">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-gold/80">{tp.specsNote}</p>
        </div>
      </section>

      <section aria-labelledby="estimator-title" className="mt-28">
        <p className="eyebrow">{tp.dressEyebrow}</p>
        <h2 id="estimator-title" className="mb-8 mt-3 text-[clamp(2rem,3.5vw,3rem)] font-light">{fill(tp.dressTitle, { name: p.name })}</h2>
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(240px,0.6fr)_minmax(0,1.4fr)]">
          <DressFigure p={p} sil={fit.sil} sleeves={fit.sleeves} />
          <Estimator
            p={p} fit={fit} onFit={setFit}
            onUse={(v) => { setMetres(clamp(v)); qtyRef.current?.focus(); qtyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
          />
        </div>
        <p className="mt-4 text-xs text-mist">
          {tp.dressNote} {p.photo ? tp.dressNotePhoto : tp.dressNoteIllustration} <Link href={href(`/studio?fabric=${p.slug}`)} className="text-gold underline underline-offset-4">{tp.compare}</Link>
        </p>
      </section>

      {looks.length > 0 && (
        <section aria-labelledby="look-title" className="mt-28">
          <p className="eyebrow">{tp.lookEyebrow}</p>
          <h2 id="look-title" className="mb-8 mt-3 text-[clamp(2rem,3.5vw,3rem)] font-light">{tp.lookTitle}</h2>
          <ul className="grid gap-5 md:grid-cols-3">
            {looks.map((c) => (
              <li key={c.slug} className="card flex flex-col p-6">
                <span aria-hidden className="mb-6 block h-28 rounded-2xl" style={{ background: `linear-gradient(135deg, ${p.colour.hex}, ${p.look.base} 70%)` }} />
                <span className="eyebrow">{c.kind === "lining" ? tp.lining : tp.trim}</span>
                <h3 className="mt-2 text-2xl">{c.name}</h3>
                <p className="mt-1 text-sm text-mist">{c.note} {fill(tp.matched, { colour: p.colour.name })}</p>
                <div className="mt-auto flex items-center justify-between pt-6">
                  <span className="text-sm">{price(c.price)} <span className="text-mist">/ {c.unit === "m" ? "m" : tp.perSet}</span> <span className="sample-tag ml-1">{tp.sample}</span></span>
                  <button type="button" className="btn btn-line min-h-10 px-4" onClick={() => { add({ kind: "complement", slug: c.slug, qty: c.unit === "m" ? clamp(metres) : 1 }); notice(fill(tp.added, { name: c.name })); }}>
                    {tp.add}<span className="sr-only"> {c.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
