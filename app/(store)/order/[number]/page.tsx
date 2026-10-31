import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { checkOrderToken, orderToken } from "@/lib/tokens";
import { getCustomer, getStaff } from "@/lib/auth";
import { OrderView, orderInclude } from "@/components/store/OrderView";
import { markPaid } from "@/lib/services/orders";
import { stripe, } from "@/lib/payments/stripe";
import { stripeEnabled } from "@/lib/payments";
import { ClearCart } from "@/components/store/ClearCart";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; session_id?: string; payment?: string }> }) {
  const { number } = await params;
  const sp = await searchParams;
  let order = await db.order.findUnique({ where: { number }, include: orderInclude });
  if (!order) notFound();
  const customer = await getCustomer();
  const staff = await getStaff();
  const allowed = checkOrderToken(order.id, sp.t) || (customer && customer.id === order.customerId) || staff;
  if (!allowed) notFound();

  // If Stripe redirected back before the webhook arrived, confirm the session directly (idempotent).
  if (sp.session_id && stripeEnabled() && order.paymentStatus !== "paid") {
    const session = await stripe().checkout.sessions.retrieve(sp.session_id).catch(() => null);
    if (session?.payment_status === "paid" && session.metadata?.orderId === order.id) {
      await markPaid(order.id, { provider: "stripe", providerRef: String(session.payment_intent ?? session.id), amount: BigInt(session.amount_total ?? 0) });
      order = await db.order.findUniqueOrThrow({ where: { number }, include: orderInclude });
    }
  }
  const cur = await db.currency.findUnique({ where: { code: order.currency } });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <ClearCart />
      {sp.payment === "failed" && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">The payment didn&apos;t go through. You can try again from checkout.</p>}
      <OrderView order={order} exponent={cur?.exponent ?? 2} token={orderToken(order.id)} />
    </div>
  );
}
