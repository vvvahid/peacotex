import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFabric } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";
import type { FabricRecord } from "@/server/catalog";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "Edit fabric" };

const NEW: FabricRecord = {
  slug: "", name: "", active: false, featured: false, sort: 1000,
  techniques: ["beading"], base: "tulle", edge: "straight", layout: "allover",
  colourFamily: "Ivory", colourHex: "#efe6d4", occasions: ["bridal"],
  widthCm: 135, weightGsm: 300, repeatCm: 0, stretch: "none", detachableMotifs: false,
  pricePerMetre: 200, minMetres: 1,
  look: { pattern: "beaded", ground: "tulle", base: "#a99c87", ink: "#f4efe6", accent: "#fbf6ec", glint: "#ffffff", layout: "allover", edge: "straight", seed: 7 },
  text: { en: { tagline: "", description: "", colour: "" } },
};

export default async function FabricPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const isNew = slug === "new";
  const found = isNew ? null : await getFabric(slug);
  if (!isNew && !found) notFound();
  const saved = (await searchParams).saved === "1";
  return (
    <>
      <Link href="/admin/products" className="text-sm text-mist hover:text-gold">← Fabrics</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-light">{isNew ? "New fabric" : found!.record.name}</h1>
        {!isNew && found!.record.active && <a href={`/shop/${slug}`} target="_blank" rel="noopener" className="text-sm text-gold underline underline-offset-4">View in shop ↗</a>}
      </div>
      <ProductForm record={found?.record ?? NEW} stock={found?.metres ?? 0} isNew={isNew} saved={saved} />
    </>
  );
}
