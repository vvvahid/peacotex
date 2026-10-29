"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { EMPTY, type FilterKey, type Filters } from "@/lib/filters";
import { BASES, EDGES, LAYOUTS, OCCASIONS, PRODUCTS, TECHNIQUES, type Product } from "@/lib/catalog";
import { useI18n } from "@/i18n/client";
import type { Dict } from "@/i18n/dict/en";

type Sort = "featured" | "price-asc" | "price-desc";

const COLOURS = Array.from(new Map(PRODUCTS.map((p) => [p.colour.family, p.colour.hex])).entries())
  .map(([family, hex]) => ({ id: family, hex }));

const groups = (t: Dict): { key: FilterKey; options: { id: string; label: string; hex?: string }[] }[] => {
  const tr = t.terms;
  return [
    { key: "occasion", options: OCCASIONS.map((o) => ({ id: o.id, label: tr.occasions[o.id].label })) },
    { key: "technique", options: TECHNIQUES.map((o) => ({ id: o.id, label: tr.techniques[o.id] })) },
    { key: "base", options: BASES.map((o) => ({ id: o.id, label: tr.bases[o.id] })) },
    { key: "edge", options: EDGES.map((o) => ({ id: o.id, label: tr.edges[o.id] })) },
    { key: "layout", options: LAYOUTS.map((o) => ({ id: o.id, label: tr.layouts[o.id] })) },
    { key: "colour", options: COLOURS.map((o) => ({ ...o, label: tr.colours[o.id as keyof typeof tr.colours] ?? o.id })) },
  ];
};

const matches = (p: Product, f: Filters) =>
  (!f.occasion.length || f.occasion.some((o) => p.occasions.includes(o as never))) &&
  (!f.technique.length || f.technique.some((t) => p.techniques.includes(t as never))) &&
  (!f.base.length || f.base.includes(p.base)) &&
  (!f.edge.length || f.edge.includes(p.edge)) &&
  (!f.layout.length || f.layout.includes(p.layout)) &&
  (!f.colour.length || f.colour.includes(p.colour.family));


export function ShopBrowser({ initial }: { initial: Filters }) {
  const [filters, setFilters] = useState<Filters>(initial);
  const [sort, setSort] = useState<Sort>("featured");
  const [panel, setPanel] = useState(false);
  const { t, href, plural } = useI18n();
  const s = t.shop;

  // Keep the URL shareable without a navigation.
  useEffect(() => {
    const q = new URLSearchParams();
    (Object.keys(filters) as FilterKey[]).forEach((k) => filters[k].length && q.set(k, filters[k].join(",")));
    const qs = q.toString();
    window.history.replaceState(null, "", href(qs ? `/shop?${qs}` : "/shop"));
  }, [filters, href]);

  const list = useMemo(() => {
    const l = PRODUCTS.filter((p) => matches(p, filters));
    if (sort === "price-asc") l.sort((a, b) => a.pricePerMetre - b.pricePerMetre);
    if (sort === "price-desc") l.sort((a, b) => b.pricePerMetre - a.pricePerMetre);
    if (sort === "featured") l.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return l;
  }, [filters, sort]);

  const active = (Object.values(filters) as string[][]).reduce((a, v) => a + v.length, 0);
  const toggle = (k: FilterKey, id: string) =>
    setFilters((f) => ({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] }));

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
      <div>
        <button
          type="button" className="btn btn-line w-full lg:hidden" aria-expanded={panel} aria-controls="filters"
          onClick={() => setPanel((o) => !o)}
        >
          {panel ? s.hideFilters : s.filters}{active ? ` (${active})` : ""}
        </button>
        <form id="filters" aria-label={s.filterForm} onSubmit={(e) => e.preventDefault()} className={`${panel ? "block" : "hidden"} mt-6 space-y-8 lg:sticky lg:top-32 lg:mt-0 lg:block`}>
          {groups(t).map((g) => (
            <fieldset key={g.key}>
              <legend className="eyebrow mb-3">{s.groups[g.key]}</legend>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const on = filters[g.key].includes(o.id);
                  return (
                    <label key={o.id} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${on ? "border-gold bg-gold/15 text-gold" : "border-line text-ivory/80 hover:border-ivory/40"}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(g.key, o.id)} />
                      {o.hex && <span aria-hidden className="h-3.5 w-3.5 rounded-full border border-ivory/30" style={{ background: o.hex }} />}
                      {o.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {active > 0 && (
            <button type="button" onClick={() => setFilters(EMPTY)} className="text-sm text-gold underline underline-offset-4">{s.clearAll}</button>
          )}
        </form>
      </div>

      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <p aria-live="polite" className="text-sm text-mist">{plural(s.count, list.length)}</p>
          <label className="flex items-center gap-3 text-sm text-mist">
            {s.sort}
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-full border border-line bg-ink px-4 text-ivory">
              <option value="featured">{s.sortFeatured}</option>
              <option value="price-asc">{s.sortAsc}</option>
              <option value="price-desc">{s.sortDesc}</option>
            </select>
          </label>
        </div>
        {list.length ? (
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => <ProductCard key={p.slug} p={p} headingLevel={2} />)}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <p className="font-serif text-3xl">{s.emptyTitle}</p>
            <p className="mt-3 text-mist">{s.emptyText}</p>
            <button type="button" onClick={() => setFilters(EMPTY)} className="btn btn-line mt-6">{s.clear}</button>
          </div>
        )}
      </div>
    </div>
  );
}
