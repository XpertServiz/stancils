import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { majorString } from "@/lib/money";
import { TEMPLATE_HEADERS } from "@/lib/services/importer";

export async function GET(req: Request) {
  const s = await getStaff();
  if (!s?.perms.has("inventory.import")) return new Response("Forbidden", { status: 403 });
  const rows: (string | number)[][] = [[...TEMPLATE_HEADERS]];
  if (new URL(req.url).searchParams.get("template")) {
    rows.push(["Example Mandala Stencil", "example-mandala-stencil", "STOCK_PHYSICAL", "ACTIVE", "wall;mandala", "mandala;boho", "Short line", "Long description", "no", "1", "EX-001", "S · 20×20 cm", 200, 200, "MYL-10", "1800", "", "500", 20, 5, "no", ""]);
    return csvResponse("catalogue-template.csv", rows);
  }
  const products = await db.product.findMany({ include: { variants: { include: { material: true } }, collections: { include: { collection: true } }, images: true }, orderBy: { name: "asc" } });
  for (const p of products) {
    for (const v of p.variants) {
      rows.push([p.name, p.slug, p.type, p.status, p.collections.map((c) => c.collection.slug).join(";"), p.tags.join(";"), p.shortDesc ?? "", p.description ?? "", p.foodSafe ? "yes" : "no", p.layers, v.sku, v.name, v.widthMm ?? "", v.heightMm ?? "", v.material?.code ?? "", majorString(v.basePrice), v.compareAt ? majorString(v.compareAt) : "", majorString(v.avgCost), v.onHand, v.reorderLevel, v.isDigital ? "yes" : "no", p.images[0]?.url ?? ""]);
    }
  }
  return csvResponse(`catalogue-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}
