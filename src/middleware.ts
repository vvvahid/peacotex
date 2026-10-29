import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, fromAcceptLanguage, isLocale, localePath } from "@/i18n/config";

/*
 * Language routing. Pages live under app/[lang]. English is served at unprefixed URLs (/shop is
 * rewritten to /en/shop internally); other languages keep their prefix (/nl/shop). A visitor's
 * first unprefixed visit goes to their chosen (cookie) or browser language.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const seg = pathname.split("/")[1];

  if (seg === DEFAULT_LOCALE) {
    // /en/shop → /shop: one URL per page.
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }
  if (isLocale(seg)) return NextResponse.next();

  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  const wanted = isLocale(cookie) ? cookie : fromAcceptLanguage(req.headers.get("accept-language"));
  if (wanted && wanted !== DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = localePath(wanted, pathname);
    url.search = search;
    const res = NextResponse.redirect(url, 307);
    res.headers.set("Vary", "Accept-Language, Cookie");
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only: not the API, Next's assets or files with an extension.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
