import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  COLOUR_FAMILIES, PRODUCTS, PRODUCT_PHOTOS,
  type BaseFabric, type Edge, type Layout, type Occasion, type Product, type Technique,
} from "@/lib/catalog";
import type { FabricLook, Ground, Pattern } from "@/lib/fabric/render";
import { PHOTOS, ownPhoto, type PhotoKey } from "@/lib/photos";
import { LOCALES, type Locale } from "@/i18n/config";
import { getDict } from "@/i18n/server";
import { getDb, isDbConfigured, type Queryable } from "./db";

/*
 * The catalogue. Each fabric is one row in `products` (a JSON record, validated by parseFabric);
 * pages read it through a cache that the admin clears on every save.
 */

export interface FabricText { tagline: string; description: string; colour: string }

export interface FabricRecord {
  slug: string;
  name: string;
  /** Shown in the shop. Hidden fabrics stay in the database (orders refer to them). */
  active: boolean;
  featured: boolean;
  /** Position in the shop (low first). */
  sort: number;
  techniques: Technique[];
  base: BaseFabric;
  edge: Edge;
  layout: Layout;
  colourFamily: string;
  colourHex: string;
  occasions: Occasion[];
  widthCm: number;
  weightGsm: number;
  repeatCm: number;
  stretch: "slight" | "none";
  detachableMotifs: boolean;
  pricePerMetre: number;
  minMetres: number;
  /** Procedural illustration, used when there is no photo (and for colour swatches in the bag). */
  look: FabricLook;
  /** An uploaded photo of the actual fabric (media table). Wins over the stock photo. */
  image?: { id: string; alt: string };
  /** A labelled stock photo standing in until the fabric is photographed. */
  stockPhoto?: PhotoKey;
  /** Texts per language; English is required, other languages fall back to it. */
  text: Partial<Record<Locale, FabricText>> & { en: FabricText };
}

export const TECHNIQUE_IDS: Technique[] = ["beading", "sequins", "pearls", "embroidery", "lace"];
export const BASE_IDS: BaseFabric[] = ["tulle", "chiffon", "organza", "satin"];
export const OCCASION_IDS: Occasion[] = ["bridal", "engagement", "evening", "gala"];
export const PATTERNS: Pattern[] = ["sequins", "beaded", "pearls", "lace", "embroidery"];

// ---- seed: the built-in sample catalogue, with the dictionaries' translations

function seedRecords(): FabricRecord[] {
  return PRODUCTS.map((p, i) => ({
    slug: p.slug,
    name: p.name,
    active: true,
    featured: !!p.featured,
    sort: (i + 1) * 10,
    techniques: p.techniques,
    base: p.base,
    edge: p.edge,
    layout: p.layout,
    colourFamily: p.colour.family,
    colourHex: p.colour.hex,
    occasions: p.occasions,
    widthCm: p.widthCm,
    weightGsm: p.weightGsm,
    repeatCm: p.repeatCm,
    stretch: p.stretch === "None" ? "none" : "slight",
    detachableMotifs: p.detachableMotifs,
    pricePerMetre: p.pricePerMetre,
    minMetres: p.minMetres,
    look: p.look,
    stockPhoto: PRODUCT_PHOTOS[p.slug],
    text: {
      en: { tagline: p.tagline, description: p.description, colour: p.colour.name },
      ...Object.fromEntries(LOCALES.filter((l) => l !== "en").flatMap((l) => {
        const tx = getDict(l).catalog.products[p.slug];
        return tx ? [[l, tx]] : [];
      })),
    },
  }));
}

/** Copies the sample catalogue into an empty products table (first run only). */
export async function ensureCatalog(db: Queryable) {
  const { rows } = await db.query<{ n: string }>("SELECT count(*) AS n FROM products");
  if (Number(rows[0].n) > 0) return;
  for (const r of seedRecords()) {
    await db.query("INSERT INTO products (slug, data) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING", [r.slug, JSON.stringify(r)]);
  }
}

// ---- reading

/** Whether pages may read the database now. PGlite is single-process, so the build (many workers) uses the seed. */
function dbReadable() {
  if (!isDbConfigured()) return false;
  const pglite = process.env.DATABASE_URL!.startsWith("pglite://");
  return !(pglite && process.env.NEXT_PHASE === "phase-production-build");
}

