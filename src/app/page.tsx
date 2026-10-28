import Link from "next/link";
import { FabricHero } from "@/components/home/FabricHero";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import { ProductCard } from "@/components/shop/ProductCard";
import { IntroCurtain } from "@/components/ui/IntroCurtain";
import { OCCASIONS, PRODUCTS, SWATCH_PRICE, SWATCH_SIZE, formatPrice, getProduct } from "@/lib/catalog";

const OCCASION_LOOK = { bridal: "seraphine", engagement: "lumen", evening: "vesper", gala: "sapphira" } as const;

const STEPS = [
  { n: "01", title: "Choose up to five swatches", text: `Each swatch is ${SWATCH_SIZE}, cut from the current roll so colour and shine match what you will receive. ${formatPrice(SWATCH_PRICE)} each, credited against your fabric order.` },
  { n: "02", title: "Hold them to the light", text: "Swatches arrive flat in a card folio within a few working days. Check them by daylight and by evening light: that is where embellishment shows its character." },
  { n: "03", title: "Order by the metre", text: "Order in 0.5 m steps from 1 m. Our estimator works out metreage from your silhouette and the pattern repeat. Every length is cut to order and shipped rolled." },
];

const PROMISES = [
  { title: "Rolled, never folded", text: "Every cut is wound on a tube so beads, sequins and scallops arrive without creases or crushed work." },
  { title: "Metreage by silhouette", text: "From mini to ball gown with train, including pattern repeat and border fabrics." },
  { title: "Clear cut-fabric policy", text: "Fabric is cut to your length, so it cannot be returned unless faulty. That is why every fabric has a swatch first." },
  { title: "Ateliers & trade", text: "Trade pricing, sample books and roll reservations for dressmakers and bridal houses." },
];

export default function Home() {
  const featured = PRODUCTS.filter((p) => p.featured);
  return (
    <>
      <IntroCurtain />
      <FabricHero />

      <section aria-labelledby="statement" className="mx-auto grid max-w-[1400px] gap-10 px-4 py-28 sm:px-8 md:grid-cols-[1fr_1.2fr] md:py-40">
        <p className="eyebrow reveal">The house of embellishment</p>
        <div className="reveal">
          <h2 id="statement" className="text-[clamp(2.2rem,4.5vw,4rem)] font-light">
            Only embellished fabrics. <em className="text-gold">Only for evening.</em> Chosen for how they move in light.
          </h2>
          <p className="mt-8 max-w-xl text-ivory/75">
            Peacotex is a focused fabric house for evening and bridal dresses: hand and machine beading, sequins, pearls,
            metallic embroidery and corded lace. For ateliers cutting a couture gown, and for brides who want to choose
            the fabric themselves.
          </p>
        </div>
      </section>

      <section id="collections" aria-labelledby="collections-title" className="mx-auto max-w-[1400px] scroll-mt-28 px-4 pb-28 sm:px-8">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Collections</p>
            <h2 id="collections-title" className="mt-3 text-[clamp(2.2rem,4vw,3.6rem)] font-light">Dressed for the occasion</h2>
          </div>
          <Link href="/shop" className="btn btn-line">All fabrics</Link>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {OCCASIONS.map((o, i) => {
            const p = getProduct(OCCASION_LOOK[o.id])!;
            return (
              <li key={o.id} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <Link href={`/shop?occasion=${o.id}`} className="card group relative block aspect-[3/4]">
                  <FabricCanvas look={p.look} label={`${o.label} collection fabric`} followPointer rest={{ x: 0.3, y: 0.2 }} />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-6">
                    <span className="block font-serif text-4xl font-light">{o.label}</span>
                    <span className="mt-2 block text-sm text-ivory/75">{o.line}</span>
                    <span className="mt-4 inline-block text-[0.75rem] uppercase tracking-[0.2em] text-gold transition-transform group-hover:translate-x-1">Explore →</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-mist">Move your pointer over a fabric to move the light. All fabrics are illustrations until product footage is ready.</p>
      </section>

      <section aria-labelledby="featured-title" className="border-y border-line bg-night py-28">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">This season</p>
              <h2 id="featured-title" className="mt-3 text-[clamp(2.2rem,4vw,3.6rem)] font-light">Fabrics to start with</h2>
            </div>
            <span className="sample-tag">Sample collection</span>
          </div>
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto max-w-[1400px] px-4 py-28 sm:px-8 md:py-36">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 id="how-title" className="mt-3 text-[clamp(2.2rem,4vw,3.6rem)] font-light">Swatch first.<br />Then cut.</h2>
            <Link href="/service#swatches" className="btn btn-gold mt-8">How swatches work</Link>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="reveal bg-ink p-8">
                <span className="font-serif text-5xl font-light text-gold">{s.n}</span>
                <h3 className="mt-6 text-2xl">{s.title}</h3>
                <p className="mt-3 text-sm text-ivory/70">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="audience-title" className="mx-auto max-w-[1400px] px-4 pb-28 sm:px-8">
        <h2 id="audience-title" className="sr-only">Who we work with</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { eyebrow: "For ateliers", title: "Your next couture commission, in stock.", text: "Trade accounts, sample books by technique, roll reservations while your client decides, and full specifications on every fabric: width, weight, repeat, edge.", href: "/service#ateliers", cta: "Trade accounts" },
            { eyebrow: "For brides", title: "Choose the fabric, then your dressmaker.", text: "Order swatches to share with your dressmaker, use the metreage estimator for your silhouette, and add matching lining and trims in one order.", href: "/shop?occasion=bridal", cta: "Bridal fabrics" },
          ].map((a) => (
            <div key={a.eyebrow} className="card reveal p-8 sm:p-12">
              <p className="eyebrow">{a.eyebrow}</p>
              <h3 className="mt-4 text-[clamp(1.9rem,3vw,2.8rem)] font-light">{a.title}</h3>
              <p className="mt-4 max-w-lg text-ivory/70">{a.text}</p>
              <Link href={a.href} className="btn btn-line mt-8">{a.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="promise-title" className="border-t border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8">
          <h2 id="promise-title" className="sr-only">Our promises</h2>
          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((p) => (
              <li key={p.title} className="reveal">
                <span aria-hidden className="mb-5 block h-px w-10 bg-gold" />
                <h3 className="text-2xl">{p.title}</h3>
                <p className="mt-2 text-sm text-ivory/70">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="px-4 pb-24 sm:px-8">
        <div className="card relative mx-auto max-w-[1400px] overflow-hidden">
          <div className="absolute inset-0">
            <FabricCanvas look={getProduct("aurelia")!.look} label="Champagne sequin fabric" followPointer rest={{ x: 0.75, y: 0.3 }} />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/10" />
          </div>
          <div className="relative px-8 py-20 sm:px-16 sm:py-28">
            <p className="eyebrow">Swatches</p>
            <h2 id="cta-title" className="mt-4 max-w-xl text-[clamp(2.4rem,5vw,4.5rem)] font-light">See it in your hands first.</h2>
            <p className="mt-5 max-w-md text-ivory/75">Up to five swatches, {formatPrice(SWATCH_PRICE)} each, credited when you order the fabric.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-gold">Choose swatches</Link>
              <Link href="/service" className="btn btn-line">Shipping &amp; returns</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
