"use client";

import { useActionState, useState, startTransition } from "react";
import { FabricCanvas } from "@/components/fabric/FabricCanvas";
import { BASES, COLOUR_FAMILIES, EDGES, LAYOUTS, OCCASIONS, TECHNIQUES } from "@/lib/catalog";
import type { FabricLook, Pattern } from "@/lib/fabric/render";
import { PHOTOS, ownPhoto, photoUrl, type PhotoKey } from "@/lib/photos";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import type { FabricRecord } from "@/server/catalog";
import { saveFabricAction } from "../actions";
import { Notice, field } from "../ui";

const PATTERNS: Pattern[] = ["sequins", "beaded", "pearls", "lace", "embroidery"];
const MAX_EDGE = 2400;

/** Shrinks a photo in the browser (longest side 2400 px, WebP) so uploads stay small and fast. */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
}

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <fieldset className="card min-w-0 p-6">
      <legend className="sr-only">{title}</legend>
      <h2 aria-hidden className="text-2xl">{title}</h2>
      {note && <p className="mt-1 text-xs text-mist">{note}</p>}
      <div className="mt-5">{children}</div>
    </fieldset>
  );
}

const lbl = "block text-sm text-mist";
const check = "flex items-center gap-2 text-sm";
const box = "h-4 w-4 accent-[#e6d2a2]";

