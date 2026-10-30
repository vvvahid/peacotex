import { NextResponse, type NextRequest } from "next/server";
import { getDb, isDbConfigured } from "@/server/db";
import { invoiceFor } from "@/server/invoice";

export const runtime = "nodejs";

/** The customer's invoice PDF, reached from the order-confirmation page (the Stripe session id is the key). */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") ?? "";
  if (!isDbConfigured() || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return new NextResponse(null, { status: 404 });
  const db = await getDb();
  const { rows } = await db.query<{ id: string }>("SELECT id FROM orders WHERE stripe_session_id = $1", [sessionId]);
  const inv = rows[0] && (await invoiceFor(rows[0].id));
  if (!inv) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(inv.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Peacotex-${inv.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
