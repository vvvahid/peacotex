import type { Metadata } from "next";
import Link from "next/link";
import { listFabrics } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";
import { PHOTOS, ownPhoto, photoUrl } from "@/lib/photos";
import { fabricFlagAction } from "../actions";
import { euro } from "../ui";

export const metadata: Metadata = { title: "Fabrics" };

function Toggle({ slug, flag, on, label }: { slug: string; flag: "active" | "featured"; on: boolean; label: string }) {
  return (
    <form action={fabricFlagAction}>
      <input type="hidden" name="slug" value={slug} /><input type="hidden" name="flag" value={flag} /><input type="hidden" name="value" value={on ? "0" : "1"} />
      <button type="submit" aria-pressed={on} aria-label={`${label}: ${on ? "on" : "off"}`} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-gold bg-gold/15 text-gold" : "border-line text-mist hover:border-ivory/40"}`}>
        {on ? "Yes" : "No"}
      </button>
    </form>
  );
}

export default async function ProductsPage() {
  await requireAdmin();
  const fabrics = await listFabrics();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-light">Fabrics</h1>
        <Link href="/admin/products/new" className="btn btn-gold">New fabric</Link>
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-mist">
            <tr><th className="py-2 font-normal">Fabric</th><th className="text-right font-normal">Price / m</th><th className="text-right font-normal">Stock</th><th className="pl-6 font-normal">In shop</th><th className="font-normal">Featured</th><th className="font-normal">Photo</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {fabrics.map(({ record: r, metres }) => {
              const photo = r.image ? ownPhoto(r.image.id, r.image.alt) : r.stockPhoto ? PHOTOS[r.stockPhoto] : undefined;
              return (
                <tr key={r.slug} className={r.active ? "" : "opacity-60"}>
                  <td className="py-3">
                    <Link href={`/admin/products/${r.slug}`} className="flex items-center gap-3 hover:text-gold">
                      <span aria-hidden className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line" style={{ background: `radial-gradient(circle at 30% 25%, ${r.look.glint}55, ${r.look.ink} 35%, ${r.look.base} 80%)` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {photo && <img src={photoUrl(photo, 240)} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span><span className="font-medium">{r.name}</span><span className="block text-xs text-mist">{r.text.en.tagline}</span></span>
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">{euro(Math.round(r.pricePerMetre * 100))}</td>
                  <td className={`text-right tabular-nums ${metres < 5 ? "text-gold" : ""}`}>{metres} m</td>
                  <td className="pl-6"><Toggle slug={r.slug} flag="active" on={r.active} label={`${r.name} in shop`} /></td>
                  <td><Toggle slug={r.slug} flag="featured" on={r.featured} label={`${r.name} featured`} /></td>
                  <td className="text-xs text-mist">{r.image ? "Own photo" : r.stockPhoto ? "Stock photo" : "Illustration"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-mist">Hidden fabrics stay here and in past orders; they just don&apos;t show in the shop. The home page shows the first four featured fabrics.</p>
    </>
  );
}
