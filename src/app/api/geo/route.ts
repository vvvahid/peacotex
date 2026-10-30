import { NextResponse, type NextRequest } from "next/server";

/** The visitor's country (two letters) from Vercel's edge, for showing local payment methods. Nothing is stored. */
export function GET(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country");
  return NextResponse.json(
    { country: country && /^[A-Z]{2}$/.test(country) ? country : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
