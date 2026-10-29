import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { CartProvider } from "@/lib/cart";
import { I18nProvider } from "@/i18n/client";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";
import { alternates, getDict, langOf } from "@/i18n/server";
import { CatalogProvider } from "@/lib/catalog-client";
import { getCatalog } from "@/server/catalog";
import { getRates } from "@/server/rates";
import "../globals.css";

// latin-ext carries the letters of Polish, Czech, Romanian and Hungarian (ł, ř, ș, ő…).
const serif = Cormorant_Garamond({ subsets: ["latin", "latin-ext"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const sans = Manrope({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-manrope", display: "swap" });

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));
// Unknown languages 404 in langOf(); fabric pages added in the admin still render on demand below this layout.
// Admin saves refresh pages at once (revalidateTag); this is the fallback.
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: "%s · Peacotex" },
    description: t.meta.description,
    alternates: alternates(lang, "/"),
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#0b0a09", width: "device-width", initialScale: 1 };

// Decide before first paint whether the home intro curtain runs (once per session, never with reduced motion).
const HOME = `^/(${LOCALES.filter((l) => l !== DEFAULT_LOCALE).join("|")})?/?$`;
const INTRO_SCRIPT = `try{if(new RegExp(${JSON.stringify(HOME)}).test(location.pathname)&&!sessionStorage.getItem('ptx_intro')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('intro','intro-lock')}}catch(e){}`;

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getDict(lang);
  const [products, rates] = await Promise.all([getCatalog(lang), getRates()]);
  // Fabric translations reach the browser through the catalogue, not the dictionary.
  const clientDict = { ...t, catalog: { ...t.catalog, products: {} } };
  return (
    <html lang={lang} className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only z-[300] rounded-full bg-gold px-5 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-10">{t.skip}</a>
        <I18nProvider lang={lang} dict={clientDict} rates={rates}>
          <CatalogProvider products={products}>
            <CartProvider>
              <p className="fixed inset-x-0 top-0 z-[60] flex h-8 items-center justify-center gap-2 bg-gold px-3 text-center text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink">
                <span className="sm:hidden">{t.banner.short}</span>
                <span className="hidden sm:inline">{t.banner.long}</span>
              </p>
              <Header />
              <main id="main" tabIndex={-1} className="outline-none">{children}</main>
              <Footer />
            </CartProvider>
          </CatalogProvider>
        </I18nProvider>
        <SmoothScroll />
        <RevealObserver />
      </body>
    </html>
  );
}
