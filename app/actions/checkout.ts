"use server";
import { z } from "zod";
import { placeOrder, markPaid } from "@/lib/services/orders";
import { getActiveCurrency } from "@/lib/currency";
import { getCustomer } from "@/lib/auth";
import { availableMethods } from "@/lib/payments";
import { createStripeCheckout } from "@/lib/payments/stripe";
import { createPayPalOrder } from "@/lib/payments/paypal";
import { orderToken } from "@/lib/tokens";
import { sendOrderEmail } from "@/lib/email";
import { db } from "@/lib/db";

const Input = z.object({
  idempotencyKey: z.string().min(8).max(80),
  lines: z.array(z.object({ variantId: z.string().optional(), customDesignId: z.string().optional(), qty: z.number().int().min(1).max(999) })).min(1).max(100),
  email: z.string().email(),
  name: z.string().min(2).max(120),
  phone: z.string().max(40).optional(),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().length(2),
  shippingId: z.string().optional().nullable(),
  discountCode: z.string().max(40).optional().nullable(),
  paymentMethod: z.enum(["stripe", "paypal", "card_demo", "bank", "cod", "b2b_terms"]),
  notes: z.string().max(1000).optional(),
  marketing: z.boolean().optional(),
});

export type CheckoutResult = { ok: true; redirect: string } | { ok: false; error: string };

export async function checkout(raw: unknown): Promise<CheckoutResult> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check your details: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const d = parsed.data;
  const { cur } = await getActiveCurrency();
  const customer = await getCustomer();
  const biz = customer?.business?.status === "approved" ? customer.business : null;
  const methods = await availableMethods(cur.code, d.country, { b2bTerms: Boolean(biz && biz.termsDays > 0) });
  if (!methods.some((m) => m.id === d.paymentMethod)) return { ok: false, error: "That payment method isn't available for your currency or country." };
  if (d.paymentMethod === "cod" && !d.phone) return { ok: false, error: "A phone number is required for cash on delivery." };

  try {
    const order = await placeOrder({
      idempotencyKey: d.idempotencyKey,
      lines: d.lines,
      currency: cur.code,
      email: d.email,
      name: d.name,
      phone: d.phone,
      address: { line1: d.line1, line2: d.line2, city: d.city, state: d.state, postcode: d.postcode, country: d.country },
      shippingId: d.shippingId ?? undefined,
      discountCode: d.discountCode ?? undefined,
      paymentMethod: d.paymentMethod,
      notes: d.notes,
      customerId: customer?.id ?? null,
      businessDiscountPct: biz?.discountPct,
    });
    if (d.marketing) await db.subscriber.upsert({ where: { email: d.email.toLowerCase() }, create: { email: d.email.toLowerCase() }, update: {} });
    const t = orderToken(order.id);
    const page = `/order/${order.number}?t=${t}`;
    if (d.paymentMethod === "stripe") return { ok: true, redirect: await createStripeCheckout(order, t) };
    if (d.paymentMethod === "paypal") return { ok: true, redirect: await createPayPalOrder(order, cur.exponent, t) };
    if (d.paymentMethod === "card_demo") {
      await markPaid(order.id, { provider: "card_demo", providerRef: `demo_${order.id}` });
      return { ok: true, redirect: page };
    }
    await sendOrderEmail(order.id, "placed").catch(() => {});
    return { ok: true, redirect: page };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function methodsFor(country: string) {
  const { cur } = await getActiveCurrency();
  const customer = await getCustomer();
  const biz = customer?.business?.status === "approved" ? customer.business : null;
  return availableMethods(cur.code, country.slice(0, 2).toUpperCase(), { b2bTerms: Boolean(biz && biz.termsDays > 0) });
}
