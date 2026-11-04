"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { saveUpload } from "@/lib/storage";
import { pingIndexNow } from "@/lib/seo";
import {
  cleanLandingSettings, cleanProduct, getLandingProducts, getLandingSettings, linkToCatalog, resetLandingProducts, saveLandingProducts,
  saveLandingSettings, splitCategory, unlinkFromCatalog, type LandingProduct,
} from "@/lib/landing";

type R = { ok: boolean; msg: string } | null;
const done = (msg: string): R => {
  revalidatePath("/admin/website/landing");
  revalidatePath("/");
  revalidatePath("/shop");
  void pingIndexNow(["/"]);
  return { ok: true, msg };
};

const LOOK: Record<string, { icon: string; bg: string }> = {
  Stencils: { icon: "❀", bg: "#f3e5ee" }, Gifts: { icon: "🎁", bg: "#fde9dc" }, "T-Shirts": { icon: "👕", bg: "#dfe9f1" }, Cybersigilism: { icon: "✣", bg: "#e2dfea" },
};

async function fields(fd: FormData) {
  const data = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, unknown>;
  // the simple form sends one “category” dropdown: "Stencils" or "Stencils|Floral & Botanical"
  if (typeof data.category === "string" && data.category) Object.assign(data, splitCategory(data.category));
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) throw new Error("Photo must be an image (JPG or PNG).");
    data.image = await saveUpload(photo);
  }
  if (fd.get("remove_photo") === "on") data.image = "";
  return data;
}

/** Add or update one homepage product (and its twin in the catalogue so it can be bought). */
export async function saveLandingProduct(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const list = await getLandingProducts();
    const id = Number(fd.get("id") || 0);
    const data = await fields(fd);
    if (id) {
      const i = list.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("Product not found — refresh the page.");
      const old = list[i];
      if (data.image === undefined && old.image) data.image = old.image;
      data.variantId = old.variantId;
      data.slug = old.slug;
      for (const k of ["icon", "bg", "tag"] as const) if (data[k] === undefined) data[k] = old[k];
      if (data.subcat === undefined && data.category === undefined) data.subcat = old.subcat;
      const next = await linkToCatalog(cleanProduct(data, id));
      await audit(s.id, "landing.product.update", "landing_product", String(id), old, next);
      list[i] = next;
      await saveLandingProducts(list);
      return done("Saved.");
    }
    // beginners only fill name, category, price and photo — the card look follows the category
    const look = LOOK[String(data.cat)];
    if (look) { data.icon ??= look.icon; data.bg ??= look.bg; }
    data.tag ??= "New";
    const next = await linkToCatalog(cleanProduct(data, Math.max(0, ...list.map((p) => p.id)) + 1));
    list.splice(fd.get("position") === "top" ? 0 : list.length, 0, next);
    await saveLandingProducts(list);
    await audit(s.id, "landing.product.create", "landing_product", String(next.id), undefined, next);
    return done(next.variantId ? `Added “${next.name}”. Customers can buy it now.` : `Added “${next.name}”. Add a price to let customers buy it.`);
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

export async function landingProductOp(fd: FormData) {
  const s = await requirePermission("content.publish");
  const id = Number(fd.get("id"));
  const op = String(fd.get("op"));
  const list = await getLandingProducts();
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return;
  if (op === "delete") {
    await audit(s.id, "landing.product.delete", "landing_product", String(id), list[i]);
    await unlinkFromCatalog(list[i]);
    list.splice(i, 1);
  } else if (op === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
  else if (op === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
  else return;
  await saveLandingProducts(list);
  done("");
}

/** One click: put every priced homepage product into the catalogue so it can be added to the cart. */
export async function syncLanding(_: R): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const list = await getLandingProducts();
    let linked = 0;
    let noPrice = 0;
    const next: LandingProduct[] = [];
    for (const p of list) {
      if (p.price <= 0 && !p.variantId) { noPrice++; next.push(p); continue; }
      const before = p.variantId;
      const q = await linkToCatalog(p);
      if (!before && q.variantId) linked++;
      next.push(q);
    }
    await saveLandingProducts(next);
    await audit(s.id, "landing.products.sync", "landing_product", "all", undefined, { linked, noPrice });
    return done(`${linked} product${linked === 1 ? "" : "s"} are now ready to sell.${noPrice ? ` ${noPrice} still need a price.` : ""}`);
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

export async function resetLanding(_: R): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    for (const p of await getLandingProducts()) await unlinkFromCatalog(p);
    await resetLandingProducts();
    await audit(s.id, "landing.products.reset", "landing_product", "all");
    return done("Restored the starter products.");
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** Headline, model photo and search-engine text for the homepage. */
export async function saveLandingPage(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const prev = await getLandingSettings();
    const data = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, unknown>;
    const photo = fd.get("heroPhoto");
    if (photo instanceof File && photo.size > 0) {
      if (!photo.type.startsWith("image/")) throw new Error("Photo must be an image (JPG or PNG).");
      data.heroImage = await saveUpload(photo);
    } else if (fd.get("remove_hero") === "on") data.heroImage = "";
    else data.heroImage = prev.heroImage;
    const next = cleanLandingSettings(data, prev);
    await saveLandingSettings(next);
    await audit(s.id, "landing.page.update", "landing_page", "home", prev, next);
    return done("Saved. The homepage updates within about 30 seconds.");
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}
