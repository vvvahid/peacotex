import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, localePath, type Locale } from "./config";
import type { Dict } from "./dict/en";
import en from "./dict/en";
import nl from "./dict/nl";
import de from "./dict/de";
import fr from "./dict/fr";
import pl from "./dict/pl";
import ro from "./dict/ro";
import cs from "./dict/cs";
import hu from "./dict/hu";
import sv from "./dict/sv";
import da from "./dict/da";
import fi from "./dict/fi";
import nb from "./dict/nb";
import { makeI18n } from "./tools";
import { LANG_CURRENCY, moneyOf } from "@/lib/money";
import { getRates } from "@/server/rates";

const DICTS: Record<Locale, Dict> = { en, nl, de, fr, pl, ro, cs, hu, sv, da, fi, nb };

export const getDict = (lang: Locale) => DICTS[lang];
export const getI18n = (lang: Locale) => makeI18n(lang, DICTS[lang]);

/** Prices on server-rendered pages, in the language's usual currency. */
export async function getMoney(lang: Locale) {
  return moneyOf(LANG_CURRENCY[lang], await getRates(), lang);
}

/** The [lang] route param as a Locale; anything else is a 404. */
export async function langOf(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}

/** Canonical URL and hreflang links for a page that exists in every language. */
export function alternates(lang: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: localePath(lang, path),
    languages: { ...Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])), "x-default": path },
  };
}
