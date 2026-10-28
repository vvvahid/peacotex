"use client";

import { useEffect, useRef } from "react";
import { FabricRenderer, type FabricLook, type RenderOptions } from "@/lib/fabric/render";

interface Props extends RenderOptions {
  look: FabricLook;
  /** Accessible description; "(illustration)" is appended. */
  label: string;
  className?: string;
  /** Controlled light position (fractions of the canvas). When set, pointer tracking is off. */
  light?: { x: number; y: number };
  /** Light follows the pointer while it is over the canvas (cards, macro view). */
  followPointer?: boolean;
  /** Resting light position. */
  rest?: { x: number; y: number };
}

/**
 * A procedural fabric in a canvas that fills its parent. The renderer is built lazily when the
 * canvas first comes near the viewport, rebuilt on resize, and only redraws when the light moves.
 */
export function FabricCanvas({ look, label, className, light, followPointer, rest = { x: 0.3, y: 0.25 }, scale, showEdge, backdrop }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef(light ?? rest);
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: FabricRenderer | null = null;
    let raf = 0, built = false, near = false, timer = 0;
    const cur = { ...lightRef.current };

    const draw = () => {
      raf = 0;
      if (!renderer) return;
      const target = lightRef.current;
      // Ease toward the target unless the visitor prefers reduced motion.
      const k = reduce ? 1 : 0.18;
      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;
      renderer.draw(ctx, cur.x, cur.y);
      if (Math.abs(target.x - cur.x) > 0.001 || Math.abs(target.y - cur.y) > 0.001) raf = requestAnimationFrame(draw);
    };
    redraw.current = () => { if (!raf) raf = requestAnimationFrame(draw); };

    const build = () => {
      const { width, height } = cv.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(width * dpr);
      cv.height = Math.round(height * dpr);
      renderer = new FabricRenderer(look, cv.width, cv.height, dpr, { scale, showEdge, backdrop });
      built = true;
      cur.x = lightRef.current.x; cur.y = lightRef.current.y;
      renderer.draw(ctx, cur.x, cur.y);
    };

    const io = new IntersectionObserver(([e]) => {
      near = e.isIntersecting;
      if (near && !built) build();
    }, { rootMargin: "300px" });
    io.observe(cv);
    const ro = new ResizeObserver(() => {
      if (!built) return;
      clearTimeout(timer);
      timer = window.setTimeout(build, 150);
    });
    ro.observe(cv);

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      lightRef.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      redraw.current();
    };
    const onLeave = () => { lightRef.current = rest; redraw.current(); };
    const host = cv.parentElement;
    if (followPointer && host) {
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
    }
    return () => {
      io.disconnect(); ro.disconnect();
      cancelAnimationFrame(raf); clearTimeout(timer);
      host?.removeEventListener("pointermove", onMove);
      host?.removeEventListener("pointerleave", onLeave);
    };
    // The look object is static per product; rebuild only if its seed or pattern changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look.seed, look.pattern, scale, showEdge, followPointer]);

  useEffect(() => {
    if (!light) return;
    lightRef.current = light;
    redraw.current();
  }, [light?.x, light?.y]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} role="img" aria-label={`${label} (illustration)`} className={className ?? "absolute inset-0 h-full w-full"} />;
}
