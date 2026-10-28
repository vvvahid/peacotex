import type { Metadata } from "next";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { EMPTY, type Filters, type FilterKey } from "@/lib/filters";
import { OCCASIONS } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop embellished fabrics" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial: Filters = { ...EMPTY };
  (Object.keys(EMPTY) as FilterKey[]).forEach((k) => {
    const v = sp[k];
    if (typeof v === "string" && v) initial[k] = v.split(",");
  });
  const occasion = initial.occasion.length === 1 ? OCCASIONS.find((o) => o.id === initial.occasion[0]) : undefined;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-40 sm:px-8">
      <header className="mb-14 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
        <div>
          <p className="eyebrow">{occasion ? "Collection" : "Shop"}</p>
          <h1 className="mt-3 text-[clamp(2.8rem,6vw,5.5rem)] font-light">{occasion ? `${occasion.label} fabrics` : "Embellished fabrics"}</h1>
        </div>
        <p className="max-w-md text-ivory/75 md:justify-self-end">
          {occasion?.line ?? "Beading, sequins, pearls, embroidery and lace, sold by the metre from 1 m. Every fabric has a swatch."}{" "}
          <span className="sample-tag mt-3">Sample catalogue</span>
        </p>
      </header>
      <ShopBrowser key={JSON.stringify(initial)} initial={initial} />
    </div>
  );
}
