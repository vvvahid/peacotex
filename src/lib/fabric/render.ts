/**
 * Procedural embellished-fabric renderer (Canvas 2D).
 *
 * Until real footage exists, every fabric on the site is drawn here: a ground (tulle, chiffon,
 * organza, satin) covered with sequins, beads, pearls, metallic thread or corded lace. Each
 * embellishment gets a surface normal; a highlight appears where the light sits in that normal's
 * reflection direction, so moving the light makes different sequins flash, like a real fabric
 * turning under a lamp.
 *
 * Cost model: the ground and all embellishment bodies are painted once into an offscreen canvas.
 * A frame is one drawImage of that layer plus additive glint sprites for the elements that are
 * actually lit, so even ~15k sequins redraw well within a frame.
 */

export type Pattern = "sequins" | "beaded" | "pearls" | "lace" | "embroidery";
export type Ground = "tulle" | "chiffon" | "organza" | "satin";

export interface FabricLook {
  pattern: Pattern;
  ground: Ground;
  /** Ground colour (hex). */
  base: string;
  /** Main embellishment colour (hex). */
  ink: string;
  /** Secondary embellishment colour: pearls in a beaded motif, accent sequins (hex). */
  accent?: string;
  /** Highlight tint (hex). */
  glint: string;
  layout: "allover" | "border";
  edge: "straight" | "scalloped";
  seed: number;
}

export interface RenderOptions {
  /** Element size multiplier (macro view uses ~3). */
  scale?: number;
  /** Draw the scalloped edge (when the look has one) instead of filling the frame. */
  showEdge?: boolean;
  /** Colour outside the fabric (behind the scallops). */
  backdrop?: string;
}

// sequin, bead, pearl, bugle bead, thread stitch, lace cord
enum K { Sequin, Bead, Pearl, Bugle, Thread, Cord }

interface El { x: number; y: number; r: number; k: K; nx: number; ny: number; a: number; acc: boolean }

/** Per kind: specular width (sigma²), strength, glint size factor, glint offset toward the light. */
const SPEC: Record<K, { s2: number; amp: number; size: number; off: number }> = {
  [K.Sequin]: { s2: 0.012, amp: 1.15, size: 1.6, off: 0 },
  [K.Bead]: { s2: 0.07, amp: 0.8, size: 0.85, off: 0.35 },
  [K.Pearl]: { s2: 0.33, amp: 0.6, size: 0.75, off: 0.38 },
  [K.Bugle]: { s2: 0.035, amp: 0.85, size: 1, off: 0 },
  [K.Thread]: { s2: 0.025, amp: 0.75, size: 1, off: 0 },
  [K.Cord]: { s2: 0.22, amp: 0.2, size: 1.4, off: 0.2 },
};

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const v = h.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const lighten = (c: RGB, t: number) => mix(c, WHITE, t);
const darken = (c: RGB, t: number) => mix(c, BLACK, t);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function sprite(size: number, paint: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = canvas(size, size);
  paint(c.getContext("2d")!, size);
  return c;
}

const discSprite = (col: RGB, kind: "sequin" | "bead" | "pearl") =>
  sprite(64, (g, s) => {
    const r = s / 2;
    const hi = kind === "pearl" ? 0.55 : kind === "bead" ? 0.4 : 0.22;
    const gr = g.createRadialGradient(r * 0.7, r * 0.62, r * 0.05, r, r, r);
    gr.addColorStop(0, rgba(lighten(col, hi)));
    gr.addColorStop(0.55, rgba(col));
    gr.addColorStop(1, rgba(darken(col, kind === "sequin" ? 0.6 : 0.45)));
    g.fillStyle = gr;
    g.beginPath(); g.arc(r, r, r - 1, 0, Math.PI * 2); g.fill();
    if (kind === "sequin") {
      g.strokeStyle = rgba(lighten(col, 0.35), 0.45);
      g.lineWidth = 2;
      g.beginPath(); g.arc(r, r, r - 2.5, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
      g.fillStyle = rgba(darken(col, 0.75), 0.9);
      g.beginPath(); g.arc(r, r, r * 0.12, 0, Math.PI * 2); g.fill();
    }
  });

const glintSprite = (col: RGB) =>
  sprite(64, (g, s) => {
    const r = s / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.18, rgba(lighten(col, 0.4), 0.85));
    gr.addColorStop(0.5, rgba(col, 0.22));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  });