const bySort = (a: FabricRecord, b: FabricRecord) => a.sort - b.sort || a.name.localeCompare(b.name);

/** Every fabric record straight from the database (admin, checkout). */
export async function loadRecords(db?: Queryable): Promise<FabricRecord[]> {
  const conn = db ?? (await getDb());
  const { rows } = await conn.query<{ data: FabricRecord | string }>("SELECT data FROM products");
  return rows.map((r) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data) as FabricRecord).sort(bySort);
}

export async function loadRecord(slug: string, db?: Queryable): Promise<FabricRecord | undefined> {
  const conn = db ?? (await getDb());
  const { rows } = await conn.query<{ data: FabricRecord | string }>("SELECT data FROM products WHERE slug = $1", [slug]);
  const d = rows[0]?.data;
  return d ? ((typeof d === "string" ? JSON.parse(d) : d) as FabricRecord) : undefined;
}

/*
 * Pages always read through this tagged cache, even when the data is the seed, so that an admin
 * save (revalidateTag "catalog") also refreshes pages prerendered at build time. Build and runtime
 * use separate cache keys: a build without database access must not leave the seed in the cache.
 */
const cachedRecords = (phase: string) =>
  unstable_cache(async () => (dbReadable() ? loadRecords() : seedRecords()), ["catalog-records", phase], { tags: ["catalog"] })();

/** Records for the public site: cached, and the seed when there is no database (or it fails). */
async function siteRecords(): Promise<FabricRecord[]> {
  if (!isDbConfigured()) return seedRecords();
  try {
    return await cachedRecords(process.env.NEXT_PHASE === "phase-production-build" ? "build" : "run");
  } catch (err) {
    console.error("catalogue: database read failed, showing the sample catalogue", err);
    return seedRecords();
  }
}

/** The record as the shop shows it, in one language. */
export function toProduct(r: FabricRecord, lang: Locale): Product {
  const t = getDict(lang);
  const tx = { ...r.text.en, ...Object.fromEntries(Object.entries(r.text[lang] ?? {}).filter(([, v]) => v)) } as FabricText;
  return {
    slug: r.slug,
    name: r.name,
    tagline: tx.tagline,
    description: tx.description,
    techniques: r.techniques,
    base: r.base,
    edge: r.edge,
    layout: r.layout,
    colour: { name: tx.colour, family: r.colourFamily, hex: r.colourHex },
    occasions: r.occasions,
    widthCm: r.widthCm,
    weightGsm: r.weightGsm,
    repeatCm: r.repeatCm,
    stretch: r.stretch === "none" ? t.catalog.stretchNone : t.catalog.stretchSlight,
    care: t.catalog.care,
    detachableMotifs: r.detachableMotifs,
    pricePerMetre: r.pricePerMetre,
    minMetres: r.minMetres,
    look: r.look,
    photo: r.image ? ownPhoto(r.image.id, r.image.alt || r.name) : r.stockPhoto ? PHOTOS[r.stockPhoto] : undefined,
    featured: r.featured,
  };
}

/** The fabrics on sale, in one language, in shop order. */
export async function getCatalog(lang: Locale): Promise<Product[]> {
  return (await siteRecords()).filter((r) => r.active).map((r) => toProduct(r, lang));
}

export async function getCatalogProduct(lang: Locale, slug: string): Promise<Product | undefined> {
  const r = (await siteRecords()).find((x) => x.slug === slug && x.active);
  return r && toProduct(r, lang);
}

/** Slugs to prerender at build time. */
export const seedSlugs = () => PRODUCTS.map((p) => p.slug);

/** Clears the cached catalogue so every page picks up an admin change. */
export function catalogChanged() {
  revalidateTag("catalog");
}

// ---- validation (admin input)

export class FabricError extends Error {}

