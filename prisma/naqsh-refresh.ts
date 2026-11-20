/* eslint-disable no-console */
// One-time switch of an existing store to the "Stencil and Gift Studio" design (the Naqsh look), run during `vercel-build`
// (after seed-if-empty and catalog-refresh) or by hand: `npx tsx prisma/naqsh-refresh.ts`. Marker: Setting "naqshRebrand".
//   1. brand name, theme, fonts, announcement, splash and Google title/description are switched (only if they were saved before);
//   2. the old homepage layout and menu are reset so the new Naqsh homepage and menu (Stencils · Gifts · Custom T-Shirts · Cybersigilism Art) show;
//   3. the new categories are created and every existing product is also placed in the matching new stencil category;
//   4. ~46 sample products (stencils, gift baskets, T-shirts, cybersigilism art) are added with size dropdowns —
//      stencil sizes, T-shirt sizes (XS–5XL, youth) and gift sizes (Small–Deluxe). They carry source = SEED so the owner can bulk-delete or replace them.
// Never touches orders, customers, reviews, accounts or staff. Skip with NAQSH_REFRESH=false.
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "../lib/db-url";
import { DEFAULT_MENU_TEXT, parseMenu, slugify } from "../lib/storefront";
import { SIZE_SETS, type SizeSetKey } from "../lib/sizes";

const VERSION = "naqsh-v1";
const db = new PrismaClient({ datasourceUrl: databaseUrl() });

type Seed = { name: string; cat: string; sub: string; price: number; old: number; tag: string; desc: string; art: string };

const ROOT: Record<string, string> = { Stencils: "Stencils", Gifts: "Gifts", "Custom T-Shirts": "Custom T-Shirts", "Cybersigilism Art": "Cybersigilism Art" };
// old collection slug → new category it should also appear in
const OLD_TO_NEW: Record<string, string> = {
  "mandala-designs": "mandala-stencils", "floral-and-motif-designs": "floral-stencils", "all-calligraphy-stencils": "calligraphy-stencils",
  "entire-surah": "calligraphy-stencils", tasbih: "calligraphy-stencils", "quran-verses": "calligraphy-stencils", "sacred-names": "calligraphy-stencils",
  "ayat-ul-kursi": "calligraphy-stencils", "4-qul": "calligraphy-stencils", "quranic-panels": "calligraphy-stencils", "kaaba-inspired-calligraphy": "calligraphy-stencils",
  "pattern-and-texture": "geometric-stencils", "borders-and-corners": "wall-and-decor-stencils", "wall-and-canvas-stencils": "wall-and-decor-stencils",
};

const marked = async () => ((await db.setting.findUnique({ where: { key: "naqshRebrand" } }))?.value as { version?: string } | null)?.version === VERSION;

async function merge(key: string, patch: Record<string, unknown>) {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return; // nothing saved: the new defaults already apply
  await db.setting.update({ where: { key }, data: { value: { ...(row.value as object), ...patch } as object } });
}

function setFor(p: Seed): SizeSetKey {
  if (/apparel|t-?shirt|tee/i.test(p.sub)) return "tee";
  if (p.cat === "Gifts") return "gift";
  if (p.cat === "Stencils") return "stencil";
  return "single";
}

