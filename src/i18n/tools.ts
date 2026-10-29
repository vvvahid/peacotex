import type { Complement, Product } from "@/lib/catalog";
import { localePath, type Locale } from "./config";
import type { Dict } from "./dict/en";
import { fill, formatMetres, formatPrice, plural, type Plural } from "./format";

/** Everything a page or component needs to speak one language. Works on the server and in the browser. */
export function makeI18n(lang: Locale, t: Dict) {
  return {
    lang,
    t,
    fill,
    /** A site path in this language: "/shop" → "/nl/shop". */
    href: (path: string) => localePath(lang, path),
    price: (n: number) => formatPrice(n, lang),
    metres: (n: number) => formatMetres(n, lang),
    plural: (forms: Plural, n: number) => plural(lang, forms, n),
    product: (p: Product): Product => {
      const tx = t.catalog.products[p.slug];
      return {
        ...p,
        tagline: tx?.tagline ?? p.tagline,
        description: tx?.description ?? p.description,
        colour: { ...p.colour, name: tx?.colour ?? p.colour.name },
        stretch: p.stretch === "None" ? t.catalog.stretchNone : t.catalog.stretchSlight,
        care: t.catalog.care,
      };
    },
    complement: (c: Complement): Complement => {
      const tx = t.catalog.complements[c.slug];
      return tx ? { ...c, ...tx } : c;
    },
  };
}

export type I18n = ReturnType<typeof makeI18n>;
