import type { Metadata } from "next";
import Link from "next/link";
import { ClearCart } from "@/components/cart/ClearCart";
import { formatPrice } from "@/lib/catalog";
import { fulfil, type OrderView } from "@/server/checkout";

export const metadata: Metadata = { title: "Order confirmed" };
export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
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
        <p className="eyebrow">Order</p>
        <h1 className="mt-3 text-5xl font-light">We couldn&apos;t find this order.</h1>
        <p className="mt-6 text-ivory/75">If you paid, your confirmation email is on its way. Otherwise your bag is still saved.</p>
        <Link href="/cart" className="btn btn-line mt-8">Back to bag</Link>
      </div>
    );
  }

  const paid = order.status !== "pending" && order.status !== "expired";
  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-44 sm:px-8">
      {paid && <ClearCart />}
      <p className="eyebrow">Order {order.reference}</p>
      <h1 className="mt-3 text-5xl font-light">{paid ? "Thank you. Your fabric is being prepared." : "Your payment is being confirmed."}</h1>
      <p className="mt-6 text-ivory/75">
        {paid
          ? `We cut every length to order and ship it rolled on a tube. A confirmation goes to ${order.email ?? "your email"}.`
          : "Some payment methods take a moment to confirm. This page will show your order once the payment is through."}
      </p>
      <dl className="card mt-10 divide-y divide-line p-6 text-sm">
        {order.lines.map((l) => (
          <div key={l.name} className="flex justify-between gap-4 py-2"><dt>{l.name}</dt><dd className="tabular-nums">{formatPrice(l.totalCents / 100)}</dd></div>
        ))}
        <div className="flex justify-between gap-4 py-2 text-mist"><dt>Shipping</dt><dd className="tabular-nums">{formatPrice(order.shippingCents / 100)}</dd></div>
        {order.totalCents != null && (
          <div className="flex justify-between gap-4 pt-3 font-serif text-2xl"><dt>Paid</dt><dd className="tabular-nums">{formatPrice(order.totalCents / 100)}</dd></div>
        )}
      </dl>
      <Link href="/shop" className="btn btn-line mt-8">Continue browsing</Link>
    </div>
  );
}
