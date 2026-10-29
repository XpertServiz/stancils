import Papa from "papaparse";
import type { ProductType } from "@prisma/client";
import { db } from "../db";
import { ACC, postJournal, reverseJournal } from "../accounting";
import { parseMajor } from "../money";
import { moveVariant } from "./inventory";

export const TEMPLATE_HEADERS = [
  "name", "slug", "type", "status", "collections", "tags", "short_desc", "description", "food_safe", "layers",
  "sku", "variant_name", "width_mm", "height_mm", "material_code", "price", "compare_at", "unit_cost", "opening_stock", "reorder_level", "digital", "image_url",
] as const;

type Row = Record<(typeof TEMPLATE_HEADERS)[number], string>;
export type ImportReport = { products: number; variants: number; created: number; updated: number; errors: { row: number; msg: string }[]; warnings: string[] };

const truthy = (v?: string) => /^(1|y|yes|true)$/i.test((v ?? "").trim());
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

/** Accepts our template or a Shopify product export and returns normalised rows. */
export function parseCsv(text: string): { rows: Row[]; format: "template" | "shopify" } {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  if (headers.includes("Handle") && headers.includes("Variant SKU")) {
    let last: Record<string, string> = {};
    const rows = parsed.data.map((r) => {
      if (r.Title) last = r; // Shopify repeats only the handle on extra variant rows
      return {
        name: r.Title || last.Title || "", slug: r.Handle, type: "STOCK_PHYSICAL", status: (r.Status || last.Status || "active").toLowerCase() === "active" ? "ACTIVE" : "DRAFT",
        collections: "", tags: (r.Tags || last.Tags || "").split(",").map((t) => t.trim()).join(";"), short_desc: "",
        description: (r["Body (HTML)"] || last["Body (HTML)"] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), food_safe: "", layers: "1",
        sku: r["Variant SKU"], variant_name: [r["Option1 Value"], r["Option2 Value"]].filter((x) => x && x !== "Default Title").join(" · ") || "Standard",
        width_mm: "", height_mm: "", material_code: "", price: r["Variant Price"], compare_at: r["Variant Compare At Price"] ?? "", unit_cost: r["Cost per item"] ?? "",
        opening_stock: r["Variant Inventory Qty"] ?? "", reorder_level: "", digital: r["Variant Requires Shipping"] === "false" ? "yes" : "", image_url: r["Image Src"] ?? "",
      } as Row;
    }).filter((r) => r.sku);
    return { rows, format: "shopify" };
  }
  return { rows: parsed.data.map((r) => Object.fromEntries(TEMPLATE_HEADERS.map((h) => [h, (r[h] ?? "").trim()])) as Row), format: "template" };
}

