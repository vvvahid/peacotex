/*
 * Stock photos from Unsplash (Unsplash License: free for commercial use). They are NOT Peacotex
 * fabrics: every use on the site is labelled "Stock photo" and credited. Replace them with the
 * shop's own photography as it becomes available.
 */

/** A product or mood photo: an Unsplash stock photo, or (own) one the shop uploaded in /admin. */
export interface Photo { id: string; src: string; alt: string; author: string; username: string; own?: boolean }

/** A photo uploaded in the admin (stored in the media table). Not a stock photo: no label or credit. */
export const ownPhoto = (id: string, alt: string): Photo => ({ id, src: id, alt, author: "", username: "", own: true });

const p = (id: string, src: string, alt: string, author: string, username: string): Photo => ({ id, src, alt, author, username });

export const PHOTOS = {
  sequinDrape: p("ew43qqRKfao", "photo-1608768390181-dda1b3455107", "Bronze sequin fabric hanging in soft folds", "Tim Mossholder", "timmossholder"),
  iridescent: p("UPqQ3XqFhjU", "photo-1779144640787-976d7e6310f4", "Iridescent sequins catching the light on a dark ground", "Jason Leung", "ninjason"),
  redGold: p("QhMklrq-f30", "photo-1703202189129-cf7ba26a6dfc", "Red and gold sequins glittering", "Tim Mossholder", "timmossholder"),
  midnight: p("I6bXBCFVIsk", "photo-1646176385724-6e1c83da6198", "Deep violet-blue sequins, close up", "Julia Morales", "beachlandia"),
  emerald: p("3MucARcgz4E", "photo-1676918555443-8474deebdfc5", "Emerald fabric with green and gold sequin embroidery", "Sunira Moses", "sunira"),
  bridalBeading: p("o4ww9yRnOuY", "photo-1706741921247-0069d59ff55a", "Ivory bridal fabric with beaded embroidery", "Browne And Dixon Photography", "browneanddixon"),
  bridalDetail: p("aChcFIX7JS0", "photo-1673960507883-5d7a5351726f", "Ivory bridal fabric with raised floral appliqué", "Sandie Clarke", "honeypoppet"),
  scallopLace: p("K-zyVx3Jakw", "photo-1525169087805-031a4da0623c", "Ivory lace with a scalloped edge over a satin skirt", "Tom Pumford", "tompumford"),
  whiteLace: p("S_06N663vig", "photo-1627012898015-aa708e5c53ee", "White floral lace on a dark ground", "Nareeta Martin", "splashabout"),
  blushLace: p("E7DXHeozCgs", "photo-1769420290265-6359445daaa4", "Delicate lace on a soft blush ground", "Anita Austvika", "anitaaustvika"),
  goldEmbroidery: p("8zSR5HjPJ9A", "photo-1791598638960-7931c1f83290", "Gold metallic embroidery in floral motifs on dark fabric", "Bernd Dittrich", "hdbernd"),
  copperPaillettes: p("PzUnYcECavg", "photo-1779167327071-963220d85043", "Copper paillettes and beads, close up", "Anshul Gurjar", "blibityblabity"),
  goldGown: p("KJN6tzCht2I", "photo-1768885560804-637950eb129d", "A golden mannequin wearing an ornate sequined gown", "zai Dan", "danzai_ph"),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

/** Unsplash image CDN URL at a given width (Unsplash asks for hotlinked, resized images). */
/** Own photos go through Next's image optimiser, which resizes them (allowed widths: next.config images). */
export const photoUrl = (ph: Photo, w: number) => ph.own
  ? `/_next/image?url=${encodeURIComponent(`/api/media/${ph.src}`)}&w=${w}&q=75`
  : `https://images.unsplash.com/${ph.src}?w=${w}&q=72&auto=format&fit=crop`;
export const photoSrcSet = (ph: Photo) => [480, 800, 1200, 1800, 2400].map((w) => `${photoUrl(ph, w)} ${w}w`).join(", ");

const UTM = "utm_source=peacotex&utm_medium=referral";
export const authorUrl = (ph: Photo) => `https://unsplash.com/@${ph.username}?${UTM}`;
export const photoPage = (ph: Photo) => `https://unsplash.com/photos/${ph.id}?${UTM}`;
export const UNSPLASH_URL = `https://unsplash.com/?${UTM}`;
