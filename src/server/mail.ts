import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { COMPANY } from "@/lib/company";

/*
 * Outgoing email through Resend (resend.com), over its HTTP API. Settings:
 *   RESEND_API_KEY   the API key (Vercel environment variable; never in the code)
 *   MAIL_FROM        sender on a domain verified in Resend, e.g. "Peacotex <orders@peacotex.com>"
 *   MAIL_COPY_TO     where a copy of each order confirmation goes (default: sales@peacotex.com)
 * Without a key, outside production, messages are written to .data/outbox to look at instead.
 */

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  bcc?: string;
  attachments?: { filename: string; content: Uint8Array }[];
  /** Sending the same key twice within 24 h sends once (Resend idempotency). */
  idempotencyKey?: string;
}

export const mailConfigured = () => !!process.env.RESEND_API_KEY;
export const copyAddress = () => process.env.MAIL_COPY_TO || COMPANY.email;

/** Sends a message; returns false when nothing could be sent (no provider configured in production). */
export async function sendMail(m: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production" && !process.env.MAIL_OUTBOX) {
      console.error(`mail not sent (RESEND_API_KEY missing): ${m.subject} → ${m.to}`);
      return false;
    }
    const dir = path.join(process.cwd(), ".data", "outbox");
    await mkdir(dir, { recursive: true });
    const base = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${m.to.replace(/[^a-z0-9@.]/gi, "_")}`);
    await writeFile(`${base}.html`, `<!-- To: ${m.to}${m.bcc ? ` | Bcc: ${m.bcc}` : ""} | Subject: ${m.subject} -->\n${m.html}`);
    for (const a of m.attachments ?? []) await writeFile(`${base}-${a.filename}`, a.content);
    console.log(`mail written to ${base}.html`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(m.idempotencyKey && { "Idempotency-Key": m.idempotencyKey }),
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || `${COMPANY.tradeName} <${COMPANY.email}>`,
      to: [m.to],
      ...(m.bcc && { bcc: [m.bcc] }),
      reply_to: COMPANY.email,
      subject: m.subject,
      html: m.html,
      text: m.text,
      attachments: (m.attachments ?? []).map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return true;
}
