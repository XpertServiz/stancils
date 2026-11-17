"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clearMemo } from "@/lib/memo";
import { saveUpload } from "@/lib/storage";
import { getCurrencies } from "@/lib/settings";
import { parseMajor } from "@/lib/money";
import { collectionByName, createQuickProduct, nameFromFile } from "@/lib/services/quick-product";
import { SET_KEYS, type SizeSetKey } from "@/lib/sizes";

const setOf = (fd: FormData): SizeSetKey => (SET_KEYS.includes(fd.get("sizeSet") as SizeSetKey) ? (fd.get("sizeSet") as SizeSetKey) : "single");

export type QR = { ok: boolean; msg: string; id?: string; name?: string } | null;

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
};
/** Price boxes named price_<size tag> → { tag: price }. Every size has its own price, typed by hand. */
const pricesOf = (fd: FormData) => {
  const out: Record<string, number> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("price_")) out[k.slice(6)] = num(v);
  return out;
};
const photos = (fd: FormData, key = "photos") => fd.getAll(key).filter((f): f is File => f instanceof File && f.size > 0);

async function upload(files: File[]) {
  const urls: string[] = [];
  for (const f of files) {
    if (!f.type.startsWith("image/")) throw new Error(`“${f.name}” is not a picture. Please use JPG or PNG photos.`);
    urls.push(await saveUpload(f));
  }
  return urls;
}

async function pickCollection(fd: FormData) {
  const fresh = String(fd.get("newCategory") ?? "").trim();
  if (fresh) return (await collectionByName(fresh)).id;
  const id = String(fd.get("collectionId") ?? "");
  if (!id) throw new Error("Please choose a category (or type a new one).");
  return id;
}

const done = () => {
  clearMemo("sf:menu-live"); // a new category shows in the header menu straight away
  revalidatePath("/", "layout");
  revalidatePath("/admin/products");
};

