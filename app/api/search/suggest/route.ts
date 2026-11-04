import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveCurrency } from "@/lib/currency";
import { cardInclude, toCard } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ products: [], collections: [] });
  const { cur, base } = await getActiveCurrency();
  const [products, collections] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", OR: [{ name: { contains: q, mode: "insensitive" } }, { tags: { has: q.toLowerCase() } }] },
      include: cardInclude, take: 5, orderBy: [{ featured: "desc" }, { salesCount: "desc" }],
    }),
    db.collection.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { slug: true, name: true }, take: 3 }),
  ]);
  return NextResponse.json({
    products: products.map((p) => { const c = toCard(p, cur, base); return { slug: c.slug, name: c.name, price: c.price, image: c.image }; }),
    collections,
  }, { headers: { "cache-control": "private, max-age=30" } });
}
