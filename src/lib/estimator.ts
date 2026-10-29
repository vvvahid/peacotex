import type { Product } from "@/lib/catalog";

export type Silhouette = "mini" | "midi" | "maxi" | "ballgown" | "train";
export type Height = "petite" | "average" | "tall";
export type Sleeves = "none" | "short" | "long";

export const SILHOUETTES: Silhouette[] = ["mini", "midi", "maxi", "ballgown", "train"];

// Body length for a ~140 cm wide fabric, average height (165–172 cm), no sleeves.
const BASE: Record<Silhouette, number> = { mini: 1.5, midi: 2.4, maxi: 3.2, ballgown: 5.5, train: 7 };
// Main pieces whose motifs must line up across seams (front, back, skirt panels).
const MATCHED_PIECES: Record<Silhouette, number> = { mini: 2, midi: 2, maxi: 3, ballgown: 4, train: 5 };
// Approximate hem circumference: a border fabric must run all the way round the hem.
const HEM: Record<Silhouette, number> = { mini: 1.3, midi: 1.7, maxi: 2.1, ballgown: 4.5, train: 5.5 };
const HEIGHT: Record<Height, number> = { petite: 0.92, average: 1, tall: 1.1 };
const SLEEVES: Record<Sleeves, number> = { none: 0, short: 0.4, long: 0.8 };

/** Lines and notes are keys into the dictionary's `estimator` texts, with the values to fill in. */
export type LineKey = "body" | "bodyNarrow" | "sleevesShort" | "sleevesLong" | "matching" | "border" | "allowance";
export type NoteKey = "noteRandom" | "noteBorder" | "noteScallop";
export interface Estimate { metres: number; lines: { key: LineKey; vars?: Record<string, number>; metres: number }[]; notes: NoteKey[] }

const roundUpHalf = (m: number) => Math.ceil(m * 2 - 1e-9) / 2;

export function estimate(p: Product, s: Silhouette, h: Height, sl: Sleeves): Estimate {
  const lines: Estimate["lines"] = [];
  const notes: NoteKey[] = [];
  const widthFactor = p.widthCm < 135 ? 1.08 : 1;
  const body = BASE[s] * HEIGHT[h] * widthFactor;
  lines.push({ key: widthFactor > 1 ? "bodyNarrow" : "body", vars: { w: p.widthCm }, metres: body });
  if (SLEEVES[sl]) lines.push({ key: sl === "long" ? "sleevesLong" : "sleevesShort", metres: SLEEVES[sl] });

  if (p.repeatCm > 0 && p.layout === "allover") {
    const extra = (p.repeatCm / 100) * MATCHED_PIECES[s];
    lines.push({ key: "matching", vars: { cm: p.repeatCm, n: MATCHED_PIECES[s] }, metres: extra });
  } else if (p.repeatCm === 0) {
    notes.push("noteRandom");
  }

  let subtotal = lines.reduce((a, l) => a + l.metres, 0);
  if (p.layout === "border") {
    const hem = HEM[s] * HEIGHT[h];
    if (hem > subtotal) {
      lines.push({ key: "border", vars: { m: Math.round(hem * 10) / 10 }, metres: hem - subtotal });
      subtotal = hem;
    }
    notes.push("noteBorder");
  }
  if (p.edge === "scalloped") notes.push("noteScallop");

  const allowance = subtotal * 0.1;
  lines.push({ key: "allowance", metres: allowance });
  const metres = Math.max(p.minMetres, roundUpHalf(subtotal + allowance));
  return { metres, lines, notes };
}
