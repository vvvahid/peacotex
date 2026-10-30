"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { LogoFull } from "@/components/brand/Logo";
import { PaymentMethods } from "@/components/ui/PaymentMethods";

export function Footer() {
  const { t, href } = useI18n();
  const f = t.footer;
  return (
    <footer className="border-t border-line bg-ink">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <LogoFull className="h-auto w-64" />
          <p className="mt-4 max-w-sm text-sm text-mist">{f.blurb}</p>
        </div>
        <div>
          <h2 className="eyebrow mb-4 font-sans">{f.shop}</h2>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li><Link href={href("/shop")} className="hover:text-gold">{f.allFabrics}</Link></li>
            <li><Link href={href("/shop?occasion=bridal")} className="hover:text-gold">{f.bridal}</Link></li>
            <li><Link href={href("/shop?edge=scalloped")} className="hover:text-gold">{f.scalloped}</Link></li>
            <li><Link href={href("/shop?layout=border")} className="hover:text-gold">{f.border}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow mb-4 font-sans">{f.service}</h2>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li><Link href={href("/service#swatches")} className="hover:text-gold">{f.swatches}</Link></li>
            <li><Link href={href("/service#shipping")} className="hover:text-gold">{f.shipping}</Link></li>
            <li><Link href={href("/service#returns")} className="hover:text-gold">{f.returns}</Link></li>
            <li><Link href={href("/service#ateliers")} className="hover:text-gold">{f.ateliers}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow mb-4 font-sans">{f.aboutTitle}</h2>
          <p className="text-sm text-mist">{f.about} <Link href={href("/credits")} className="underline underline-offset-2 hover:text-gold">{f.credits}</Link></p>
        </div>
      </div>
      <div className="border-t border-line px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-xs text-mist">© {new Date().getFullYear()} Peacotex · {f.demoSite}</p>
          <PaymentMethods title={false} className="flex justify-center" />
        </div>
      </div>
    </footer>
  );
}
