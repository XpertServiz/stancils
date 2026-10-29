import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { formatMoney, toBaseMinor, type CurrencyInfo } from "./money";
import { variantPrice } from "./services/pricing";

export const cardInclude = {
  variants: { where: { active: true }, include: { prices: true }, orderBy: { sort: "asc" } },
} satisfies Prisma.ProductInclude;

type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type Card = {
  id: string;
  slug: string;
  name: string;
  short: string | null;
  svg: string | null;
  colors: string[];
  price: string;
  priceMinor: number;
  compareAt: string | null;
  from: boolean;
  badges: { label: string; tone: "mint" | "coral" | "mustard" | "muted" }[];
  rating: number;
  ratingCount: number;
  defaultVariantId: string | null;
  stockLabel: string;
};

export function toCard(p: CardProduct, cur: CurrencyInfo, base: CurrencyInfo): Card {
  const physical = p.variants.filter((v) => !v.isDigital);
  const priced = (physical.length ? physical : p.variants).map((v) => ({ v, ...variantPrice(v, cur, base) }));
  priced.sort((a, b) => Number(a.price - b.price));
  const best = priced[0];
  const badges: Card["badges"] = [];
  if (p.foodSafe) badges.push({ label: "Food-safe", tone: "mint" });
  if (p.layers > 1) badges.push({ label: `${p.layers} layers`, tone: "mustard" });
  if (p.variants.some((v) => v.isDigital)) badges.push({ label: "+ Digital", tone: "muted" });
  if (best?.compareAt && best.compareAt > best.price) badges.unshift({ label: "Sale", tone: "coral" });
  const tracked = p.type === "STOCK_PHYSICAL" || p.type === "TOOL";
  const avail = physical.reduce((a, v) => a + Math.max(0, v.onHand - v.reserved), 0);
  const stockLabel = !tracked ? (p.type === "MADE_TO_ORDER" ? "Made to order · ships in 2–3 days" : "Instant download") : avail === 0 ? "Out of stock" : avail <= 5 ? `Only ${avail} left` : "In stock · ships in 24h";
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    short: p.shortDesc,
    svg: p.designSvg,
    colors: p.layerColors,
    price: best ? formatMoney(best.price, cur.code, cur.exponent) : "—",
    priceMinor: best ? Number(best.price) : 0,
    compareAt: best?.compareAt && best.compareAt > best.price ? formatMoney(best.compareAt, cur.code, cur.exponent) : null,
    from: priced.length > 1,
    badges,
    rating: p.ratingAvg,
    ratingCount: p.ratingCount,
    defaultVariantId: best?.v.id ?? null,
    stockLabel,
  };
}

const SYNONYMS: Record<string, string[]> = {
  stensil: ["stencil"], stencel: ["stencil"], latte: ["coffee"], cappuccino: ["coffee"], barista: ["coffee"], cocoa: ["coffee"],
  biscuit: ["cookie"], cookies: ["cookie"], cake: ["cake"], letters: ["alphabet", "lettering"], alphabet: ["alphabet", "letters"],
  numbers: ["numbers", "number"], word: ["lettering"], words: ["lettering"], quote: ["lettering"], moroccan: ["moroccan", "lattice"],
  tile: ["tile", "floor"], tiles: ["tile", "floor"], flower: ["floral"], flowers: ["floral"], leaf: ["nature", "fern", "palm"],
  christmas: ["christmas"], xmas: ["christmas"], eid: ["eid"], ramadan: ["ramadan", "eid"], logo: ["custom", "sign"], kid: ["kids"],
  baby: ["kids", "nursery"], nursery: ["kids"], geo: ["geometric"], boho: ["mandala", "boho"], sign: ["sign"], signs: ["sign"],
};

export type ListFilters = {
  q?: string;
  collection?: string;
  type?: string;
  foodSafe?: boolean;
  digital?: boolean;
  inStock?: boolean;
  layers?: number;
  material?: string;
  min?: number;
  max?: number;
  sort?: string;
  page?: number;
  perPage?: number;
};

export async function listProducts(f: ListFilters, cur: CurrencyInfo, base: CurrencyInfo) {
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];
  if (f.collection) and.push({ collections: { some: { collection: { slug: f.collection } } } });
  if (f.type) and.push({ type: f.type as never });
  if (f.foodSafe) and.push({ foodSafe: true });
  if (f.digital) and.push({ variants: { some: { isDigital: true } } });
  if (f.layers) and.push(f.layers >= 2 ? { layers: { gte: 2 } } : { layers: 1 });
  if (f.material) and.push({ variants: { some: { material: { kind: f.material } } } });
  if (f.inStock) and.push({ OR: [{ type: { in: ["MADE_TO_ORDER", "DIGITAL"] } }, { variants: { some: { onHand: { gt: 0 } } } }] });
  if (f.min || f.max) {
    const toBase = (n: number) => toBaseMinor(Math.round(n * 10 ** cur.exponent), cur.exponent, cur.rate, base.exponent);
    and.push({ variants: { some: { isDigital: false, basePrice: { ...(f.min ? { gte: toBase(f.min) } : {}), ...(f.max ? { lte: toBase(f.max) } : {}) } } } });
  }
  if (f.q) {
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
    for (const w of words) {
      const terms = [w, ...(SYNONYMS[w] ?? []), w.replace(/s$/, "")];
      and.push({
        OR: terms.flatMap((t) => [
          { name: { contains: t, mode: "insensitive" as const } },
          { tags: { has: t } },
          { shortDesc: { contains: t, mode: "insensitive" as const } },
          { collections: { some: { collection: { name: { contains: t, mode: "insensitive" as const } } } } },
          { variants: { some: { sku: { equals: t.toUpperCase() } } } },
        ]),
      });
    }
  }
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    f.sort === "new" ? [{ createdAt: "desc" }] : f.sort === "rating" ? [{ ratingAvg: "desc" }] : f.sort === "name" ? [{ name: "asc" }] : [{ featured: "desc" }, { salesCount: "desc" }, { createdAt: "desc" }];
  const perPage = f.perPage ?? 24;
  const page = Math.max(1, f.page ?? 1);
  const where = { AND: and };

  // price sorting needs the computed price, so sort in memory for those
  if (f.sort === "price_asc" || f.sort === "price_desc") {
    const all = await db.product.findMany({ where, include: cardInclude, take: 600 });
    const cards = all.map((p) => toCard(p, cur, base)).sort((a, b) => (f.sort === "price_asc" ? a.priceMinor - b.priceMinor : b.priceMinor - a.priceMinor));
    return { cards: cards.slice((page - 1) * perPage, page * perPage), total: cards.length, page, perPage };
  }
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, include: cardInclude, orderBy, skip: (page - 1) * perPage, take: perPage }),
  ]);
  return { cards: rows.map((p) => toCard(p, cur, base)), total, page, perPage };
}
