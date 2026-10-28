import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const sans = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Peacotex — Embellished fabrics for evening & bridal", template: "%s · Peacotex" },
  description: "Beaded, sequinned, pearl, embroidered and lace fabrics for evening dresses, sold by the metre. Order a swatch first.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b0a09", width: "device-width", initialScale: 1 };

// Decide before first paint whether the home intro curtain runs (once per session, never with reduced motion).
const INTRO_SCRIPT = `try{if(location.pathname==='/'&&!sessionStorage.getItem('ptx_intro')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('intro','intro-lock')}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only z-[300] rounded-full bg-gold px-5 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-10">Skip to content</a>
        <CartProvider>
          <p className="fixed inset-x-0 top-0 z-[60] flex h-8 items-center justify-center gap-2 bg-gold px-3 text-center text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink">
            <span className="sm:hidden">Demo · sample products &amp; prices</span>
            <span className="hidden sm:inline">Demo site · Sample products &amp; prices · Stock photos &amp; illustrations, not our fabrics</span>
          </p>
          <Header />
          <main id="main" tabIndex={-1} className="outline-none">{children}</main>
          <Footer />
        </CartProvider>
        <SmoothScroll />
        <RevealObserver />
      </body>
    </html>
  );
}
