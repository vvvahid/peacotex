"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PHOTOS, authorUrl, photoSrcSet, photoUrl, type Photo } from "@/lib/photos";

interface Scene { eyebrow: string; title: string; note: string; photo: Photo }

const SCENES: Scene[] = [
  {
    eyebrow: "01 · Sequins", title: "Fabric that\nholds the light.",
    note: "Every sequin sits at its own angle, so the dress turns to liquid as it moves.",
    photo: PHOTOS.iridescent,
  },
  {
    eyebrow: "02 · Beading", title: "Beaded by hand,\nbead by bead.",
    note: "Seed beads, bugles and pearl hearts traced into flowers you can feel.",
    photo: PHOTOS.bridalBeading,
  },
  {
    eyebrow: "03 · Embroidery", title: "Thread that\nturns to gold.",
    note: "Metallic embroidery worked into leaves and flowers that glow by candlelight.",
    photo: PHOTOS.goldEmbroidery,
  },
  {
    eyebrow: "04 · Lace & edges", title: "Corded lace,\nfinished at the edge.",
    note: "Lace and border fabrics finished at the selvedge, ready for hem and neckline.",
    photo: PHOTOS.whiteLace,
  },
];

const N = SCENES.length;
const FADE = 0.2; // last part of each scene crossfades into the next

/** Light path inside one scene: a diagonal sweep, alternating direction per scene. */
function lightAt(i: number, t: number) {
  const dir = i % 2 ? 1 : -1; // scene 1 starts on the right, clear of the headline
  const x = 0.5 + dir * (-0.42 + 0.9 * t);
  const y = 0.18 + 0.55 * t + 0.08 * Math.sin(t * Math.PI * 2);
  return { x, y };
}

/**
 * Pinned, scroll-scrubbed hero: four fabric photographs crossfade while a light sweeps across
 * them. Scrolling drives `state.progress` through a GSAP ScrollTrigger; photos, light, headlines
 * and scene markers all follow that one number, so scrolling back plays everything in reverse.
 * Only transforms and opacity change per frame, which the GPU composites cheaply.
 */
