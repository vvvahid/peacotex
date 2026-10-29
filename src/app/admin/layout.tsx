import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import { isAdmin, isAdminConfigured } from "@/server/admin-auth";
import { logoutAction } from "./actions";
import "../globals.css";

const sans = Manrope({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = { title: { default: "Admin · Peacotex", template: "%s · Admin · Peacotex" }, robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#0b0a09", width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Fabrics" },
];

/** The shop owner's back office. Its own root layout: no shop header, no smooth scrolling. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAdmin();
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen bg-ink font-sans">
        {signedIn && (
          <header className="sticky top-0 z-20 border-b border-line bg-night/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-8">
              <Link href="/admin" className="font-serif text-xl tracking-[0.3em]">PEACOTEX <span className="font-sans text-[0.6875rem] tracking-[0.2em] text-gold">ADMIN</span></Link>
              <nav aria-label="Admin" className="flex gap-6 text-sm">
                {NAV.map((n) => <Link key={n.href} href={n.href} className="text-ivory/80 hover:text-gold">{n.label}</Link>)}
              </nav>
              <div className="ml-auto flex items-center gap-5 text-sm">
                <a href="/" target="_blank" rel="noopener" className="text-mist hover:text-gold">View shop ↗</a>
                <form action={logoutAction}><button type="submit" className="text-mist underline underline-offset-4 hover:text-gold">Sign out</button></form>
              </div>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
          {isAdminConfigured() ? children : <NotConfigured />}
        </main>
      </body>
    </html>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-xl py-20">
      <h1 className="text-4xl font-light">The admin is not switched on</h1>
      <p className="mt-4 text-ivory/75">It needs two settings on the server (environment variables):</p>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-ivory/75">
        <li><code className="text-gold">DATABASE_URL</code>: the database that holds orders and fabrics.</li>
        <li><code className="text-gold">ADMIN_PASSWORD</code>: the password for signing in here.</li>
      </ul>
    </div>
  );
}
