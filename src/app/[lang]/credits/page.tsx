import type { Metadata } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { PHOTOS, UNSPLASH_URL, authorUrl, photoPage, photoUrl } from "@/lib/photos";
import { alternates, getI18n, langOf } from "@/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  return { title: getI18n(lang).t.credits.metaTitle, alternates: alternates(lang, "/credits") };
}

export default async function CreditsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { t, fill } = getI18n(await langOf(params));
  const c = t.credits;
  const usedBy = (id: string) => PRODUCTS.filter((p) => p.photo?.id === id).map((p) => p.name);
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-32 pt-40 sm:px-8">
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-3 text-[clamp(2.8rem,6vw,5rem)] font-light">{c.title}</h1>
      <p className="mt-6 max-w-2xl text-ivory/75">
        {c.introBefore}{" "}
        <a href={UNSPLASH_URL} target="_blank" rel="noopener noreferrer" className="text-gold underline underline-offset-4">Unsplash</a>{" "}
        {c.introAfter}
      </p>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(PHOTOS).map((ph) => (
          <li key={ph.id} className="card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(ph, 600)} alt={ph.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="p-5 text-sm">
              <p>
                <a href={photoPage(ph)} target="_blank" rel="noopener noreferrer" className="hover:text-gold">{ph.alt}</a>
              </p>
              <p className="mt-1 text-mist">
                {c.by} <a href={authorUrl(ph)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gold">{ph.author}</a>
                {usedBy(ph.id).length > 0 && <> · {fill(c.shownWith, { names: usedBy(ph.id).join(", ") })}</>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
