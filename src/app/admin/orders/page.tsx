import type { Metadata } from "next";
import Link from "next/link";
import { ORDER_FILTERS, listOrders, type OrderFilter } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";
import { StatusBadge, euro, field, when } from "../ui";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter: OrderFilter = sp.filter && sp.filter in ORDER_FILTERS ? (sp.filter as OrderFilter) : "todo";
  const q = (sp.q ?? "").slice(0, 80);
  const orders = await listOrders(filter, q);
  return (
    <>
      <h1 className="text-4xl font-light">Orders</h1>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Order filter" className="flex flex-wrap gap-2">
          {(Object.keys(ORDER_FILTERS) as OrderFilter[]).map((f) => (
            <Link
              key={f} href={`/admin/orders?filter=${f}`} aria-current={f === filter ? "page" : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm ${f === filter ? "border-gold bg-gold/15 text-gold" : "border-line text-ivory/80 hover:border-ivory/40"}`}
            >
              {ORDER_FILTERS[f].label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="filter" value={filter} />
          <label className="sr-only" htmlFor="q">Search by order number or email</label>
          <input id="q" name="q" defaultValue={q} placeholder="Order number or email" className={`${field} mt-0 w-64`} />
          <button type="submit" className="btn btn-line min-h-0 px-4">Search</button>
        </form>
      </div>

      {orders.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-mist">
              <tr><th className="py-2 font-normal">Order</th><th className="font-normal">Status</th><th className="font-normal">Customer</th><th className="font-normal">Items</th><th className="text-right font-normal">Total</th><th className="text-right font-normal">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-ivory/5">
                  <td className="py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium text-gold underline-offset-4 hover:underline">{o.reference}</Link></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.name ?? ""}<span className="block text-xs text-mist">{o.email ?? ""}</span></td>
                  <td>{o.items}</td>
                  <td className="text-right tabular-nums">{euro(o.totalCents)}</td>
                  <td className="text-right text-mist">{when(o.paidAt ?? o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-10 text-mist">{q ? "No orders match this search." : filter === "todo" ? "Nothing to do: every paid order has shipped." : "No orders here."}</p>
      )}
    </>
  );
}
