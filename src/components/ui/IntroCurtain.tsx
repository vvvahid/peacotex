"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n/client";

const MIN_VISIBLE_MS = 1200; // from first paint; long enough for the wordmark and the line to land
const MAX_VISIBLE_MS = 2200; // never hold the page longer, even if `load` is slow
const EXIT_MS = 800;
export const INTRO_DONE_EVENT = "ptx:intro-done";

/**
 * Opening curtain for the home page: wordmark + a filling line, then the curtain slides up and
 * the hero's first headline rises in. Shown once per session; the head script in the locale
 * layout decides before first paint (html.intro), so returning visitors never see a flash.
 * Purely decorative for assistive tech (aria-hidden); content underneath is already in the DOM.
 */
export function IntroCurtain() {
  const { t } = useI18n();
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("intro")) return;
    window.__lenis?.stop();
    const started = performance.now();
    let done = false;
    const timers: number[] = [];

    const finish = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem("ptx_intro", "seen"); } catch {}
      root.classList.add("intro-out");
      root.classList.remove("intro-lock");
      window.__lenis?.start();
      window.dispatchEvent(new Event(INTRO_DONE_EVENT));
      timers.push(window.setTimeout(() => root.classList.remove("intro", "intro-out"), EXIT_MS));
    };
    const afterLoad = () => timers.push(window.setTimeout(finish, Math.max(0, MIN_VISIBLE_MS - (performance.now() - started))));
    if (document.readyState === "complete") afterLoad(); else window.addEventListener("load", afterLoad, { once: true });
    timers.push(window.setTimeout(finish, MAX_VISIBLE_MS));

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", afterLoad);
      // Leaving mid-intro (client navigation): never strand the page locked.
      if (!done) root.classList.remove("intro", "intro-lock", "intro-out");
    };
  }, []);

  return (
    <div aria-hidden className="intro-curtain">
      <div className="intro-mark flex flex-col items-center leading-none">
        <span className="font-serif text-[2.1rem] sm:text-[2.6rem] font-light tracking-[0.36em]">PEACOTEX</span>
        <span className="mt-3 text-[0.75rem] tracking-[0.5em] uppercase text-champagne">{t.intro.tagline}</span>
      </div>
      <div className="h-px w-40 overflow-hidden bg-gold/20">
        <div className="intro-fill h-full w-full bg-gold" />
      </div>
    </div>
  );
}
