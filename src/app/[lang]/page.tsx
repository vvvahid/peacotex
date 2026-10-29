import Link from "next/link";
import { FabricHero } from "@/components/home/FabricHero";
import { ProductCard } from "@/components/shop/ProductCard";
import { IntroCurtain } from "@/components/ui/IntroCurtain";
import { StockPhoto } from "@/components/ui/StockPhoto";
import { PHOTOS, authorUrl } from "@/lib/photos";
import { OCCASIONS, SWATCH_PRICE, SWATCH_SIZE } from "@/lib/catalog";
import { getI18n, getMoney, langOf } from "@/i18n/server";
import { getCatalog } from "@/server/catalog";

const OCCASION_PHOTO = { bridal: PHOTOS.scallopLace, engagement: PHOTOS.blushLace, evening: PHOTOS.sequinDrape, gala: PHOTOS.goldGown } as const;

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const { t, fill, href } = getI18n(lang);
  const { price } = await getMoney(lang);
  const h = t.home;
  const featured = (await getCatalog(lang)).filter((p) => p.featured).slice(0, 4);
  const steps = h.steps.map((s, i) => ({ ...s, n: `0${i + 1}`, text: fill(s.text, { size: SWATCH_SIZE, price: price(SWATCH_PRICE) }) }));
  return (
    <>
      <IntroCurtain />
      <FabricHero />

      <section aria-labelledby="statement" className="mx-auto grid max-w-[1400px] gap-10 px-4 py-28 sm:px-8 md:grid-cols-[1fr_1.2fr] md:py-40">
        <p className="eyebrow reveal">{h.statementEyebrow}</p>
        <div className="reveal">
          <h2 id="statement" className="text-[clamp(2.2rem,4.5vw,4rem)] font-light">
            {h.statementA} <em className="text-gold">{h.statementB}</em> {h.statementC}
          </h2>
          <p className="mt-8 max-w-xl text-ivory/75">{h.statementText}</p>
        </div>
      </section>

      <section id="collections" aria-labelledby="collections-title" className="mx-auto max-w-[1400px] scroll-mt-28 px-4 pb-28 sm:px-8">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{h.collectionsEyebrow}</p>
            <h2 id="collections-title" className="mt-3 text-[clamp(2.2rem,4vw,3.6rem)] font-light">{h.collectionsTitle}</h2>
          </div>
          <Link href={href("/shop")} className="btn btn-line">{h.allFabrics}</Link>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {OCCASIONS.map((o, i) => (
            <li key={o.id} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <Link href={href(`/shop?occasion=${o.id}`)} className="card group relative block aspect-[3/4]">
                <StockPhoto photo={OCCASION_PHOTO[o.id]} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" credit={false} />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-6">
                  <span className="block font-serif text-4xl font-light">{t.terms.occasions[o.id].label}</span>
                  <span className="mt-2 block text-sm text-ivory/75">{t.terms.occasions[o.id].line}</span>
                  <span className="mt-4 inline-block text-[0.75rem] uppercase tracking-[0.2em] text-gold transition-transform group-hover:translate-x-1">{h.explore}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-mist">
          {h.stockNote}{" "}
          {OCCASIONS.map((o, i) => (
            <span key={o.id}>
              <a href={authorUrl(OCCASION_PHOTO[o.id])} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gold">{OCCASION_PHOTO[o.id].author}</a>
              {i < OCCASIONS.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
      </section>

      <section aria-labelledby="featured-title" className="border-y border-line bg-night py-28">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">{h.featuredEyebrow}</p>
              <h2 id="featured-title" className="mt-3 text-[clamp(2.2rem,4vw,3.6rem)] font-light">{h.featuredTitle}</h2>
            </div>
            <span className="sample-tag">{h.sampleCollection}</span>
          </div>
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto max-w-[1400px] px-4 py-28 sm:px-8 md:py-36">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">{h.howEyebrow}</p>
            <h2 id="how-title" className="mt-3 text-[clamp(2.2rem,4vw,3.6rem)] font-light">{h.howTitleA}<br />{h.howTitleB}</h2>
            <Link href={href("/service#swatches")} className="btn btn-gold mt-8">{h.howLink}</Link>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line sm:grid-cols-3">
            {steps.map((s) => (
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
        <h2 id="audience-title" className="sr-only">{h.audienceTitle}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { ...h.ateliers, href: href("/service#ateliers") },
            { ...h.brides, href: href("/shop?occasion=bridal") },
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
          <h2 id="promise-title" className="sr-only">{h.promisesTitle}</h2>
          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {h.promises.map((p) => (
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
            <StockPhoto photo={PHOTOS.redGold} sizes="100vw" label={false} credit={false} alt="" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/10" />
          </div>
          <div className="relative px-8 py-20 sm:px-16 sm:py-28">
            <p className="eyebrow">{h.ctaEyebrow}</p>
            <h2 id="cta-title" className="mt-4 max-w-xl text-[clamp(2.4rem,5vw,4.5rem)] font-light">{h.ctaTitle}</h2>
            <p className="mt-5 max-w-md text-ivory/75">{fill(h.ctaText, { price: price(SWATCH_PRICE) })}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href("/shop")} className="btn btn-gold">{h.ctaChoose}</Link>
              <Link href={href("/service")} className="btn btn-line">{h.ctaShipping}</Link>
            </div>
            <p className="mt-10 text-[0.6875rem] text-ivory/60">
              {h.ctaCreditBefore} <a href={authorUrl(PHOTOS.redGold)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gold">{PHOTOS.redGold.author}</a> {h.ctaCreditAfter}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
