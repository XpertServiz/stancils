"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { parseMajor } from "@/lib/money";
import { adjustMaterial, adjustVariant } from "@/lib/services/inventory";
import { rollbackImport, runImport } from "@/lib/services/importer";
import { saveUpload } from "@/lib/storage";

type R = { ok: boolean; msg: string } | null;

export async function adjustStock(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("inventory.adjust");
    const variantId = String(fd.get("variantId"));
    const mode = String(fd.get("mode"));
    const qty = Math.floor(Number(fd.get("qty")));
    const reason = String(fd.get("reason") || "").trim();
    if (!reason) return { ok: false, msg: "A reason is required for every adjustment." };
    const v = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
    const delta = mode === "set" ? qty - v.onHand : qty;
    if (!delta) return { ok: true, msg: "No change." };
    if (v.onHand + delta < v.reserved) return { ok: false, msg: `Can't go below ${v.reserved} reserved for open orders.` };
    await db.$transaction((tx) => adjustVariant(tx, variantId, delta, reason, s.id));
    await audit(s.id, "stock.adjust", "variant", variantId, { onHand: v.onHand }, { onHand: v.onHand + delta, reason });
    revalidatePath("/admin/inventory");
    return { ok: true, msg: `${v.sku}: ${delta > 0 ? "+" : ""}${delta} (now ${v.onHand + delta}). Posted to ledger.` };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function saveMaterial(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("inventory.edit");
    const id = String(fd.get("id") || "");
    const data = {
      code: String(fd.get("code")).trim().toUpperCase(), name: String(fd.get("name")).trim(), kind: String(fd.get("kind")), unit: String(fd.get("unit")),
      thicknessUm: Number(fd.get("thicknessUm")) || null, foodSafe: fd.get("foodSafe") === "on", reorderLevel: Number(fd.get("reorderLevel")) || 0,
      minBridgeMm: Number(fd.get("minBridgeMm")) || 1.5, rateCm2Base: parseMajor(String(fd.get("rate") || "0")), active: fd.get("active") !== "off",
    };
    if (id) await db.material.update({ where: { id }, data });
    else await db.material.create({ data });
    await audit(s.id, id ? "material.update" : "material.create", "material", id || data.code, undefined, data);
    revalidatePath("/admin/inventory/materials");
    return { ok: true, msg: "Material saved." };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function adjustMat(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("inventory.adjust");
    const id = String(fd.get("id"));
    const delta = Math.floor(Number(fd.get("qty")));
    const reason = String(fd.get("reason") || "").trim();
    if (!delta || !reason) return { ok: false, msg: "Quantity and reason are required." };
    await db.$transaction((tx) => adjustMaterial(tx, id, delta, reason, s.id));
    await audit(s.id, "material.adjust", "material", id, undefined, { delta, reason });
    revalidatePath("/admin/inventory/materials");
    return { ok: true, msg: "Adjusted and posted." };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export type ImportState = { ok: boolean; msg: string; report?: Awaited<ReturnType<typeof runImport>>; csv?: string; filename?: string } | null;

export async function importCatalog(_: ImportState, fd: FormData): Promise<ImportState> {
  try {
    const s = await requirePermission("inventory.import");
    const file = fd.get("file") as File | null;
    const commit = fd.get("commit") === "1";
    const csv = file && file.size > 0 ? await file.text() : String(fd.get("csv") || "");
    const filename = file && file.size > 0 ? file.name : String(fd.get("filename") || "import.csv");
    if (!csv.trim()) return { ok: false, msg: "Choose a CSV file." };
    const report = await runImport(csv, { commit, filename, byId: s.id });
    if (commit && report.batchId) {
      await audit(s.id, "catalog.import", "import_batch", report.batchId, undefined, { rows: report.variants });
      revalidatePath("/admin/products");
      return { ok: true, msg: `Imported ${report.variants} rows (${report.created} new, ${report.updated} updated).`, report };
    }
    return { ok: report.errors.length === 0, msg: report.errors.length ? `${report.errors.length} errors — fix them and try again.` : `Dry run OK (${report.format}). Review and confirm.`, report, csv, filename };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function rollback(fd: FormData) {
  const s = await requirePermission("inventory.import");
  await rollbackImport(String(fd.get("id")), s.id);
  await audit(s.id, "catalog.import.rollback", "import_batch", String(fd.get("id")));
  revalidatePath("/admin/inventory/import");
}

/** Match files to products by filename: SKU (variant) or product slug. SVGs become the artwork. */
export async function bulkMedia(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("inventory.edit");
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    let matched = 0;
    const missed: string[] = [];
    for (const f of files) {
      const key = f.name.replace(/\.[^.]+$/, "").replace(/[-_](\d+)$/, "").trim();
      const v = await db.variant.findUnique({ where: { sku: key.toUpperCase() } });
      const p = v ? await db.product.findUnique({ where: { id: v.productId } }) : await db.product.findUnique({ where: { slug: key.toLowerCase() } });
      if (!p) { missed.push(f.name); continue; }
      if (f.type === "image/svg+xml") await db.product.update({ where: { id: p.id }, data: { designSvg: (await f.text()).replace(/<script[\s\S]*?<\/script>/gi, "") } });
      else await db.productImage.create({ data: { productId: p.id, url: await saveUpload(f), alt: p.name } });
      matched++;
    }
    await audit(s.id, "media.bulk", "product", null, undefined, { matched, missed: missed.length });
    revalidatePath("/admin/products");
    return { ok: true, msg: `${matched} file(s) attached.${missed.length ? ` No match for: ${missed.slice(0, 10).join(", ")}${missed.length > 10 ? "…" : ""}` : ""}` };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}
