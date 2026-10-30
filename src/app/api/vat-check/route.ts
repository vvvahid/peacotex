import { NextResponse, type NextRequest } from "next/server";
import { checkVat } from "@/server/vies";
import { treatmentFor } from "@/server/vat";

export const runtime = "nodejs";

/** Checks a business buyer's VAT number (VIES) so the bag can show prices without VAT before checkout. */
export async function POST(req: NextRequest) {
  const { vatId } = (await req.json().catch(() => ({}))) as { vatId?: unknown };
  if (typeof vatId !== "string" || vatId.length > 30) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const check = await checkVat(vatId);
  return NextResponse.json({
    valid: check.valid,
    unavailable: !!check.unavailable,
    country: check.country,
    vatId: check.vatId,
    name: check.name ?? null,
    treatment: check.valid ? treatmentFor(check) : null,
  });
}
