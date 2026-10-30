import { NextResponse } from "next/server";
import { isAdmin } from "@/server/admin-auth";
import { invoiceFor } from "@/server/invoice";

export const runtime = "nodejs";

/** An order's invoice PDF, for the shop owner. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const inv = /^[0-9a-f-]{36}$/.test(id) ? await invoiceFor(id) : null;
  if (!inv) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(inv.pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Peacotex-${inv.number}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
