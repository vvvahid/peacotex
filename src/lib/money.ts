import { INTL_LOCALE, type Locale } from "@/i18n/config";

/*
 * Prices are set in euros (admin). Shoppers in Poland, Romania, Czechia, Hungary, Sweden, Denmark
 * and Norway see and pay in their own currency: the euro price is converted at the ECB rate and
 * rounded up to a tidy amount. A line costs (rounded unit price) × quantity, the same on the page, in the bag and on Stripe.
 */

export const CURRENCIES = ["EUR", "PLN", "RON", "CZK", "HUF", "SEK", "DKK", "NOK"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_COOKIE = "ptx_cur";

/** Units of each currency per euro. */
export type Rates = Record<Currency, number>;

/** Used when the ECB feed cannot be reached (rates of 28–29 Oct 2026). */
export const FALLBACK_RATES: Rates = { EUR: 1, PLN: 4.4045, RON: 5.3508, CZK: 24.367, HUF: 366.88, SEK: 10.9995, DKK: 7.4736, NOK: 10.3315 };

export const isCurrency = (s: unknown): s is Currency => typeof s === "string" && (CURRENCIES as readonly string[]).includes(s);

/** The currency a language starts with; the currency menu can change it. */
export const LANG_CURRENCY: Record<Locale, Currency> = {
  en: "EUR", nl: "EUR", de: "EUR", fr: "EUR", pl: "PLN", ro: "RON", cs: "CZK", hu: "HUF", sv: "SEK", da: "DKK", fi: "EUR", nb: "NOK",
};

/** Euro price → price in `cur`, rounded up: 787.43 zł → 789 zł, 2 034.9 kr → 2 039 kr, 4 625 Kč → 4 630 Kč, 67 873 Ft → 67 900 Ft. */
export function localUnit(eur: number, cur: Currency, rates: Rates): number {
  if (cur === "EUR") return eur;
  const x = eur * rates[cur];
  if (cur === "CZK") return Math.ceil(x / 10) * 10;
  if (cur === "HUF") return Math.ceil(x / 100) * 100;
  // PLN, RON, SEK, DKK, NOK: whole units ending in 9 from 10 up.
  return x < 10 ? Math.ceil(x) : Math.ceil((x + 1) / 10) * 10 - 1;
}

/** Amount in minor units (cents, grosze…) for Stripe and the database. */
export const toMinor = (amount: number) => Math.round(amount * 100);

export function formatMoney(amount: number, cur: Currency, lang: Locale) {
  const whole = Math.abs(amount % 1) < 1e-9;
  return new Intl.NumberFormat(INTL_LOCALE[lang], {
    // narrowSymbol: "lei", "zł", "Kč", "Ft" rather than "RON", "PLN"…
    style: "currency", currency: cur, currencyDisplay: "narrowSymbol", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** The currency an order or line is charged in, with its tidy local prices. */
export function moneyOf(cur: Currency, rates: Rates, lang: Locale) {
  const unit = (eur: number) => localUnit(eur, cur, rates);
  return {
    cur,
    rate: rates[cur],
    unit,
    format: (amount: number) => formatMoney(amount, cur, lang),
    /** A euro unit price, converted, times a quantity, formatted. */
    price: (eurUnit: number, qty = 1) => formatMoney(unit(eurUnit) * qty, cur, lang),
  };
}

export type Money = ReturnType<typeof moneyOf>;
