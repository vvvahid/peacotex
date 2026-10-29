import type { FabricLook } from "@/lib/fabric/render";
import { PHOTOS, type Photo, type PhotoKey } from "@/lib/photos";

/*
 * SAMPLE CONTENT. Every product, name, price and specification below is invented for the demo
 * and is shown on the site as sample content. Replace with the real catalogue before launch.
 */

export type Technique = "beading" | "sequins" | "pearls" | "embroidery" | "lace";
export type BaseFabric = "tulle" | "chiffon" | "organza" | "satin";
export type Edge = "straight" | "scalloped";
export type Layout = "allover" | "border";
export type Occasion = "bridal" | "engagement" | "evening" | "gala";

export interface Colour { name: string; family: string; hex: string }

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  techniques: Technique[];
  base: BaseFabric;
  edge: Edge;
  layout: Layout;
  colour: Colour;
  occasions: Occasion[];
  widthCm: number;
  weightGsm: number;
  /** Vertical pattern repeat in cm; 0 = random/all-over, no matching needed. */
  repeatCm: number;
  stretch: string;
  care: string;
  detachableMotifs: boolean;
  pricePerMetre: number;
  minMetres: number;
  look: FabricLook;
  /** Stock photo standing in until the shop's own photography exists (labelled on the site). */
  photo?: Photo;
  featured?: boolean;
}

export interface Complement {
  slug: string;
  name: string;
  kind: "lining" | "trim";
  base?: BaseFabric;
  colourFamilies: string[];
  price: number;
  unit: "m" | "piece";
  note: string;
}

export const TECHNIQUES: { id: Technique; label: string }[] = [
  { id: "beading", label: "Beading" },
  { id: "sequins", label: "Sequins" },
  { id: "pearls", label: "Pearls" },
  { id: "embroidery", label: "Embroidery" },
  { id: "lace", label: "Lace" },
];
export const BASES: { id: BaseFabric; label: string }[] = [
  { id: "tulle", label: "Tulle" },
  { id: "chiffon", label: "Chiffon" },
  { id: "organza", label: "Organza" },
  { id: "satin", label: "Satin" },
];
export const EDGES: { id: Edge; label: string }[] = [
  { id: "straight", label: "Straight" },
  { id: "scalloped", label: "Scalloped" },
];
export const LAYOUTS: { id: Layout; label: string }[] = [
  { id: "allover", label: "All-over" },
  { id: "border", label: "Border" },
];
export const OCCASIONS: { id: Occasion; label: string; line: string }[] = [
  { id: "bridal", label: "Bridal", line: "Ivory, pearl and the quiet shine of hand beading." },
  { id: "engagement", label: "Engagement", line: "Blush, champagne and silver for the first celebration." },
  { id: "evening", label: "Evening", line: "Black, gold and deep jewel tones that come alive after dark." },
  { id: "gala", label: "Gala", line: "Full-sequin statements made for the red carpet." },
];

const CARE = "Specialist dry clean only. Store rolled on a tube, never folded. Steam from the reverse.";

export const SWATCH_PRICE = 8;
export const SWATCH_SIZE = "15 × 15 cm";