const starSprite = (col: RGB) =>
  sprite(128, (g, s) => {
    const r = s / 2;
    for (const [w, h, a] of [[s, 3, 0.9], [3, s, 0.9], [s * 0.45, 2, 0.5]] as const) {
      const lg = g.createLinearGradient(r - w / 2, r - h / 2, r + w / 2, r + h / 2);
      lg.addColorStop(0, rgba(col, 0));
      lg.addColorStop(0.5, `rgba(255,255,255,${a})`);
      lg.addColorStop(1, rgba(col, 0));
      g.fillStyle = lg;
      g.save();
      if (a === 0.5) { g.translate(r, r); g.rotate(Math.PI / 4); g.translate(-r, -r); }
      g.fillRect(r - w / 2, r - h / 2, w, h);
      g.restore();
    }
  });

/** Bottom boundary of a scalloped fabric at x (semicircles bulging down). */
const scallopY = (x: number, edgeY: number, sr: number) => {
  const m = ((x % (2 * sr)) + 2 * sr) % (2 * sr) - sr;
  return edgeY + Math.sqrt(Math.max(0, sr * sr - m * m));
};

interface Gen { els: El[]; cords: { x: number; y: number }[][] }

function generate(look: FabricLook, W: number, H: number, u: number, edge: { y: number; sr: number } | null): Gen {
  const rand = rng(look.seed);
  const els: El[] = [];
  const cords: { x: number; y: number }[][] = [];
  const disc = (m: number) => {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * m;
    return [Math.cos(a) * d, Math.sin(a) * d] as const;
  };
  // Border layouts concentrate the work toward the hem (bottom).
  const mask = (y: number) => {
    if (look.layout !== "border") return 1;
    const t = Math.min(1, Math.max(0, (y / H - 0.08) / 0.62));
    return t * t;
  };
  const inside = (x: number, y: number, r: number) => {
    if (x < -r * 3 || x > W + r * 3 || y < -r * 3 || y > H + r * 3) return false;
    return !edge || y + r * 0.6 < scallopY(x, edge.y, edge.sr);
  };
  const push = (x: number, y: number, r: number, k: K, nx: number, ny: number, a = 0, acc = false) => {
    if (inside(x, y, r)) els.push({ x, y, r, k, nx, ny, a, acc });
  };
  const bead = (x: number, y: number, r = u * 0.55, acc = false) => { const [nx, ny] = disc(0.9); push(x, y, r, K.Bead, nx, ny, 0, acc); };
  const pearl = (x: number, y: number, r: number, acc = false) => { const [nx, ny] = disc(0.25); push(x, y, r, K.Pearl, nx, ny, 0, acc); };
  const sequin = (x: number, y: number, r: number, acc = false) => { const [nx, ny] = disc(0.85); push(x, y, r, K.Sequin, nx, ny, 0, acc); };
  /** Seed beads every `step` along a quadratic curve. */
  const beadCurve = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, step: number, r?: number) => {
    const len = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
    const n = Math.max(2, Math.ceil(len / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n, mt = 1 - t;
      bead(mt * mt * x0 + 2 * mt * t * cx + t * t * x1, mt * mt * y0 + 2 * mt * t * cy + t * t * y1, r);
    }
  };
  const jitterGrid = (cell: number, fn: (cx: number, cy: number) => void) => {
    for (let j = -1; j * cell * 0.86 < H + cell; j++) {
      for (let i = -1; i * cell < W + cell; i++) {
        const cx = i * cell + (j % 2 ? cell / 2 : 0) + (rand() - 0.5) * cell * 0.3;
        const cy = j * cell * 0.86 + (rand() - 0.5) * cell * 0.3;
        if (rand() < mask(cy)) fn(cx, cy);
      }
    }
  };

  switch (look.pattern) {
    case "sequins": {
      // Fish-scale rows; the normals follow a slow wave, so light rolls across in bands.
      const sp = u * 1.7, r = sp * 0.62;
      for (let j = -1; j * sp * 0.72 < H + sp; j++) {
        const y = j * sp * 0.72;
        if (rand() > mask(y) * 1.4) continue;
        for (let i = -1; i * sp < W + sp; i++) {
          const x = i * sp + (j % 2 ? sp / 2 : 0);
          const fx = x / W, fy = y / H;
          const nx = (rand() - 0.5) * 1.1 + 0.42 * Math.sin(fx * 6.5 + fy * 3.1);
          const ny = (rand() - 0.5) * 1.1 + 0.42 * Math.cos(fx * 3.7 - fy * 5.3);
          push(x, y, r * (0.95 + rand() * 0.1), K.Sequin, nx, ny, 0, !!look.accent && rand() < 0.14);
        }
      }
      break;
    }
    case "beaded": {
      const cell = u * 30;
      jitterGrid(cell, (cx, cy) => {
        const R = cell * 0.3 * (0.85 + rand() * 0.35);
        const P = rand() < 0.5 ? 5 : 6;
        const rot = rand() * Math.PI;
        for (let p = 0; p < P; p++) {
          const th = rot + (p * Math.PI * 2) / P;
          const dx = Math.cos(th), dy = Math.sin(th), px = -dy, py = dx;
          const w = R * 0.4;
          const n = Math.ceil((R * 2.3) / (u * 1.5));
          for (const side of [-1, 1]) {
            for (let i = 1; i <= n; i++) {
              const t = i / n;
              bead(cx + dx * t * R + px * side * Math.sin(Math.PI * t) * w, cy + dy * t * R + py * side * Math.sin(Math.PI * t) * w);
            }
          }
          for (const off of [-0.16, 0.16]) {
            const a = th + off, d = R * 0.52;
            const [nx, ny] = disc(0.8);
            push(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * 0.22, K.Bugle, nx, ny, a);
          }
        }
        pearl(cx, cy, u * 1.35, true);
        for (let i = 0; i < 8; i++) bead(cx + Math.cos(i * 0.785) * u * 2.5, cy + Math.sin(i * 0.785) * u * 2.5, u * 0.5);
        // Vine to the right with two sequin leaves.
        const x1 = cx + cell * (0.85 + rand() * 0.2), y1 = cy + (rand() - 0.5) * cell * 0.6;
        const qx = (cx + x1) / 2 + (rand() - 0.5) * cell * 0.3, qy = (cy + y1) / 2 + cell * 0.35 * (rand() < 0.5 ? -1 : 1);
        beadCurve(cx + R, cy, qx, qy, x1 - R, y1, u * 1.5, u * 0.45);
        for (const t of [0.35, 0.65]) {
          const mt = 1 - t;
          const lx = mt * mt * (cx + R) + 2 * mt * t * qx + t * t * (x1 - R);
          const ly = mt * mt * cy + 2 * mt * t * qy + t * t * y1;
          sequin(lx, ly - u * 1.1, u * 1.05); sequin(lx + u * 1.2, ly - u * 1.8, u * 0.95);
        }
      });
      const scatter = (W * H) / (u * u * 80);
      for (let i = 0; i < scatter; i++) {
        const x = rand() * W, y = rand() * H;
        if (rand() < mask(y)) rand() < 0.5 ? sequin(x, y, u * 0.95) : bead(x, y);
      }
      break;
    }
    case "pearls": {
      const cell = u * 3.6;
      for (let y = -cell; y < H + cell; y += cell) {
        for (let x = -cell; x < W + cell; x += cell) {
          const px = x + rand() * cell, py = y + rand() * cell;
          const cluster = 0.55 + 0.45 * Math.sin(px / (u * 23)) * Math.cos(py / (u * 19));
          if (rand() < 0.5 * cluster * mask(py) + 0.04) pearl(px, py, u * (0.55 + rand() * rand() * 1.25), rand() < 0.2);
          else if (rand() < 0.3 * mask(py)) bead(px, py, u * 0.4);
        }
      }
      break;
    }
    case "lace": {
      // Corded motifs: a ring, petal loops around it, bars ("brides") joining neighbours.
      const cell = u * 24;
      const ellipse = (cx: number, cy: number, a: number, b: number, rot: number, steps = 22) => {
        const pts = [];
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * Math.PI * 2;
          const ex = Math.cos(t) * a, ey = Math.sin(t) * b;
          pts.push({ x: cx + ex * Math.cos(rot) - ey * Math.sin(rot), y: cy + ex * Math.sin(rot) + ey * Math.cos(rot) });
        }
        return pts;
      };
      const centers: [number, number][] = [];
      jitterGrid(cell, (cx, cy) => {
        centers.push([cx, cy]);
        cords.push(ellipse(cx, cy, u * 2.4, u * 2.4, 0, 18));
        const P = 6 + Math.floor(rand() * 3), rot = rand() * Math.PI;
        for (let p = 0; p < P; p++) {
          const th = rot + (p * Math.PI * 2) / P;
          cords.push(ellipse(cx + Math.cos(th) * u * 5.6, cy + Math.sin(th) * u * 5.6, u * 3.1, u * 1.7, th));
          if (rand() < 0.6) bead(cx + Math.cos(th + Math.PI / P) * u * 9.2, cy + Math.sin(th + Math.PI / P) * u * 9.2, u * 0.6, true);
        }
        pearl(cx, cy, u * 1.2, true);
      });
      for (const [cx, cy] of centers) {
        for (const [ox, oy] of centers) {
          const d = Math.hypot(ox - cx, oy - cy);
          if (ox > cx && d < cell * 1.25) {
            const mx = (cx + ox) / 2 + (rand() - 0.5) * u * 4, my = (cy + oy) / 2 + (rand() - 0.5) * u * 4;
            const a = Math.atan2(oy - cy, ox - cx), s = u * 9;
            cords.push([{ x: cx + Math.cos(a) * s, y: cy + Math.sin(a) * s }, { x: mx, y: my }, { x: ox - Math.cos(a) * s, y: oy - Math.sin(a) * s }]);
          }
        }
      }
      for (const path of cords) {
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1], b = path[i];
          const len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.round(len / (u * 1.4)));
          for (let s = 0; s < n; s++) {
            const t = s / n;
            const [nx, ny] = disc(0.7);
            push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, u * 0.9, K.Cord, nx, ny);
          }
        }
      }
      break;
    }
    case "embroidery": {
      // Leaf sprays in satin stitch: the stitches on each half of a leaf face different ways,
      // so the leaf halves light up one after the other as the light moves.
      const cell = u * 34;
      jitterGrid(cell, (cx, cy) => {
        const ang = -Math.PI / 2 + (rand() - 0.5) * 1.4;
        const len = cell * 0.75;
        const ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len;
        const bend = (rand() - 0.5) * cell * 0.5;
        const qx = (cx + ex) / 2 - Math.sin(ang) * bend, qy = (cy + ey) / 2 + Math.cos(ang) * bend;
        const at = (t: number) => {
          const mt = 1 - t;
          return [mt * mt * cx + 2 * mt * t * qx + t * t * ex, mt * mt * cy + 2 * mt * t * qy + t * t * ey] as const;
        };
        const stemN = Math.ceil(len / (u * 0.9));
        for (let i = 0; i < stemN; i++) {
          const [x0, y0] = at(i / stemN), [x1, y1] = at((i + 1) / stemN);
          const a = Math.atan2(y1 - y0, x1 - x0);
          push((x0 + x1) / 2, (y0 + y1) / 2, u * 0.6, K.Thread, Math.cos(a + 1.57) * 0.5, Math.sin(a + 1.57) * 0.5, a);
        }
        const leaves = 6 + Math.floor(rand() * 3);
        for (let l = 0; l < leaves; l++) {
          const t = 0.18 + (l / leaves) * 0.72;
          const [sx, sy] = at(t), [tx, ty] = at(Math.min(1, t + 0.02));
          const stemA = Math.atan2(ty - sy, tx - sx);
          const side = l % 2 ? 1 : -1;
          const la = stemA + side * 0.75;
          const L = u * (5.5 + rand() * 3), Wd = u * 1.9;
          const n = Math.ceil(L / (u * 0.5));
          for (let i = 1; i < n; i++) {
            const tt = i / n, half = Math.sin(Math.PI * tt) * Wd;
            const mx = sx + Math.cos(la) * tt * L, my = sy + Math.sin(la) * tt * L;
            for (const h of [-1, 1]) {
              const sa = la + h * 0.9;
              const ox = mx + Math.cos(la + h * 1.5708) * half * 0.5, oy = my + Math.sin(la + h * 1.5708) * half * 0.5;
              const [jx, jy] = disc(0.15);
              push(ox, oy, half * 0.55 + u * 0.15, K.Thread, Math.cos(sa + 1.57) * 0.6 + jx, Math.sin(sa + 1.57) * 0.6 + jy, sa);
            }
          }
        }
        for (let i = 0; i < 5; i++) sequin(ex + Math.cos(i * 1.2566) * u * 1.7, ey + Math.sin(i * 1.2566) * u * 1.7, u * 1.15, true);
        bead(ex, ey, u * 0.7);
      });
      break;
    }
  }
  if (edge) {
    // Picot of beads following the scallop line.
    for (let x = 0; x < W; x += u * 1.4) bead(x, scallopY(x, edge.y, edge.sr) - u * 1.1, u * 0.5);
  }
  return { els, cords };
}