/** The one-screen "add a product" form. */
export async function quickAddProduct(_: QR, fd: FormData): Promise<QR> {
  try {
    const s = await requirePermission("inventory.edit");
    const urls = await upload(photos(fd));
    const p = await createQuickProduct({
      name: String(fd.get("name") ?? ""),
      collectionId: await pickCollection(fd),
      prices: pricesOf(fd),
      sizeSet: setOf(fd),
      description: String(fd.get("description") ?? ""),
      imageUrls: urls,
    });
    await audit(s.id, "product.quick_add", "product", p.id, undefined, { name: p.name });
    done();
    return { ok: true, id: p.id, name: p.name, msg: urls.length ? `Added “${p.name}”. It is on your website now.` : `Added “${p.name}”, but it has no photo yet — it will show on the website once you add one.` };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** Bulk add, one photo at a time (the browser calls this once per photo): one photo = one product. */
export async function quickAddFromPhoto(_: QR, fd: FormData): Promise<QR> {
  try {
    const s = await requirePermission("inventory.edit");
    const [file] = photos(fd, "photo");
    if (!file) throw new Error("No photo received.");
    const [url] = await upload([file]);
    const p = await createQuickProduct({
      name: String(fd.get("name") || "") || nameFromFile(file.name),
      collectionId: await pickCollection(fd),
      prices: pricesOf(fd),
      sizeSet: setOf(fd),
      imageUrls: [url],
    });
    await audit(s.id, "product.quick_add", "product", p.id, undefined, { name: p.name, bulk: true });
    return { ok: true, id: p.id, name: p.name, msg: "Added." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** Save the price of each size exactly as typed (boxes named vprice_<variant id>). Nothing is scaled or copied to the other sizes. */
async function saveVariantPrices(fd: FormData, productId: string, exponent: number) {
  const vs = await db.variant.findMany({ where: { productId, isDigital: false }, select: { id: true, name: true, basePrice: true } });
  for (const v of vs) {
    const raw = fd.get(`vprice_${v.id}`);
    if (raw === null || String(raw).trim() === "") continue;
    const price = num(raw);
    if (!(price > 0)) throw new Error(`The price for “${v.name}” must be more than 0.`);
    const minor = parseMajor(price.toFixed(exponent), exponent);
    if (minor === v.basePrice) continue;
    await db.variant.update({ where: { id: v.id }, data: { basePrice: minor } });
    await db.variantPrice.deleteMany({ where: { variantId: v.id } }); // manual per-currency prices for this size no longer match
  }
}

/** After a bulk add: fix names and the price of every size, one product at a time. */
export async function renameProducts(_: QR, fd: FormData): Promise<QR> {
  try {
    const s = await requirePermission("inventory.edit");
    const { base } = await getCurrencies();
    let n = 0;
    for (const id of fd.getAll("id").map(String)) {
      const name = String(fd.get(`name_${id}`) ?? "").replace(/[<>]/g, "").trim().slice(0, 120);
      if (!name) continue;
      await db.product.update({ where: { id }, data: { name } });
      await saveVariantPrices(fd, id, base.exponent);
      n++;
    }
    await audit(s.id, "product.quick_rename", "product", "many", undefined, { count: n });
    done();
    return { ok: true, msg: `Saved ${n} product${n === 1 ? "" : "s"}.` };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** The short "edit" panel on a product: name, category, price, show/hide. */
export async function quickSaveProduct(_: QR, fd: FormData): Promise<QR> {
  try {
    const s = await requirePermission("inventory.edit");
    const id = String(fd.get("id"));
    const name = String(fd.get("name") ?? "").replace(/[<>]/g, "").trim().slice(0, 120);
    if (!name) throw new Error("Please type a product name.");
    const { base } = await getCurrencies();
    await db.product.update({ where: { id }, data: { name } });
    await saveVariantPrices(fd, id, base.exponent);
    const fresh = String(fd.get("newCategory") ?? "").trim();
    const cid = fresh ? (await collectionByName(fresh)).id : String(fd.get("collectionId") ?? "");
    if (cid) {
      await db.productCollection.deleteMany({ where: { productId: id } });
      await db.productCollection.create({ data: { productId: id, collectionId: cid } });
    }
    await db.product.update({ where: { id }, data: { status: fd.get("visible") === "on" ? "ACTIVE" : "DRAFT" } });
    await audit(s.id, "product.quick_edit", "product", id);
    done();
    revalidatePath(`/admin/products/${id}`);
    return { ok: true, msg: "Saved." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** One photo added to an existing product (the browser calls this once per photo). */
export async function addPhoto(_: QR, fd: FormData): Promise<QR> {
  try {
    const s = await requirePermission("inventory.edit");
    const productId = String(fd.get("productId"));
    const [file] = photos(fd, "photo");
    if (!file) throw new Error("No photo received.");
    const [url] = await upload([file]);
    const max = (await db.productImage.aggregate({ where: { productId }, _max: { sort: true } }))._max.sort ?? -1;
    const p = await db.product.findUniqueOrThrow({ where: { id: productId }, select: { name: true } });
    await db.productImage.create({ data: { productId, url, alt: p.name, sort: max + 1 } });
    await audit(s.id, "product.photo", "product", productId);
    done();
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true, msg: "Photo added." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** Put a chosen photo first (it is the one shown on the shop cards). */
export async function makeCover(fd: FormData) {
  await requirePermission("inventory.edit");
  const id = String(fd.get("id"));
  const img = await db.productImage.findUniqueOrThrow({ where: { id } });
  const all = await db.productImage.findMany({ where: { productId: img.productId }, orderBy: { sort: "asc" } });
  const order = [img, ...all.filter((x) => x.id !== id)];
  await db.$transaction(order.map((x, i) => db.productImage.update({ where: { id: x.id }, data: { sort: i } })));
  done();
  revalidatePath(`/admin/products/${img.productId}`);
}
