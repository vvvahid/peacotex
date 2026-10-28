import "server-only";
import { PRODUCTS } from "@/lib/catalog";
import type { Queryable } from "./db";

/** Sample starting stock (metres) for fabrics not yet in the table. Real stock comes from the admin later. */
const SAMPLE_METRES = 30;

export async function ensureStock(db: Queryable) {
  for (const p of PRODUCTS) {
    await db.query("INSERT INTO fabric_stock (slug, metres) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING", [p.slug, SAMPLE_METRES]);
  }
}

export async function stockFor(db: Queryable, slugs: string[]): Promise<Map<string, number>> {
  if (!slugs.length) return new Map();
  const { rows } = await db.query<{ slug: string; metres: string }>("SELECT slug, metres FROM fabric_stock WHERE slug = ANY($1)", [slugs]);
  return new Map(rows.map((r) => [r.slug, Number(r.metres)]));
}
