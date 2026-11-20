/* eslint-disable no-console */
// One-time catalogue swap, run during `vercel-build` (after seed-if-empty):
//   1. removes the generated demo products — only ones that have NO photo and were never ordered or purchased —
//      and posts a balanced journal that takes their stock value back out of the books;
//   2. adds a starter catalogue with real (free-licence) photos, grouped like a classic stencil shop;
//   3. gives the homepage rows banner photos.
// Runs once (marker: Setting "catalogRefresh"). Never touches orders, customers, reviews, settings or staff.
// Skip with CATALOG_REFRESH=false.
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "../lib/db-url";
import { ACC, postJournal } from "../lib/accounting";
import { COLLECTIONS, PRODUCTS, SIZES, type Group } from "./catalog-data";
import { HOME_DEFAULTS } from "../lib/storefront";

const VERSION = "cc-catalog-v1";
const db = new PrismaClient({ datasourceUrl: databaseUrl() });

const OLD_DEMO_COLLECTIONS = [
  "wall", "furniture", "floor-tile", "cake-cookie", "coffee", "fabric", "sign-logo", "craft-journal", "moroccan", "floral", "geometric", "mandala",
  "lettering", "seasonal", "kids", "nature", "tools", "kits", "christmas", "eid-ramadan", "halloween", "valentines", "easter",
];

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const round50 = (n: number) => Math.round(n / 50) * 50;

function photosOf(group: Group): string[] {
  const dir = path.join(process.cwd(), "public", "catalog");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => new RegExp(`^${group}-\\d+\\.jpg$`).test(f)).sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, ""))).map((f) => `/catalog/${f}`);
}

