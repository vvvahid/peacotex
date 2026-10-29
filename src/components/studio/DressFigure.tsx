"use client";

import { useId, useMemo } from "react";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import type { Product } from "@/lib/catalog";
import { photoUrl } from "@/lib/photos";
import { DRESS_TOP, FIGURE, VIEW_H, VIEW_W, dressBottom, dressPath, sleevePaths } from "@/lib/dress";
import type { Silhouette, Sleeves } from "@/lib/estimator";
import { useI18n } from "@/i18n/client";

const FOLDS: Record<Silhouette, number> = { mini: 5, midi: 6, maxi: 5, ballgown: 11, train: 7 };

/**
 * A fashion croquis wearing the chosen fabric: the live fabric canvas is masked to the dress
 * shape, with folds and an outline drawn over it. Move the pointer over the dress to move the light.
 */
export function DressFigure({ p, sil, sleeves }: { p: Product; sil: Silhouette; sleeves: Sleeves }) {
  const uid = useId().replace(/:/g, "");
  const { t, fill } = useI18n();
  const tf = t.figure;
  const scalloped = p.edge === "scalloped";
  const body = dressPath(sil, scalloped);
  const arms = sleevePaths(sleeves);
  const bottom = dressBottom(sil);

  // The fabric canvas covers the dress from the neckline to the hem, so a border fabric's motifs land on the hem.
  const mask = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${DRESS_TOP} ${VIEW_W} ${bottom - DRESS_TOP}" preserveAspectRatio="none">` +
      arms.map((d) => `<path d="${d}" fill="#fff" fill-opacity=".72"/>`).join("") +
      `<path d="${body}" fill="#fff"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [arms, body, bottom]);

  const label = fill(tf.label, { name: p.name, sil: t.terms.silhouettes[sil].label }) + (sleeves === "none" ? "" : tf[sleeves]);
  const folds = FOLDS[sil];

  return (
    <figure className="relative mx-auto aspect-[300/640] w-full max-w-[15rem] sm:max-w-[22rem]" aria-label={`${label} ${tf.illustration}`}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`skin-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5b4e43" />
            <stop offset="1" stopColor="#2a231d" />
          </linearGradient>
          <radialGradient id={`floor-${uid}`}>
            <stop offset="0" stopColor="#000" stopOpacity=".55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="150" cy="600" rx={sil === "ballgown" ? 160 : 90} ry="16" fill={`url(#floor-${uid})`} />
        <g fill={`url(#skin-${uid})`} stroke="rgba(230,210,170,.22)" strokeWidth=".8">
          {FIGURE.parts.map((d) => <path key={d} d={d} />)}
          <ellipse {...FIGURE.head} />
        </g>
      </svg>

      <div
        className="absolute inset-x-0"
        style={{
          top: `${(DRESS_TOP / VIEW_H) * 100}%`, height: `${((bottom - DRESS_TOP) / VIEW_H) * 100}%`,
          maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
        }}
      >
        {p.photo ? (
          <div role="img" aria-label={p.photo.own ? label : `${label} ${tf.stockPhoto}`} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${photoUrl(p.photo, 900)}")` }} />
        ) : (
          <FabricCanvas look={p.look} label={label} scale={0.42} followPointer rest={{ x: 0.7, y: 0.25 }} />
        )}
      </div>

      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <clipPath id={`dress-${uid}`}><path d={body} /></clipPath>
          <linearGradient id={`folds-${uid}`} x1="0" x2="1">
            {Array.from({ length: folds * 2 + 1 }, (_, i) => (
              <stop key={i} offset={i / (folds * 2)} stopColor="#000" stopOpacity={i % 2 ? 0 : 0.34} />
            ))}
          </linearGradient>
          <linearGradient id={`depth-${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor="#000" stopOpacity=".45" />
            <stop offset=".35" stopColor="#000" stopOpacity="0" />
            <stop offset=".65" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".5" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#dress-${uid})`}>
          <rect x="0" y="222" width={VIEW_W} height={VIEW_H} fill={`url(#folds-${uid})`} />
          <rect x="0" y={DRESS_TOP} width={VIEW_W} height={VIEW_H} fill={`url(#depth-${uid})`} />
          <path d={`M110,215 Q150,${222} 190,215`} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.2" />
        </g>
        <path d={body} fill="none" stroke="rgba(255,240,215,.28)" strokeWidth=".9" />
        {arms.map((d) => <path key={d} d={d} fill="none" stroke="rgba(255,240,215,.18)" strokeWidth=".7" />)}
      </svg>
      <figcaption className="chip absolute left-0 top-0">{p.photo ? (p.photo.own ? tf.captionOwn : tf.captionPhoto) : tf.captionIllustration}</figcaption>
    </figure>
  );
}
