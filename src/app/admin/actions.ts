"use server";

import { redirect } from "next/navigation";
import { FabricError } from "@/server/catalog";
import { AdminError, changeOrder, getFabric, saveFabric, setFabricFlag, storeImage } from "@/server/admin";
import { login, logout, requireAdmin } from "@/server/admin-auth";
import { LOCALES } from "@/i18n/config";

export type FormState = { error?: string } | undefined;

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const res = await login(String(form.get("password") ?? ""));
  if (!res.ok) return { error: res.error };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

const back = (path: string, params: Record<string, string>) => redirect(`${path}?${new URLSearchParams(params)}`);

export async function orderAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const action = String(form.get("action") ?? "") as Parameters<typeof changeOrder>[1];
  if (!["cut", "ship", "resolve", "cancel", "note"].includes(action)) back(`/admin/orders/${id}`, { error: "Unknown action." });
  try {
    await changeOrder(id, action, {
      trackingNumber: String(form.get("trackingNumber") ?? ""),
      trackingUrl: String(form.get("trackingUrl") ?? ""),
      restock: form.get("restock") === "on",
      note: String(form.get("note") ?? ""),
    });
  } catch (err) {
    if (err instanceof AdminError) back(`/admin/orders/${id}`, { error: err.message });
    throw err;
  }
  back(`/admin/orders/${id}`, { done: action });
}

export async function fabricFlagAction(form: FormData) {
  await requireAdmin();
  const flag = form.get("flag") === "featured" ? "featured" : "active";
  await setFabricFlag(String(form.get("slug") ?? ""), flag, form.get("value") === "1");
  redirect("/admin/products");
}

/** Turns the product form into a fabric record (see parseFabric for the checks). */
export async function saveFabricAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const isNew = form.get("isNew") === "1";
  const str = (k: string) => String(form.get(k) ?? "");
  const input: Record<string, unknown> = {
    slug: str("slug"), name: str("name"), active: form.get("active") === "on", featured: form.get("featured") === "on",
    sort: str("sort"), techniques: form.getAll("techniques"), occasions: form.getAll("occasions"),
    base: str("base"), edge: str("edge"), layout: str("layout"), colourFamily: str("colourFamily"), colourHex: str("colourHex"),
    widthCm: str("widthCm"), weightGsm: str("weightGsm"), repeatCm: str("repeatCm"), stretch: str("stretch"),
    detachableMotifs: form.get("detachableMotifs") === "on", pricePerMetre: str("pricePerMetre"), minMetres: str("minMetres"),
    look: {
      pattern: str("look.pattern"), ground: str("base"), base: str("look.base"), ink: str("look.ink"),
      accent: str("look.accent"), glint: str("look.glint"), seed: str("look.seed"),
    },
    text: Object.fromEntries(LOCALES.map((l) => [l, { tagline: str(`text.${l}.tagline`), description: str(`text.${l}.description`), colour: str(`text.${l}.colour`) }])),
  };

  let slug = str("slug");
  try {
    // Photo: keep what is there, upload a new one, use a stock photo, or none (illustration).
    const mode = str("photoMode");
    const existing = isNew ? null : (await getFabric(slug))?.record;
    if (mode === "upload") {
      const file = form.get("photo");
      if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo to upload." };
      input.image = { id: await storeImage(file), alt: str("photoAlt") };
    } else if (mode === "keep" && existing?.image) {
      input.image = { ...existing.image, alt: str("photoAlt") };
    } else if (mode === "stock" || (mode === "keep" && existing?.stockPhoto)) {
      input.stockPhoto = str("stockPhoto") || existing?.stockPhoto;
    }
    const record = await saveFabric(input, { isNew, stock: Number(str("stock").replace(",", ".")) });
    slug = record.slug;
  } catch (err) {
    if (err instanceof FabricError || err instanceof AdminError) return { error: err.message };
    throw err;
  }
  redirect(`/admin/products/${slug}?saved=1`);
}
