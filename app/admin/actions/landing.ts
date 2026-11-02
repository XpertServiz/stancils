"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { saveUpload } from "@/lib/storage";
import { cleanProduct, getLandingProducts, resetLandingProducts, saveLandingProducts } from "@/lib/landing";

type R = { ok: boolean; msg: string } | null;
const done = (msg: string): R => {
  revalidatePath("/admin/website/landing");
  revalidatePath("/");
  return { ok: true, msg };
};

async function fields(fd: FormData) {
  const data = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, unknown>;
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) throw new Error("Photo must be an image.");
    data.image = await saveUpload(photo);
  }
  if (fd.get("remove_photo") === "on") data.image = "";
  return data;
}

export async function saveLandingProduct(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const list = await getLandingProducts();
    const id = Number(fd.get("id") || 0);
    const data = await fields(fd);
    if (id) {
      const i = list.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("Product not found — refresh the page.");
      if (data.image === undefined && list[i].image) data.image = list[i].image;
      const next = cleanProduct(data, id);
      await audit(s.id, "landing.product.update", "landing_product", String(id), list[i], next);
      list[i] = next;
      await saveLandingProducts(list);
      return done("Saved.");
    }
    const next = cleanProduct(data, Math.max(0, ...list.map((p) => p.id)) + 1);
    const pos = fd.get("position") === "top" ? 0 : list.length;
    list.splice(pos, 0, next);
    await saveLandingProducts(list);
    await audit(s.id, "landing.product.create", "landing_product", String(next.id), undefined, next);
    return done(`Added “${next.name}”.`);
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
    list.splice(i, 1);
  } else if (op === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
  else if (op === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
  else return;
  await saveLandingProducts(list);
  done("");
}

export async function resetLanding(_: R): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    await resetLandingProducts();
    await audit(s.id, "landing.products.reset", "landing_product", "all");
    return done("Restored the products from the approved design.");
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}
