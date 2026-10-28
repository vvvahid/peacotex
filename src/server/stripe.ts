import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Minimal Stripe client over the REST API (no SDK): Checkout sessions and webhook signature
// verification as documented by Stripe (HMAC-SHA256 of "t.payload"). Card data never reaches
// this server: customers pay on Stripe's hosted Checkout page.

const API = "https://api.stripe.com/v1";

export const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;
export const isLiveKey = () => !!process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");

export class StripeError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

type Params = { [k: string]: string | number | boolean | null | undefined | Params | (string | number | Params)[] };

/** Stripe's form encoding: nested objects as a[b][c]=v, arrays as a[0]=v. */
export function encodeForm(params: Params, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? encodeForm(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") encodeForm(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripeRequest<T>(method: "GET" | "POST", path: string, params?: Params, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError("not_configured", 503);
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const query = method === "GET" && params ? `?${encodeForm(params)}` : "";
  const res = await fetch(`${API}${path}${query}`, {
    method, headers, body: method === "POST" && params ? encodeForm(params).toString() : undefined, signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } } & T;
  if (!res.ok) throw new StripeError(body.error?.message ?? `stripe_${res.status}`, res.status, body.error?.code);
  return body as T;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  payment_intent: string | null;
  client_reference_id: string | null;
  amount_subtotal: number | null;
  amount_total: number | null;
  currency: string;
  customer_details?: { email?: string | null; name?: string | null; address?: unknown; phone?: string | null } | null;
  collected_information?: { shipping_details?: unknown } | null;
  shipping_details?: unknown;
  shipping_cost?: { amount_total?: number } | null;
  metadata?: Record<string, string>;
}

export const retrieveSession = (id: string) => stripeRequest<CheckoutSession>("GET", `/checkout/sessions/${encodeURIComponent(id)}`);

// ------------------------------------------------------------------ webhooks
export function signPayload(payload: string, secret: string, timestamp: number): string {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
}

/** Verifies the Stripe-Signature header. Rejects stale timestamps (replay protection). */
export function verifyWebhookSignature(payload: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = Buffer.from(signPayload(payload, secret, t), "hex");
  return sigs.some((s) => {
    const got = Buffer.from(s ?? "", "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
