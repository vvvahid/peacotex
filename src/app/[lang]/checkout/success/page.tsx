import type { Metadata } from "next";
import Link from "next/link";
import { ClearCart } from "@/components/cart/ClearCart";
import { fulfil, type OrderView } from "@/server/checkout";
import { getI18n, langOf } from "@/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return { title: getI18n(await langOf(params)).t.success.metaTitle };
}
export const dynamic = "force-dynamic";

export default async function SuccessPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { t, fill, href, price } = getI18n(await langOf(params));
  const s = t.success;
  const { session_id } = await searchParams;
  let order: OrderView | null = null;
  try {
    order = session_id ? await fulfil(session_id) : null;
  } catch (err) {
    console.error("success page lookup failed", err);
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-44 text-center sm:px-8">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1 className="mt-3 text-5xl font-light">{s.notFoundTitle}</h1>
        <p className="mt-6 text-ivory/75">{s.notFoundText}</p>
        <Link href={href("/cart")} className="btn btn-line mt-8">{s.back}</Link>
      </div>
    );
  }

  const paid = order.status !== "pending" && order.status !== "expired";
  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-44 sm:px-8">
      {paid && <ClearCart />}
      <p className="eyebrow">{fill(s.orderRef, { ref: order.reference })}</p>
      <h1 className="mt-3 text-5xl font-light">{paid ? s.paidTitle : s.pendingTitle}</h1>
      <p className="mt-6 text-ivory/75">
        {paid ? fill(s.paidText, { email: order.email ?? s.yourEmail }) : s.pendingText}
      </p>
      <dl className="card mt-10 divide-y divide-line p-6 text-sm">
        {order.lines.map((l) => (
          <div key={l.name} className="flex justify-between gap-4 py-2"><dt>{l.name}</dt><dd className="tabular-nums">{price(l.totalCents / 100)}</dd></div>
        ))}
        <div className="flex justify-between gap-4 py-2 text-mist"><dt>{s.shipping}</dt><dd className="tabular-nums">{price(order.shippingCents / 100)}</dd></div>
        {order.totalCents != null && (
          <div className="flex justify-between gap-4 pt-3 font-serif text-2xl"><dt>{s.paid}</dt><dd className="tabular-nums">{price(order.totalCents / 100)}</dd></div>
        )}
      </dl>
      <Link href={href("/shop")} className="btn btn-line mt-8">{s.continue}</Link>
    </div>
  );
}
