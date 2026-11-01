"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, ProductStatus, ProductType } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { parseMajor } from "@/lib/money";
import { saveUpload } from "@/lib/storage";
import { pingIndexNow } from "@/lib/seo";

type R = { ok: boolean; msg: string } | null;
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

async function uniqueSlug(base: string, exceptId?: string) {
  let s = slugify(base) || "product";
  let i = 2;
  while (await db.product.findFirst({ where: { slug: s, ...(exceptId ? { id: { not: exceptId } } : {}) } })) s = `${slugify(base)}-${i++}`;
  return s;
}

export async function createProduct(fd: FormData) {
  const s = await requirePermission("inventory.edit");
  const name = String(fd.get("name") || "").trim();
  if (!name) throw new Error("Name is required");
  const type = (String(fd.get("type")) || "STOCK_PHYSICAL") as ProductType;
  const p = await db.product.create({
    data: {
      name, slug: await uniqueSlug(name), type, status: "DRAFT", source: "MANUAL",
      variants: { create: { sku: `CC-${Date.now().toString(36).toUpperCase()}`, name: "Standard", basePrice: 0n } },
    },
  });
  await audit(s.id, "product.create", "product", p.id, undefined, { name, type });
  redirect(`/admin/products/${p.id}`);
}

export async function saveProduct(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("inventory.edit");
    const id = String(fd.get("id"));
    const before = await db.product.findUniqueOrThrow({ where: { id } });
    const slugIn = String(fd.get("slug") || "").trim();
    const slug = slugIn && slugIn !== before.slug ? await uniqueSlug(slugIn, id) : before.slug;
    const passport = {
      material: String(fd.get("pp_material") || ""), thicknessUm: Number(fd.get("pp_thickness") || 0), minBridgeMm: Number(fd.get("pp_bridge") || 0),
      finestDetailMm: Number(fd.get("pp_detail") || 0), reuse: String(fd.get("pp_reuse") || ""), foodSafe: fd.get("foodSafe") === "on", cleaning: String(fd.get("pp_cleaning") || ""),
    };
    let designSvg = String(fd.get("designSvg") ?? before.designSvg ?? "");
    const svgFile = fd.get("svgFile") as File | null;
    if (svgFile && svgFile.size > 0) designSvg = await svgFile.text();
    if (designSvg && !/^\s*<svg[\s>]/i.test(designSvg.replace(/^<\?xml[^>]*>\s*/i, ""))) return { ok: false, msg: "Design must be an SVG." };
    designSvg = sanitizeSvg(designSvg);
    const data: Prisma.ProductUpdateInput = {
      name: String(fd.get("name")).trim(),
      slug,
      status: String(fd.get("status")) as ProductStatus,
      type: String(fd.get("type")) as ProductType,
      shortDesc: String(fd.get("shortDesc") || "") || null,
      description: String(fd.get("description") || "") || null,
      tags: String(fd.get("tags") || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      foodSafe: fd.get("foodSafe") === "on",
      featured: fd.get("featured") === "on",
      reusable: fd.get("reusable") === "on",
      layers: Math.max(1, Math.min(4, Number(fd.get("layers") || 1))),
      layerColors: String(fd.get("layerColors") || "").split(",").map((c) => c.trim()).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c)),
      repeatWmm: Number(fd.get("repeatWmm")) || null,
      repeatHmm: Number(fd.get("repeatHmm")) || null,
      hsCode: String(fd.get("hsCode") || "") || null,
      seoTitle: String(fd.get("seoTitle") || "") || null,
      seoDesc: String(fd.get("seoDesc") || "") || null,
      designSvg: designSvg || null,
      needsReview: fd.get("needsReview") === "on",
      passport,
      collections: { deleteMany: {}, create: fd.getAll("collections").map((c) => ({ collectionId: String(c) })) },
    };
    await db.product.update({ where: { id }, data });
    if (slug !== before.slug) await db.redirect.upsert({ where: { from: `/p/${before.slug}` }, create: { from: `/p/${before.slug}`, to: `/p/${slug}` }, update: { to: `/p/${slug}` } });
    await audit(s.id, "product.update", "product", id, { name: before.name, status: before.status, slug: before.slug }, { name: data.name, status: data.status, slug });
    revalidatePath(`/p/${slug}`);
    revalidatePath(`/admin/products/${id}`);
    void pingIndexNow([`/p/${slug}`]);
    return { ok: true, msg: "Saved." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** Strip scripts, event handlers and external references from uploaded SVG. */
function sanitizeSvg(svg: string) {
  return svg
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("|')(?!#)[^"']*\2/gi, "")
    .trim();
}

export async function saveVariants(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("inventory.edit");
    const productId = String(fd.get("productId"));
    const canPrice = s.perms.has("pricing.edit");
    const ids = fd.getAll("vid").map(String);
    const currencies = await db.currency.findMany({ where: { isBase: false } });
    for (const vid of ids) {
      const g = (k: string) => String(fd.get(`${k}_${vid}`) ?? "");
      const sku = g("sku").trim().toUpperCase();
      if (!sku) continue;
      const data: Prisma.VariantUpdateInput = {
        sku, name: g("name").trim() || "Standard",
        widthMm: Number(g("w")) || null, heightMm: Number(g("h")) || null,
        material: g("mat") ? { connect: { id: g("mat") } } : { disconnect: true },
        thicknessUm: Number(g("th")) || null,
        reorderLevel: Number(g("reorder")) || 0,
        weightG: Number(g("weight")) || 60,
        isDigital: g("digital") === "on",
        active: g("active") === "on",
      };
      if (canPrice) {
        data.basePrice = parseMajor(g("price") || "0");
        data.compareAt = g("compare") ? parseMajor(g("compare")) : null;
      }
      await db.variant.update({ where: { id: vid }, data });
      if (canPrice) {
        for (const c of currencies) {
          const v = g(`px_${c.code}`).trim();
          if (v) await db.variantPrice.upsert({ where: { variantId_currency: { variantId: vid, currency: c.code } }, create: { variantId: vid, currency: c.code, price: parseMajor(v, c.exponent) }, update: { price: parseMajor(v, c.exponent) } });
          else await db.variantPrice.deleteMany({ where: { variantId: vid, currency: c.code } });
        }
      }
    }
    if (String(fd.get("new_sku") || "").trim()) {
      await db.variant.create({
        data: {
          productId, sku: String(fd.get("new_sku")).trim().toUpperCase(), name: String(fd.get("new_name") || "New size"),
          widthMm: Number(fd.get("new_w")) || null, heightMm: Number(fd.get("new_h")) || null,
          basePrice: canPrice ? parseMajor(String(fd.get("new_price") || "0")) : 0n, isDigital: fd.get("new_digital") === "on",
        },
      });
    }
    await audit(s.id, "variants.update", "product", productId);
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true, msg: "Variants saved." };
  } catch (e) {
    const m = (e as Error).message;
    return { ok: false, msg: m.includes("Unique constraint") ? "That SKU is already used by another variant." : m };
  }
}

