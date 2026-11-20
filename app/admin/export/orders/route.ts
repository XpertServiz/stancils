import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  const s = await getStaff();
  if (!s?.perms.has("orders.view")) return new Response("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const orders = await db.order.findMany({ where: status ? { status: status as never } : {}, orderBy: { createdAt: "desc" }, include: { items: true } });
  const rows: (string | number)[][] = [["number", "date", "status", "payment_status", "payment_method", "name", "email", "country", "currency", "subtotal", "discount", "shipping", "tax", "total", "total_base", "items"]];
  for (const o of orders) rows.push([o.number, o.createdAt.toISOString(), o.status, o.paymentStatus, o.paymentMethod, o.name, o.email, o.country, o.currency, Number(o.subtotal) / 100, Number(o.discount) / 100, Number(o.shippingFee) / 100, Number(o.tax) / 100, Number(o.total) / 100, Number(o.totalBase) / 100, o.items.map((i) => `${i.qty}x ${i.sku}`).join("; ")]);
  return csvResponse(`orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}
