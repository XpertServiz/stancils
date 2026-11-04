import type { Order } from "@prisma/client";

const API = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function token() {
  const res = await fetch(`${API()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal auth failed");
  return (await res.json()).access_token as string;
}

export async function createPayPalOrder(order: Order, exponent: number, viewToken: string) {
  const res = await fetch(`${API()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", "PayPal-Request-Id": `cc-${order.id}` },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: order.id, custom_id: order.id, description: `Order ${order.number}`, amount: { currency_code: order.currency, value: (Number(order.total) / 10 ** exponent).toFixed(exponent) } }],
      application_context: {
        brand_name: "Creative Corner",
        user_action: "PAY_NOW",
        return_url: `${SITE()}/api/payments/paypal/capture?order=${order.number}&t=${viewToken}`,
        cancel_url: `${SITE()}/checkout?cancelled=${order.number}`,
      },
    }),
  });
  if (!res.ok) throw new Error("Could not start PayPal checkout");
  const data = await res.json();
  return (data.links as { rel: string; href: string }[]).find((l) => l.rel === "approve")!.href;
}

export async function capturePayPal(paypalOrderId: string) {
  const res = await fetch(`${API()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", "PayPal-Request-Id": `cap-${paypalOrderId}` },
  });
  const data = await res.json();
  const unit = data.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return { ok: data.status === "COMPLETED", orderId: unit?.reference_id as string | undefined, captureId: capture?.id as string | undefined };
}
