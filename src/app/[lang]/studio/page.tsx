import type { Metadata } from "next";
import { DressStudio } from "@/components/studio/DressStudio";
import { alternates, getI18n, langOf } from "@/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  const { t } = getI18n(lang);
  return { title: t.studio.metaTitle, description: t.studio.metaDescription, alternates: alternates(lang, "/studio") };
}

export default async function StudioPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ fabric?: string }> }) {
  const { t } = getI18n(await langOf(params));
  const { fabric } = await searchParams;
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-40 sm:px-8">
      <header className="mb-12 grid gap-6 md:grid-cols-2 md:items-end">
        <div>
          <p className="eyebrow">{t.studio.eyebrow}</p>
          <h1 className="mt-3 text-[clamp(2.8rem,6vw,5.5rem)] font-light">{t.studio.title}</h1>
        </div>
        <p className="max-w-md text-ivory/75 md:justify-self-end">{t.studio.intro}</p>
      </header>
      <DressStudio initialSlug={fabric} />
    </div>
  );
}
