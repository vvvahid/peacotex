"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import { LightStage } from "@/components/product/LightStage";
import { Estimator } from "@/components/product/Estimator";
import { useCart } from "@/lib/cart";
import {
  BASES, EDGES, LAYOUTS, SWATCH_PRICE, SWATCH_SIZE, TECHNIQUES, completeTheLook, formatPrice, getProduct, label,
} from "@/lib/catalog";

const STEP = 0.5;
const MAX = 40;

export function ProductView({ slug }: { slug: string }) {
  const p = getProduct(slug)!;
  const { add, lines } = useCart();
  const [metres, setMetres] = useState(Math.max(p.minMetres, 2));
  const [flash, setFlash] = useState("");
  const qtyRef = useRef<HTMLInputElement>(null);
  const qtyId = useId();
  const swatches = lines.filter((l) => l.kind === "swatch").length;
  const hasSwatch = lines.some((l) => l.kind === "swatch" && l.slug === p.slug);

  const clamp = (m: number) => Math.min(MAX, Math.max(p.minMetres, Math.round(m / STEP) * STEP));
  const notice = (t: string) => { setFlash(t); window.setTimeout(() => setFlash(""), 3500); };

  const specs: [string, string][] = [
    ["Technique", p.techniques.map((t) => label(TECHNIQUES, t)).join(", ")],
    ["Base fabric", label(BASES, p.base)],
    ["Edge", label(EDGES, p.edge)],
    ["Layout", label(LAYOUTS, p.layout)],
    ["Colour", p.colour.name],
    ["Usable width", `${p.widthCm} cm`],
    ["Weight", `${p.weightGsm} g/m²`],
    ["Pattern repeat", p.repeatCm ? `${p.repeatCm} cm (vertical)` : "None: random all-over"],
    ["Stretch", p.stretch],
    ["Detachable motifs", p.detachableMotifs ? "Yes: motifs can be cut out and appliquéd" : "No"],
    ["Care", p.care],
    ["Sold by", `The metre, in ${STEP} m steps, minimum ${p.minMetres} m`],
  ];

  const looks = completeTheLook(p);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-36 sm:px-8">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-mist">
        <ol className="flex flex-wrap gap-2">
          <li><Link href="/shop" className="hover:text-gold">Shop</Link> /</li>
          <li aria-current="page" className="text-ivory">{p.name}</li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
        <LightStage p={p} />

        <div className="lg:pt-4">
          <div className="flex flex-wrap gap-2">
            <span className="sample-tag">Sample listing</span>
            {p.edge === "scalloped" && <span className="chip">Scalloped edge</span>}
            {p.layout === "border" && <span className="chip">Border</span>}
          </div>
          <h1 className="mt-5 text-[clamp(3rem,6vw,5.5rem)] font-light">{p.name}</h1>
          <p className="mt-2 text-lg text-ivory/80">{p.tagline}</p>
          <p className="mt-6 text-ivory/70">{p.description}</p>

          <p className="mt-8 text-3xl font-serif">
            {formatPrice(p.pricePerMetre)} <span className="text-base font-sans text-mist">per metre</span>
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-gold/80">Sample price, for demonstration</p>

          <div className="mt-8 rounded-[1.75rem] border border-line p-6">
            <label htmlFor={qtyId} className="eyebrow">Length</label>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-line">
                <button type="button" className="grid h-12 w-12 place-items-center text-xl hover:text-gold disabled:opacity-30" aria-label="Decrease by 0.5 metre" disabled={metres <= p.minMetres} onClick={() => setMetres((m) => clamp(m - STEP))}>−</button>
                <input
                  ref={qtyRef} id={qtyId} type="number" inputMode="decimal" min={p.minMetres} max={MAX} step={STEP} value={metres}
                  onChange={(e) => setMetres(Number(e.target.value) || p.minMetres)}
                  onBlur={() => setMetres((m) => clamp(m))}
                  className="h-12 w-20 bg-transparent text-center text-lg tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  aria-describedby={`${qtyId}-hint`}
                />
                <button type="button" className="grid h-12 w-12 place-items-center text-xl hover:text-gold disabled:opacity-30" aria-label="Increase by 0.5 metre" disabled={metres >= MAX} onClick={() => setMetres((m) => clamp(m + STEP))}>+</button>
              </div>
              <span className="text-mist">metres</span>
              <span className="ml-auto font-serif text-2xl tabular-nums">{formatPrice(p.pricePerMetre * metres)}</span>
            </div>
            <p id={`${qtyId}-hint`} className="mt-2 text-xs text-mist">0.5 m steps, minimum {p.minMetres} m. Cut as one continuous length and shipped rolled.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" className="btn btn-gold" onClick={() => { add({ kind: "fabric", slug: p.slug, qty: clamp(metres) }); notice(`${clamp(metres)} m of ${p.name} is in your bag.`); }}>
                Add {clamp(metres)} m to bag
              </button>
              <button
                type="button" className="btn btn-line" disabled={hasSwatch || swatches >= 5}
                onClick={() => { add({ kind: "swatch", slug: p.slug, qty: 1 }); notice(`Swatch of ${p.name} added.`); }}
              >
                {hasSwatch ? "Swatch in bag" : `Order a swatch · ${formatPrice(SWATCH_PRICE)}`}
              </button>
            </div>
            <p className="mt-3 text-xs text-mist">
              Swatch: {SWATCH_SIZE}, cut from the current roll, credited against your fabric order. Up to 5 per order.
              {swatches >= 5 && !hasSwatch && " You already have 5 swatches in your bag."}
            </p>
            <p role="status" className="mt-3 min-h-5 text-sm text-gold">{flash && <>{flash} <Link href="/cart" className="underline underline-offset-4">View bag</Link></>}</p>
          </div>

          <ul className="mt-6 grid gap-3 text-sm text-ivory/75 sm:grid-cols-2">
            <li className="rounded-2xl border border-line p-4"><strong className="block font-medium text-ivory">Shipped rolled</strong>Wound on a tube, never folded, so beading and scallops arrive flat.</li>
            <li className="rounded-2xl border border-line p-4"><strong className="block font-medium text-ivory">Cut to order</strong>Cut lengths can&apos;t be returned unless faulty. <Link href="/service#returns" className="text-gold underline underline-offset-4">Policy</Link></li>
          </ul>
        </div>
      </div>

      <section aria-labelledby="detail-title" className="mt-28 grid gap-12 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="eyebrow">Macro detail</p>
          <h2 id="detail-title" className="mt-3 text-[clamp(2rem,3.5vw,3rem)] font-light">Up close</h2>
          <div className="card relative mt-6 aspect-square">
            <FabricCanvas look={{ ...p.look, layout: "allover" }} label={`${p.name}, macro detail`} scale={3} followPointer rest={{ x: 0.35, y: 0.3 }} />
            <span className="chip absolute left-4 top-4">Macro · approx. 3× · illustration</span>
          </div>
          <p className="mt-3 text-xs text-mist">Move your pointer over the detail to light individual beads and sequins.</p>
        </div>
        <div>
          <p className="eyebrow">Specifications</p>
          <h2 className="mt-3 text-[clamp(2rem,3.5vw,3rem)] font-light">Everything your atelier needs</h2>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[10rem_1fr] gap-4 py-3.5 text-sm">
                <dt className="text-mist">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-gold/80">Specifications are sample values for the demo.</p>
        </div>
      </section>

      <section aria-labelledby="estimator-title" className="mt-28">
        <p className="eyebrow">Metreage estimator</p>
        <h2 id="estimator-title" className="mb-8 mt-3 text-[clamp(2rem,3.5vw,3rem)] font-light">How much {p.name} do you need?</h2>
        <Estimator p={p} onUse={(m) => { setMetres(clamp(m)); qtyRef.current?.focus(); qtyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />
      </section>

      {looks.length > 0 && (
        <section aria-labelledby="look-title" className="mt-28">
          <p className="eyebrow">Complete the look</p>
          <h2 id="look-title" className="mb-8 mt-3 text-[clamp(2rem,3.5vw,3rem)] font-light">Lining &amp; trims to match</h2>
          <ul className="grid gap-5 md:grid-cols-3">
            {looks.map((c) => (
              <li key={c.slug} className="card flex flex-col p-6">
                <span aria-hidden className="mb-6 block h-28 rounded-2xl" style={{ background: `linear-gradient(135deg, ${p.colour.hex}, ${p.look.base} 70%)` }} />
                <span className="eyebrow">{c.kind === "lining" ? "Lining" : "Trim"}</span>
                <h3 className="mt-2 text-2xl">{c.name}</h3>
                <p className="mt-1 text-sm text-mist">{c.note} Matched to {p.colour.name.toLowerCase()}.</p>
                <div className="mt-auto flex items-center justify-between pt-6">
                  <span className="text-sm">{formatPrice(c.price)} <span className="text-mist">/ {c.unit === "m" ? "m" : "set"}</span> <span className="sample-tag ml-1">Sample</span></span>
                  <button type="button" className="btn btn-line min-h-10 px-4" onClick={() => { add({ kind: "complement", slug: c.slug, qty: c.unit === "m" ? clamp(metres) : 1 }); notice(`${c.name} added.`); }}>
                    Add<span className="sr-only"> {c.name}</span>
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