export function ProductForm({ record: r, stock, isNew, saved }: { record: FabricRecord; stock: number; isNew: boolean; saved: boolean }) {
  const [state, action, pending] = useActionState(saveFabricAction, undefined);
  const [slug, setSlug] = useState(r.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [look, setLook] = useState<FabricLook>(r.look);
  const [layout, setLayout] = useState(r.layout);
  const [edge, setEdge] = useState(r.edge);
  const hasPhoto = !!r.image || !!r.stockPhoto;
  const [mode, setMode] = useState<"keep" | "upload" | "stock" | "none">(hasPhoto ? "keep" : "none");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [stockKey, setStockKey] = useState<PhotoKey>(r.stockPhoto ?? "sequinDrape");

  const current = r.image ? ownPhoto(r.image.id, r.image.alt) : r.stockPhoto ? PHOTOS[r.stockPhoto] : undefined;
  const shown = mode === "upload" ? preview : mode === "stock" ? photoUrl(PHOTOS[stockKey], 600) : mode === "keep" && current ? photoUrl(current, 600) : null;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy("Preparing photo…");
    try {
      const small = await shrink(f);
      setFile(small);
      setPreview(URL.createObjectURL(small));
      setMode("upload");
    } finally {
      setBusy("");
    }
  };

  // Submit through a transition: React would otherwise reset every field when the server sends back an error.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.delete("photoPicker");
    if (mode === "upload" && file) data.set("photo", file);
    startTransition(() => action(data));
  };

  const setLookField = (k: keyof FabricLook, v: string | number) => setLook((l) => ({ ...l, [k]: v }));

  return (
    <form onSubmit={submit} className="mt-8 space-y-6" noValidate>
      <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />
      {saved && !state?.error && <Notice>Saved. The shop shows the change now.</Notice>}
      {state?.error && <Notice tone="error">{state.error}</Notice>}

      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={lbl}>Name
            <input name="name" required defaultValue={r.name} className={field} onChange={(e) => { if (!slugTouched) setSlug(slugify(e.target.value)); }} />
          </label>
          <label className={lbl}>Web address
            <input name="slug" required value={slug} readOnly={!isNew} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} className={`${field} ${isNew ? "" : "opacity-60"}`} aria-describedby="slug-hint" />
            <span id="slug-hint" className="mt-1 block text-xs">/shop/{slug || "…"}{!isNew && " · fixed after creation"}</span>
          </label>
          <label className={lbl}>Price per metre (€)
            <input name="pricePerMetre" inputMode="decimal" required defaultValue={r.pricePerMetre} className={field} />
          </label>
          <label className={lbl}>Minimum length (m)
            <input name="minMetres" type="number" min={0.5} step={0.5} required defaultValue={r.minMetres} className={field} />
          </label>
          <label className={lbl}>In stock (m)
            <input name="stock" inputMode="decimal" required defaultValue={stock} className={field} />
          </label>
          <label className={lbl}>Position in shop
            <input name="sort" type="number" min={0} defaultValue={r.sort} className={field} aria-describedby="sort-hint" />
            <span id="sort-hint" className="mt-1 block text-xs">Lower numbers come first.</span>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-6">
          <label className={check}><input type="checkbox" name="active" defaultChecked={r.active} className={box} /> Show in shop</label>
          <label className={check}><input type="checkbox" name="featured" defaultChecked={r.featured} className={box} /> Feature on the home page</label>
        </div>
      </Section>

      <Section title="Photo" note="Your own photo is shown without a stock label. Without a photo the shop draws an illustration.">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-night">
            {shown
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={shown} alt="" className="h-full w-full object-cover" />
              : <FabricCanvas look={{ ...look, layout, edge }} label="Illustration preview" showEdge rest={{ x: 0.3, y: 0.25 }} />}
          </div>
          <div className="space-y-3">
            {hasPhoto && <label className={check}><input type="radio" name="photoMode" value="keep" checked={mode === "keep"} onChange={() => setMode("keep")} className={box} /> Keep current {r.image ? "photo" : "stock photo"}</label>}
            <label className={check}><input type="radio" name="photoMode" value="upload" checked={mode === "upload"} onChange={() => setMode("upload")} className={box} /> Upload a photo of this fabric</label>
            {mode === "upload" && (
              <div className="pl-6">
                <input name="photoPicker" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-ink" />
                <p className="mt-1 text-xs text-mist">{busy || (file ? `Ready: ${Math.round(file.size / 1024)} KB` : "JPEG, PNG or WebP. Large photos are shrunk before upload.")}</p>
              </div>
            )}
            <label className={check}><input type="radio" name="photoMode" value="stock" checked={mode === "stock"} onChange={() => setMode("stock")} className={box} /> Stock photo (labelled “not this exact fabric”)</label>
            {mode === "stock" && (
              <select name="stockPhoto" value={stockKey} onChange={(e) => setStockKey(e.target.value as PhotoKey)} className={`${field} ml-6 w-auto`}>
                {(Object.keys(PHOTOS) as PhotoKey[]).map((k) => <option key={k} value={k}>{PHOTOS[k].alt}</option>)}
              </select>
            )}
            <label className={check}><input type="radio" name="photoMode" value="none" checked={mode === "none"} onChange={() => setMode("none")} className={box} /> No photo: show the illustration</label>
            {(mode === "upload" || (mode === "keep" && r.image)) && (
              <label className={`${lbl} pt-2`}>Photo description (for screen readers)
                <input name="photoAlt" defaultValue={r.image?.alt ?? ""} placeholder="e.g. Ivory beaded tulle with pearl flowers, close up" className={field} />
              </label>
            )}
          </div>
        </div>
      </Section>

      <Section title="Fabric">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className={lbl}>Techniques</p>
            <div className="mt-2 flex flex-wrap gap-4">{TECHNIQUES.map((t) => <label key={t.id} className={check}><input type="checkbox" name="techniques" value={t.id} defaultChecked={r.techniques.includes(t.id)} className={box} /> {t.label}</label>)}</div>
          </div>
          <div>
            <p className={lbl}>Occasions</p>
            <div className="mt-2 flex flex-wrap gap-4">{OCCASIONS.map((o) => <label key={o.id} className={check}><input type="checkbox" name="occasions" value={o.id} defaultChecked={r.occasions.includes(o.id)} className={box} /> {o.label}</label>)}</div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className={lbl}>Base fabric
            <select name="base" defaultValue={r.base} className={field} onChange={(e) => setLookField("ground", e.target.value)}>{BASES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
          </label>
          <label className={lbl}>Edge
            <select name="edge" value={edge} onChange={(e) => setEdge(e.target.value as typeof edge)} className={field}>{EDGES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
          </label>
          <label className={lbl}>Layout
            <select name="layout" value={layout} onChange={(e) => setLayout(e.target.value as typeof layout)} className={field}>{LAYOUTS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
          </label>
          <label className={lbl}>Stretch
            <select name="stretch" defaultValue={r.stretch} className={field}><option value="none">None</option><option value="slight">Slight (2-way)</option></select>
          </label>
          <label className={lbl}>Colour group (shop filter)
            <select name="colourFamily" defaultValue={r.colourFamily} className={field}>{COLOUR_FAMILIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </label>
          <label className={lbl}>Colour swatch
            <input name="colourHex" type="color" defaultValue={r.colourHex} className={`${field} h-11 p-1`} />
          </label>
          <label className={lbl}>Usable width (cm)<input name="widthCm" type="number" min={50} defaultValue={r.widthCm} className={field} /></label>
          <label className={lbl}>Weight (g/m²)<input name="weightGsm" type="number" min={10} defaultValue={r.weightGsm} className={field} /></label>
          <label className={lbl}>Pattern repeat (cm, 0 = none)<input name="repeatCm" type="number" min={0} defaultValue={r.repeatCm} className={field} /></label>
        </div>
        <label className={`${check} mt-5`}><input type="checkbox" name="detachableMotifs" defaultChecked={r.detachableMotifs} className={box} /> Motifs can be cut out for appliqué</label>
      </Section>

      <Section title="Texts" note="English is required. Other languages are optional: an empty field shows the English text.">
        <div className="space-y-3">
          {LOCALES.map((l) => {
            const tx = r.text[l];
            return (
              <details key={l} open={l === "en"} className="rounded-2xl border border-line p-4">
                <summary className="cursor-pointer text-sm"><span className="uppercase tracking-[0.2em] text-gold">{l}</span> · {LOCALE_NAMES[l]}{l !== "en" && !tx?.tagline && <span className="text-mist"> · not translated</span>}</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
                  <label className={lbl}>Tagline<input name={`text.${l}.tagline`} defaultValue={tx?.tagline ?? ""} required={l === "en"} className={field} /></label>
                  <label className={lbl}>Colour name<input name={`text.${l}.colour`} defaultValue={tx?.colour ?? ""} required={l === "en"} className={field} /></label>
                  <label className={`${lbl} md:col-span-2`}>Description<textarea name={`text.${l}.description`} rows={3} defaultValue={tx?.description ?? ""} required={l === "en"} className={field} /></label>
                </div>
              </details>
            );
          })}
        </div>
      </Section>

      <Section title="Illustration" note="Drawn when there is no photo, and used for the colour dot in the bag.">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-line">
            <FabricCanvas look={{ ...look, layout, edge }} label="Illustration preview" showEdge followPointer rest={{ x: 0.3, y: 0.25 }} />
          </div>
          <div className="grid content-start gap-4 sm:grid-cols-3">
            <label className={lbl}>Pattern
              <select name="look.pattern" value={look.pattern} onChange={(e) => setLookField("pattern", e.target.value)} className={field}>{PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            </label>
            {(["base", "ink", "accent", "glint"] as const).map((k) => (
              <label key={k} className={lbl}>{{ base: "Ground colour", ink: "Main colour", accent: "Second colour", glint: "Highlight" }[k]}
                <input name={`look.${k}`} type="color" value={look[k] ?? "#ffffff"} onChange={(e) => setLookField(k, e.target.value)} className={`${field} h-11 p-1`} />
              </label>
            ))}
            <label className={lbl}>Variation
              <input name="look.seed" type="number" min={1} max={9999} value={look.seed} onChange={(e) => setLookField("seed", Number(e.target.value) || 1)} className={field} />
            </label>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-4 border-t border-line bg-ink/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <button type="submit" disabled={pending || !!busy} className="btn btn-gold">{pending ? "Saving…" : isNew ? "Create fabric" : "Save changes"}</button>
        <p role="status" className="text-sm text-gold">{state?.error}</p>
      </div>
    </form>
  );
}
