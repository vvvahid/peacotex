import type { Product } from "@/lib/catalog";

export type Silhouette = "mini" | "midi" | "maxi" | "ballgown" | "train";
export type Height = "petite" | "average" | "tall";
export type Sleeves = "none" | "short" | "long";

export const SILHOUETTES: { id: Silhouette; label: string; hint: string }[] = [
  { id: "mini", label: "Mini", hint: "Above the knee" },
  { id: "midi", label: "Midi", hint: "Mid-calf" },
  { id: "maxi", label: "Maxi / column", hint: "Floor length, slim skirt" },
  { id: "ballgown", label: "Ball gown", hint: "Full gathered skirt" },
  { id: "train", label: "Gown with train", hint: "Floor length plus train" },
];

// Body length for a ~140 cm wide fabric, average height (165–172 cm), no sleeves.
const BASE: Record<Silhouette, number> = { mini: 1.5, midi: 2.4, maxi: 3.2, ballgown: 5.5, train: 7 };
// Main pieces whose motifs must line up across seams (front, back, skirt panels).
const MATCHED_PIECES: Record<Silhouette, number> = { mini: 2, midi: 2, maxi: 3, ballgown: 4, train: 5 };
// Approximate hem circumference: a border fabric must run all the way round the hem.
const HEM: Record<Silhouette, number> = { mini: 1.3, midi: 1.7, maxi: 2.1, ballgown: 4.5, train: 5.5 };
const HEIGHT: Record<Height, number> = { petite: 0.92, average: 1, tall: 1.1 };
const SLEEVES: Record<Sleeves, number> = { none: 0, short: 0.4, long: 0.8 };

export interface Estimate { metres: number; lines: { label: string; metres: number }[]; notes: string[] }

const roundUpHalf = (m: number) => Math.ceil(m * 2 - 1e-9) / 2;

export function estimate(p: Product, s: Silhouette, h: Height, sl: Sleeves): Estimate {
  const lines: Estimate["lines"] = [];
  const notes: string[] = [];
  const widthFactor = p.widthCm < 135 ? 1.08 : 1;
  const body = BASE[s] * HEIGHT[h] * widthFactor;
  lines.push({ label: `${SILHOUETTES.find((x) => x.id === s)!.label} body${widthFactor > 1 ? ` (narrower ${p.widthCm} cm width)` : ""}`, metres: body });
  if (SLEEVES[sl]) lines.push({ label: `${sl === "long" ? "Long" : "Short"} sleeves`, metres: SLEEVES[sl] });

  if (p.repeatCm > 0 && p.layout === "allover") {
    const extra = (p.repeatCm / 100) * MATCHED_PIECES[s];
    lines.push({ label: `Pattern matching (${p.repeatCm} cm repeat × ${MATCHED_PIECES[s]} pieces)`, metres: extra });
  } else if (p.repeatCm === 0) {
    notes.push("Random all-over pattern: no extra needed for matching.");
  }

  let subtotal = lines.reduce((a, l) => a + l.metres, 0);
  if (p.layout === "border") {
    const hem = HEM[s] * HEIGHT[h];
    if (hem > subtotal) {
      lines.push({ label: `Border must reach round the hem (≈ ${hem.toFixed(1)} m)`, metres: hem - subtotal });
      subtotal = hem;
    }
    notes.push("Border fabric: the skirt is cut with the border along the hem, so the hem circumference sets the minimum.");
  }
  if (p.edge === "scalloped") notes.push("Scalloped selvedge: place it at the hem, neckline or sleeve ends so the edge needs no finishing.");

  const allowance = subtotal * 0.1;
  lines.push({ label: "Cutting allowance (10%)", metres: allowance });
  const metres = Math.max(p.minMetres, roundUpHalf(subtotal + allowance));
  return { metres, lines, notes };
}