export class FabricRenderer {
  readonly w: number;
  readonly h: number;
  private base: HTMLCanvasElement;
  private els: El[];
  private glint: HTMLCanvasElement;
  private star: HTMLCanvasElement;
  private glintRGB: RGB;
  private clip: Path2D | null = null;

  constructor(look: FabricLook, w: number, h: number, dpr: number, opts: RenderOptions = {}) {
    this.w = w;
    this.h = h;
    const u = 7 * dpr * (opts.scale ?? 1);
    const showEdge = !!opts.showEdge && look.edge === "scalloped";
    const edge = showEdge ? { y: h - u * 8, sr: u * 5 } : null;
    const { els, cords } = generate(look, w, h, u, edge);
    this.els = els;
    this.glintRGB = hex(look.glint);
    this.glint = glintSprite(this.glintRGB);
    this.star = starSprite(this.glintRGB);

    const base = canvas(w, h);
    const g = base.getContext("2d")!;
    if (edge) {
      g.fillStyle = opts.backdrop ?? "#0b0a09";
      g.fillRect(0, 0, w, h);
      const p = new Path2D();
      p.moveTo(0, 0); p.lineTo(w, 0); p.lineTo(w, edge.y);
      for (let x = w; x >= -2; x -= 2) p.lineTo(x, scallopY(x, edge.y, edge.sr));
      p.closePath();
      this.clip = p;
      g.save();
      g.clip(p);
    }
    paintGround(g, look, w, h, u);

    const ink = hex(look.ink), acc = hex(look.accent ?? look.ink);
    // Pale sequins (ivory, silver) read grey if shaded as hard as dark ones.
    const shadeMax = (0.299 * ink[0] + 0.587 * ink[1] + 0.114 * ink[2]) / 255 > 0.6 ? 0.22 : 0.7;
    const sprites = {
      [K.Sequin]: [discSprite(ink, "sequin"), discSprite(acc, "sequin")],
      [K.Bead]: [discSprite(ink, "bead"), discSprite(acc, "bead")],
      [K.Pearl]: [discSprite(ink, "pearl"), discSprite(acc, "pearl")],
    };

    // Lace cords: shadow, body, then a thin raised highlight for the corded relief.
    if (cords.length) {
      g.lineCap = "round"; g.lineJoin = "round";
      const stroke = (col: string, wd: number, dx: number, dy: number) => {
        g.strokeStyle = col; g.lineWidth = wd;
        for (const path of cords) {
          g.beginPath();
          path.forEach((pt, i) => (i ? g.lineTo(pt.x + dx, pt.y + dy) : g.moveTo(pt.x + dx, pt.y + dy)));
          g.stroke();
        }
      };
      stroke("rgba(0,0,0,0.45)", u * 1.9, u * 0.25, u * 0.45);
      stroke(rgba(darken(ink, 0.25)), u * 1.7, 0, 0);
      stroke(rgba(ink), u * 1.15, -u * 0.12, -u * 0.12);
      stroke(rgba(lighten(ink, 0.35), 0.55), u * 0.35, -u * 0.3, -u * 0.32);
    }

    for (const e of els) {
      const set = e.k === K.Sequin || e.k === K.Bead || e.k === K.Pearl ? sprites[e.k] : null;
      if (set) {
        const s = set[e.acc ? 1 : 0];
        if (e.k !== K.Sequin) {
          g.fillStyle = "rgba(0,0,0,0.35)";
          g.beginPath(); g.arc(e.x + e.r * 0.2, e.y + e.r * 0.3, e.r * 0.95, 0, Math.PI * 2); g.fill();
        }
        g.drawImage(s, e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
        if (e.k === K.Sequin) {
          // Diffuse tone follows the sequin's tilt, so the resting fabric shows soft bands.
          const dark = Math.min(shadeMax, Math.max(0.03, (0.38 + (e.nx * 0.6 + e.ny * 0.8) * 0.35) * (shadeMax / 0.7)));
          g.fillStyle = `rgba(0,0,0,${dark})`;
          g.beginPath(); g.arc(e.x, e.y, e.r * 0.97, 0, Math.PI * 2); g.fill();
        }
      } else if (e.k === K.Bugle || e.k === K.Thread) {
        const c = Math.cos(e.a) * e.r, s = Math.sin(e.a) * e.r;
        g.lineCap = "round";
        g.strokeStyle = rgba(darken(ink, e.k === K.Bugle ? 0.35 : 0.15));
        g.lineWidth = e.k === K.Bugle ? u * 0.75 : u * 0.42;
        g.beginPath(); g.moveTo(e.x - c, e.y - s); g.lineTo(e.x + c, e.y + s); g.stroke();
      }
    }
    if (edge) g.restore();
    paintVignette(g, w, h);
    this.base = base;
  }

  /** Draw the fabric lit from (lx, ly), given as fractions of the canvas (may run outside 0..1). */
  draw(ctx: CanvasRenderingContext2D, lx: number, ly: number, alpha = 1, intensity = 1) {
    const { w: W, h: H } = this;
    const Lx = lx * W, Ly = ly * H, R = Math.hypot(W, H) * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.base, 0, 0);
    if (this.clip) ctx.clip(this.clip);

    // Broad pool of light on the ground.
    ctx.globalCompositeOperation = "screen";
    const pool = ctx.createRadialGradient(Lx, Ly, 0, Lx, Ly, R * 0.85);
    pool.addColorStop(0, rgba(this.glintRGB, 0.12 * intensity));
    pool.addColorStop(0.5, rgba(this.glintRGB, 0.035 * intensity));
    pool.addColorStop(1, rgba(this.glintRGB, 0));
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    const glint = this.glint, star = this.star;
    for (let i = 0; i < this.els.length; i++) {
      const e = this.els[i];
      const dx = (Lx - e.x) / R, dy = (Ly - e.y) / R;
      const ex = dx - e.nx, ey = dy - e.ny;
      const sp = SPEC[e.k];
      const near = 0.35 + 0.65 * Math.exp(-(dx * dx + dy * dy) / 0.4);
      const b = sp.amp * Math.exp(-(ex * ex + ey * ey) / sp.s2) * near * intensity;
      if (b < 0.025) continue;
      ctx.globalAlpha = Math.min(1, b) * alpha;
      if (e.k === K.Bugle || e.k === K.Thread) {
        const c = Math.cos(e.a), s = Math.sin(e.a);
        ctx.setTransform(c, s, -s, c, e.x, e.y);
        const len = e.r * 2.4, th = e.k === K.Bugle ? e.r * 0.9 : e.r * 0.7;
        ctx.drawImage(glint, -len / 2, -th / 2, len, th);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (b > 0.75 && e.k === K.Bugle) ctx.drawImage(star, e.x - e.r * 2.5, e.y - e.r * 2.5, e.r * 5, e.r * 5);
        continue;
      }
      let gx = e.x, gy = e.y;
      if (sp.off) {
        const d = Math.hypot(dx, dy) || 1;
        gx += (dx / d) * e.r * sp.off;
        gy += (dy / d) * e.r * sp.off;
      }
      const size = e.r * 2 * sp.size * (0.7 + Math.min(1, b) * 0.6);
      ctx.drawImage(glint, gx - size / 2, gy - size / 2, size, size);
      if (e.k === K.Sequin && b > 0.5) {
        const ss = e.r * 6 * (b - 0.3);
        ctx.globalAlpha = Math.min(1, (b - 0.5) * 2) * alpha;
        ctx.drawImage(star, e.x - ss / 2, e.y - ss / 2, ss, ss);
      }
    }
    ctx.restore();
  }
}