export async function deleteVariant(fd: FormData) {
  const s = await requirePermission("inventory.delete");
  const id = String(fd.get("id"));
  const v = await db.variant.findUniqueOrThrow({ where: { id }, include: { _count: { select: { orderItems: true, movements: true } } } });
  if (v._count.orderItems > 0 || v._count.movements > 0) await db.variant.update({ where: { id }, data: { active: false } });
  else await db.variant.delete({ where: { id } });
  await audit(s.id, "variant.delete", "variant", id, { sku: v.sku });
  revalidatePath(`/admin/products/${v.productId}`);
}

export async function saveBom(fd: FormData) {
  await requirePermission("inventory.edit");
  const variantId = String(fd.get("variantId"));
  const materialId = String(fd.get("materialId") || "");
  const qty = Number(fd.get("qty") || 0);
  const remove = String(fd.get("remove") || "");
  if (remove) await db.bomLine.delete({ where: { id: remove } });
  else if (materialId && qty > 0) await db.bomLine.create({ data: { variantId, materialId, qty } });
  const v = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
  revalidatePath(`/admin/products/${v.productId}`);
}

export async function uploadImages(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("inventory.edit");
    const productId = String(fd.get("productId"));
    const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    const max = (await db.productImage.aggregate({ where: { productId }, _max: { sort: true } }))._max.sort ?? 0;
    let i = 0;
    for (const f of files) await db.productImage.create({ data: { productId, url: await saveUpload(f), alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), sort: max + ++i } });
    await audit(s.id, "product.images", "product", productId, undefined, { count: files.length });
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true, msg: `${files.length} image(s) uploaded.` };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

