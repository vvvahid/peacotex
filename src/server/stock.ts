import "server-only";
import type { Queryable } from "./db";

/** Sample starting stock (metres) for sample fabrics not yet in the table. After that, stock is set in /admin. */
const SAMPLE_METRES = 30;

/** Gives every catalogue fabric a stock row (sample metres for the seeded ones). */
export async function ensureStock(db: Queryable) {
  await db.query(
    "INSERT INTO fabric_stock (slug, metres) SELECT slug, $1 FROM products ON CONFLICT (slug) DO NOTHING",
    [SAMPLE_METRES],
  );
}

export async function stockFor(db: Queryable, slugs: string[]): Promise<Map<string, number>> {
  if (!slugs.length) return new Map();
  const { rows } = await db.query<{ slug: string; metres: string }>("SELECT slug, metres FROM fabric_stock WHERE slug = ANY($1)", [slugs]);
  return new Map(rows.map((r) => [r.slug, Number(r.metres)]));
}

export async function setStock(db: Queryable, slug: string, metres: number) {
  await db.query(
    "INSERT INTO fabric_stock (slug, metres) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET metres = $2, updated_at = now()",
    [slug, metres],
  );
}