async function main() {
  if (process.env.CATALOG_REFRESH === "false") return console.log("catalog-refresh: skipped (CATALOG_REFRESH=false).");
  const done = await db.setting.findUnique({ where: { key: "catalogRefresh" } });
  if ((done?.value as { version?: string } | null)?.version === VERSION) return console.log("catalog-refresh: already applied.");
  if ((await db.currency.count()) === 0) return console.log("catalog-refresh: store not set up yet — skipping.");

  // ── 1. remove the demo products (no photo, never ordered or purchased) ──
  const demo = await db.product.findMany({
    where: { images: { none: {} }, variants: { none: { OR: [{ orderItems: { some: {} } }, { poLines: { some: {} } }] } } },
    select: { id: true, variants: { select: { onHand: true, avgCost: true, isDigital: true } } },
  });
  let stockValue = 0n;
  for (const p of demo) for (const v of p.variants) if (!v.isDigital && v.onHand > 0) stockValue += v.avgCost * BigInt(v.onHand);
  for (let i = 0; i < demo.length; i += 100) await db.product.deleteMany({ where: { id: { in: demo.slice(i, i + 100).map((p) => p.id) } } });
  if (stockValue > 0n) {
    await db.$transaction((tx) =>
      postJournal(tx, {
        memo: "Removed demo products — stock value taken out of inventory",
        sourceType: "adjustment",
        lines: [{ code: ACC.CAPITAL, debit: stockValue }, { code: ACC.INV_FINISHED, credit: stockValue }],
      }),
    );
  }
  await db.projectStory.updateMany({ data: { productSlugs: [] } });
  await db.setting.upsert({ where: { key: "landingProducts" }, create: { key: "landingProducts", value: [] }, update: { value: [] } });
  console.log(`catalog-refresh: removed ${demo.length} demo products (stock value ${stockValue}).`);

  // ── 2. collections + products ──
  const pkr = await db.currency.findUnique({ where: { code: "PKR" } });
  const perPkr = pkr && pkr.rate > 0 ? 1 / pkr.rate : 1; // base units per 1 PKR
  const minor = (rupees: number) => BigInt(Math.round(rupees * perPkr * 100));
  const maxSort = (await db.collection.aggregate({ _max: { sort: true } }))._max.sort ?? 0;
  const colId: Record<string, string> = {};
  for (const [i, c] of COLLECTIONS.entries()) {
    const row = await db.collection.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, type: "STYLE", description: c.description, sort: maxSort + i + 1, seoTitle: c.name, seoDesc: c.description },
      update: { description: c.description },
    });
    colId[c.slug] = row.id;
  }

  const photoCache = new Map<Group, string[]>();
  const photos = (g: Group) => photoCache.get(g) ?? (photoCache.set(g, photosOf(g)), photoCache.get(g)!);
  const seen = new Map<Group, number>();
  let n = 0;
  for (const [idx, p] of PRODUCTS.entries()) {
    const slug = slugify(p.name);
    if (await db.product.findUnique({ where: { slug }, select: { id: true } })) continue;
    const pics = photos(p.group);
    const k = seen.get(p.group) ?? 0;
    seen.set(p.group, k + 1);
    const imgs = pics.length ? [pics[k % pics.length], ...(pics.length > 1 ? [pics[(k + 1) % pics.length]] : [])] : [];
    const sku = `CC-${101 + idx}`;
    const single = p.kind === "single";
    await db.product.create({
      data: {
        name: p.name, slug, type: "MADE_TO_ORDER", status: imgs.length ? "ACTIVE" : "DRAFT", source: "MANUAL",
        shortDesc: p.blurb, featured: k === 0,
        description: `${p.blurb}\n\n${single ? "" : "Cut from durable, reusable mylar. Choose your size from the list — custom sizes are available on request.\n\n**How to use:** fix the stencil with low-tack tape, load a roller or brush with very little paint, offload on a paper towel and dab or roll with light pressure.\n\nSee how to care for it under *Material & Care*."}`,
        tags: [p.group, ...p.collection.split("-").filter((w) => w.length > 3)],
        seoTitle: p.name, seoDesc: `${p.name}. ${p.blurb}`.slice(0, 160),
        collections: { create: [{ collectionId: colId[p.collection] }] },
        images: { create: imgs.map((url, i) => ({ url, alt: p.name, sort: i })) },
        variants: {
          create: single
            ? [{ sku: `${sku}-1`, name: "Standard", basePrice: minor(p.price), compareAt: minor(p.price * 2), sort: 0 }]
            : SIZES.map((s, i) => {
                const price = round50(p.price * s.mult);
                return { sku: `${sku}-${s.w >= 900 ? 36 : s.w >= 600 ? 24 : s.w >= 450 ? 18 : 12}`, name: s.label, widthMm: s.w, heightMm: s.h, basePrice: minor(price), compareAt: minor(price * 2), sort: i };
              }),
        },
      },
    });
    n++;
  }
  console.log(`catalog-refresh: added ${n} products in ${COLLECTIONS.length} collections.`);

  // tidy up the demo collections that are now empty
  const stale = await db.collection.findMany({ where: { slug: { in: OLD_DEMO_COLLECTIONS }, products: { none: {} } }, select: { id: true } });
  if (stale.length) await db.collection.deleteMany({ where: { id: { in: stale.map((c) => c.id) } } });

  // ── 3. homepage banners ──
  const banner = (g: Group) => photos(g)[0] ?? "";
  const rows = HOME_DEFAULTS.rows.map((r) => ({
    ...r,
    banner: r.collection === "carpet-design-stencils" ? banner("carpet") : r.collection === "all-calligraphy-stencils" ? banner("calligraphy") : r.collection === "wall-and-canvas-stencils" ? banner("mandala") : r.collection === "all-art-and-craft-stencils" ? banner("fabric") : r.collection === "furniture-stencils" ? banner("furniture") : "",
  }));
  const cur = ((await db.setting.findUnique({ where: { key: "storeHome" } }))?.value ?? {}) as Record<string, unknown>;
  if (!Array.isArray(cur.rows) || cur.rows.every((r: { banner?: string }) => !r.banner)) {
    const value = JSON.parse(JSON.stringify({ ...cur, rows }));
    await db.setting.upsert({ where: { key: "storeHome" }, create: { key: "storeHome", value }, update: { value } });
  }

  const value = { version: VERSION, at: new Date().toISOString(), removed: demo.length, added: n };
  await db.setting.upsert({ where: { key: "catalogRefresh" }, create: { key: "catalogRefresh", value }, update: { value } });
}

main()
  .catch((e) => {
    // never block a deploy because of the catalogue swap — it retries on the next build
    console.error("catalog-refresh: failed —", e instanceof Error ? e.message : e);
  })
  .finally(() => db.$disconnect());
