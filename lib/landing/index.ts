import { db } from "../db";
import { memo, clearMemo } from "../memo";
import { getCurrencies, getSettings } from "../settings";
import { convertMinor, formatMoney, parseMajor } from "../money";
import { variantPrice } from "../services/pricing";
import { getLiveSales, landingPercent } from "../sales";
import { DEFAULT_LANDING_PRODUCTS, DEPARTMENTS, SUBCATEGORIES } from "./defaults";
import { buildHome, type CardProduct, type ReviewCard } from "./template";

/**
 * Products shown on the homepage. Managed in Admin → Website → Homepage products.
 * Every product with a price is mirrored into the real catalogue (`variantId`), so a visitor can add it to the
 * cart and use the normal checkout, stock, shipping, tax and ledger flow. Price is in the store's base currency.
 */
export type LandingProduct = {
  id: number;
  name: string;
  cat: (typeof DEPARTMENTS)[number];
  subcat: string;
  price: number;
  icon: string;
  bg: string;
  tag: string;
  image?: string;
  /** catalogue link, set automatically */
  variantId?: string;
  slug?: string;
};

const KEY = "landingProducts";

export async function getLandingProducts(): Promise<LandingProduct[]> {
  const row = await memo(KEY, () => db.setting.findUnique({ where: { key: KEY } })).catch(() => null);
  const list = row?.value;
  return Array.isArray(list) ? (list as LandingProduct[]) : (DEFAULT_LANDING_PRODUCTS as LandingProduct[]);
}

export async function saveLandingProducts(list: LandingProduct[]) {
  const value = JSON.parse(JSON.stringify(list));
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  clearMemo(KEY);
}

export async function resetLandingProducts() {
  await db.setting.deleteMany({ where: { key: KEY } });
  clearMemo(KEY);
}

