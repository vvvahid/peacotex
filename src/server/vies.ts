import "server-only";

/*
 * EU VAT number check against VIES (the European Commission's VAT Information Exchange System).
 * Norwegian numbers are not in VIES: they are checked for the right shape only.
 * VIES_TEST=1 uses the Commission's test service (valid: number "100", invalid: "200").
 */

export interface VatCheck {
  valid: boolean;
  /** Country of the number; Greece uses "EL" in VAT numbers but "GR" for shipping. */
  country: string;
  /** Normalised number, e.g. "NL123456789B01". */
  vatId: string;
  name?: string;
  /** VIES did not answer: try again later. */
  unavailable?: boolean;
}

const BASE = "https://ec.europa.eu/taxation_customs/vies/rest-api";
const cache = new Map<string, { at: number; result: VatCheck }>();

export const normaliseVatId = (raw: string) => raw.toUpperCase().replace(/[\s.\-/]/g, "");

export async function checkVat(raw: string): Promise<VatCheck> {
  const id = normaliseVatId(raw);
  const prefix = id.slice(0, 2);
  const number = id.slice(2);
  const shipCountry = prefix === "EL" ? "GR" : prefix;
  if (!/^[A-Z]{2}[0-9A-Z+*]{2,13}$/.test(id)) return { valid: false, country: shipCountry, vatId: id };
  if (prefix === "NO") {
    // Norway: 9-digit organisation number, optionally followed by MVA.
    const m = number.match(/^(\d{9})(MVA)?$/);
    return { valid: !!m, country: "NO", vatId: m ? `NO${m[1]}MVA` : id };
  }

  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < 3600_000) return hit.result;
  try {
    const test = process.env.VIES_TEST === "1";
    const res = await fetch(`${BASE}/${test ? "check-vat-test-service" : "check-vat-number"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ countryCode: prefix, vatNumber: number }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`VIES ${res.status}`);
    const data = (await res.json()) as { valid?: boolean; name?: string; userError?: string };
    if (data.userError && !["VALID", "INVALID", "INVALID_INPUT"].includes(data.userError)) throw new Error(`VIES ${data.userError}`);
    const name = data.name && data.name !== "---" ? data.name.trim() : undefined;
    const result: VatCheck = { valid: !!data.valid, country: shipCountry, vatId: id, ...(name && { name }) };
    cache.set(id, { at: Date.now(), result });
    return result;
  } catch (err) {
    console.error("VIES check failed", err);
    return { valid: false, unavailable: true, country: shipCountry, vatId: id };
  }
}
