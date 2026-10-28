import { authorUrl, photoSrcSet, photoUrl, type Photo } from "@/lib/photos";

interface Props {
  photo: Photo;
  sizes: string;
  className?: string;
  /** Load eagerly (above the fold). */
  priority?: boolean;
  /** Show the "Stock photo" label; product images say it is not the actual fabric. */
  label?: "product" | "mood" | false;
  /** Show the photographer credit on the image. */
  credit?: boolean;
  alt?: string;
}

/** A credited Unsplash stock photo that fills its (relatively positioned) parent. */
export function StockPhoto({ photo, sizes, className, priority, label = "mood", credit = true, alt }: Props) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- Unsplash serves resized images itself */}
      <img
        src={photoUrl(photo, 1200)} srcSet={photoSrcSet(photo)} sizes={sizes} alt={alt ?? photo.alt}
        loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async"
        className={className ?? "absolute inset-0 h-full w-full object-cover"}
      />
      {label && (
        <span className="chip pointer-events-none absolute left-3 top-3 z-[1]">
          {label === "product" ? "Stock photo · not this exact fabric" : "Stock photo"}
        </span>
      )}
      {credit && (
        <a
          href={authorUrl(photo)} target="_blank" rel="noopener noreferrer"
          className="absolute bottom-2 right-3 z-[2] text-[0.625rem] text-ivory/70 underline-offset-2 hover:text-gold hover:underline"
        >
          Photo: {photo.author} / Unsplash
        </a>
      )}
    </>
  );
}
