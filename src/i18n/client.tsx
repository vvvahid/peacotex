"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dict/en";
import { makeI18n, type I18n } from "./tools";

const Ctx = createContext<I18n | null>(null);

/** Hands the current language's texts to client components (only that one dictionary reaches the browser). */
export function I18nProvider({ lang, dict, children }: { lang: Locale; dict: Dict; children: ReactNode }) {
  const value = useMemo(() => makeI18n(lang, dict), [lang, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