export const PRODUCTS: Product[] = [
  {
    slug: "aurelia", name: "Aurelia", featured: true,
    tagline: "Champagne-gold sequins on black tulle",
    description: "Densely set 5 mm cup sequins in a fish-scale lay. Each sequin is sewn individually, so the fabric drapes like liquid metal and catches light from every angle.",
    techniques: ["sequins"], base: "tulle", edge: "straight", layout: "allover",
    colour: { name: "Champagne gold", family: "Gold", hex: "#c9a86a" }, occasions: ["evening", "gala"],
    widthCm: 130, weightGsm: 420, repeatCm: 0, stretch: "Slight (2-way)", care: CARE, detachableMotifs: false,
    pricePerMetre: 185, minMetres: 1,
    look: { pattern: "sequins", ground: "tulle", base: "#0d0b09", ink: "#a8864f", accent: "#d9c08e", glint: "#ffe2a8", layout: "allover", edge: "straight", seed: 11 },
  },
  {
    slug: "seraphine", name: "Seraphine", featured: true,
    tagline: "Hand-beaded florals with pearl hearts, scalloped border",
    description: "Glass seed beads and bugles trace five-petal flowers, each centred on a freshwater-style pearl. The motifs gather toward a scalloped hem border with a beaded picot edge.",
    techniques: ["beading", "pearls"], base: "tulle", edge: "scalloped", layout: "border",
    colour: { name: "Ivory", family: "Ivory", hex: "#efe6d4" }, occasions: ["bridal"],
    widthCm: 135, weightGsm: 380, repeatCm: 64, stretch: "None", care: CARE, detachableMotifs: true,
    pricePerMetre: 340, minMetres: 1,
    look: { pattern: "beaded", ground: "tulle", base: "#a99c87", ink: "#f4efe6", accent: "#fbf6ec", glint: "#ffffff", layout: "border", edge: "scalloped", seed: 23 },
  },
  {
    slug: "perle", name: "Perle", featured: true,
    tagline: "Scattered pearls on soft ivory tulle",
    description: "Pearls in six sizes scattered in drifting clusters, with clear seed beads between them. Light enough for veils and overlays, rich enough for a full skirt.",
    techniques: ["pearls"], base: "tulle", edge: "straight", layout: "allover",
    colour: { name: "Ivory", family: "Ivory", hex: "#f1e9da" }, occasions: ["bridal", "engagement"],
    widthCm: 145, weightGsm: 210, repeatCm: 0, stretch: "Slight (2-way)", care: CARE, detachableMotifs: false,
    pricePerMetre: 145, minMetres: 1,
    look: { pattern: "pearls", ground: "tulle", base: "#9e927f", ink: "#f6f0e4", accent: "#ead9c6", glint: "#ffffff", layout: "allover", edge: "straight", seed: 31 },
  },
  {
    slug: "vesper", name: "Vesper", featured: true,
    tagline: "Corded lace in black with jet beads, scalloped",
    description: "Raised corded lace motifs joined by fine bars, set with jet glass beads at every petal tip. Finished on both selvedges with a deep scallop.",
    techniques: ["lace", "beading"], base: "tulle", edge: "scalloped", layout: "allover",
    colour: { name: "Black", family: "Black", hex: "#141210" }, occasions: ["evening"],
    widthCm: 125, weightGsm: 330, repeatCm: 48, stretch: "None", care: CARE, detachableMotifs: true,
    pricePerMetre: 260, minMetres: 1,
    look: { pattern: "lace", ground: "tulle", base: "#0a0908", ink: "#2c2925", accent: "#6f6a64", glint: "#d9dde6", layout: "allover", edge: "scalloped", seed: 47 },
  },
  {
    slug: "chantal", name: "Chantal",
    tagline: "Ivory corded lace with pearl centres",
    description: "A softer corded lace re-embroidered onto silk-feel tulle, each flower finished with a pearl. Scalloped on one side for hems and necklines.",
    techniques: ["lace", "pearls"], base: "tulle", edge: "scalloped", layout: "border",
    colour: { name: "Ivory", family: "Ivory", hex: "#eee4d2" }, occasions: ["bridal", "engagement"],
    widthCm: 130, weightGsm: 290, repeatCm: 52, stretch: "None", care: CARE, detachableMotifs: true,
    pricePerMetre: 235, minMetres: 1,
    look: { pattern: "lace", ground: "tulle", base: "#8d8270", ink: "#efe7d8", accent: "#fbf7ef", glint: "#ffffff", layout: "border", edge: "scalloped", seed: 53 },
  },
  {
    slug: "lumen", name: "Lumen",
    tagline: "Silver beading on blush tulle",
    description: "Silver-lined seed beads and bugles in an all-over floral, light enough to gather. A soft blush ground that reads almost nude on the skin.",
    techniques: ["beading"], base: "tulle", edge: "straight", layout: "allover",
    colour: { name: "Blush", family: "Blush", hex: "#e6c3b8" }, occasions: ["engagement", "evening"],
    widthCm: 135, weightGsm: 310, repeatCm: 36, stretch: "Slight (2-way)", care: CARE, detachableMotifs: false,
    pricePerMetre: 210, minMetres: 1,
    look: { pattern: "beaded", ground: "tulle", base: "#b48f86", ink: "#d6d8dc", accent: "#f2e9e4", glint: "#ffffff", layout: "allover", edge: "straight", seed: 61 },
  },
  {
    slug: "opaline", name: "Opaline",
    tagline: "Blush pearls gathering to a scalloped hem",
    description: "Pearls in rose and ivory tones, sparse at the top and dense at the hem, finished with a scalloped, beaded edge.",
    techniques: ["pearls", "beading"], base: "tulle", edge: "scalloped", layout: "border",
    colour: { name: "Blush", family: "Blush", hex: "#e8cfc6" }, occasions: ["engagement", "bridal"],
    widthCm: 140, weightGsm: 260, repeatCm: 70, stretch: "None", care: CARE, detachableMotifs: false,
    pricePerMetre: 195, minMetres: 1,
    look: { pattern: "pearls", ground: "tulle", base: "#a98b84", ink: "#f0ddd5", accent: "#fbf3ee", glint: "#fff3ee", layout: "border", edge: "scalloped", seed: 67 },
  },
  {
    slug: "noctis", name: "Noctis",
    tagline: "Gunmetal sequin border on black chiffon",
    description: "A flowing black chiffon that turns into a dense gunmetal sequin border toward the hem: weightless at the waist, heavy and swinging at the floor.",
    techniques: ["sequins"], base: "chiffon", edge: "scalloped", layout: "border",
    colour: { name: "Gunmetal", family: "Silver", hex: "#6e7176" }, occasions: ["evening", "gala"],
    widthCm: 140, weightGsm: 350, repeatCm: 0, stretch: "None", care: CARE, detachableMotifs: false,
    pricePerMetre: 225, minMetres: 1,
    look: { pattern: "sequins", ground: "chiffon", base: "#0b0b0c", ink: "#595d63", accent: "#9aa0a8", glint: "#e8eef8", layout: "border", edge: "scalloped", seed: 71 },
  },
  {
    slug: "celeste", name: "Celeste",
    tagline: "Gold-thread leaf embroidery on ivory organza",
    description: "Satin-stitched leaves in metallic gold thread with sequin flower heads. Crisp organza holds structure for bodices, capes and sculpted sleeves.",
    techniques: ["embroidery", "sequins"], base: "organza", edge: "straight", layout: "allover",
    colour: { name: "Ivory & gold", family: "Gold", hex: "#e9dcc0" }, occasions: ["engagement", "bridal"],
    widthCm: 132, weightGsm: 240, repeatCm: 42, stretch: "None", care: CARE, detachableMotifs: false,
    pricePerMetre: 275, minMetres: 1,
    look: { pattern: "embroidery", ground: "organza", base: "#cbbd9f", ink: "#b8914c", accent: "#e7cf96", glint: "#ffe6b0", layout: "allover", edge: "straight", seed: 83 },
  },
  {
    slug: "ember", name: "Ember",
    tagline: "Copper embroidery border on bordeaux organza",
    description: "Copper metallic thread worked in trailing leaf sprays that thicken into a hem border. A warm, candle-lit shine for autumn and winter evenings.",
    techniques: ["embroidery"], base: "organza", edge: "straight", layout: "border",
    colour: { name: "Bordeaux", family: "Bordeaux", hex: "#5a1621" }, occasions: ["evening"],
    widthCm: 135, weightGsm: 270, repeatCm: 58, stretch: "None", care: CARE, detachableMotifs: false,
    pricePerMetre: 240, minMetres: 1,
    look: { pattern: "embroidery", ground: "organza", base: "#3a0e16", ink: "#a8603a", accent: "#d99a6b", glint: "#ffc79a", layout: "border", edge: "straight", seed: 89 },
  },
  {
    slug: "sapphira", name: "Sapphira",
    tagline: "Midnight sequin border on duchess-feel satin",
    description: "Midnight-blue sequins packed into a deep scalloped border on a heavy satin ground. Made for structured gala gowns and long trains.",
    techniques: ["sequins"], base: "satin", edge: "scalloped", layout: "border",
    colour: { name: "Midnight", family: "Navy", hex: "#18223f" }, occasions: ["gala"],
    widthCm: 140, weightGsm: 520, repeatCm: 0, stretch: "None", care: CARE, detachableMotifs: false,
    pricePerMetre: 290, minMetres: 1,
    look: { pattern: "sequins", ground: "satin", base: "#0e1430", ink: "#2b3e78", accent: "#6f86c9", glint: "#cfdcff", layout: "border", edge: "scalloped", seed: 97 },
  },
  {
    slug: "rosalind", name: "Rosalind",
    tagline: "Emerald beading on silk-feel chiffon",
    description: "Tonal emerald beads and gold bugles in an all-over floral on fluid chiffon. A jewel-tone statement for gala evenings.",
    techniques: ["beading"], base: "chiffon", edge: "straight", layout: "allover",
    colour: { name: "Emerald", family: "Emerald", hex: "#1d4a3a" }, occasions: ["gala", "evening"],
    widthCm: 135, weightGsm: 360, repeatCm: 40, stretch: "None", care: CARE, detachableMotifs: false,
    pricePerMetre: 255, minMetres: 1,
    look: { pattern: "beaded", ground: "chiffon", base: "#0f2a21", ink: "#3f8a6c", accent: "#d8b56e", glint: "#e6ffef", layout: "allover", edge: "straight", seed: 101 },
  },
];

