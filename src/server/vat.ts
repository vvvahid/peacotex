import "server-only";

/*
 * Standard VAT rates of the EU countries we ship to (as fractions). Prices on the site include
 * VAT; at payment the order records how much of the total is VAT for the destination country
 * (EU OSS rules for sales to consumers abroad). Rates change: check them with the accountant
 * at least once a year.
 *
 * Norway (NO) is outside the EU: its 25% VAT is collected through the VOEC scheme (registration
 * with the Norwegian tax office) for parcels up to NOK 3 000; above that the buyer pays import VAT.
 */
export const VAT_RATES: Record<string, number> = {
  AT: 0.2, BE: 0.21, BG: 0.2, CY: 0.19, CZ: 0.21, DE: 0.19, DK: 0.25, EE: 0.24, ES: 0.21, FI: 0.255,
  FR: 0.2, GR: 0.24, HR: 0.25, HU: 0.27, IE: 0.23, IT: 0.22, LT: 0.21, LU: 0.17, LV: 0.21, MT: 0.18,
  NL: 0.21, PL: 0.23, PT: 0.23, RO: 0.21, SE: 0.25, SI: 0.22, SK: 0.23,
  NO: 0.25,
};

/** Every country Stripe Checkout lets customers ship to: the EU and Norway. */
export const SHIP_COUNTRIES = Object.keys(VAT_RATES);

/** The VAT inside a VAT-inclusive total, in minor units. */
export function vatOf(totalCents: number, country: string | null | undefined) {
  const rate = country ? VAT_RATES[country] : undefined;
  if (rate == null) return null;
  return { country: country!, rate, cents: Math.round((totalCents * rate) / (1 + rate)) };
}
