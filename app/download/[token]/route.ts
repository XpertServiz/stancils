import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dl = await db.download.findUnique({ where: { token }, include: { orderItem: { include: { order: true, variant: { include: { product: true } } } } } });
  if (!dl || dl.expiresAt < new Date() || dl.remaining <= 0 || dl.orderItem.order.paymentStatus !== "paid") {
    return new Response("This download link has expired or reached its limit. Contact us for a fresh link.", { status: 410 });
  }
  const n = await db.download.updateMany({ where: { token, remaining: { gt: 0 } }, data: { remaining: { decrement: 1 } } });
  if (n.count !== 1) return new Response("Download limit reached.", { status: 410 });
  const p = dl.orderItem.variant?.product;
  const svg = (p?.designSvg ?? "").replace(/var\(--l\d,currentColor\)/g, "#000000");
  const licence = `<!-- Creative Corner · ${p?.name} · Personal-use licence for order ${dl.orderItem.order.number} (${dl.orderItem.order.email}). Not for resale. -->\n`;
  return new Response(licence + svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="${p?.slug ?? "stencil"}.svg"`,
      "Cache-Control": "private, no-store",
    },
  });
}