const HEX = /^#[0-9a-f]{6}$/i;
const num = (v: unknown, label: string, min: number, max: number, step = 0) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) throw new FabricError(`${label} must be between ${min} and ${max}.`);
  if (step && Math.abs(n / step - Math.round(n / step)) > 1e-9) throw new FabricError(`${label} must be in steps of ${step}.`);
  return n;
};
const oneOf = <T extends string>(v: unknown, list: readonly T[], label: string): T => {
  if (!list.includes(v as T)) throw new FabricError(`Choose a valid ${label}.`);
  return v as T;
};
const someOf = <T extends string>(v: unknown, list: readonly T[], label: string): T[] => {
  const arr = (Array.isArray(v) ? v : []).filter((x): x is T => list.includes(x as T));
  if (!arr.length) throw new FabricError(`Choose at least one ${label}.`);
  return Array.from(new Set(arr));
};
const text = (v: unknown, label: string, max: number, required = false) => {
  const s = String(v ?? "").trim().replace(/\s+\n/g, "\n");
  if (required && !s) throw new FabricError(`${label} is required.`);
  if (s.length > max) throw new FabricError(`${label} is too long (max ${max} characters).`);
  return s;
};

/** Checks and normalises a fabric record coming from the admin form. Throws FabricError with a readable message. */
export function parseFabric(input: Record<string, unknown>): FabricRecord {
  const slug = String(input.slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) throw new FabricError("The web address may use a–z, 0–9 and hyphens (2–40 characters).");
  const textIn = (input.text ?? {}) as Record<string, Partial<FabricText>>;
  const texts: Partial<Record<Locale, FabricText>> = {};
  for (const l of LOCALES) {
    const tx = textIn[l] ?? {};
    const req = l === "en";
    const entry = {
      tagline: text(tx.tagline, `Tagline (${l})`, 140, req),
      description: text(tx.description, `Description (${l})`, 1200, req),
      colour: text(tx.colour, `Colour name (${l})`, 60, req),
    };
    if (req || entry.tagline || entry.description || entry.colour) texts[l] = entry;
  }
  const lookIn = (input.look ?? {}) as Partial<FabricLook>;
  const layout = oneOf(input.layout, ["allover", "border"] as const, "layout");
  const edge = oneOf(input.edge, ["straight", "scalloped"] as const, "edge");
  const colourHex = String(input.colourHex ?? "");
  if (!HEX.test(colourHex)) throw new FabricError("Colour must be a hex value like #c9a86a.");
  const hex = (v: unknown, fallback: string) => (HEX.test(String(v ?? "")) ? String(v) : fallback);
  const image = input.image as FabricRecord["image"];
  const stockPhoto = input.stockPhoto ? oneOf(input.stockPhoto, Object.keys(PHOTOS) as PhotoKey[], "stock photo") : undefined;

  return {
    slug,
    name: text(input.name, "Name", 60, true),
    active: !!input.active,
    featured: !!input.featured,
    sort: Math.round(num(input.sort ?? 100, "Position", 0, 100000)),
    techniques: someOf(input.techniques, TECHNIQUE_IDS, "technique"),
    base: oneOf(input.base, BASE_IDS, "base fabric"),
    edge,
    layout,
    colourFamily: oneOf(input.colourFamily, COLOUR_FAMILIES, "colour group"),
    colourHex,
    occasions: someOf(input.occasions, OCCASION_IDS, "occasion"),
    widthCm: Math.round(num(input.widthCm, "Width", 50, 400)),
    weightGsm: Math.round(num(input.weightGsm, "Weight", 10, 2000)),
    repeatCm: Math.round(num(input.repeatCm, "Pattern repeat", 0, 300)),
    stretch: oneOf(input.stretch, ["slight", "none"] as const, "stretch"),
    detachableMotifs: !!input.detachableMotifs,
    pricePerMetre: num(input.pricePerMetre, "Price per metre", 1, 10000, 0.01),
    minMetres: num(input.minMetres, "Minimum length", 0.5, 20, 0.5),
    look: {
      pattern: oneOf(lookIn.pattern, PATTERNS, "illustration pattern"),
      ground: oneOf(lookIn.ground ?? input.base, ["tulle", "chiffon", "organza", "satin"] as Ground[], "ground"),
      base: hex(lookIn.base, "#0d0b09"),
      ink: hex(lookIn.ink, colourHex),
      accent: hex(lookIn.accent, "#f2ebdf"),
      glint: hex(lookIn.glint, "#ffffff"),
      layout,
      edge,
      seed: Math.round(num(lookIn.seed ?? 1, "Illustration seed", 1, 9999)),
    },
    ...(image?.id && /^[0-9a-f-]{36}$/.test(image.id) ? { image: { id: image.id, alt: text(image.alt, "Photo description", 200) } } : {}),
    ...(stockPhoto ? { stockPhoto } : {}),
    text: texts as FabricRecord["text"],
  };
}
