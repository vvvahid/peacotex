"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COMPLEMENTS, getProduct, SWATCH_PRICE } from "@/lib/catalog";

/** Front-end demo cart: lives in this browser only, no payments. */
export type LineKind = "fabric" | "swatch" | "complement";
export interface CartLine { kind: LineKind; slug: string; qty: number }

interface Cart {
  lines: CartLine[];
  count: number;
  total: number;
  add: (line: CartLine) => void;
  setQty: (kind: LineKind, slug: string, qty: number) => void;
  remove: (kind: LineKind, slug: string) => void;
  clear: () => void;
  announcement: string;
}

const KEY = "ptx_cart_v1";
const Ctx = createContext<Cart | null>(null);

export function linePrice(l: CartLine) {
  if (l.kind === "swatch") return SWATCH_PRICE * l.qty;
  if (l.kind === "fabric") return (getProduct(l.slug)?.pricePerMetre ?? 0) * l.qty;
  return (COMPLEMENTS.find((c) => c.slug === l.slug)?.price ?? 0) * l.qty;
}

export function lineName(l: CartLine) {
  if (l.kind === "complement") return COMPLEMENTS.find((c) => c.slug === l.slug)?.name ?? l.slug;
  const p = getProduct(l.slug);
  return l.kind === "swatch" ? `${p?.name ?? l.slug} — swatch` : p?.name ?? l.slug;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, loaded]);

  const add = useCallback((line: CartLine) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.kind === line.kind && l.slug === line.slug);
      if (i < 0) return [...ls, line];
      const next = [...ls];
      next[i] = { ...next[i], qty: line.kind === "fabric" ? line.qty : next[i].qty + line.qty };
      return next;
    });
    setAnnouncement(`${lineName(line)} added to your bag.`);
  }, []);
  const setQty = useCallback((kind: LineKind, slug: string, qty: number) => {
    setLines((ls) => ls.map((l) => (l.kind === kind && l.slug === slug ? { ...l, qty } : l)));
  }, []);
  const remove = useCallback((kind: LineKind, slug: string) => {
    setLines((ls) => ls.filter((l) => !(l.kind === kind && l.slug === slug)));
    setAnnouncement("Item removed from your bag.");
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Cart>(() => ({
    lines,
    count: lines.length,
    total: lines.reduce((a, l) => a + linePrice(l), 0),
    add, setQty, remove, clear, announcement,
  }), [lines, add, setQty, remove, clear, announcement]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="sr-only">{announcement}</div>
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
