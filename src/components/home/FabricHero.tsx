"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FabricRenderer, type FabricLook } from "@/lib/fabric/render";

interface Scene { eyebrow: string; title: string; note: string; look: FabricLook }

const SCENES: Scene[] = [
  {
    eyebrow: "01 · Sequins", title: "Fabric that\nholds the light.",
    note: "Every sequin sits at its own angle, so the dress turns to liquid as it moves.",
    look: { pattern: "sequins", ground: "tulle", base: "#0b0908", ink: "#9c7c48", accent: "#d6bb86", glint: "#ffe0a3", layout: "allover", edge: "straight", seed: 5 },
  },
  {
    eyebrow: "02 · Beading", title: "Beaded by hand,\nbead by bead.",
    note: "Seed beads, bugles and pearl hearts traced into flowers you can feel.",
    look: { pattern: "beaded", ground: "tulle", base: "#0e0c0a", ink: "#b89a64", accent: "#f3ead9", glint: "#fff0cc", layout: "allover", edge: "straight", seed: 7 },
  },
  {
    eyebrow: "03 · Pearls", title: "Pearls, scattered\nlike candlelight.",
    note: "Six sizes of pearl drifting across soft tulle, for veils, overlays and full skirts.",
    look: { pattern: "pearls", ground: "tulle", base: "#3a3128", ink: "#efe6d6", accent: "#e2cdb4", glint: "#fff8ec", layout: "allover", edge: "straight", seed: 13 },
  },
  {
    eyebrow: "04 · Lace & edges", title: "Corded lace,\nfinished at the edge.",
    note: "Corded lace and border fabrics finished at the selvedge, ready for hem and neckline.",
    look: { pattern: "lace", ground: "tulle", base: "#0a0908", ink: "#b9ad96", accent: "#efe6d6", glint: "#fff6e6", layout: "allover", edge: "straight", seed: 17 },
  },
];

const N = SCENES.length;
const FADE = 0.2; // last part of each scene crossfades into the next
const IDLE_MS = 6000;
const IDLE_FRAME_MS = 50; // idle shimmer at ~20 fps; scroll-driven frames are never throttled
const RENDER_SCALE = 1; // canvas pixels per CSS pixel: sparkle is soft anyway, and pixel fill is the main cost

/** Light path inside one scene: a diagonal sweep, alternating direction per scene. */
function lightAt(i: number, t: number) {
  const dir = i % 2 ? 1 : -1; // scene 1 starts on the right, clear of the headline
  const x = 0.5 + dir * (-0.42 + 0.9 * t);
  const y = 0.18 + 0.55 * t + 0.08 * Math.sin(t * Math.PI * 2);
  return { x, y };
}

/**
 * Pinned, scroll-scrubbed hero: a light sweeps across four embellished fabrics. Scrolling drives
 * `state.progress` through a GSAP ScrollTrigger; the canvas, headlines and scene markers are
 * updated from that one number, so scrolling back plays everything in reverse.
 */
