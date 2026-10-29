import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, type Customer } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";
import { orderAction } from "../../actions";
import { Notice, StatusBadge, euro, field, when } from "../../ui";

export const metadata: Metadata = { title: "Order" };

const DONE: Record<string, string> = {
  cut: "Marked as cut.", ship: "Marked as shipped.", resolve: "Marked as checked: back to “to cut”.", cancel: "Order cancelled.", note: "Note saved.",
};

function Address({ c }: { c: Customer | null }) {
  const a = c?.shipping?.address ?? c?.details?.address;
  if (!a) return <p className="text-mist">No address (the order was not paid).</p>;
  return (
    <address className="not-italic leading-relaxed">
      {c?.shipping?.name ?? c?.details?.name}<br />
      {a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />
      {[a.postal_code, a.city].filter(Boolean).join(" ")}{a.state ? `, ${a.state}` : ""}<br />
      {a.country}
    </address>
  );
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const o = await getOrder(id);
  if (!o) notFound();
  const paid = ["paid", "needs_attention", "cut"].includes(o.status);
  const fabricMetres = o.lines.filter((l) => l.kind === "fabric").reduce((a, l) => a + l.qty, 0);

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-mist hover:text-gold">← Orders</Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="text-4xl font-light">{o.reference}</h1>
        <StatusBadge status={o.status} />
      </div>
      <p className="mt-1 text-sm text-mist">Placed {when(o.createdAt)}{o.paidAt && ` · paid ${when(o.paidAt)}`}{o.shippedAt && ` · shipped ${when(o.shippedAt)}`}</p>

      <div className="mt-6 space-y-3">
        {sp.done && DONE[sp.done] && <Notice>{DONE[sp.done]}</Notice>}
        {sp.error && <Notice tone="error">{sp.error}</Notice>}
        {o.status === "needs_attention" && o.note && <Notice tone="error">Check this order: {o.note}</Notice>}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="items" className="card p-6">
            <h2 id="items" className="text-2xl">Items</h2>
            <table className="mt-4 w-full text-sm">
              <tbody className="divide-y divide-line">
                {o.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2.5">{l.name}<span className="block text-xs text-mist">{l.kind === "fabric" ? `Cut ${l.qty} m · ${l.slug}` : l.kind === "swatch" ? "Swatch" : l.unit === "m" ? `${l.qty} m` : `× ${l.qty}`}</span></td>
                    <td className="text-right tabular-nums">{euro(l.totalCents)}</td>
                  </tr>
                ))}
                <tr><td className="py-2.5 text-mist">Shipping</td><td className="text-right tabular-nums">{euro(o.shippingCents)}</td></tr>
                <tr className="font-serif text-xl"><td className="pt-3">{o.paidCents != null ? "Paid" : "Total"}</td><td className="pt-3 text-right tabular-nums">{euro(o.paidCents ?? o.totalCents)}</td></tr>
              </tbody>
            </table>
            {fabricMetres > 0 && <p className="mt-3 text-xs text-mist">{fabricMetres} m of fabric to cut, each length in one piece.</p>}
          </section>

          {paid && (
            <section aria-labelledby="next" className="card p-6">
              <h2 id="next" className="text-2xl">Next step</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {o.status === "needs_attention" && (
                  <form action={orderAction}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="action" value="resolve" />
                    <button type="submit" className="btn btn-line">Checked, carry on</button></form>
                )}
                {o.status !== "cut" && (
                  <form action={orderAction}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="action" value="cut" />
                    <button type="submit" className="btn btn-line">Mark as cut</button></form>
                )}
              </div>
              <form action={orderAction} className="mt-6 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="action" value="ship" />
                <label className="text-sm text-mist">Tracking number<input name="trackingNumber" className={field} placeholder="e.g. 3SABC1234567" /></label>
                <label className="text-sm text-mist">Tracking link (optional)<input name="trackingUrl" type="url" className={field} placeholder="https://…" /></label>
                <div className="sm:col-span-2"><button type="submit" className="btn btn-gold">Mark as shipped</button></div>
              </form>
            </section>
          )}

          <section aria-labelledby="notes" className="card p-6">
            <h2 id="notes" className="text-2xl">Internal note</h2>
            <form action={orderAction} className="mt-4">
              <input type="hidden" name="id" value={o.id} /><input type="hidden" name="action" value="note" />
              <label className="sr-only" htmlFor="note">Note</label>
              <textarea id="note" name="note" rows={3} defaultValue={o.note ?? ""} className={field} placeholder="Only visible here" />
              <button type="submit" className="btn btn-line mt-3 min-h-0 px-4 py-2">Save note</button>
            </form>
          </section>
        </div>

        <aside className="space-y-8">
          <section aria-labelledby="cust" className="card p-6 text-sm">
            <h2 id="cust" className="text-2xl">Customer</h2>
            <p className="mt-4">{o.email ? <a href={`mailto:${o.email}`} className="text-gold underline underline-offset-4">{o.email}</a> : <span className="text-mist">No email yet</span>}</p>
            {o.customer?.details?.phone && <p className="mt-1">{o.customer.details.phone}</p>}
            <h3 className="mt-5 text-xs uppercase tracking-[0.2em] text-mist">Ship to</h3>
            <div className="mt-2"><Address c={o.customer} /></div>
          </section>

          {o.status === "shipped" && (
            <section aria-labelledby="track" className="card p-6 text-sm">
              <h2 id="track" className="text-2xl">Shipment</h2>
              <p className="mt-4">{o.trackingNumber ?? "No tracking number"}</p>
              {o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline underline-offset-4">Track parcel ↗</a>}
            </section>
          )}

          <section aria-labelledby="pay" className="card p-6 text-sm">
            <h2 id="pay" className="text-2xl">Payment</h2>
            {o.stripeUrl ? <a href={o.stripeUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-gold underline underline-offset-4">Open in Stripe ↗</a> : <p className="mt-4 text-mist">Not paid.</p>}
            <p className="mt-2 text-xs text-mist">Refunds are made in Stripe; then cancel the order here.</p>
          </section>

          {o.status !== "cancelled" && o.status !== "shipped" && (
            <section aria-labelledby="cancel" className="card p-6 text-sm">
              <h2 id="cancel" className="text-2xl">Cancel order</h2>
              <form action={orderAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="action" value="cancel" />
                {paid && fabricMetres > 0 && (
                  <label className="flex items-center gap-2"><input type="checkbox" name="restock" defaultChecked className="h-4 w-4 accent-[#e6d2a2]" /> Put the {fabricMetres} m back in stock (not yet cut)</label>
                )}
                <button type="submit" className="btn btn-line min-h-0 border-red-400/60 px-4 py-2 text-red-200">Cancel order</button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
