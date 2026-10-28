"use client";

import { useMemo } from "react";
import type { Product } from "@/lib/catalog";
import { estimate, SILHOUETTES, type Height, type Silhouette, type Sleeves } from "@/lib/estimator";

const fmt = (m: number) => `${m.toFixed(2).replace(/\.?0+$/, "")} m`;

export interface Fit { sil: Silhouette; height: Height; sleeves: Sleeves }
export const DEFAULT_FIT: Fit = { sil: "maxi", height: "average", sleeves: "none" };

interface Props {
  p: Product;
  fit: Fit;
  onFit: (fit: Fit) => void;
  onUse: (metres: number) => void;
  /** Button text for the estimate, e.g. "Use 4 m" or "Add 4 m to bag". */
  useLabel?: (metres: string) => string;
}

export function Estimator({ p, fit, onFit, onUse, useLabel = (m) => `Use ${m}` }: Props) {
  const { sil, height, sleeves } = fit;
  const setSil = (v: Silhouette) => onFit({ ...fit, sil: v });
  const setHeight = (v: Height) => onFit({ ...fit, height: v });
  const setSleeves = (v: Sleeves) => onFit({ ...fit, sleeves: v });
  const est = useMemo(() => estimate(p, sil, height, sleeves), [p, sil, height, sleeves]);

  const radio = <T extends string>(name: string, value: T, current: T, set: (v: T) => void, label: string, hint?: string) => (
    <label key={value} className={`flex cursor-pointer flex-col rounded-2xl border px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${current === value ? "border-gold bg-gold/10" : "border-line hover:border-ivory/40"}`}>
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => set(value)} className="sr-only" />
      <span className={current === value ? "text-gold" : ""}>{label}</span>
      {hint && <span className="text-xs text-mist">{hint}</span>}
    </label>
  );

  return (
    <div className="card grid gap-10 p-6 sm:p-10 xl:grid-cols-[1.3fr_1fr]">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        <fieldset>
          <legend className="eyebrow mb-3">Dress silhouette</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SILHOUETTES.map((s) => radio("sil", s.id, sil, setSil, s.label, s.hint))}
          </div>
        </fieldset>
        <div className="grid gap-8">
          <fieldset>
            <legend className="eyebrow mb-3">Wearer&apos;s height</legend>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {radio("h", "petite", height, setHeight, "Petite", "< 160 cm")}
              {radio("h", "average", height, setHeight, "Average", "160–175")}
              {radio("h", "tall", height, setHeight, "Tall", "> 175 cm")}
            </div>
          </fieldset>
          <fieldset>
            <legend className="eyebrow mb-3">Sleeves</legend>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {radio("sl", "none", sleeves, setSleeves, "None")}
              {radio("sl", "short", sleeves, setSleeves, "Short")}
              {radio("sl", "long", sleeves, setSleeves, "Long")}
            </div>
          </fieldset>
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col">
        <p className="eyebrow">You will need about</p>
        <p className="mt-2 font-serif text-7xl font-light text-gold">{fmt(est.metres)}</p>
        <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
          {est.lines.map((l) => (
            <div key={l.label} className="flex justify-between gap-4">
              <dt className="text-ivory/75">{l.label}</dt>
              <dd className="shrink-0 tabular-nums">{fmt(Math.round(l.metres * 100) / 100)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-2 text-ivory">
            <dt>Rounded up to the next 0.5 m</dt>
            <dd className="tabular-nums">{fmt(est.metres)}</dd>
          </div>
        </dl>
        {est.notes.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-mist">
            {est.notes.map((n) => <li key={n}>· {n}</li>)}
          </ul>
        )}
        <button type="button" onClick={() => onUse(est.metres)} className="btn btn-gold mt-6 self-start">{useLabel(fmt(est.metres))}</button>
        <p className="mt-3 text-xs text-mist">An estimate for a {p.widthCm} cm wide fabric. Always confirm with your dressmaker&apos;s pattern before cutting.</p>
      </div>
    </div>
  );
}