export function FabricHero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const photos = useRef<(HTMLImageElement | null)[]>([]);
  const heads = useRef<(HTMLDivElement | null)[]>([]);
  const credits = useRef<(HTMLAnchorElement | null)[]>([]);
  const marks = useRef<(HTMLButtonElement | null)[]>([]);
  const cue = useRef<HTMLDivElement>(null);
  const pool = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [reduced, setReduced] = useState(false);

  const jump = (i: number) => {
    const t = trigger.current;
    if (!t) return;
    const top = t.start + ((i + 0.35) / N) * (t.end - t.start);
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 1.6 });
    else window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const el = section.current, st = stage.current;
    if (!el || !st) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);
    const state = { progress: 0 };
    let raf = 0, dirty = true, disposed = false, w = st.clientWidth, h = st.clientHeight;

    const render = () => {
      dirty = false;
      const f = Math.min(state.progress * N, N - 1e-6);
      const i = Math.floor(f), t = f - i;
      const fade = i < N - 1 && t > 1 - FADE ? (t - (1 - FADE)) / FADE : 0;
      const eased = fade * fade * (3 - 2 * fade);

      photos.current.forEach((img, j) => {
        if (!img) return;
        const o = j === i ? 1 : j === i + 1 ? eased : 0;
        // A slow pull-back while the scene plays.
        img.style.opacity = String(o);
        img.style.transform = reduce ? "none" : `scale(${1.14 - 0.1 * (j === i ? t : 0)})`;
        img.style.visibility = o < 0.01 ? "hidden" : "visible";
      });

      const L = reduce ? { x: 0.68, y: 0.3 } : lightAt(i, t);
      if (pool.current) pool.current.style.transform = `translate3d(${L.x * w}px, ${L.y * h}px, 0) translate(-50%, -50%)`;

      heads.current.forEach((hd, j) => {
        if (!hd) return;
        let o = 0;
        if (reduce) o = j === 0 ? 1 : 0;
        else if (j === i) o = (i === 0 ? 1 : Math.min(1, t / 0.12)) * (i === N - 1 ? 1 : Math.min(1, (1 - FADE * 0.6 - t) / 0.1));
        else if (j === i + 1 && fade > 0.6) o = (fade - 0.6) / 0.4;
        o = Math.max(0, Math.min(1, o));
        hd.style.opacity = String(o);
        hd.style.transform = `translate3d(0, ${(1 - o) * 26}px, 0)`;
        hd.style.visibility = o < 0.01 ? "hidden" : "visible";
      });
      const shown = fade > 0.5 ? i + 1 : i;
      credits.current.forEach((c, j) => { if (c) c.style.visibility = j === shown ? "visible" : "hidden"; });
      marks.current.forEach((m, j) => m?.setAttribute("aria-current", j === shown ? "step" : "false"));
      if (cue.current) cue.current.style.opacity = String(Math.max(0, 1 - state.progress * 12));
    };

    const loop = () => {
      if (disposed) return;
      if (dirty) render();
      raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(() => { w = st.clientWidth; h = st.clientHeight; dirty = true; });
    ro.observe(st);
    raf = requestAnimationFrame(loop);

    let tween: gsap.core.Tween | null = null;
    if (!reduce) {
      gsap.registerPlugin(ScrollTrigger);
      tween = gsap.to(state, {
        progress: 1, ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 },
        onUpdate: () => { dirty = true; },
      });
      trigger.current = tween.scrollTrigger ?? null;
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      tween?.scrollTrigger?.kill();
      tween?.kill();
      trigger.current = null;
    };
  }, []);

  return (
    <section ref={section} aria-labelledby="hero-title" className="relative" style={{ height: reduced ? "100svh" : `${N * 100 + 40}svh` }}>
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden bg-ink">
        {SCENES.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- Unsplash serves resized images itself
          <img
            key={s.photo.id} ref={(n) => { photos.current[i] = n; }}
            src={photoUrl(s.photo, 1800)} srcSet={photoSrcSet(s.photo)} sizes="100vw" alt={i === 0 ? s.photo.alt : ""}
            loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} decoding="async"
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
            style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "visible" : "hidden", transform: "scale(1.14)" }}
          />
        ))}
        {/* The moving light: a soft highlight blended over the photos. */}
        <div
          ref={pool} aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[130vmax] w-[130vmax] rounded-full mix-blend-overlay will-change-transform"
          style={{ background: "radial-gradient(circle, rgba(255,236,200,0.75) 0%, rgba(255,236,200,0.22) 22%, rgba(0,0,0,0) 50%)", transform: "translate3d(68vw, 30vh, 0) translate(-50%, -50%)" }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,10,9,0.9)_0%,rgba(11,10,9,0.6)_38%,rgba(11,10,9,0.1)_72%),linear-gradient(0deg,rgba(11,10,9,0.9)_0%,rgba(11,10,9,0)_40%),linear-gradient(180deg,rgba(11,10,9,0.55)_0%,rgba(11,10,9,0)_22%)]" />

        <h1 id="hero-title" className="sr-only">Peacotex: embellished fabrics for evening and bridal dresses</h1>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1400px] px-4 pb-24 sm:px-8 sm:pb-20">
          <div className="relative min-h-[15rem] sm:min-h-[17rem]">
            {SCENES.map((s, i) => (
              <div key={s.eyebrow} ref={(n) => { heads.current[i] = n; }} className="absolute inset-x-0 bottom-0 will-change-transform" style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "visible" : "hidden" }}>
                <p className="eyebrow">{s.eyebrow}</p>
                <p className="mt-4 whitespace-pre-line font-serif text-[clamp(2.6rem,7vw,6.5rem)] font-light leading-[0.95]">{s.title}</p>
                <p className="mt-5 max-w-md text-[0.95rem] text-ivory/80">{s.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn btn-gold">Shop fabrics</Link>
            <Link href="/service#swatches" className="btn btn-line">Order swatches</Link>
          </div>
        </div>

        {!reduced && (
          <nav aria-label="Hero scenes" className="absolute right-4 top-1/2 hidden -translate-y-1/2 md:block sm:right-8">
            <ol className="flex flex-col gap-4">
              {SCENES.map((s, i) => (
                <li key={s.eyebrow}>
                  <button
                    ref={(n) => { marks.current[i] = n; }} type="button" onClick={() => jump(i)}
                    className="group flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.2em] text-ivory/70 hover:text-gold aria-[current=step]:text-gold"
                    aria-current={i === 0 ? "step" : "false"}
                  >
                    <span className="h-px w-6 bg-current transition-all group-aria-[current=step]:w-12" />
                    {s.eyebrow.split(" · ")[1]}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="absolute bottom-6 right-4 flex flex-col items-end gap-1.5 sm:right-8">
          <span className="chip">Stock photo · not a Peacotex fabric</span>
          <div className="relative h-4 w-64">
            {SCENES.map((s, i) => (
              <a
                key={s.photo.id} ref={(n) => { credits.current[i] = n; }}
                href={authorUrl(s.photo)} target="_blank" rel="noopener noreferrer"
                className="absolute right-0 top-0 whitespace-nowrap text-[0.6875rem] text-ivory/70 hover:text-gold"
                style={{ visibility: i === 0 ? "visible" : "hidden" }}
              >
                Photo: {s.photo.author} / Unsplash
              </a>
            ))}
          </div>
        </div>
        {!reduced && (
          <div ref={cue} aria-hidden className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.6875rem] uppercase tracking-[0.3em] text-ivory/60 lg:flex">
            Scroll to move the light
            <span className="h-8 w-px bg-gradient-to-b from-gold to-transparent" />
          </div>
        )}
      </div>
    </section>
  );
}