export async function runImport(text: string, opts: { commit: boolean; filename?: string; byId: string }): Promise<ImportReport & { batchId?: string; format: string }> {
  const { rows, format } = parseCsv(text);
  const report: ImportReport = { products: 0, variants: 0, created: 0, updated: 0, errors: [], warnings: [] };
  const [materials, collections, existingVariants] = await Promise.all([
    db.material.findMany(),
    db.collection.findMany(),
    db.variant.findMany({ where: { sku: { in: rows.map((r) => r.sku.toUpperCase()).filter(Boolean) } }, select: { sku: true, productId: true } }),
  ]);
  const seenSku = new Set<string>();
  rows.forEach((r, i) => {
    const n = i + 2;
    if (!r.name && !r.slug) report.errors.push({ row: n, msg: "name or slug is required" });
    if (!r.sku) report.errors.push({ row: n, msg: "sku is required" });
    if (r.sku && seenSku.has(r.sku.toUpperCase())) report.errors.push({ row: n, msg: `duplicate sku ${r.sku}` });
    seenSku.add(r.sku.toUpperCase());
    if (r.price && isNaN(Number(r.price))) report.errors.push({ row: n, msg: `price "${r.price}" is not a number` });
    if (r.material_code && !materials.some((m) => m.code === r.material_code)) report.warnings.push(`Row ${n}: unknown material_code ${r.material_code} (ignored)`);
    if (r.type && !["STOCK_PHYSICAL", "MADE_TO_ORDER", "DIGITAL", "TOOL", "BUNDLE"].includes(r.type)) report.errors.push({ row: n, msg: `type must be STOCK_PHYSICAL, MADE_TO_ORDER, DIGITAL, TOOL or BUNDLE` });
    r.collections.split(";").filter(Boolean).forEach((c) => { if (!collections.some((x) => x.slug === c.trim())) report.warnings.push(`Row ${n}: unknown collection "${c}" (ignored)`); });
  });
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.slug || slugify(r.name);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  report.products = groups.size;
  report.variants = rows.length;
  report.updated = existingVariants.length;
  report.created = rows.length - existingVariants.length;
  if (!opts.commit || report.errors.length) return { ...report, format };

  const batch = await db.importBatch.create({ data: { kind: format, filename: opts.filename, rows: rows.length, byId: opts.byId } });
  let openingValue = 0n;
  await db.$transaction(
    async (tx) => {
      for (const [slugKey, vrows] of groups) {
        const first = vrows[0];
        const existingProductId = existingVariants.find((e) => vrows.some((r) => r.sku.toUpperCase() === e.sku))?.productId;
        const bySlug = existingProductId ? null : await tx.product.findUnique({ where: { slug: slugKey } });
        const productData = {
          name: first.name || slugKey,
          type: (first.type || "STOCK_PHYSICAL") as ProductType,
          status: (first.status?.toUpperCase() === "DRAFT" ? "DRAFT" : first.status?.toUpperCase() === "ARCHIVED" ? "ARCHIVED" : "ACTIVE") as "ACTIVE" | "DRAFT" | "ARCHIVED",
          shortDesc: first.short_desc || null,
          description: first.description || null,
          foodSafe: truthy(first.food_safe),
          layers: Math.max(1, Number(first.layers) || 1),
          tags: first.tags.split(";").map((t) => t.trim().toLowerCase()).filter(Boolean),
        };
        const product = existingProductId || bySlug
          ? await tx.product.update({ where: { id: existingProductId ?? bySlug!.id }, data: productData })
          : await tx.product.create({ data: { ...productData, slug: slugKey, source: "IMPORT", importBatchId: batch.id } });
        const colIds = first.collections.split(";").map((c) => collections.find((x) => x.slug === c.trim())?.id).filter(Boolean) as string[];
        if (colIds.length) await tx.productCollection.createMany({ data: colIds.map((collectionId) => ({ productId: product.id, collectionId })), skipDuplicates: true });
        const imgs = [...new Set(vrows.map((r) => r.image_url).filter((u) => /^https?:\/\//.test(u)))];
        for (const [i, url] of imgs.entries()) {
          if (!(await tx.productImage.findFirst({ where: { productId: product.id, url } }))) await tx.productImage.create({ data: { productId: product.id, url, sort: i } });
        }
        for (const r of vrows) {
          const sku = r.sku.toUpperCase();
          const mat = materials.find((m) => m.code === r.material_code);
          const data = {
            name: r.variant_name || "Standard",
            widthMm: Number(r.width_mm) || null,
            heightMm: Number(r.height_mm) || null,
            materialId: mat?.id ?? null,
            thicknessUm: mat?.thicknessUm ?? null,
            basePrice: parseMajor(r.price || "0"),
            compareAt: r.compare_at ? parseMajor(r.compare_at) : null,
            reorderLevel: Number(r.reorder_level) || 5,
            isDigital: truthy(r.digital),
          };
          const existing = await tx.variant.findUnique({ where: { sku } });
          if (existing) await tx.variant.update({ where: { sku }, data });
          else {
            const v = await tx.variant.create({ data: { ...data, sku, productId: product.id } });
            const qty = Math.max(0, Math.floor(Number(r.opening_stock) || 0));
            if (qty > 0 && !data.isDigital) {
              const cost = r.unit_cost ? parseMajor(r.unit_cost) : 0n;
              await moveVariant(tx, v.id, qty, "OPENING", cost, { refType: "import", refId: batch.id, note: "Opening stock (import)", byId: opts.byId });
              openingValue += cost * BigInt(qty);
            }
          }
        }
      }
      if (openingValue > 0n) {
        await postJournal(tx, { memo: `Opening stock from import ${opts.filename ?? batch.id}`, sourceType: "import", sourceId: batch.id, byId: opts.byId, lines: [{ code: ACC.INV_FINISHED, debit: openingValue }, { code: ACC.CAPITAL, credit: openingValue }] });
      }
    },
    { timeout: 120_000 },
  );
  await db.importBatch.update({ where: { id: batch.id }, data: { created: report.created, updated: report.updated, report: report as object } });
  return { ...report, batchId: batch.id, format };
}

/** Removes products created by a batch (unless sold) and reverses its opening-stock journal. */
export async function rollbackImport(batchId: string, byId: string) {
  const batch = await db.importBatch.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.status === "rolled_back") throw new Error("Already rolled back");
  const sold = await db.orderItem.count({ where: { variant: { product: { importBatchId: batchId } } } });
  if (sold > 0) throw new Error("Some imported products have already been sold — archive them instead.");
  await db.$transaction(async (tx) => {
    const j = await tx.journalEntry.findFirst({ where: { sourceType: "import", sourceId: batchId } });
    if (j) await reverseJournal(tx, j.id, byId, `Rollback of import ${batch.filename ?? batchId}`);
    await tx.product.deleteMany({ where: { importBatchId: batchId } });
    await tx.importBatch.update({ where: { id: batchId }, data: { status: "rolled_back" } });
  });
}
