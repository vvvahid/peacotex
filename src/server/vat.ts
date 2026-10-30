import "server-only";
import type { VatCheck } from "./vies";

/*
 * VAT rules for the shop (seller: LeoPers BV, Belgium). Check them with the accountant at least
 * once a year; rates change.
 *
 *  - Private buyers pay the catalogue price, which includes VAT. At payment the order records the
 *    VAT share for the destination country (EU OSS), or Belgian VAT when VAT_MODE=origin (sales
 *    below the EU €10 000 OSS threshold). Norway: 25% through the VOEC scheme.
 *  - Businesses in Belgium pay the same price, with 21% Belgian VAT on the invoice.
 *  - Businesses elsewhere in the EU with a VAT number that VIES confirms: intra-Community supply,
 *    reverse charge, no VAT. They pay the price excluding Belgian VAT and the goods must ship to
 *    their own country.
 *  - Businesses in Norway: export, no VAT, shipped to Norway.
 */

export const VAT_RATES: Record<string, number> = {
  AT: 0.2, BE: 0.21, BG: 0.2, CY: 0.19, CZ: 0.21, DE: 0.19, DK: 0.25, EE: 0.24, ES: 0.21, FI: 0.255,
  FR: 0.2, GR: 0.24, HR: 0.25, HU: 0.27, IE: 0.23, IT: 0.22, LT: 0.21, LU: 0.17, LV: 0.21, MT: 0.18,
  NL: 0.21, PL: 0.23, PT: 0.23, RO: 0.21, SE: 0.25, SI: 0.22, SK: 0.23,
  NO: 0.25,
};

/** Every country Stripe Checkout lets customers ship to: the EU and Norway. */
export const SHIP_COUNTRIES = Object.keys(VAT_RATES);

export type VatTreatment = "standard" | "reverse_charge" | "export";

export interface Buyer { type: "private" | "business"; company?: string; vatId?: string }

/** How VAT applies to a business buyer whose number has been checked. */
export function treatmentFor(check: VatCheck): VatTreatment {
  if (check.country === "NO") return "export";
  return check.country === "BE" ? "standard" : "reverse_charge";
}

/** The VAT recorded on a paid order: rate and amount inside a VAT-inclusive total, in minor units. */
export function vatFor(totalCents: number, treatment: VatTreatment, customerType: string, shipCountry: string | null | undefined) {
  if (treatment !== "standard") return { country: shipCountry ?? "", rate: 0, cents: 0 };
  const country = customerType === "business" || process.env.VAT_MODE === "origin" ? "BE" : shipCountry ?? "BE";
  const rate = VAT_RATES[country];
  if (rate == null) return null;
  return { country, rate, cents: Math.round((totalCents * rate) / (1 + rate)) };
}