function paintGround(g: CanvasRenderingContext2D, look: FabricLook, W: number, H: number, u: number) {
  const base = hex(look.base);
  g.fillStyle = rgba(base);
  g.fillRect(0, 0, W, H);
  const light = rgba(lighten(base, 0.3), 1);
  const rand = rng(look.seed ^ 0x9e37);
  g.save();
  switch (look.ground) {
    case "tulle": {
      // Hexagonal net, drawn as three families of fine lines.
      g.globalAlpha = 0.07;
      g.strokeStyle = light;
      g.lineWidth = Math.max(1, u * 0.12);
      const c = u * 1.15;
      for (const ang of [0, Math.PI / 3, -Math.PI / 3]) {
        g.save();
        g.translate(W / 2, H / 2); g.rotate(ang);
        const ext = Math.hypot(W, H);
        g.beginPath();
        for (let y = -ext; y < ext; y += c) { g.moveTo(-ext, y); g.lineTo(ext, y); }
        g.stroke();
        g.restore();
      }
      break;
    }
    case "chiffon": {
      g.globalAlpha = 0.05;
      g.strokeStyle = light;
      g.lineWidth = Math.max(1, u * 0.1);
      g.beginPath();
      for (let i = 0; i < W / (u * 0.6); i++) {
        const x = rand() * W;
        g.moveTo(x, 0);
        g.bezierCurveTo(x + (rand() - 0.5) * u * 6, H * 0.33, x + (rand() - 0.5) * u * 6, H * 0.66, x + (rand() - 0.5) * u * 4, H);
      }
      g.stroke();
      break;
    }
    case "organza": {
      g.globalAlpha = 0.06;
      g.strokeStyle = light;
      g.lineWidth = Math.max(1, u * 0.08);
      const c = u * 0.7;
      g.beginPath();
      for (let x = 0; x < W; x += c) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = 0; y < H; y += c) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
      g.globalAlpha = 0.18;
      const lg = g.createLinearGradient(0, 0, W, H);
      lg.addColorStop(0, "rgba(180,200,255,0)");
      lg.addColorStop(0.5, "rgba(255,210,230,0.5)");
      lg.addColorStop(1, "rgba(180,255,220,0)");
      g.fillStyle = lg;
      g.globalCompositeOperation = "soft-light";
      g.fillRect(0, 0, W, H);
      break;
    }
    case "satin": {
      for (let i = 0; i < 5; i++) {
        const x = rand() * W;
        const lg = g.createLinearGradient(x - W * 0.25, 0, x + W * 0.25, H);
        lg.addColorStop(0, rgba(base, 0));
        lg.addColorStop(0.5, rgba(lighten(base, 0.22), 0.5));
        lg.addColorStop(1, rgba(base, 0));
        g.fillStyle = lg;
        g.fillRect(0, 0, W, H);
      }
      break;
    }
  }
  g.restore();
}

function paintVignette(g: CanvasRenderingContext2D, W: number, H: number) {
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.42)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
}