export function FabricHero() {
  const section = useRef<HTMLElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const heads = useRef<(HTMLDivElement | null)[]>([]);
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
    const el = section.current, cv = cvRef.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    setReduced(reduce);

    const renderers: (FabricRenderer | null)[] = SCENES.map(() => null);
    const state = { progress: 0 };
    let raf = 0, dirty = true, visible = true, disposed = false, lastActivity = -Infinity, lastRender = 0, buildToken = 0;
    let buildTimer = 0, cssW = 1, cssH = 1, poolScene = -1;

    const build = () => {
      const token = ++buildToken;
      const dpr = RENDER_SCALE;
      const { width, height } = cv.getBoundingClientRect();
      cssW = width; cssH = height;
      cv.width = Math.round(width * dpr);
      cv.height = Math.round(height * dpr);
      renderers.fill(null);
      scale = mobile ? 1.15 : 1;
      // First scene now; the rest while the browser is idle, so they are ready before the visitor scrolls to them.
      const next = (i: number) => {
        if (disposed || token !== buildToken || i >= N) return;
        ensure(i);
        if (!reduce) buildTimer = idle(() => next(i + 1));
      };
      next(0);
    };
    let scale = 1;
    const ensure = (i: number) => {
      if (renderers[i] || i >= N) return renderers[i];
      renderers[i] = new FabricRenderer(SCENES[i].look, cv.width, cv.height, RENDER_SCALE, { scale });
      dirty = true;
      return renderers[i];
    };
    // Safari has no requestIdleCallback.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = (fn: () => void) => (hasIdle ? window.requestIdleCallback(fn, { timeout: 1500 }) : window.setTimeout(fn, 200));
    const cancelIdle = (id: number) => (hasIdle ? window.cancelIdleCallback(id) : clearTimeout(id));

    const render = (now: number) => {
      dirty = false;
      lastRender = now;
      const f = Math.min(state.progress * N, N - 1e-6);
      const i = Math.floor(f), t = f - i;
      const drift = reduce ? 0 : Math.sin(now / 1400) * 0.015;
      const a = ensure(i);
      const L = reduce ? { x: 0.32, y: 0.3 } : lightAt(i, t);
      if (a) a.draw(ctx, L.x + drift, L.y, 1, 1, false);
      // The broad pool of light is a CSS layer: the GPU moves it for free, the canvas never blends it.
      const p = pool.current;
      if (p) {
        if (poolScene !== i) { poolScene = i; p.style.setProperty("--glint", SCENES[i].look.glint); }
        p.style.transform = `translate3d(${(L.x + drift) * cssW}px, ${L.y * cssH}px, 0) translate(-50%, -50%)`;
      }
      const fade = i < N - 1 && t > 1 - FADE ? (t - (1 - FADE)) / FADE : 0;
      const b = i < N - 1 && t > 1 - FADE ? ensure(i + 1) : null;
      if (fade > 0 && b) {
        const L2 = lightAt(i + 1, 0);
        b.draw(ctx, L2.x + drift, L2.y, fade * fade * (3 - 2 * fade), 1, false);
      }
      // Headlines: visible through the middle of their scene.
      heads.current.forEach((h, j) => {
        if (!h) return;
        let o = 0;
        if (reduce) o = j === 0 ? 1 : 0;
        else if (j === i) o = (i === 0 ? 1 : Math.min(1, t / 0.12)) * (i === N - 1 ? 1 : Math.min(1, (1 - FADE * 0.6 - t) / 0.1));
        else if (j === i + 1 && fade > 0.6) o = (fade - 0.6) / 0.4;
        o = Math.max(0, Math.min(1, o));
        h.style.opacity = String(o);
        h.style.transform = `translate3d(0, ${(1 - o) * 26}px, 0)`;
        h.style.visibility = o < 0.01 ? "hidden" : "visible";
      });
      marks.current.forEach((m, j) => m?.setAttribute("aria-current", j === (fade > 0.5 ? i + 1 : i) ? "step" : "false"));
      if (cue.current) cue.current.style.opacity = String(Math.max(0, 1 - state.progress * 12));
    };

    const loop = (now: number) => {
      if (disposed) return;
      const idle = !reduce && now - lastActivity < IDLE_MS && now - lastRender >= IDLE_FRAME_MS;
      if (visible && !document.hidden && (dirty || idle)) render(now);
      raf = requestAnimationFrame(loop);
    };

    build();
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 180); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);
    const wake = () => { lastActivity = performance.now(); };
    const wakeEvents = ["scroll", "wheel", "pointermove", "touchstart", "keydown"] as const;
    wakeEvents.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    raf = requestAnimationFrame(loop);

    let tween: gsap.core.Tween | null = null;
    if (!reduce) {
      gsap.registerPlugin(ScrollTrigger);
      tween = gsap.to(state, {
        progress: 1, ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6, onUpdate: () => { dirty = true; } },
        onUpdate: () => { dirty = true; },
      });
      trigger.current = tween.scrollTrigger ?? null;
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelIdle(buildTimer); clearTimeout(resizeTimer);
      ro.disconnect(); io.disconnect();
      wakeEvents.forEach((e) => window.removeEventListener(e, wake));
      tween?.scrollTrigger?.kill();
      tween?.kill();
      trigger.current = null;
    };
  }, []);

  return (
    <section ref={section} aria-labelledby="hero-title" className="relative" style={{ height: reduced ? "100svh" : `${N * 100 + 40}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={cvRef} role="img" aria-label="Light moving across embellished fabrics: sequins, beading, pearls and lace (illustration)" className="absolute inset-0 h-full w-full" />
        <div
          ref={pool} aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[170vmax] w-[170vmax] rounded-full will-change-transform"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--glint, #ffe0a3) 16%, transparent) 0%, color-mix(in srgb, var(--glint, #ffe0a3) 5%, transparent) 28%, transparent 55%)", transform: "translate3d(32vw, 30vh, 0) translate(-50%, -50%)" }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,10,9,0.9)_0%,rgba(11,10,9,0.6)_38%,rgba(11,10,9,0)_72%),linear-gradient(0deg,rgba(11,10,9,0.9)_0%,rgba(11,10,9,0)_40%)]" />

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
                    className="group flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.2em] text-ivory/60 hover:text-gold aria-[current=step]:text-gold"
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

        <span className="chip absolute bottom-6 right-4 sm:right-8">Illustration · not a product photo</span>
        {!reduced && (
          <div ref={cue} aria-hidden className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.6875rem] uppercase tracking-[0.3em] text-ivory/60 sm:flex">
            Scroll to move the light
            <span className="h-8 w-px bg-gradient-to-b from-gold to-transparent" />
          </div>
        )}
      </div>
    </section>
  );
}
