"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COMPLEMENTS, SWATCH_PRICE, type Product } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalog-client";
import { useI18n } from "@/i18n/client";
import type { I18n } from "@/i18n/tools";

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
  /** True once the saved bag has been read from this browser. */
  ready: boolean;
}

const KEY = "ptx_cart_v1";
const Ctx = createContext<Cart | null>(null);

type Lookup = (slug: string) => Product | undefined;

export function linePrice(l: CartLine, getProduct: Lookup) {
  if (l.kind === "swatch") return SWATCH_PRICE * l.qty;
  if (l.kind === "fabric") return (getProduct(l.slug)?.pricePerMetre ?? 0) * l.qty;
  return (COMPLEMENTS.find((c) => c.slug === l.slug)?.price ?? 0) * l.qty;
}

export function lineName(l: CartLine, getProduct: Lookup, { t, complement }: I18n) {
  if (l.kind === "complement") {
    const c = COMPLEMENTS.find((x) => x.slug === l.slug);
    return c ? complement(c).name : l.slug;
  }
  const p = getProduct(l.slug);
  return l.kind === "swatch" ? `${p?.name ?? l.slug} — ${t.cart.swatch}` : p?.name ?? l.slug;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const i18n = useI18n();
  const { get } = useCatalog();

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
    setAnnouncement(i18n.fill(i18n.t.cart.added, { name: lineName(line, get, i18n) }));
  }, [i18n, get]);
  const setQty = useCallback((kind: LineKind, slug: string, qty: number) => {
    setLines((ls) => ls.map((l) => (l.kind === kind && l.slug === slug ? { ...l, qty } : l)));
  }, []);
  const remove = useCallback((kind: LineKind, slug: string) => {
    setLines((ls) => ls.filter((l) => !(l.kind === kind && l.slug === slug)));
    setAnnouncement(i18n.t.cart.removed);
  }, [i18n]);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Cart>(() => ({
    lines,
    count: lines.length,
    total: lines.reduce((a, l) => a + linePrice(l, get), 0),
    add, setQty, remove, clear, announcement, ready: loaded,
  }), [lines, add, setQty, remove, clear, announcement, loaded, get]);

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
