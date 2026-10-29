"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Product } from "@/lib/catalog";

interface Catalog { products: Product[]; get: (slug: string) => Product | undefined }

const Ctx = createContext<Catalog | null>(null);

/** The fabrics on sale (already in the page's language), for client components and the bag. */
export function CatalogProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  const value = useMemo<Catalog>(() => {
    const map = new Map(products.map((p) => [p.slug, p]));
    return { products, get: (slug) => map.get(slug) };
  }, [products]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog outside CatalogProvider");
  return c;
}
