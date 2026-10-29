import "server-only";
import { FALLBACK_RATES, type Currency, type Rates } from "@/lib/money";

const ECB = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

/** Today's ECB reference rates (cached for 6 hours); the built-in rates if the feed is down. */
export async function getRates(): Promise<Rates> {
  try {
    const res = await fetch(ECB, { next: { revalidate: 21600, tags: ["rates"] }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`ECB ${res.status}`);
    const xml = await res.text();
    const rates: Rates = { ...FALLBACK_RATES };
    for (const cur of Object.keys(rates) as Currency[]) {
      if (cur === "EUR") continue;
      const m = xml.match(new RegExp(`currency=['"]${cur}['"]\\s+rate=['"]([0-9.]+)['"]`));
      const r = m ? Number(m[1]) : NaN;
      if (Number.isFinite(r) && r > 0) rates[cur] = r;
    }
    return rates;
  } catch (err) {
    console.error("rates: ECB feed unavailable, using built-in rates", err);
    return FALLBACK_RATES;
  }
}
