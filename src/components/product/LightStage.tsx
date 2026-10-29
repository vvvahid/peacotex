"use client";

import { useId, useRef, useState } from "react";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import { StockPhoto } from "@/components/ui/StockPhoto";
import type { Product } from "@/lib/catalog";
import { useI18n } from "@/i18n/client";

/** Light height follows a gentle arc as it moves across, like a lamp swung over a cutting table. */
const arcY = (x: number) => 0.42 - 0.3 * Math.sin(Math.PI * Math.min(1, Math.max(0, x)));

/**
 * The "light slider": drag across the fabric (or use the range input / arrow keys) to move a
 * highlight over it and see how the embellishment catches light.
 */
export function LightStage({ p }: { p: Product }) {
  const [light, setLight] = useState({ x: 0.22, y: arcY(0.22) });
  const dragging = useRef(false);
  const id = useId();
  const { t, fill } = useI18n();

  const fromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    setLight({ x: Math.min(1.1, Math.max(-0.1, x)), y: Math.min(1.1, Math.max(-0.1, y)) });
  };

  return (
    <div>
      <div
        className="card relative aspect-[4/5] touch-pan-y select-none sm:aspect-[5/6]"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
        onPointerMove={(e) => { if (dragging.current) fromPointer(e); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        {p.photo ? (
          <>
            <StockPhoto photo={p.photo} sizes="(min-width: 1024px) 55vw, 100vw" priority label="product" />
            {/* A lamp swung over the photo: an overlay highlight that follows the slider. */}
            <span
              aria-hidden className="pointer-events-none absolute inset-0 mix-blend-overlay"
              style={{ background: `radial-gradient(circle at ${light.x * 100}% ${light.y * 100}%, rgba(255,240,210,0.85) 0%, rgba(255,240,210,0.25) 22%, rgba(0,0,0,0.35) 60%)` }}
            />
          </>
        ) : (
          <>
            <FabricCanvas look={p.look} label={`${p.name}, ${p.tagline}`} light={light} showEdge />
            <span className="chip absolute left-4 top-4">{t.product.lightIllustration}</span>
          </>
        )}
        <span
          aria-hidden className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/50"
          style={{ left: `${light.x * 100}%`, top: `${light.y * 100}%`, boxShadow: "0 0 60px 20px rgba(255,226,168,0.12)" }}
        />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <label htmlFor={id} className="shrink-0 text-[0.75rem] uppercase tracking-[0.2em] text-mist">{t.product.moveLight}</label>
        <input
          id={id} type="range" min={0} max={100} step={1} className="rail"
          value={Math.round(Math.min(1, Math.max(0, light.x)) * 100)}
          aria-valuetext={fill(t.product.lightValue, { n: Math.round(light.x * 100) })}
          onChange={(e) => { const x = Number(e.target.value) / 100; setLight({ x, y: arcY(x) }); }}
        />
      </div>
      <p className="text-xs text-mist">{t.product.lightHint}</p>
    </div>
  );
}
