import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteCart } from "@/lib/services/orders";
import { getActiveCurrency, getCountry } from "@/lib/currency";
import { quoteToJson } from "@/lib/quote-json";
import { getCustomer } from "@/lib/auth";

const Body = z.object({
  lines: z.array(z.object({ variantId: z.string().optional(), customDesignId: z.string().optional(), qty: z.number().int().min(1).max(999) })).max(100),
  discountCode: z.string().max(40).optional().nullable(),
  shippingId: z.string().optional().nullable(),
  country: z.string().length(2).optional(),
  email: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  const { cur } = await getActiveCurrency();
  const customer = await getCustomer();
  const biz = customer?.business?.status === "approved" ? customer.business.discountPct : 0;
  const q = await quoteCart({
    lines: parsed.data.lines,
    currency: cur.code,
    country: parsed.data.country ?? (await getCountry()),
    discountCode: parsed.data.discountCode,
    shippingId: parsed.data.shippingId,
    email: parsed.data.email ?? customer?.email,
    businessDiscountPct: biz,
  });
  return NextResponse.json(quoteToJson(q));
}
