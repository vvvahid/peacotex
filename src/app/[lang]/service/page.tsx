import type { Metadata } from "next";
import Link from "next/link";
import { SWATCH_PRICE, SWATCH_SIZE } from "@/lib/catalog";
import { alternates, getI18n, getMoney, langOf } from "@/i18n/server";
import { SITE_LIVE } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  return { title: getI18n(lang).t.service.metaTitle, alternates: alternates(lang, "/service") };
}

const ORDER = ["swatches", "shipping", "returns", "ateliers"] as const;

export default async function ServicePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const { t, fill, href } = getI18n(lang);
  const { price } = await getMoney(lang);
  const sv = t.service;
  const vars = { size: SWATCH_SIZE, price: price(SWATCH_PRICE) };
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-32 pt-40 sm:px-8">
      <p className="eyebrow">{sv.eyebrow}</p>
      <h1 className="mt-3 text-[clamp(2.8rem,6vw,5.5rem)] font-light">{sv.title}</h1>
      {!SITE_LIVE && <p className="mt-4 text-sm text-gold/80">{sv.demoNote}</p>}
      <div className="mt-16 space-y-6">
        {ORDER.map((id) => {
          const s = sv.sections[id];
          return (
            <section key={id} id={id} aria-labelledby={`${id}-t`} className="card scroll-mt-32 grid gap-6 p-8 sm:p-12 md:grid-cols-[1fr_1.6fr]">
              <div>
                <p className="eyebrow">{s.eyebrow}</p>
                <h2 id={`${id}-t`} className="mt-3 text-4xl font-light">{s.title}</h2>
              </div>
              <div className="space-y-4 text-ivory/80">{s.body.map((b) => <p key={b}>{fill(b, vars)}</p>)}</div>
            </section>
          );
        })}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href={href("/shop")} className="btn btn-gold">{sv.choose}</Link>
        <Link href={href("/")} className="btn btn-line">{sv.home}</Link>
      </div>
    </div>
  );
}
