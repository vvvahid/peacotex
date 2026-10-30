"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dict/en";
import { makeI18n } from "./tools";
import { CURRENCY_COOKIE, LANG_CURRENCY, isCurrency, moneyOf, type Currency, type Rates } from "@/lib/money";

function useValue(lang: Locale, dict: Dict, rates: Rates) {
  // Each language starts with its usual currency; a choice in the currency menu (cookie) overrides it.
  const [cur, setCur] = useState<Currency>(LANG_CURRENCY[lang]);
  useEffect(() => {
    const saved = document.cookie.match(new RegExp(`(?:^|; )${CURRENCY_COOKIE}=([A-Z]{3})`))?.[1];
    if (isCurrency(saved)) setCur(saved);
  }, []);
  const setCurrency = useCallback((c: Currency) => {
    document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`;
    setCur(c);
  }, []);
  return useMemo(() => {
    const money = moneyOf(cur, rates, lang);
    return { ...makeI18n(lang, dict), money, rates, price: money.price, setCurrency };
  }, [lang, dict, rates, cur, setCurrency]);
}

type Value = ReturnType<typeof useValue>;
const Ctx = createContext<Value | null>(null);

/** Hands the current language's texts and the shopper's currency to client components (only this language's dictionary reaches the browser). */
export function I18nProvider({ lang, dict, rates, children }: { lang: Locale; dict: Dict; rates: Rates; children: ReactNode }) {
  return <Ctx.Provider value={useValue(lang, dict, rates)}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
