import type { Metadata } from "next";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { EMPTY, type Filters, type FilterKey } from "@/lib/filters";
import { OCCASIONS } from "@/lib/catalog";
import { alternates, getI18n, langOf } from "@/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  return { title: getI18n(lang).t.shop.metaTitle, alternates: alternates(lang, "/shop") };
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, fill } = getI18n(await langOf(params));
  const s = t.shop;
  const sp = await searchParams;
  const initial: Filters = { ...EMPTY };
  (Object.keys(EMPTY) as FilterKey[]).forEach((k) => {
    const v = sp[k];
    if (typeof v === "string" && v) initial[k] = v.split(",");
  });
  const id = initial.occasion.length === 1 ? OCCASIONS.find((o) => o.id === initial.occasion[0])?.id : undefined;
  const occasion = id && t.terms.occasions[id];

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-40 sm:px-8">
      <header className="mb-14 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
        <div>
          <p className="eyebrow">{occasion ? s.collectionEyebrow : s.eyebrow}</p>
          <h1 className="mt-3 text-[clamp(2.8rem,6vw,5.5rem)] font-light">{occasion ? fill(s.occasionTitle, { occasion: occasion.label }) : s.title}</h1>
        </div>
        <p className="max-w-md text-ivory/75 md:justify-self-end">
          {occasion ? occasion.line : s.intro}{" "}
          <span className="sample-tag mt-3">{s.sampleCatalogue}</span>
        </p>
      </header>
      <ShopBrowser key={JSON.stringify(initial)} initial={initial} />
    </div>
  );
}
