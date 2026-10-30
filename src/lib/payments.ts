import type { Locale } from "@/i18n/config";
import type { Currency } from "@/lib/money";
import type { PaymentIcon } from "@/lib/payment-icons";

/*
 * The payment methods shown on the site, per country and currency. Keep `on` in step with Stripe →
 * Settings → Payment methods: Checkout only offers what is switched on there, and the site must
 * never show a logo the shopper then cannot use. (State of the test account, 29 Oct 2026; the
 * live account has its own settings.)
 */

interface Method {
  label: string;
  /** Brand mark (lib/payment-icons); methods without one are shown as a wordmark. */
  icon?: PaymentIcon;
  on: boolean;
  /** Countries where the method is offered; all when absent. */
  countries?: string[];
  /** Currencies the method can be paid in; all when absent. */
  currencies?: Currency[];
}

const EUR: Currency[] = ["EUR"];

export const METHODS = {
  visa: { label: "Visa", icon: "visa", on: true },
  mastercard: { label: "Mastercard", icon: "mastercard", on: true },
  amex: { label: "American Express", icon: "americanexpress", on: true },
  applepay: { label: "Apple Pay", icon: "applepay", on: true },
  googlepay: { label: "Google Pay", icon: "googlepay", on: false },
  ideal: { label: "iDEAL", on: false, countries: ["NL"], currencies: EUR },
  bancontact: { label: "Bancontact", on: true, countries: ["BE"], currencies: EUR },
  eps: { label: "EPS", on: true, countries: ["AT"], currencies: EUR },
  blik: { label: "BLIK", on: true, countries: ["PL"], currencies: ["PLN"] },
  p24: { label: "Przelewy24", on: false, countries: ["PL"], currencies: ["PLN", "EUR"] },
  mobilepay: { label: "MobilePay", on: false, countries: ["DK", "FI"], currencies: ["DKK", "EUR"] },
  swish: { label: "Swish", on: false, countries: ["SE"], currencies: ["SEK"] },
  klarna: { label: "Klarna", icon: "klarna", on: true, currencies: ["EUR", "DKK", "SEK", "NOK", "PLN"] },
  paypal: { label: "PayPal", icon: "paypal", on: false },
} satisfies Record<string, Method>;

export type MethodId = keyof typeof METHODS;

/** The shopper's likely country when the server cannot tell (no geo header): from the page language. */
export const LANG_COUNTRY: Record<Locale, string | null> = {
  en: null, nl: "NL", de: "DE", fr: "FR", pl: "PL", ro: "RO", cs: "CZ", hu: "HU", sv: "SE", da: "DK", fi: "FI", nb: "NO",
};

/** Local methods first (iDEAL, BLIK…: what people in that country look for), then cards and wallets. */
export function methodsFor(country: string | null, currency: Currency): MethodId[] {
  const ok = (id: MethodId) => {
    const m: Method = METHODS[id];
    return m.on && (!m.currencies || m.currencies.includes(currency)) && (!m.countries || (!!country && m.countries.includes(country)));
  };
  const all = Object.keys(METHODS) as MethodId[];
  const local = all.filter((id) => "countries" in METHODS[id] && ok(id));
  return [...local, ...all.filter((id) => !("countries" in METHODS[id]) && ok(id))];
}
