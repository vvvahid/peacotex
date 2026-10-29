import { INTL_LOCALE, type Locale } from "./config";

/** Plural forms of a phrase; which ones a language needs comes from Intl.PluralRules. */
export interface Plural { one: string; few?: string; many?: string; other: string }

/** Fills {placeholders} in a translated string. */
export function fill(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

export function plural(lang: Locale, forms: Plural, n: number) {
  const form = new Intl.PluralRules(INTL_LOCALE[lang]).select(n) as keyof Plural;
  return fill(forms[form] ?? forms.other, { n });
}

/** A length in metres, with the language's decimal separator: "2.5 m", "2,5 m". */
export function formatMetres(n: number, lang: Locale = "en") {
  return `${new Intl.NumberFormat(INTL_LOCALE[lang], { maximumFractionDigits: 2 }).format(n)} m`;
}
