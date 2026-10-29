import { NextResponse, type NextRequest } from "next/server";
import { CheckoutError, startCheckout } from "@/server/checkout";
import { isDbConfigured } from "@/server/db";
import { isStripeConfigured, StripeError } from "@/server/stripe";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !isDbConfigured()) {
    return NextResponse.json({ error: "not_configured", message: "Payments are not switched on for this demo." }, { status: 503 });
  }
  // Same-origin requests only: the bag lives on this site.
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const from = req.headers.get("origin");
  if (from && from !== req.nextUrl.origin && from !== origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid", message: "Invalid request." }, { status: 400 });
  }
  try {
    const { lines, lang } = (body ?? {}) as { lines?: unknown; lang?: unknown };
    const { url, reference } = await startCheckout(lines, origin, isLocale(lang) ? lang : DEFAULT_LOCALE);
    return NextResponse.json({ url, reference });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    console.error("checkout failed", err instanceof StripeError ? `${err.status} ${err.code ?? ""} ${err.message}` : err);
    return NextResponse.json({ error: "server", message: "The payment page could not be opened. Please try again." }, { status: 502 });
  }
}
