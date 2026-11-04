import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";

/** Production cut file: black fill, real-world size in mm, order reference in metadata. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getStaff();
  if (!s?.perms.has("production.manage") && !s?.perms.has("orders.view")) return new Response("Forbidden", { status: 403 });
  const d = await db.customDesign.findUnique({ where: { id: (await params).id }, include: { material: true } });
  if (!d) return new Response("Not found", { status: 404 });
  const svg = d.svg
    .replace(/style="fill:var\(--l\d,currentColor\)"/g, 'fill="#000"')
    .replace("<svg ", `<svg width="${d.widthMm}mm" height="${d.heightMm}mm" `);
  return new Response(`<!-- Creative Corner custom design ${d.id} · ${d.material.name} · ${d.widthMm}×${d.heightMm} mm -->\n${svg}`, {
    headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="custom-${d.id.slice(-8)}-${d.widthMm}x${d.heightMm}mm.svg"` },
  });
}
