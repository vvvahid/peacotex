/*
 * Languages of the site. English lives at the unprefixed URLs (/shop); every other language has
 * its own prefix (/nl/shop). The middleware maps unprefixed URLs onto the [lang] routes.
 * Pure data and string helpers only: this file also runs in the edge middleware.
 */

export const LOCALES = ["en", "nl", "de", "fr", "pl", "ro", "cs", "hu", "sv", "da", "fi", "nb"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ptx_lang";

/** Each language's own name, as shown in the language menu. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English", nl: "Nederlands", de: "Deutsch", fr: "Français",
  pl: "Polski", ro: "Română", cs: "Čeština", hu: "Magyar",
  sv: "Svenska", da: "Dansk", fi: "Suomi", nb: "Norsk",
};

/** Locale for Intl number and currency formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB", nl: "nl-NL", de: "de-DE", fr: "fr-FR", pl: "pl-PL", ro: "ro-RO", cs: "cs-CZ", hu: "hu-HU",
  sv: "sv-SE", da: "da-DK", fi: "fi-FI", nb: "nb-NO",
};

export const isLocale = (s: unknown): s is Locale => typeof s === "string" && (LOCALES as readonly string[]).includes(s);

/** "/shop" in a language: "/shop" for English, "/nl/shop" for Dutch. Keeps any ?query and #hash. */
export function localePath(lang: Locale, path: string) {
  if (lang === DEFAULT_LOCALE) return path;
  if (path === "/" || path.startsWith("/?") || path.startsWith("/#")) return `/${lang}${path.slice(1)}`;
  return `/${lang}${path}`;
}

/** The language a pathname is in, and the path without its prefix. */
export function splitLocale(pathname: string): { lang: Locale; path: string } {
  const seg = pathname.split("/")[1];
  if (isLocale(seg) && seg !== DEFAULT_LOCALE) return { lang: seg, path: pathname.slice(seg.length + 1) || "/" };
  return { lang: DEFAULT_LOCALE, path: pathname };
}

/** Best supported language from an Accept-Language header, or undefined. */
export function fromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;
  const wanted = header.split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((x) => x.trim().startsWith("q="));
      const base = tag.toLowerCase().split("-")[0];
      // Norwegian arrives as "no", "nb" or "nn"; the site has Bokmål.
      return { base: base === "no" || base === "nn" ? "nb" : base, q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q);
  return wanted.map((w) => w.base).find(isLocale);
}
