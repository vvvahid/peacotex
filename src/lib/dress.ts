import type { Silhouette, Sleeves } from "@/lib/estimator";

/*
 * Dress shapes for the Dress studio, drawn in a 300 × 640 figure space (head at the top, floor
 * at ~590). Every silhouette shares the sweetheart bodice; the skirt, hem and train change.
 */

export const VIEW_W = 300;
export const VIEW_H = 640;
export const DRESS_TOP = 108;
const CX = 150;
const WAIST = 215;
const HIPS = 270;

type Pt = [dx: number, y: number];
interface Seg { c: "Q" | "C"; pts: Pt[] } // control point(s) then end point, right side, dx from the centre line
interface Skirt { hem: number; half: number; segs: Seg[]; train?: boolean }

const x = (s: 1 | -1, dx: number) => (CX + s * dx).toFixed(1);
const pt = (s: 1 | -1, [dx, y]: Pt) => `${x(s, dx)},${y}`;
const WAIST_PT: Pt = [26, WAIST];

// From the right side of the waist down to the right hem corner; the left side is the mirror, walked upward.
const SKIRTS: Record<Silhouette, Skirt> = {
  mini: { hem: 330, half: 64, segs: [{ c: "Q", pts: [[50, 272], [64, 330]] }] },
  midi: { hem: 455, half: 86, segs: [{ c: "Q", pts: [[52, HIPS], [86, 455]] }] },
  maxi: { hem: 590, half: 62, segs: [{ c: "Q", pts: [[46, 240], [45, HIPS]] }, { c: "Q", pts: [[47, 450], [62, 590]] }] },
  ballgown: { hem: 596, half: 140, segs: [{ c: "C", pts: [[60, 240], [138, 380], [140, 596]] }] },
  train: {
    hem: 590, half: 78, train: true,
    segs: [{ c: "Q", pts: [[46, 240], [45, HIPS]] }, { c: "Q", pts: [[38, 400], [40, 430]] }, { c: "Q", pts: [[50, 520], [78, 590]] }],
  },
};

const down = (segs: Seg[]) => segs.map((g) => `${g.c}${g.pts.map((p) => pt(1, p)).join(" ")}`).join(" ");

/** The same curve on the left side, from the hem corner back up to the waist. */
function up(segs: Seg[]): string {
  const ends = [WAIST_PT, ...segs.map((g) => g.pts[g.pts.length - 1])];
  return segs
    .map((g, i) => ({ g, from: ends[i] }))
    .reverse()
    .map(({ g, from }) => `${g.c}${[...g.pts.slice(0, -1).reverse(), from].map((p) => pt(-1, p)).join(" ")}`)
    .join(" ");
}

/** Hem from the right corner to the left one; scallops bulge downward. */
function hem(sk: Skirt, scalloped: boolean): string {
  const right = CX + sk.half, left = CX - sk.half;
  if (sk.train) {
    // Sweep out to a train at the back (drawn to the right), then back along the floor.
    const back = scalloped ? scallops(296, left, 628) : `L${left},${sk.hem + 4}`;
    return `Q${right + 60},${sk.hem + 8} 296,628 ${back}`;
  }
  return scalloped ? scallops(right, left, sk.hem) : `L${left},${sk.hem}`;
}

function scallops(from: number, to: number, y: number): string {
  const n = Math.max(4, Math.round((from - to) / 13));
  const w = (from - to) / n;
  let d = `L${from.toFixed(1)},${y}`;
  for (let i = 1; i <= n; i++) d += ` A${(w / 2).toFixed(2)},${(w / 2.4).toFixed(2)} 0 0 1 ${(from - i * w).toFixed(1)},${y}`;
  return d;
}

/** The dress body (bodice + skirt) as an SVG path in figure space. */
export function dressPath(sil: Silhouette, scalloped: boolean): string {
  const sk = SKIRTS[sil];
  return [
    `M${CX - 38},128 Q${CX - 20},120 ${CX},140 Q${CX + 20},120 ${CX + 38},128`, // sweetheart neckline
    `L${CX + 32},175 Q${CX + 28},200 ${CX + 26},${WAIST}`,
    down(sk.segs),
    hem(sk, scalloped),
    up(sk.segs),
    `Q${CX - 28},200 ${CX - 32},175 Z`,
  ].join(" ");
}

export function dressBottom(sil: Silhouette): number {
  return SKIRTS[sil].train ? 632 : SKIRTS[sil].hem + 6;
}

/** Sleeves (sheer, in the fabric) for each arm. */
export function sleevePaths(sleeves: Sleeves): string[] {
  if (sleeves === "none") return [];
  const end = sleeves === "short" ? 168 : 300;
  const one = (s: 1 | -1) =>
    `M${x(s, 38)},128 Q${x(s, 50)},112 ${x(s, 58)},120 Q${x(s, 64)},140 ${x(s, 62)},170 L${x(s, sleeves === "short" ? 66 : 68)},${end} ` +
    `L${x(s, sleeves === "short" ? 44 : 52)},${end} L${x(s, 42)},170 Q${x(s, 38)},150 ${x(s, 38)},128 Z`;
  return [one(1), one(-1)];
}

/** Abstract fashion croquis behind the dress. */
export const FIGURE = {
  head: { cx: CX, cy: 60, rx: 21, ry: 27 },
  parts: [
    // neck
    `M${CX - 9},82 L${CX + 9},82 L${CX + 11},112 L${CX - 11},112 Z`,
    // torso
    `M${CX - 46},118 Q${CX},104 ${CX + 46},118 L${CX + 40},150 Q${CX + 30},200 ${CX + 27},215 Q${CX + 44},250 ${CX + 42},280 L${CX - 42},280 Q${CX - 44},250 ${CX - 27},215 Q${CX - 30},200 ${CX - 40},150 Z`,
    // arms
    ...[1, -1].map((sn) => {
      const s = sn as 1 | -1;
      return `M${x(s, 46)},118 Q${x(s, 60)},124 ${x(s, 61)},160 L${x(s, 66)},300 Q${x(s, 66)},318 ${x(s, 57)},318 Q${x(s, 51)},314 ${x(s, 53)},300 L${x(s, 42)},170 Q${x(s, 39)},150 ${x(s, 38)},140 Z`;
    }),
    // legs
    ...[1, -1].map((sn) => {
      const s = sn as 1 | -1;
      return `M${x(s, 1)},276 L${x(s, 42)},276 L${x(s, 30)},420 L${x(s, 17)},582 Q${x(s, 22)},594 ${x(s, 9)},594 L${x(s, 6)},584 L${x(s, 5)},420 Z`;
    }),
  ],
};
