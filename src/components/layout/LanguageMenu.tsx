"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, localePath, splitLocale, type Locale } from "@/i18n/config";

/**
 * Language picker: a disclosure button with plain links to the same page in each language.
 * Choosing one remembers it in a cookie, so later unprefixed visits land in that language.
 */
export function LanguageMenu() {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const { path } = splitLocale(pathname);

  // Keep filters and #anchors when switching (read after mount; the server has no window).
  useEffect(() => { setQuery(window.location.search + window.location.hash); }, [pathname, open]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, [open]);

  const choose = (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button" aria-expanded={open} aria-controls="language-list" onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-1.5 rounded-full px-2 text-[0.8125rem] sm:px-3 uppercase tracking-[0.2em] hover:text-gold"
      >
        <span className="sr-only">{t.nav.language}: </span>{lang}
        <span aria-hidden className={`text-[0.6rem] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <ul id="language-list" className="absolute right-0 top-12 z-10 min-w-44 overflow-hidden rounded-2xl border border-line bg-ink/95 py-2 shadow-2xl backdrop-blur-md">
          {LOCALES.map((l) => (
            <li key={l}>
              {/* A full page load, so the new language's texts and <html lang> come from the server. */}
              <a
                href={localePath(l, path) + query} hrefLang={l} lang={l} onClick={() => choose(l)}
                aria-current={l === lang ? "true" : undefined}
                className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-ivory/5 hover:text-gold ${l === lang ? "text-gold" : "text-ivory/85"}`}
              >
                {LOCALE_NAMES[l]}
                <span className="text-[0.6875rem] uppercase tracking-[0.2em] text-mist">{l}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
