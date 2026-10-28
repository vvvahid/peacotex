import type { Metadata } from "next";
import Link from "next/link";
import { SWATCH_PRICE, SWATCH_SIZE, formatPrice } from "@/lib/catalog";

export const metadata: Metadata = { title: "Swatches, shipping & returns" };

const SECTIONS = [
  {
    id: "swatches", eyebrow: "Swatches", title: "Order a swatch before you cut",
    body: [
      `Every fabric can be ordered as a ${SWATCH_SIZE} swatch, cut from the roll you will receive, so colour and shine match. Swatches are ${formatPrice(SWATCH_PRICE)} each, up to five per order, and the cost is credited when you order that fabric.`,
      "Swatches travel flat in a card folio. Look at them in daylight and in evening light, and next to your lining: embellishment changes character under different lamps.",
    ],
  },
  {
    id: "shipping", eyebrow: "Shipping", title: "Rolled, never folded",
    body: [
      "Every cut length is wound face-in onto a cardboard tube with tissue between the layers, then boxed. Folding crushes sequins, bends bugle beads and creases scallops; rolling keeps the work flat and ready to cut.",
      "Fabric orders ship insured and tracked. Long lengths and ball-gown quantities travel on a wider tube.",
    ],
  },
  {
    id: "returns", eyebrow: "Returns", title: "Our cut-fabric policy, plainly",
    body: [
      "Fabric is cut to the length you order, so cut fabric cannot be returned or exchanged unless it is faulty. That is why we encourage a swatch first.",
      "If a length arrives damaged or not as described, tell us within 7 days of delivery, before cutting into it, with photos. We will replace it or refund it in full, including shipping.",
      "Unopened swatches, trims sold by the piece and uncut motif sets can be returned within 14 days.",
    ],
  },
  {
    id: "ateliers", eyebrow: "Ateliers & trade", title: "For dressmakers and bridal houses",
    body: [
      "Trade accounts get trade pricing, sample books by technique, and roll reservations: we can hold a length for up to 10 days while your client decides.",
      "Every listing carries full specifications: usable width, weight, pattern repeat, edge, stretch and whether motifs can be cut out for appliqué.",
    ],
  },
];

export default function ServicePage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-32 pt-40 sm:px-8">
      <p className="eyebrow">Service</p>
      <h1 className="mt-3 text-[clamp(2.8rem,6vw,5.5rem)] font-light">Swatches, shipping &amp; returns</h1>
      <p className="mt-4 text-sm text-gold/80">Demo content: prices, timings and terms are examples to be confirmed by Peacotex.</p>
      <div className="mt-16 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="card scroll-mt-32 grid gap-6 p-8 sm:p-12 md:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="eyebrow">{s.eyebrow}</p>
              <h2 id={`${s.id}-t`} className="mt-3 text-4xl font-light">{s.title}</h2>
            </div>
            <div className="space-y-4 text-ivory/80">{s.body.map((b) => <p key={b}>{b}</p>)}</div>
          </section>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/shop" className="btn btn-gold">Choose swatches</Link>
        <Link href="/" className="btn btn-line">Home</Link>
      </div>
    </div>
  );
}
