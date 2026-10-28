import Link from "next/link";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import { StockPhoto } from "@/components/ui/StockPhoto";
import { formatPrice, type Product } from "@/lib/catalog";

export function ProductCard({ p, headingLevel = 3 }: { p: Product; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative">
      <div className="card relative aspect-[4/5]">
        {p.photo ? (
          <StockPhoto photo={p.photo} sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" label="product" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <>
            <FabricCanvas look={p.look} label={`${p.name}: ${p.tagline}`} followPointer showEdge rest={{ x: 0.28, y: 0.22 }} />
            <span className="chip absolute left-3 top-3">Illustration</span>
          </>
        )}
        {p.edge === "scalloped" && <span className="chip absolute left-3 top-11 z-[1]">Scalloped edge</span>}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <H className="text-2xl">
            <Link href={`/shop/${p.slug}`} className="after:absolute after:inset-0 hover:text-gold">{p.name}</Link>
          </H>
          <p className="mt-1 text-sm text-mist">{p.tagline}</p>
        </div>
        <p className="shrink-0 text-right text-sm">
          {formatPrice(p.pricePerMetre)}<span className="text-mist"> / m</span>
          <span className="mt-1 block text-[0.6875rem] uppercase tracking-[0.12em] text-gold/80">Sample price</span>
        </p>
      </div>
    </article>
  );
}
