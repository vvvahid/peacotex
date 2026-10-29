import type { OrderStatus } from "@/server/admin";

/** Minor units (cents, grosze…) in a currency; euros when none is given. */
export const euro = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export const when = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(new Date(iso)) : "—";

const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  needs_attention: { label: "Needs attention", tone: "border-red-400/60 bg-red-400/15 text-red-200" },
  paid: { label: "Paid · to cut", tone: "border-gold/60 bg-gold/15 text-gold" },
  cut: { label: "Cut · to ship", tone: "border-sky-300/50 bg-sky-300/10 text-sky-200" },
  shipped: { label: "Shipped", tone: "border-emerald-300/50 bg-emerald-300/10 text-emerald-200" },
  pending: { label: "Awaiting payment", tone: "border-line text-mist" },
  expired: { label: "Not paid", tone: "border-line text-mist" },
  cancelled: { label: "Cancelled", tone: "border-line text-mist line-through" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS[status];
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${s.tone}`}>{s.label}</span>;
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-red-400/60 bg-red-400/10 text-red-200" : "border-emerald-300/50 bg-emerald-300/10 text-emerald-200"}`}>
      {children}
    </p>
  );
}

export const field = "mt-1.5 block w-full rounded-xl border border-line bg-night px-3.5 py-2.5 text-ivory focus:border-gold focus:outline-none";
