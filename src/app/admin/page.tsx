import Link from "next/link";
import { dashboard } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";
import { StatusBadge, euro, when } from "./ui";

export default async function AdminHome() {
  await requireAdmin();
  const d = await dashboard();
  const tiles = [
    { label: "Need attention", value: d.attention, href: "/admin/orders?filter=todo", warn: d.attention > 0 },
    { label: "To cut", value: d.toCut, href: "/admin/orders?filter=todo" },
    { label: "To ship", value: d.toShip, href: "/admin/orders?filter=todo" },
    { label: "Paid, last 30 days", value: euro(d.revenue30Cents), sub: `${d.orders30} orders`, href: "/admin/orders?filter=all" },
  ];
  return (
    <>
      <h1 className="text-4xl font-light">Overview</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className={`card block p-6 hover:border-gold ${t.warn ? "border-red-400/60" : ""}`}>
              <span className="text-sm text-mist">{t.label}</span>
              <span className="mt-2 block font-serif text-4xl">{t.value}</span>
              {t.sub && <span className="text-xs text-mist">{t.sub}</span>}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="recent">
          <h2 id="recent" className="text-2xl">Latest orders</h2>
          {d.recent.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {d.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-gold">
                    <span className="font-medium">{o.reference}</span>
                    <StatusBadge status={o.status} />
                    <span className="text-sm text-mist">{o.name ?? o.email ?? ""}</span>
                    <span className="ml-auto text-sm tabular-nums">{euro(o.totalCents)}</span>
                    <span className="w-28 text-right text-xs text-mist">{when(o.paidAt ?? o.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-mist">No paid orders yet.</p>}
        </section>
        <section aria-labelledby="low">
          <h2 id="low" className="text-2xl">Low stock</h2>
          {d.lowStock.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {d.lowStock.map((s) => (
                <li key={s.slug}>
                  <Link href={`/admin/products/${s.slug}`} className="flex justify-between py-3 hover:text-gold">
                    <span>{s.name}</span><span className="tabular-nums text-gold">{s.metres} m</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-mist">Every fabric has at least 5 m in stock.</p>}
        </section>
      </div>
    </>
  );
}
