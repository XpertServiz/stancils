import { db } from "../db";
import { getCurrencies } from "../settings";
import { parseMajor } from "../money";
import { slugify } from "../storefront";

/**
 * The beginner path for creating a product: a name, a category, a price and photos — nothing else.
 * DECISION: every quick product is MADE_TO_ORDER (no stock to count, never "sold out"); the owner can switch it to
 * stocked items later in the advanced editor. Sizes are optional and scale the price by area, like a classic stencil shop.
 */
export const SIZE_STEPS = [
  { label: "12x12 inches (LxW)", mm: 305, mult: 1, tag: "12" },
  { label: "18x18 inches (LxW)", mm: 457, mult: 1.9, tag: "18" },
  { label: "24x24 inches (LxW)", mm: 610, mult: 3.2, tag: "24" },
  { label: "36x36 inches (LxW)", mm: 914, mult: 6.4, tag: "36" },
];

const money = (n: number) => (n >= 100 ? Math.round(n) : Math.round(n * 100) / 100);
const rand = () => Math.random().toString(36).slice(2, 6).toUpperCase();

/** "rose-vine_01.jpg" → "Rose Vine 01"; camera names like IMG_4821 become "New product". */
export function nameFromFile(file: string) {
  const base = file.replace(/\.[^.]+$/, "").replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
  if (!base || /^(img|dsc|dscn|pxl|photo|image|screenshot|whatsapp image)\b/i.test(base) || /^\d+$/.test(base)) return "New product";
  return base.replace(/[<>]/g, "").split(" ").map((w) => (w.length > 1 ? w[0].toUpperCase() + w.slice(1) : w)).join(" ").slice(0, 120);
}

export async function uniqueSlug(name: string) {
  const base = slugify(name) || "product";
  let s = base;
  for (let i = 2; await db.product.findUnique({ where: { slug: s }, select: { id: true } }); i++) s = `${base}-${i}`;
  return s;
}

/** Find the collection with this name, or make it. */
export async function collectionByName(name: string) {
  const clean = name.replace(/[<>]/g, "").trim().slice(0, 80);
  const slug = slugify(clean);
  if (!slug) throw new Error("Please type a category name.");
  const max = (await db.collection.aggregate({ _max: { sort: true } }))._max.sort ?? 0;
  return (await db.collection.findUnique({ where: { slug } })) ?? db.collection.create({ data: { slug, name: clean, type: "STYLE", sort: max + 1, seoTitle: clean } });
}

export type QuickInput = {
  name: string;
  collectionId: string;
  price: number; // in the store's base currency (major units)
  oldPrice?: number | null; // struck-through price; omit for none
  sizes?: boolean;
  description?: string;
  imageUrls?: string[];
};

export async function createQuickProduct(i: QuickInput) {
  const name = i.name.trim().replace(/[<>]/g, "").slice(0, 120);
  if (!name) throw new Error("Please type a product name.");
  if (!Number.isFinite(i.price) || i.price <= 0 || i.price > 100_000_000) throw new Error("Price must be more than 0.");
  if (i.oldPrice && i.oldPrice <= i.price) throw new Error("The old price must be higher than the price.");
  const { base } = await getCurrencies();
  const minor = (n: number) => parseMajor(n.toFixed(base.exponent), base.exponent);
  const sku = `CC-${Date.now().toString(36).toUpperCase().slice(-5)}${rand()}`;
  const slug = await uniqueSlug(name);
  const col = await db.collection.findUniqueOrThrow({ where: { id: i.collectionId }, select: { id: true, name: true } });
  const variants = i.sizes
    ? SIZE_STEPS.map((s, k) => {
        const p = money(i.price * s.mult);
        return { sku: `${sku}-${s.tag}`, name: s.label, widthMm: s.mm, heightMm: s.mm, basePrice: minor(p), compareAt: i.oldPrice ? minor(money(i.oldPrice * s.mult)) : null, sort: k };
      })
    : [{ sku: `${sku}-1`, name: "Standard", basePrice: minor(i.price), compareAt: i.oldPrice ? minor(i.oldPrice) : null, sort: 0 }];
  const product = await db.product.create({
    data: {
      name, slug, type: "MADE_TO_ORDER", status: "ACTIVE", source: "MANUAL",
      shortDesc: (i.description?.trim() || `${name} — ${col.name}`).slice(0, 200),
      description: i.description?.trim() || null,
      tags: [slugify(col.name)],
      seoTitle: name,
      collections: { create: [{ collectionId: col.id }] },
      images: { create: (i.imageUrls ?? []).map((url, k) => ({ url, alt: name, sort: k })) },
      variants: { create: variants },
    },
    select: { id: true, slug: true, name: true },
  });
  return product;
}
