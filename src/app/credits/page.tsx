import type { Metadata } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { PHOTOS, UNSPLASH_URL, authorUrl, photoPage, photoUrl } from "@/lib/photos";

export const metadata: Metadata = { title: "Photo credits" };

export default function CreditsPage() {
  const usedBy = (id: string) => PRODUCTS.filter((p) => p.photo?.id === id).map((p) => p.name);
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-32 pt-40 sm:px-8">
      <p className="eyebrow">Credits</p>
      <h1 className="mt-3 text-[clamp(2.8rem,6vw,5rem)] font-light">Photo credits</h1>
      <p className="mt-6 max-w-2xl text-ivory/75">
        Until our own photography is ready, this demo uses stock photographs from{" "}
        <a href={UNSPLASH_URL} target="_blank" rel="noopener noreferrer" className="text-gold underline underline-offset-4">Unsplash</a>{" "}
        under the Unsplash License. They show fabrics similar in spirit, not the Peacotex fabrics they appear next to.
        Thank you to the photographers below.
      </p>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(PHOTOS).map((ph) => (
          <li key={ph.id} className="card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(ph, 600)} alt={ph.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="p-5 text-sm">
              <p>
                <a href={photoPage(ph)} target="_blank" rel="noopener noreferrer" className="hover:text-gold">{ph.alt}</a>
              </p>
              <p className="mt-1 text-mist">
                by <a href={authorUrl(ph)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gold">{ph.author}</a>
                {usedBy(ph.id).length > 0 && <> · shown with {usedBy(ph.id).join(", ")}</>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
