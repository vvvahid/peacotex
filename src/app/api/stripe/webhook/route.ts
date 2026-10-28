import { NextResponse, type NextRequest } from "next/server";
import { fulfil, markExpired } from "@/server/checkout";
import { verifyWebhookSignature } from "@/server/stripe";

export const runtime = "nodejs";

interface StripeEvent { id: string; type: string; data: { object: { id: string; object: string } } }

/** Stripe → us. Only signed events are accepted; payment state is re-read from Stripe in fulfil(). */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const payload = await req.text();
  if (!verifyWebhookSignature(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as StripeEvent;
  const obj = event.data.object;
  if (obj.object !== "checkout.session") return NextResponse.json({ received: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfil(obj.id);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await markExpired(obj.id);
        break;
    }
  } catch (err) {
    console.error("webhook handling failed", event.type, err);
    return NextResponse.json({ error: "retry" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
