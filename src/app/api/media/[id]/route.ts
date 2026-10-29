import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/server/db";

export const runtime = "nodejs";

/** Serves a photo uploaded in /admin. Ids are random and photos never change, so they cache forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured() || !/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  const db = await getDb();
  const { rows } = await db.query<{ content_type: string; bytes: Uint8Array }>("SELECT content_type, bytes FROM media WHERE id = $1", [id]);
  const m = rows[0];
  if (!m) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(m.bytes), {
    headers: {
      "Content-Type": m.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