async function main() {
  if (process.env.NAQSH_REFRESH === "false") return console.log("naqsh-refresh: skipped (NAQSH_REFRESH=false).");
  if (await marked()) return console.log("naqsh-refresh: already applied.");
  const base = await db.currency.findFirst({ where: { isBase: true } });
  if (!base) return console.log("naqsh-refresh: store not set up yet — skipping.");
  const usd = await db.currency.findUnique({ where: { code: "USD" } });

  // 1 + 2. look, name, menu, homepage
  await merge("business", { name: "Stencil and Gift Studio", tagline: "Stencils · Gifts · Custom tees · Art" });
  await merge("theme", { preset: "naqsh", accent: "", header: "", highlight: "", displayFont: "Cormorant Garamond", bodyFont: "Jost" });
  await merge("announcement", { enabled: true, text: "Your ideas, made real" });
  await merge("splash", { enabled: true, style: "naqsh" });
  await merge("seo", { title: "Stencil and Gift Studio — Stencils, Gifts, Custom Tees & Art", description: "Reusable stencils, thoughtful gift baskets, custom T-shirts and bold cybersigilism art. Your favorite ideas, made into real things." });
  await db.setting.deleteMany({ where: { key: { in: ["storeHome", "storeMenu", "hero"] } } });

  // 3. categories
  const menu = parseMenu(DEFAULT_MENU_TEXT);
  let sort = (await db.collection.aggregate({ _max: { sort: true } }))._max.sort ?? 0;
  const names = new Map<string, string>();
  for (const m of menu) for (const x of [m, ...m.children]) names.set(slugify(x.label), x.label);
  for (const [slug, name] of names) {
    await db.collection.upsert({ where: { slug }, update: {}, create: { slug, name, type: "STYLE", sort: ++sort, seoTitle: name, seoDesc: `Shop ${name} — Stencil and Gift Studio.` } });
  }
  const col = new Map((await db.collection.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));

  // existing products also appear in the matching new stencil category (nothing is removed from the old ones)
  const existing = await db.product.findMany({ where: { source: { not: "SEED" } }, select: { id: true, collections: { select: { collection: { select: { slug: true } } } } } });
  const have = new Set<string>();
  for (const e of existing) {
    const targets = new Set<string>();
    for (const c of e.collections) {
      const slug = c.collection.slug;
      if (slug in OLD_TO_NEW) targets.add(OLD_TO_NEW[slug]);
      if (col.has(slug) && slug !== "stencils") have.add(e.id);
    }
    if (!targets.size && !have.has(e.id)) targets.add("wall-and-decor-stencils");
    for (const t of targets) {
      const cid = col.get(t);
      if (cid) await db.productCollection.upsert({ where: { productId_collectionId: { productId: e.id, collectionId: cid } }, update: {}, create: { productId: e.id, collectionId: cid } });
    }
  }

  // 4. sample products
  const seeds: Seed[] = JSON.parse(readFileSync(path.join(process.cwd(), "prisma", "naqsh-products.json"), "utf8"));
  const toBase = (usdMajor: number) => {
    const major = base.code === "USD" || !usd ? usdMajor : usdMajor / usd.rate;
    const m = base.exponent === 0 ? Math.round(major) : Math.round(major * 10 ** base.exponent) / 10 ** base.exponent;
    return BigInt(Math.round(m * 10 ** base.exponent));
  };
  let added = 0;
  for (const [i, p] of seeds.entries()) {
    const slug = slugify(p.name);
    if (await db.product.findUnique({ where: { slug }, select: { id: true } })) continue;
    const set = SIZE_SETS[setFor(p)];
    const sku = `NQ-${String(i + 1).padStart(3, "0")}`;
    const cids = [ROOT[p.cat], p.sub].map((n) => col.get(slugify(n))).filter((x): x is string => Boolean(x));
    await db.product.create({
      data: {
        name: p.name, slug, type: "MADE_TO_ORDER", status: "ACTIVE", source: "SEED", shortDesc: p.desc, description: p.desc,
        tags: [slugify(p.sub)], seoTitle: p.name, featured: /BESTSELLER|POPULAR|TRENDING/.test(p.tag),
        collections: { create: [...new Set(cids)].map((collectionId) => ({ collectionId })) },
        images: { create: [{ url: p.art, alt: p.name, sort: 0 }] },
        variants: {
          create: set.options.map((o, k) => ({
            sku: `${sku}-${o.tag}`, name: o.label, ...(o.mm ? { widthMm: o.mm, heightMm: o.mm } : {}),
            basePrice: toBase(Math.round(p.price * o.mult * 100) / 100), compareAt: p.old ? toBase(Math.round(p.old * o.mult * 100) / 100) : null, sort: k,
          })),
        },
      },
    });
    added++;
  }

  const value = { version: VERSION, at: new Date().toISOString() };
  await db.setting.upsert({ where: { key: "naqshRebrand" }, create: { key: "naqshRebrand", value }, update: { value } });
  console.log(`naqsh-refresh: applied (${names.size} categories, ${added} sample products added).`);
}

main().catch((e) => console.error("naqsh-refresh: failed —", e instanceof Error ? e.message : e)).finally(() => db.$disconnect());
