import Stripe from "stripe";
import type { Order } from "@prisma/client";

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function createStripeCheckout(order: Order, token: string) {
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: order.number },
      payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.number } },
      line_items: [
        {
          quantity: 1,
          price_data: { currency: order.currency.toLowerCase(), unit_amount: Number(order.total), product_data: { name: `Creative Corner order ${order.number}` } },
        },
      ],
      success_url: `${SITE()}/order/${order.number}?t=${token}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE()}/checkout?cancelled=${order.number}`,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );
  return session.url!;
}