/** Field rules — product text goes into the page's HTML, so markup characters are not allowed. */
export function cleanProduct(input: Record<string, unknown>, id: number): LandingProduct {
  const text = (k: string, max: number, required = false) => {
    const v = String(input[k] ?? "").trim().slice(0, max);
    if (/[<>`\\]|\$\{/.test(v)) throw new Error(`${k}: < > \` \\ and \${ are not allowed.`);
    if (required && !v) throw new Error(`${k} is required.`);
    return v;
  };
  const cat = String(input.cat) as LandingProduct["cat"];
  if (!DEPARTMENTS.includes(cat)) throw new Error("Choose a category.");
  const subcat = text("subcat", 80);
  if (subcat && !SUBCATEGORIES[cat].includes(subcat)) throw new Error("Choose a subcategory from the list.");
  const price = Number(input.price || 0);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) throw new Error("Price must be 0 or more (0 = “Get a quote”).");
  const bg = String(input.bg || "#f3e5ee").trim();
  if (!/^#[0-9a-fA-F]{3,8}$/.test(bg)) throw new Error("Background must be a colour like #f3e5ee.");
  const image = String(input.image ?? "").trim();
  if (image && !/^(https:\/\/|\/)[^"'\s<>()]+$/.test(image)) throw new Error("Photo must be an https:// or /uploads/ link.");
  const keep = (k: "variantId" | "slug") => {
    const v = String(input[k] ?? "").trim();
    return /^[A-Za-z0-9_-]{1,100}$/.test(v) ? v : undefined;
  };
  return {
    id,
    name: text("name", 120, true),
    cat,
    subcat,
    price: Math.round(price * 100) / 100,
    icon: text("icon", 8) || "✦",
    bg,
    tag: text("tag", 30),
    ...(image ? { image } : {}),
    ...(keep("variantId") ? { variantId: keep("variantId") } : {}),
    ...(keep("slug") ? { slug: keep("slug") } : {}),
  };
}

/** Pick a category + optional subcategory from one dropdown value: "Stencils" or "Stencils|Floral & Botanical". */
export function splitCategory(value: string): { cat: string; subcat: string } {
  const [cat, subcat = ""] = value.split("|");
  return { cat, subcat };
}

/** Match free text (CSV cell, dropdown label) to a department + subcategory, case-insensitively. */
export function matchCategory(raw: string): { cat: LandingProduct["cat"]; subcat: string } | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  for (const d of DEPARTMENTS) {
    if (d.toLowerCase() === t || (d === "T-Shirts" && /^t-?shirts?( printing)?$/.test(t))) return { cat: d, subcat: "" };
    const s = SUBCATEGORIES[d].find((x) => x.toLowerCase() === t);
    if (s) return { cat: d, subcat: s };
  }
  return null;
}

// ───────────────────────── catalogue link ─────────────────────────

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

async function uniqueSlug(name: string) {
  const base = slugify(name) || "product";
  let s = base;
  for (let i = 2; await db.product.findUnique({ where: { slug: s }, select: { id: true } }); i++) s = `${base}-${i}`;
  return s;
}

async function ensureCollection(name: string) {
  const slug = slugify(name);
  return (await db.collection.findUnique({ where: { slug } })) ?? db.collection.create({ data: { slug, name, type: "SURFACE" } });
}

/**
 * Make sure a homepage product exists in the catalogue so it can be bought through the normal checkout.
 * DECISION: homepage items are `MADE_TO_ORDER` (no finished-goods stock to run out; each sale creates a production
 * job and posts revenue like any other order). The owner can edit stock, sizes or photos later in Products.
 */
export async function linkToCatalog(p: LandingProduct): Promise<LandingProduct> {
  const { base } = await getCurrencies();
  const minor = parseMajor(p.price.toFixed(base.exponent), base.exponent);
  const existing = p.variantId ? await db.variant.findUnique({ where: { id: p.variantId }, include: { product: true } }) : null;
  const status = p.price > 0 ? "ACTIVE" : "DRAFT";
  const shortDesc = `${p.name} — ${p.subcat || p.cat}`.slice(0, 200);
  if (existing) {
    await db.$transaction([
      db.product.update({ where: { id: existing.productId }, data: { name: p.name, status, shortDesc } }),
      db.variant.update({ where: { id: existing.id }, data: { basePrice: minor, active: true } }),
    ]);
    if (p.image) {
      const first = await db.productImage.findFirst({ where: { productId: existing.productId }, orderBy: { sort: "asc" } });
      if (!first) await db.productImage.create({ data: { productId: existing.productId, url: p.image, alt: p.name, sort: 0 } });
      else if (first.url !== p.image) await db.productImage.update({ where: { id: first.id }, data: { url: p.image, alt: p.name } });
    }
    return { ...p, variantId: existing.id, slug: existing.product.slug };
  }
  if (p.price <= 0) return p; // nothing to sell yet — shows “Get a quote”
  const coll = await ensureCollection(p.cat);
  const product = await db.product.create({
    data: {
      name: p.name, slug: await uniqueSlug(p.name), type: "MADE_TO_ORDER", status, source: "MANUAL", shortDesc,
      tags: [p.cat.toLowerCase(), ...(p.subcat ? [p.subcat.toLowerCase()] : [])],
      collections: { create: [{ collectionId: coll.id }] },
      variants: { create: { sku: `HP-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`, name: "Standard", basePrice: minor } },
      ...(p.image ? { images: { create: [{ url: p.image, alt: p.name, sort: 0 }] } } : {}),
    },
    include: { variants: true },
  });
  return { ...p, variantId: product.variants[0].id, slug: product.slug };
}

/** Hide a homepage product's catalogue twin (kept, not deleted, so past orders stay intact). */
export async function unlinkFromCatalog(p: LandingProduct) {
  if (!p.variantId) return;
  const v = await db.variant.findUnique({ where: { id: p.variantId }, select: { productId: true } });
  if (v) await db.product.update({ where: { id: v.productId }, data: { status: "ARCHIVED" } });
}

// ───────────────────────── page settings ─────────────────────────

export type LandingSettings = { heroImage: string; headline: string; sub: string; seoTitle: string; seoDesc: string; keywords: string };

export const LANDING_DEFAULTS: LandingSettings = {
  heroImage: "",
  headline: "Stencils & gifts, made yours.",
  sub: "Pick it. Add it. Check out in a minute.",
  seoTitle: "Reusable Stencils, Gift Baskets & Custom T-Shirts",
  seoDesc: "Shop reusable wall & craft stencils, gift baskets, custom T-shirt printing and cybersigilism art. Fast shipping across the USA & Canada. Custom orders welcome.",
  keywords: "wall stencils, reusable stencils, custom stencils, craft stencils, gift baskets, custom t-shirt printing, cybersigilism art, stencils USA, stencils Canada",
};

const SKEY = "landingPage";

export async function getLandingSettings(): Promise<LandingSettings> {
  const row = await memo(SKEY, () => db.setting.findUnique({ where: { key: SKEY } })).catch(() => null);
  const v = (row?.value ?? {}) as Partial<LandingSettings>;
  const pick = (k: keyof LandingSettings) => (typeof v[k] === "string" && v[k] !== "" ? (v[k] as string) : LANDING_DEFAULTS[k]);
  return { heroImage: typeof v.heroImage === "string" ? v.heroImage : "", headline: pick("headline"), sub: pick("sub"), seoTitle: pick("seoTitle"), seoDesc: pick("seoDesc"), keywords: pick("keywords") };
}

export async function saveLandingSettings(s: LandingSettings) {
  const value = JSON.parse(JSON.stringify(s));
  await db.setting.upsert({ where: { key: SKEY }, create: { key: SKEY, value }, update: { value } });
  clearMemo(SKEY);
}

export function cleanLandingSettings(input: Record<string, unknown>, prev: LandingSettings): LandingSettings {
  const t = (k: keyof LandingSettings, max: number) => {
    const v = String(input[k] ?? "").trim().slice(0, max);
    if (/[<>`\\]|\$\{/.test(v)) throw new Error(`${k}: < > \` \\ and \${ are not allowed.`);
    return v;
  };
  const heroImage = input.heroImage === undefined ? prev.heroImage : String(input.heroImage).trim();
  if (heroImage && !/^(https:\/\/|\/)[^"'\s<>()]+$/.test(heroImage)) throw new Error("Photo must be an https:// or /uploads/ link.");
  return { heroImage, headline: t("headline", 60) || LANDING_DEFAULTS.headline, sub: t("sub", 90) || LANDING_DEFAULTS.sub, seoTitle: t("seoTitle", 70) || LANDING_DEFAULTS.seoTitle, seoDesc: t("seoDesc", 170) || LANDING_DEFAULTS.seoDesc, keywords: t("keywords", 300) || LANDING_DEFAULTS.keywords };
}

// ───────────────────────── render ─────────────────────────

const abs = (site: string, u: string) => (/^https?:\/\//.test(u) ? u : `${site}${u.startsWith("/") ? "" : "/"}${u}`);

/** The homepage HTML: server-rendered products and reviews, SEO tags and structured data included. */
export async function renderLandingPage() {
  const { getActiveCurrency } = await import("../currency"); // server-only (reads cookies); loaded lazily so the pure helpers stay testable
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const [products, page, settings, { cur, base, enabled }, sales, reviewRows, agg] = await Promise.all([
    getLandingProducts(),
    getLandingSettings(),
    getSettings(),
    getActiveCurrency(),
    getLiveSales(),
    db.review.findMany({ where: { status: "published" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 9, include: { product: { select: { name: true } } } }).catch(() => []),
    db.review.aggregate({ where: { status: "published" }, _avg: { rating: true }, _count: true }).catch(() => ({ _avg: { rating: null }, _count: 0 })),
  ]);

  const ids = products.map((p) => p.variantId).filter((x): x is string => !!x);
  const variants = ids.length ? await db.variant.findMany({ where: { id: { in: ids }, active: true, product: { status: "ACTIVE" } }, include: { prices: true, product: { select: { slug: true } } } }) : [];
  const byId = new Map(variants.map((v) => [v.id, v]));

  const cards: CardProduct[] = products.map((p) => {
    const v = p.variantId ? byId.get(p.variantId) : undefined;
    const minor = v ? variantPrice(v, cur, base).price : p.price > 0 ? convertMinor(parseMajor(p.price.toFixed(base.exponent), base.exponent), base, cur, "price") : 0n;
    const pct = minor > 0n ? landingPercent(sales, p) : 0;
    const sale = pct ? (minor * BigInt(Math.round((100 - pct) * 100))) / 10000n : minor;
    return {
      id: p.id, name: p.name, cat: p.cat, subcat: p.subcat, icon: p.icon, bg: p.bg, tag: p.tag, image: p.image, slug: v?.product.slug,
      variantId: v?.id, minor: Number(sale), fullMinor: Number(minor), pct,
      text: minor > 0n ? formatMoney(sale, cur.code, cur.exponent) : "", fullText: pct ? formatMoney(minor, cur.code, cur.exponent) : "",
    };
  });

  const reviews: ReviewCard[] = reviewRows.map((r) => ({ name: r.name, rating: r.rating, title: r.title ?? "", body: r.body, verified: r.verified, product: r.product?.name ?? "" }));
  const bestSale = sales.reduce<{ name: string; percent: number } | null>((b, s) => (!b || s.percent > b.percent ? { name: s.name, percent: s.percent } : b), null);

  const b = settings.business;
  const socials = [b.instagram, b.pinterest, b.facebook, b.youtube].filter((u) => /^https?:\/\//.test(u));
  const image = abs(site, page.heroImage || "/hero/studio-collage.webp");
  const title = `${page.seoTitle} | ${b.name}`;
  const buyable = cards.filter((c) => c.variantId && c.minor > 0 && c.slug).slice(0, 24);
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "Organization", name: b.name, url: site, logo: `${site}/icon.svg`, ...(socials.length ? { sameAs: socials } : {}) },
    { "@context": "https://schema.org", "@type": "WebSite", name: b.name, url: site, potentialAction: { "@type": "SearchAction", target: `${site}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" } },
    {
      "@context": "https://schema.org", "@type": "ItemList", name: `${b.name} — featured products`,
      itemListElement: buyable.map((c, i) => ({
        "@type": "ListItem", position: i + 1,
        item: {
          "@type": "Product", name: c.name, url: `${site}/p/${c.slug}`, ...(c.image ? { image: abs(site, c.image) } : {}), category: c.subcat || c.cat,
          offers: { "@type": "Offer", url: `${site}/p/${c.slug}`, priceCurrency: cur.code, price: (c.minor / 10 ** cur.exponent).toFixed(cur.exponent), availability: "https://schema.org/InStock" },
        },
      })),
    },
  ];

  return buildHome({
    site, brand: b.name, tagline: b.tagline, page, title, image, cards, reviews,
    rating: { avg: agg._avg.rating ?? 0, count: agg._count },
    sale: bestSale, cur: { code: cur.code, exponent: cur.exponent }, currencies: enabled.map((c) => c.code), jsonLd,
    whatsapp: b.whatsapp.replace(/\D/g, ""),
  });
}
