import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { majorString } from "@/lib/money";
import { getCurrencies } from "@/lib/settings";
import { SIMPLE_HEADERS, TEMPLATE_HEADERS } from "@/lib/services/importer";

export async function GET(req: Request) {
  const s = await getStaff();
  if (!s?.perms.has("inventory.import")) return new Response("Forbidden", { status: 403 });
  const q = new URL(req.url).searchParams;
  const template = !!q.get("template");
  const full = q.get("format") === "full";

  if (!full) {
    // Beginner file: name, category, price, stock, photo_link, description (one row per product)
    const rows: (string | number)[][] = [[...SIMPLE_HEADERS]];
    if (template) {
      rows.push(["Rose Wall Stencil", "Stencils", "15.00", "", "https://example.com/rose.jpg", "Reusable rose pattern for walls"]);
      rows.push(["Birthday Gift Basket", "Gifts", "45", "10", "", "Snacks, candle and card"]);
      return csvResponse("my-products-template.csv", rows);
    }
    const { base } = await getCurrencies();
    const products = await db.product.findMany({
      include: { variants: { orderBy: { sort: "asc" }, take: 1 }, images: { orderBy: { sort: "asc" }, take: 1 }, collections: { include: { collection: true }, take: 1 } },
      orderBy: { name: "asc" },
    });
    for (const p of products) {
      const v = p.variants[0];
      if (!v) continue;
      const tracked = p.type === "STOCK_PHYSICAL" || p.type === "TOOL";
      rows.push([p.name, p.collections[0]?.collection.name ?? "", majorString(v.basePrice, base.exponent), tracked ? v.onHand : "", p.images[0]?.url ?? "", p.shortDesc ?? p.description ?? ""]);
    }
    return csvResponse(`my-products-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  // Advanced file: every column, one row per size/variant
  const rows: (string | number)[][] = [[...TEMPLATE_HEADERS]];
  if (template) {
    rows.push(["Example Mandala Stencil", "example-mandala-stencil", "STOCK_PHYSICAL", "ACTIVE", "wall;mandala", "mandala;boho", "Short line", "Long description", "no", "1", "EX-001", "S · 20×20 cm", 200, 200, "MYL-10", "1800", "", "500", 20, 5, "no", ""]);
    return csvResponse("catalogue-template-advanced.csv", rows);
  }
  const products = await db.product.findMany({ include: { variants: { include: { material: true } }, collections: { include: { collection: true } }, images: true }, orderBy: { name: "asc" } });
  for (const p of products) {
    for (const v of p.variants) {
      rows.push([p.name, p.slug, p.type, p.status, p.collections.map((c) => c.collection.slug).join(";"), p.tags.join(";"), p.shortDesc ?? "", p.description ?? "", p.foodSafe ? "yes" : "no", p.layers, v.sku, v.name, v.widthMm ?? "", v.heightMm ?? "", v.material?.code ?? "", majorString(v.basePrice), v.compareAt ? majorString(v.compareAt) : "", majorString(v.avgCost), v.onHand, v.reorderLevel, v.isDigital ? "yes" : "no", p.images[0]?.url ?? ""]);
    }
  }
  return csvResponse(`catalogue-full-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}
