"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window { __lenis?: Lenis }
}

/**
 * Smooth wheel/trackpad scrolling (Lenis) for pointer devices. Touch scrolling stays native, and
 * nothing runs when the visitor prefers reduced motion. Lenis moves the real window scroll, so
 * ScrollTrigger and IntersectionObserver keep working; other components stop/start it through
 * `window.__lenis` (intro curtain, menu).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    // The intro curtain may already hold the page still.
    if (document.documentElement.classList.contains("intro-lock")) lenis.stop();
    let id = requestAnimationFrame(function raf(t) { lenis.raf(t); id = requestAnimationFrame(raf); });
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
      if (window.__lenis === lenis) window.__lenis = undefined;
    };
  }, []);
  return null;
}
