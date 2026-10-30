"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { PAYMENT_ICONS, PAYMENT_VIEWBOX } from "@/lib/payment-icons";
import { LANG_COUNTRY, METHODS, methodsFor } from "@/lib/payments";

// One lookup per visit, shared by every PaymentMethods on the page.
let countryPromise: Promise<string | null> | null = null;
function visitorCountry(): Promise<string | null> {
  countryPromise ??= (async () => {
    try {
      const saved = sessionStorage.getItem("ptx_country");
      if (saved) return saved === "-" ? null : saved;
    } catch {}
    const country = await fetch("/api/geo").then((r) => r.json()).then((d: { country: string | null }) => d.country).catch(() => null);
    try { sessionStorage.setItem("ptx_country", country ?? "-"); } catch {}
    return country;
  })();
  return countryPromise;
}

/**
 * The payment methods this shopper can use at checkout: cards and wallets everywhere, plus their
 * country's own methods (iDEAL, BLIK, Swish…) in their currency. See lib/payments.ts.
 */
export function PaymentMethods({ className = "", title = true }: { className?: string; title?: boolean }) {
  const { t, lang, money } = useI18n();
  const [country, setCountry] = useState<string | null>(LANG_COUNTRY[lang]);
  useEffect(() => {
    let live = true;
    visitorCountry().then((c) => { if (live && c) setCountry(c); });
    return () => { live = false; };
  }, []);

  const ids = methodsFor(country, money.cur);
  return (
    <div className={className}>
      {title && <p className="mb-2 text-xs text-mist">{t.pay.title}</p>}
      <ul aria-label={t.pay.title} className="flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const m = METHODS[id];
          return (
            <li key={id} className="flex h-8 min-w-12 items-center justify-center rounded-md border border-line bg-ivory/[0.04] px-2.5 text-ivory/80" title={m.label}>
              {"icon" in m ? (
                <svg role="img" aria-label={m.label} viewBox={PAYMENT_VIEWBOX[m.icon]} className={`w-auto ${m.icon === "americanexpress" ? "h-6" : m.icon === "visa" || m.icon === "googlepay" ? "h-3.5" : "h-5"}`} fill="currentColor">
                  <path d={PAYMENT_ICONS[m.icon]} />
                </svg>
              ) : (
                <span className="text-[0.6875rem] font-semibold tracking-wide">{m.label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
