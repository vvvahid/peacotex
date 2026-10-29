import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/product/ProductView";
import { LOCALES } from "@/i18n/config";
import { alternates, langOf } from "@/i18n/server";
import { getCatalogProduct, seedSlugs } from "@/server/catalog";

// The sample fabrics are prerendered; fabrics added in /admin render on first visit.
export const generateStaticParams = () => LOCALES.flatMap((lang) => seedSlugs().map((slug) => ({ lang, slug })));
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  const p = await getCatalogProduct(lang, (await params).slug);
  return p ? { title: `${p.name}: ${p.tagline}`, description: p.description, alternates: alternates(lang, `/shop/${p.slug}`) } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const lang = await langOf(params);
  const p = await getCatalogProduct(lang, (await params).slug);
  if (!p) notFound();
  return <ProductView p={p} />;
}
