"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/i18n/client";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import { CurrencyMenu } from "@/components/layout/CurrencyMenu";
import { LogoMark, LogoWordmark } from "@/components/brand/Logo";
import { SITE_LIVE } from "@/lib/site";

export function Header() {
  const { count } = useCart();
  const { t, href, plural } = useI18n();
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  const nav = [
    { href: href("/shop"), label: t.nav.shop },
    { href: href("/#collections"), label: t.nav.collections },
    { href: href("/studio"), label: t.nav.studio },
    { href: href("/service#swatches"), label: t.nav.swatches },
    { href: href("/service"), label: t.nav.service },
  ];

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { window.__lenis?.start(); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <header className={`fixed inset-x-0 ${SITE_LIVE ? "top-0" : "top-8"} z-50transition-colors duration-500 ${solid || open ? "bg-ink/85 backdrop-blur-md border-b border-line" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-8">
        <Link href={href("/")} className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label={t.nav.home}>
          <LogoMark className="h-10 w-auto sm:h-12" />
          <LogoWordmark className="hidden h-[15px] w-auto min-[375px]:block sm:h-[20px]" />
        </Link>
        <nav aria-label={t.nav.main} className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[0.8125rem] uppercase tracking-[0.2em]">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-ivory/80 transition-colors hover:text-gold" aria-current={pathname === n.href ? "page" : undefined}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="-mr-2 flex items-center sm:mr-0 sm:gap-1">
          <LanguageMenu />
          <CurrencyMenu />
          <Link href={href("/cart")} className="flex h-11 items-center gap-2 rounded-full px-3 text-[0.8125rem] uppercase tracking-[0.2em] hover:text-gold">
            {/* On phones only the count shows: the language and currency menus need the room. */}
            <span className="sr-only sm:not-sr-only">{t.nav.bag}</span> <span className="grid h-6 min-w-6 place-items-center rounded-full bg-gold px-1.5 text-[0.75rem] tracking-normal text-ink" aria-label={plural(t.nav.bagItems, count)}>{count}</span>
          </Link>
          <button
            type="button" className="grid h-11 w-11 place-items-center lg:hidden" aria-expanded={open} aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">{open ? t.nav.closeMenu : t.nav.openMenu}</span>
            <span aria-hidden className="relative block h-3 w-6">
              <span className={`absolute left-0 h-px w-6 bg-ivory transition-transform ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 h-px w-6 bg-ivory transition-transform ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label={t.nav.main} className="h-[calc(100dvh-6rem)] overflow-y-auto border-t border-line bg-ink px-6 py-10 lg:hidden">
          <ul className="space-y-6">
            {nav.map((n) => (
              <li key={n.href}><Link href={n.href} className="font-serif text-4xl">{n.label}</Link></li>
            ))}
            <li><Link href={href("/cart")} className="font-serif text-4xl">{t.nav.bag} ({count})</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}