export async function deleteImage(fd: FormData) {
  await requirePermission("inventory.edit");
  const img = await db.productImage.delete({ where: { id: String(fd.get("id")) } });
  revalidatePath(`/admin/products/${img.productId}`);
}

export async function bulkProducts(fd: FormData) {
  const action = String(fd.get("bulk"));
  const ids = fd.getAll("ids").map(String);
  const scope = String(fd.get("scope") || "selected");
  const s = await requirePermission(action === "delete" ? "inventory.delete" : action === "price" ? "pricing.edit" : "inventory.bulk_edit");
  let where: Prisma.ProductWhereInput = { id: { in: ids } };
  if (scope === "seed") where = { source: "SEED" };
  if (scope === "filtered") where = JSON.parse(String(fd.get("filter") || "{}"));
  if (scope === "all") where = {};
  const targets = await db.product.findMany({ where, select: { id: true } });
  const tIds = targets.map((t) => t.id);
  if (tIds.length === 0) return;
  switch (action) {
    case "publish": await db.product.updateMany({ where: { id: { in: tIds } }, data: { status: "ACTIVE" } }); break;
    case "draft": await db.product.updateMany({ where: { id: { in: tIds } }, data: { status: "DRAFT" } }); break;
    case "archive": await db.product.updateMany({ where: { id: { in: tIds } }, data: { status: "ARCHIVED" } }); break;
    case "feature": await db.product.updateMany({ where: { id: { in: tIds } }, data: { featured: true } }); break;
    case "unfeature": await db.product.updateMany({ where: { id: { in: tIds } }, data: { featured: false } }); break;
    case "reviewed": await db.product.updateMany({ where: { id: { in: tIds } }, data: { needsReview: false } }); break;
    case "collection": {
      const cid = String(fd.get("collectionId"));
      if (cid) await db.productCollection.createMany({ data: tIds.map((productId) => ({ productId, collectionId: cid })), skipDuplicates: true });
      break;
    }
    case "price": {
      const pct = Number(fd.get("pct") || 0);
      if (pct && Math.abs(pct) < 90) {
        await db.$executeRaw`UPDATE "Variant" SET "basePrice" = ROUND("basePrice" * (1 + ${pct}::float / 100)) WHERE "productId" = ANY(${tIds})`;
      }
      break;
    }
    case "delete": {
      // products with sales history are archived instead of deleted, to keep the ledger traceable
      const sold = await db.orderItem.findMany({ where: { variant: { productId: { in: tIds } } }, select: { variant: { select: { productId: true } } }, distinct: ["variantId"] });
      const keep = new Set(sold.map((x) => x.variant!.productId));
      const withStock = await db.stockMovement.findMany({ where: { variant: { productId: { in: tIds } }, type: { not: "OPENING" } }, select: { variant: { select: { productId: true } } } });
      withStock.forEach((x) => keep.add(x.variant!.productId));
      const del = tIds.filter((x) => !keep.has(x));
      await zeroOutStockForDelete(del, s.id);
      await db.product.deleteMany({ where: { id: { in: del } } });
      if (keep.size) await db.product.updateMany({ where: { id: { in: [...keep] } }, data: { status: "ARCHIVED" } });
      break;
    }
  }
  await audit(s.id, `products.bulk.${action}`, "product", null, undefined, { count: tIds.length, scope });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

/** Deleting products that still hold opening stock: write the stock off through the ledger first. */
async function zeroOutStockForDelete(productIds: string[], byId: string) {
  const { adjustVariant } = await import("@/lib/services/inventory");
  const variants = await db.variant.findMany({ where: { productId: { in: productIds }, onHand: { not: 0 } } });
  for (const v of variants) await db.$transaction((tx) => adjustVariant(tx, v.id, -v.onHand, "Product deleted", byId));
}

export async function deleteProduct(fd: FormData) {
  const id = String(fd.get("id"));
  const f = new FormData();
  f.set("bulk", "delete");
  f.set("scope", "selected");
  f.append("ids", id);
  await bulkProducts(f);
  const still = await db.product.findUnique({ where: { id } });
  redirect(still ? `/admin/products/${id}?archived=1` : "/admin/products?deleted=1");
}
