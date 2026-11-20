import { NextResponse } from "next/server";
import { capturePayPal } from "@/lib/payments/paypal";
import { markPaid } from "@/lib/services/orders";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ppToken = url.searchParams.get("token");
  const number = url.searchParams.get("order") ?? "";
  const t = url.searchParams.get("t") ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  if (!ppToken) return NextResponse.redirect(`${site}/checkout`);
  const r = await capturePayPal(ppToken);
  const order = await db.order.findUnique({ where: { number } });
  if (r.ok && order && r.orderId === order.id) await markPaid(order.id, { provider: "paypal", providerRef: r.captureId });
  return NextResponse.redirect(`${site}/order/${number}?t=${t}${r.ok ? "" : "&payment=failed"}`);
}
