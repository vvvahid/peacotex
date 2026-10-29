"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { CURRENCIES, type Currency } from "@/lib/money";

const SYMBOL: Record<Currency, string> = { EUR: "€", PLN: "zł", RON: "lei", CZK: "Kč", HUF: "Ft" };

/** Currency picker: switches prices at once (no reload) and remembers the choice in a cookie. */
export function CurrencyMenu() {
  const { t, money, setCurrency } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button" aria-expanded={open} aria-controls="currency-list" onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-1.5 rounded-full px-2 text-[0.8125rem] tracking-[0.1em] hover:text-gold"
      >
        <span className="sr-only">{t.nav.currency}: </span>{SYMBOL[money.cur]}
        <span aria-hidden className={`text-[0.6rem] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <ul id="currency-list" className="absolute right-0 top-12 z-10 min-w-36 overflow-hidden rounded-2xl border border-line bg-ink/95 py-2 shadow-2xl backdrop-blur-md">
          {CURRENCIES.map((c) => (
            <li key={c}>
              <button
                type="button" aria-pressed={c === money.cur} onClick={() => { setCurrency(c); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm hover:bg-ivory/5 hover:text-gold ${c === money.cur ? "text-gold" : "text-ivory/85"}`}
              >
                {c}<span className="text-mist">{SYMBOL[c]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