// Fabrics without a fitting stock photo keep their procedural illustration.
const PRODUCT_PHOTOS: Record<string, PhotoKey> = {
  aurelia: "sequinDrape", seraphine: "bridalBeading", perle: "bridalDetail", chantal: "scallopLace",
  opaline: "blushLace", noctis: "iridescent", celeste: "goldEmbroidery", ember: "copperPaillettes",
  sapphira: "midnight", rosalind: "emerald",
};
for (const prod of PRODUCTS) {
  const key = PRODUCT_PHOTOS[prod.slug];
  if (key) prod.photo = PHOTOS[key];
}

export const COMPLEMENTS: Complement[] = [
  { slug: "silk-tulle-lining", name: "Soft silk-feel tulle", kind: "lining", base: "tulle", colourFamilies: ["Ivory", "Blush", "Black", "Gold"], price: 28, unit: "m", note: "Underlay for beaded tulle; hides seam allowances." },
  { slug: "chiffon-lining", name: "Crepe chiffon lining", kind: "lining", base: "chiffon", colourFamilies: ["Black", "Silver", "Emerald", "Navy", "Bordeaux"], price: 32, unit: "m", note: "Fluid lining that moves with a chiffon skirt." },
  { slug: "duchess-satin", name: "Duchess-feel satin", kind: "lining", base: "satin", colourFamilies: ["Ivory", "Navy", "Black", "Gold"], price: 46, unit: "m", note: "Structured base for bodices and ball-gown skirts." },
  { slug: "organza-underlay", name: "Silk-feel organza", kind: "lining", base: "organza", colourFamilies: ["Ivory", "Gold", "Bordeaux", "Blush"], price: 30, unit: "m", note: "Crisp underlayer that keeps embroidery flat." },
  { slug: "scallop-trim", name: "Beaded scallop trim", kind: "trim", colourFamilies: ["Ivory", "Blush", "Black", "Gold", "Silver"], price: 38, unit: "m", note: "Finish necklines, sleeves and hems with a matching scallop." },
  { slug: "motif-set", name: "Detachable motif set (6)", kind: "trim", colourFamilies: ["Ivory", "Blush", "Gold", "Black"], price: 64, unit: "piece", note: "Loose appliqué motifs to scatter across a skirt or veil." },
];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export function completeTheLook(p: Product): Complement[] {
  const fam = p.colour.family;
  const linings = COMPLEMENTS.filter((c) => c.kind === "lining" && c.colourFamilies.includes(fam))
    .sort((a, b) => Number(b.base === p.base) - Number(a.base === p.base))
    .slice(0, 2);
  const trims = COMPLEMENTS.filter((c) => c.kind === "trim" && c.colourFamilies.includes(fam) && (c.slug !== "motif-set" || p.detachableMotifs || p.techniques.includes("lace")));
  return [...linings, ...trims].slice(0, 3);
}

