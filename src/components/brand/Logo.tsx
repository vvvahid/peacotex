/* eslint-disable @next/next/no-img-element -- small fixed-size brand images, served as prepared WebP */

/*
 * The Peacotex logo, cut out of the logo artwork (design/logo.png) for the dark site: gold and
 * peacock blue on a transparent ground. Files in public/brand.
 */

/** Peacock, wordmark, ATELIER and tagline. */
export function LogoFull({ className, alt = "Peacotex Atelier, Luxury Evening Fabrics" }: { className?: string; alt?: string }) {
  return (
    <img
      src="/brand/logo-640.webp" srcSet="/brand/logo-640.webp 640w, /brand/logo-1200.webp 1200w" sizes="(min-width: 640px) 520px, 80vw"
      width={1200} height={860} alt={alt} className={className} decoding="async"
    />
  );
}

/** The peacock on its own. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/brand/mark-240.webp" srcSet="/brand/mark-240.webp 240w, /brand/mark-480.webp 480w" sizes="64px" width={480} height={389} alt="" className={className} />;
}

/** "PEACOTEX" as drawn in the logo. */
export function LogoWordmark({ className }: { className?: string }) {
  return <img src="/brand/wordmark-450.webp" srcSet="/brand/wordmark-450.webp 450w, /brand/wordmark-900.webp 900w" sizes="200px" width={900} height={136} alt="Peacotex" className={className} />;
}
