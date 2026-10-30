"use client";

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/i18n/client";

export interface Buyer { type: "private" | "business"; company: string; vatId: string }
export interface VatResult { valid: boolean; unavailable: boolean; country: string; vatId: string; name: string | null; treatment: "standard" | "reverse_charge" | "export" | null }

const KEY = "ptx_buyer";
export const EMPTY_BUYER: Buyer = { type: "private", company: "", vatId: "" };

/** The buyer's details for this browser (kept between visits, like the bag). */
export function useBuyer() {
  const [buyer, setBuyer] = useState<Buyer>(EMPTY_BUYER);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setBuyer({ ...EMPTY_BUYER, ...JSON.parse(raw) }); } catch {}
  }, []);
  const update = (b: Buyer) => { setBuyer(b); try { localStorage.setItem(KEY, JSON.stringify(b)); } catch {} };
  return [buyer, update] as const;
}

/**
 * Private customer or business. A business enters its VAT number, which is checked against the
 * EU register (VIES) at once, so the bag can show prices without VAT where they apply.
 */
export function BuyerDetails({ buyer, onChange, check, onCheck }: { buyer: Buyer; onChange: (b: Buyer) => void; check: VatResult | null; onCheck: (r: VatResult | null) => void }) {
  const { t, fill, lang } = useI18n();
  const c = t.cart.buyer;
  const id = useId();
  const [busy, setBusy] = useState(false);
  const country = (code: string) => { try { return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code; } catch { return code; } };

  const runCheck = async (vatId = buyer.vatId) => {
    if (vatId.replace(/\W/g, "").length < 4) { onCheck(null); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/vat-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vatId }) });
      onCheck(res.ok ? ((await res.json()) as VatResult) : null);
    } catch {
      onCheck({ valid: false, unavailable: true, country: "", vatId, name: null, treatment: null });
    }
    setBusy(false);
  };
  // A number remembered from an earlier visit is checked again.
  useEffect(() => { if (buyer.type === "business" && buyer.vatId && !check) void runCheck(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [buyer.type]);

  const field = "mt-1.5 block h-11 w-full rounded-xl border border-line bg-ink px-3.5 text-ivory focus:border-gold focus:outline-none";
  return (
    <fieldset className="mt-6 rounded-2xl border border-line p-4">
      <legend className="px-1 text-xs uppercase tracking-[0.2em] text-mist">{c.title}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(["private", "business"] as const).map((type) => (
          <label key={type} className={`flex cursor-pointer items-center justify-center rounded-full border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${buyer.type === type ? "border-gold bg-gold/15 text-gold" : "border-line text-ivory/80 hover:border-ivory/40"}`}>
            <input type="radio" name={`${id}-type`} value={type} checked={buyer.type === type} onChange={() => { onChange({ ...buyer, type }); if (type === "private") onCheck(null); }} className="sr-only" />
            {type === "private" ? c.private : c.business}
          </label>
        ))}
      </div>
      {buyer.type === "business" && (
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-mist">{c.company}
            <input value={buyer.company} onChange={(e) => onChange({ ...buyer, company: e.target.value })} autoComplete="organization" maxLength={120} className={field} />
          </label>
          <div>
            <label htmlFor={`${id}-vat`} className="block text-xs text-mist">{c.vatId}</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={`${id}-vat`} value={buyer.vatId} placeholder={c.vatPlaceholder} maxLength={30} aria-describedby={`${id}-vatmsg`}
                onChange={(e) => { onChange({ ...buyer, vatId: e.target.value }); onCheck(null); }}
                onBlur={() => void runCheck()}
                className={`${field} mt-0 uppercase`}
              />
              <button type="button" onClick={() => void runCheck()} disabled={busy} className="btn btn-line min-h-0 shrink-0 px-4">{c.check}</button>
            </div>
          </div>
          <p id={`${id}-vatmsg`} role="status" className="min-h-5 text-xs">
            {busy ? <span className="text-mist">{c.checking}</span>
              : check?.valid ? (
                <span className="text-gold">
                  {fill(c.valid, { name: check.name ?? check.vatId })}.{" "}
                  {check.treatment === "reverse_charge" ? fill(c.reverse, { country: country(check.country) }) : check.treatment === "export" ? c.export : c.beVat}
                </span>
              ) : check?.unavailable ? <span className="text-red-300">{c.unavailable}</span>
              : check ? <span className="text-red-300">{c.invalid}</span>
              : <span className="text-mist">{c.hint}</span>}
          </p>
        </div>
      )}
    </fieldset>
  );
}
