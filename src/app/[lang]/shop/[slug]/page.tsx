import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/product/ProductView";
import { PRODUCTS, getProduct } from "@/lib/catalog";
import { LOCALES } from "@/i18n/config";
import { alternates, getI18n, langOf } from "@/i18n/server";

export const generateStaticParams = () => LOCALES.flatMap((lang) => PRODUCTS.map((p) => ({ lang, slug: p.slug })));
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  const raw = getProduct((await params).slug);
  if (!raw) return {};
  const p = getI18n(lang).product(raw);
  return { title: `${p.name}: ${p.tagline}`, description: p.description, alternates: alternates(lang, `/shop/${p.slug}`) };
}

export default async function ProductPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  if (!getProduct(slug)) notFound();
  return <ProductView slug={slug} />;
}
