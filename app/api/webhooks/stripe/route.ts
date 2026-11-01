import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/payments/stripe";
import { markPaid } from "@/lib/services/orders";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "not configured" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  // idempotency: store each event id once
  const seen = await db.webhookEvent.findUnique({ where: { id: event.id } });
  if (seen) return NextResponse.json({ ok: true, duplicate: true });
  await db.webhookEvent.create({ data: { id: event.id, provider: "stripe", type: event.type, payload: JSON.parse(JSON.stringify(event.data.object)) } });

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === "paid" && s.metadata?.orderId) {
      await markPaid(s.metadata.orderId, { provider: "stripe", providerRef: String(s.payment_intent ?? s.id), amount: BigInt(s.amount_total ?? 0) });
    }
  }
  return NextResponse.json({ ok: true });
}
