import type { Metadata } from "next";
import { DressStudio } from "@/components/studio/DressStudio";

export const metadata: Metadata = {
  title: "Dress studio",
  description: "See each embellished fabric on a dress silhouette, then work out how many metres you need.",
};

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ fabric?: string }> }) {
  const { fabric } = await searchParams;
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-40 sm:px-8">
      <header className="mb-12 grid gap-6 md:grid-cols-2 md:items-end">
        <div>
          <p className="eyebrow">Dress studio</p>
          <h1 className="mt-3 text-[clamp(2.8rem,6vw,5.5rem)] font-light">Picture your dress</h1>
        </div>
        <p className="max-w-md text-ivory/75 md:justify-self-end">
          Pick a fabric and a silhouette to get an impression of the finished dress, and see how many metres it takes.
          The figure is an illustration, not a fitted garment: order a swatch to see the real fabric.
        </p>
      </header>
      <DressStudio initialSlug={fabric} />
    </div>
  );
}
