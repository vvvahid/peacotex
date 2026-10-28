import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-serif text-3xl font-light tracking-[0.3em]">PEACOTEX</p>
          <p className="mt-4 max-w-sm text-sm text-mist">Embellished fabrics for evening and bridal wear: beading, sequins, pearls, embroidery and lace, sold by the metre.</p>
        </div>
        <div>
          <h2 className="eyebrow mb-4 font-sans">Shop</h2>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li><Link href="/shop" className="hover:text-gold">All fabrics</Link></li>
            <li><Link href="/shop?occasion=bridal" className="hover:text-gold">Bridal</Link></li>
            <li><Link href="/shop?edge=scalloped" className="hover:text-gold">Scalloped edges</Link></li>
            <li><Link href="/shop?layout=border" className="hover:text-gold">Border fabrics</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow mb-4 font-sans">Service</h2>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li><Link href="/service#swatches" className="hover:text-gold">Swatches</Link></li>
            <li><Link href="/service#shipping" className="hover:text-gold">Rolled shipping</Link></li>
            <li><Link href="/service#returns" className="hover:text-gold">Cut-fabric returns</Link></li>
            <li><Link href="/service#ateliers" className="hover:text-gold">Ateliers &amp; trade</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow mb-4 font-sans">About this demo</h2>
          <p className="text-sm text-mist">All fabrics are procedural illustrations. Product names, prices and specifications are sample content. No payments are taken.</p>
        </div>
      </div>
      <p className="border-t border-line px-4 py-6 text-center text-xs text-mist">© {new Date().getFullYear()} Peacotex · Demo site</p>
    </footer>
  );
}
