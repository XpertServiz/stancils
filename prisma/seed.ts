/* eslint-disable no-console */
// Seeds an original, fully stocked catalogue (procedurally generated artwork — no third-party
// images or copy), the chart of accounts, currencies, shipping, content and an admin user.
// Set SEED_DEMO=true to also create demo customers/orders (for testing only — do not use in production).
import { PrismaClient, type ProductType } from "@prisma/client";
import { databaseUrl } from "../lib/db-url";
import bcrypt from "bcryptjs";
import { CHART, ACC, postJournal } from "../lib/accounting";
import * as D from "../lib/designs";

const db = new PrismaClient({ datasourceUrl: databaseUrl() });
const BASE = (process.env.SEED_BASE_CURRENCY || "PKR").toUpperCase();

// rates expressed as "units per 1 PKR"; re-based below if another base is chosen
const PER_PKR: Record<string, number> = { PKR: 1, USD: 1 / 280, EUR: 1 / 303, GBP: 1 / 356, AED: 1 / 76.2, CAD: 1 / 203, AUD: 1 / 184, SAR: 1 / 74.6 };
const CURRENCIES = [
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", rounding: "NEAREST_50" },
  { code: "USD", name: "US Dollar", symbol: "$", rounding: "END_99" },
  { code: "EUR", name: "Euro", symbol: "€", rounding: "END_99" },
  { code: "GBP", name: "British Pound", symbol: "£", rounding: "END_99" },
  { code: "AED", name: "UAE Dirham", symbol: "AED", rounding: "NEAREST_1" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rounding: "END_99" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rounding: "END_99" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", rounding: "NEAREST_1" },
] as const;

const rateFromBase = (code: string) => PER_PKR[code] / PER_PKR[BASE];
/** PKR major amount → base minor units */
const P = (pkr: number) => BigInt(Math.round(pkr * PER_PKR[BASE] * 100));

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const used = new Set<string>();
const uniqSlug = (s: string) => {
  let x = slugify(s);
  let i = 2;
  while (used.has(x)) x = `${slugify(s)}-${i++}`;
  used.add(x);
  return x;
};

async function reset() {
  // order matters because of FKs; journal lines are immutable so drop via TRUNCATE
  await db.$executeRawUnsafe(`DO $$ DECLARE r RECORD; BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations') LOOP
      EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE';
    END LOOP; END $$;`);
}

async function main() {
  console.log(`Seeding (base currency ${BASE})…`);
  await reset();

  // ── currencies ──
  for (const [i, c] of CURRENCIES.entries()) {
    await db.currency.create({
      data: { code: c.code, name: c.name, symbol: c.symbol, exponent: 2, isBase: c.code === BASE, rate: rateFromBase(c.code), rounding: c.code === BASE ? "NONE" : c.rounding, enabled: ["PKR", "USD", "EUR", "GBP", "AED"].includes(c.code), sort: i },
    });
    await db.fxRate.create({ data: { code: c.code, rate: rateFromBase(c.code), source: "seed" } });
  }

  // ── accounts & admin ──
  await db.account.createMany({ data: CHART.map((a) => ({ ...a, isSystem: true })) });
  const admin = await db.staffUser.create({
    data: {
      name: "Owner",
      email: (process.env.ADMIN_EMAIL || "admin@creativecorner.local").toLowerCase(),
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "ChangeMe123!", 10),
      role: "super_admin",
    },
  });

  // ── materials (raw) ──
  const mats = {
    m5: { code: "MYL-5", name: "Mylar 5 mil (0.125 mm)", kind: "MYLAR", thicknessUm: 125, costPerK: P(2.2), rate: P(40), minBridgeMm: 1.2 },
    m7: { code: "MYL-7", name: "Mylar 7 mil (0.19 mm)", kind: "MYLAR", thicknessUm: 190, costPerK: P(2.9), rate: P(48), minBridgeMm: 1.5 },
    m10: { code: "MYL-10", name: "Mylar 10 mil (0.25 mm)", kind: "MYLAR", thicknessUm: 254, costPerK: P(3.8), rate: P(58), minBridgeMm: 1.8 },
    m14: { code: "MYL-14", name: "Mylar 14 mil (0.35 mm)", kind: "MYLAR", thicknessUm: 356, costPerK: P(5.1), rate: P(72), minBridgeMm: 2.2 },
    pet: { code: "PET-FG", name: "Food-grade PET 0.25 mm", kind: "PET", thicknessUm: 250, costPerK: P(4.5), rate: P(70), minBridgeMm: 1.8, foodSafe: true },
    steel: { code: "SS-304", name: "Stainless steel 304 (0.4 mm)", kind: "STEEL", thicknessUm: 400, costPerK: P(28), rate: P(240), minBridgeMm: 1.0, foodSafe: true },
    vinyl: { code: "VNL-ADH", name: "Adhesive stencil vinyl", kind: "VINYL", thicknessUm: 80, costPerK: P(2.6), rate: P(38), minBridgeMm: 1.0 },
  };
  const matIds: Record<string, string> = {};
  let rawValue = 0n;
  for (const [k, m] of Object.entries(mats)) {
    const onHand = k === "steel" ? 20000 : 300000; // cm²
    const created = await db.material.create({
      data: { code: m.code, name: m.name, kind: m.kind, thicknessUm: m.thicknessUm, foodSafe: "foodSafe" in m ? m.foodSafe : false, unit: "cm2", costPerK: m.costPerK, onHand, reorderLevel: k === "steel" ? 4000 : 40000, minBridgeMm: m.minBridgeMm, rateCm2Base: m.rate },
    });
    matIds[k] = created.id;
    await db.stockMovement.create({ data: { materialId: created.id, qty: onHand, unitCost: m.costPerK, type: "OPENING", note: "Opening balance", byId: admin.id } });
    rawValue += (BigInt(onHand) * m.costPerK) / 1000n;
  }
  for (const pk of [
    { code: "PKG-BOARD", name: "Backing board", kind: "PACKAGING", cost: 18 },
    { code: "PKG-SLEEVE", name: "Clear sleeve", kind: "PACKAGING", cost: 9 },
  ]) {
    const created = await db.material.create({ data: { code: pk.code, name: pk.name, kind: pk.kind, unit: "pcs", costPerK: P(pk.cost * 1000), onHand: 2000, reorderLevel: 200 } });
    matIds[pk.code] = created.id;
    await db.stockMovement.create({ data: { materialId: created.id, qty: 2000, unitCost: P(pk.cost * 1000), type: "OPENING", note: "Opening balance", byId: admin.id } });
    rawValue += 2000n * P(pk.cost);
  }

  // ── collections ──
  const COLS = [
    ["wall", "Wall", "SURFACE", "Allover patterns and feature motifs for accent walls.", "🧱"],
    ["furniture", "Furniture", "SURFACE", "Refresh dressers, tables and doors.", "🪑"],
    ["floor-tile", "Floor & Tile", "SURFACE", "Tile looks for floors, patios and stairs.", "◼"],
    ["cake-cookie", "Cake & Cookie", "SURFACE", "Food-safe stencils for icing, dusting and airbrush.", "🍪"],
    ["coffee", "Coffee & Latte", "SURFACE", "Cocoa and cinnamon art for cafés and home baristas.", "☕"],
    ["fabric", "Fabric", "SURFACE", "Tote bags, tees and cushions.", "🧵"],
    ["sign-logo", "Sign & Logo", "SURFACE", "Lettering, numbers and signage.", "🔤"],
    ["craft-journal", "Craft & Journal", "SURFACE", "Mini stencils for cards, journals and mixed media.", "✂"],
    ["moroccan", "Moroccan", "STYLE", "Lattices, quatrefoils and ogees.", null],
    ["floral", "Floral", "STYLE", "Botanical silhouettes and blooms.", null],
    ["geometric", "Geometric", "STYLE", "Diamonds, hexagons, chevrons and dots.", null],
    ["mandala", "Mandala", "STYLE", "Radial designs with built-in bridges.", null],
    ["lettering", "Lettering", "STYLE", "Words, alphabets and numbers.", null],
    ["seasonal", "Seasonal", "STYLE", "Christmas, Eid, Halloween, Easter and more.", null],
    ["kids", "Kids", "STYLE", "Playful motifs for nurseries and play rooms.", null],
    ["nature", "Nature", "STYLE", "Palms, ferns, waves, mountains and birds.", null],
    ["tools", "Tools & Supplies", "OCCASION", "Brushes, rollers, adhesive and paint.", null],
    ["kits", "Kits & Bundles", "OCCASION", "Everything you need in one box.", null],
    ["christmas", "Christmas", "OCCASION", null, null],
    ["eid-ramadan", "Eid & Ramadan", "OCCASION", null, null],
    ["halloween", "Halloween", "OCCASION", null, null],
    ["valentines", "Valentine's Day", "OCCASION", null, null],
    ["easter", "Easter", "OCCASION", null, null],
  ] as const;
  const col: Record<string, string> = {};
  for (const [i, [slug, name, type, description, icon]] of COLS.entries()) {
    const c = await db.collection.create({ data: { slug, name, type, description, icon, sort: i, seoTitle: `${name} Stencils`, seoDesc: description ?? undefined } });
    col[slug] = c.id;
  }

  // ── products ──
  let skuN = 1000;
  let finishedValue = 0n;
  type Size = { label: string; w: number; h: number; price: number };
  const WALL_SIZES: Size[] = [
    { label: "S · 20×20 cm", w: 200, h: 200, price: 1800 },
    { label: "M · 30×30 cm", w: 300, h: 300, price: 2800 },
    { label: "L · 45×45 cm", w: 450, h: 450, price: 4200 },
    { label: "XL · 60×60 cm", w: 600, h: 600, price: 6500 },
  ];
  const SMALL_SIZES: Size[] = [
    { label: "10×10 cm", w: 100, h: 100, price: 900 },
    { label: "15×15 cm", w: 150, h: 150, price: 1200 },
  ];
  const COFFEE_SIZES: Size[] = [
    { label: "Ø 9 cm (cup)", w: 90, h: 90, price: 1100 },
    { label: "Ø 11 cm (mug)", w: 110, h: 110, price: 1300 },
  ];

  const passport = (matKey: keyof typeof mats, reuse: string, extra: Record<string, unknown> = {}) => ({
    material: mats[matKey].name,
    thicknessUm: mats[matKey].thicknessUm,
    minBridgeMm: mats[matKey].minBridgeMm,
    finestDetailMm: Math.max(0.8, mats[matKey].minBridgeMm - 0.4),
    reuse,
    foodSafe: "foodSafe" in mats[matKey] ? Boolean((mats[matKey] as { foodSafe?: boolean }).foodSafe) : false,
    cleaning: matKey === "steel" ? "Dishwasher-safe. Dry immediately." : "Rinse with warm soapy water, lay flat to dry.",
    ...extra,
  });

  // Products are queued, then written with limited concurrency: on a remote database each write is a
  // network round trip, so one-by-one seeding is very slow on a first Vercel deploy.
  const jobs: (() => Promise<unknown>)[] = [];
  const queue = (p: Parameters<typeof addProduct>[0]) => {
    jobs.push(() => addProduct(p));
  };

  async function addProduct(p: {
    name: string; type: ProductType; design?: D.Design | null; svg?: string; cols: string[]; sizes: Size[]; mat: keyof typeof mats;
    tags?: string[]; digital?: boolean; foodSafe?: boolean; desc: string; short: string; featured?: boolean; repeat?: boolean; stock?: boolean;
  }) {
    const slug = uniqSlug(p.name);
    const layers = p.design?.layers ?? 1;
    const colors = ["#FF7A59", "#5EE6C0", "#F5C451"].slice(0, layers);
    const product = await db.product.create({
      data: {
        slug, name: p.name, type: p.type, status: "ACTIVE", source: "SEED", shortDesc: p.short, description: p.desc,
        designSvg: p.design?.svg ?? p.svg ?? null, layers, layerColors: colors, tags: p.tags ?? [], foodSafe: !!p.foodSafe,
        featured: !!p.featured, repeatWmm: p.repeat ? p.sizes[1]?.w ?? 300 : null, repeatHmm: p.repeat ? p.sizes[1]?.h ?? 300 : null,
        passport: p.type === "TOOL" ? undefined : passport(p.mat, p.mat === "steel" ? "Lifetime with care" : p.mat === "pet" ? "100+ uses" : "50–200 uses"),
        hsCode: p.type === "TOOL" ? "9603.40" : "3920.62", needsReview: true,
        seoTitle: `${p.name} | Creative Corner`, seoDesc: p.short,
        collections: { create: p.cols.filter((c) => col[c]).map((c) => ({ collectionId: col[c] })) },
      },
    });
    let sort = 0;
    for (const s of p.sizes) {
      const sku = `CC-${skuN++}`;
      const tracked = p.type === "STOCK_PHYSICAL" || p.type === "TOOL";
      const onHand = tracked && p.stock !== false ? 8 + ((skuN * 7) % 40) : 0;
      const unitCost = P(Math.round(s.price * 0.28));
      const v = await db.variant.create({
        data: {
          productId: product.id, sku, name: s.label, widthMm: s.w || null, heightMm: s.h || null, materialId: p.type === "TOOL" ? null : matIds[p.mat],
          thicknessUm: p.type === "TOOL" ? null : mats[p.mat].thicknessUm, basePrice: P(s.price), compareAt: skuN % 9 === 0 ? P(Math.round(s.price * 1.25)) : null,
          avgCost: unitCost, onHand, reorderLevel: 4, weightG: Math.max(40, Math.round((s.w * s.h) / 2500)), sort: sort++,
        },
      });
      if (onHand > 0) {
        await db.stockMovement.create({ data: { variantId: v.id, qty: onHand, unitCost, type: "OPENING", note: "Opening balance", byId: admin.id } });
        finishedValue += unitCost * BigInt(onHand);
      }
      if (p.type === "MADE_TO_ORDER" && s.w && s.h) {
        await db.bomLine.createMany({
          data: [
            { variantId: v.id, materialId: matIds[p.mat], qty: Math.ceil(((s.w + 20) * (s.h + 20)) / 100) },
            { variantId: v.id, materialId: matIds["PKG-BOARD"], qty: 1 },
            { variantId: v.id, materialId: matIds["PKG-SLEEVE"], qty: 1 },
          ],
        });
      }
    }
    if (p.digital) {
      await db.variant.create({ data: { productId: product.id, sku: `CC-${skuN++}-D`, name: "Digital cut file (SVG · personal licence)", isDigital: true, basePrice: P(700), avgCost: 0n, sort: 99 } });
    }
    return product;
  }

  const desc = (what: string, where: string, extra = "") =>
    `${what} Laser-cut from premium reusable film with built-in bridges, so every shape stays crisp and nothing falls out. ${where} ${extra}`.trim() +
    `\n\nHow to use: fix the stencil with repositionable adhesive or low-tack tape, load a dense roller or stencil brush with very little paint, offload on paper towel, then dab or roll with light pressure. Lift straight off and reposition using the registration edges.`;

  const MANDALA_NAMES = ["Lotus", "Saffron", "Jasmine", "Marigold", "Henna", "Sunburst", "Kaleido", "Rangoli", "Medallion", "Halo", "Compass", "Bloom", "Orbit", "Prism", "Chakra", "Nova", "Aster", "Dahlia", "Zinnia", "Solstice", "Ember", "Spiral", "Vega", "Lyra", "Indus", "Kohinoor", "Peacock", "Tara", "Shalimar", "Noor"];
  const MOROCCAN_NAMES = ["Marrakech", "Fez", "Tangier", "Rabat", "Casablanca", "Essaouira", "Agadir", "Chefchaouen", "Meknes", "Atlas", "Souk", "Riad", "Zellige", "Medina", "Kasbah", "Sahara", "Andalus", "Granada", "Alhambra", "Seville", "Cordoba", "Lahore", "Multan", "Shiraz", "Isfahan", "Tabriz", "Bukhara", "Samarkand", "Kairouan", "Tlemcen"];
  const GEO_NAMES = ["Harlequin", "Honeycomb", "Polka", "Prism", "Chevron", "Scallop", "Argyle", "Facet", "Delta", "Mosaic", "Pixel", "Bauhaus", "Deco", "Lattice", "Kite", "Trellis", "Quartz", "Ripple", "Tessera", "Origami", "Shard", "Gem", "Apex", "Vertex", "Grid", "Zigzag", "Pebble", "Domino", "Petal Scale", "Fan"];
  const FLORAL_NAMES = ["Wild Poppy", "Cherry Blossom", "Daisy Chain", "Sunflower", "Tulip Field", "Peony", "Rose Garden", "Lavender", "Camellia", "Orchid", "Magnolia", "Cosmos", "Anemone", "Primrose", "Iris", "Hibiscus", "Lily", "Wildflower", "Gardenia", "Clover", "Bluebell", "Buttercup", "Foxglove", "Hollyhock", "Freesia"];
  for (let i = 0; i < 30; i++) {
    const layered = i % 5 === 0;
    queue({
      name: `${MANDALA_NAMES[i]} Mandala ${layered ? "Layered " : ""}Stencil`, type: i % 3 === 0 ? "MADE_TO_ORDER" : "STOCK_PHYSICAL",
      design: D.mandala(1000 + i, layered), cols: ["mandala", "wall", i % 2 ? "furniture" : "floor-tile", "craft-journal"], sizes: WALL_SIZES, mat: "m10",
      tags: ["mandala", "boho", layered ? "multi-layer" : "single-layer"], digital: true, featured: i < 3,
      short: `${layered ? "3-layer" : "Single-layer"} ${MANDALA_NAMES[i].toLowerCase()} mandala for walls, floors, tables and canvases.`,
      desc: desc(`A balanced ${MANDALA_NAMES[i].toLowerCase()} mandala with radial bridges built into the design.`, "Perfect as a feature motif above a bed, on a tabletop, on floor tiles or on a canvas.", layered ? "Comes as three registered layers so you can paint each ring in its own colour." : ""),
    });
  }
  for (let i = 0; i < 30; i++) {
    queue({
      name: `${MOROCCAN_NAMES[i]} Allover Wall Stencil`, type: i % 4 === 0 ? "MADE_TO_ORDER" : "STOCK_PHYSICAL", design: D.moroccan(2000 + i),
      cols: ["moroccan", "wall", "floor-tile"], sizes: WALL_SIZES, mat: "m10", tags: ["allover", "moroccan", "repeat"], digital: true, repeat: true, featured: i < 2,
      short: `Repeating ${MOROCCAN_NAMES[i]} lattice that tiles seamlessly across a whole wall.`,
      desc: desc(`An allover ${MOROCCAN_NAMES[i]} lattice with alignment edges for a seamless repeat.`, "Use it for a full accent wall, a stair riser run or a patio floor.", "Use the repeat calculator on this page to see how many placements your wall needs."),
    });
  }
  for (let i = 0; i < 30; i++) {
    const d = D.geometric(3000 + i);
    queue({
      name: `${GEO_NAMES[i]} Geometric Stencil`, type: "STOCK_PHYSICAL", design: d, cols: ["geometric", "wall", i % 2 ? "fabric" : "furniture"], sizes: WALL_SIZES,
      mat: i % 3 ? "m10" : "m7", tags: ["geometric", d.motif, "modern"], digital: true, repeat: true,
      short: `Modern ${d.motif} pattern — crisp, graphic and easy to repeat.`,
      desc: desc(`A clean ${d.motif} repeat in a modern geometric style.`, "Great on walls, cabinet doors, rugs and fabric."),
    });
  }
  for (let i = 0; i < 25; i++) {
    const layered = i % 4 === 0;
    queue({
      name: `${FLORAL_NAMES[i]} ${layered ? "Layered " : ""}Stencil`, type: i % 3 === 0 ? "MADE_TO_ORDER" : "STOCK_PHYSICAL", design: D.floral(4000 + i, layered),
      cols: ["floral", "wall", "furniture", "fabric", "craft-journal"], sizes: WALL_SIZES.slice(0, 3), mat: "m7", tags: ["floral", "botanical"], digital: true,
      short: `${FLORAL_NAMES[i]} botanical silhouette for walls, furniture and fabric.`,
      desc: desc(`A ${FLORAL_NAMES[i].toLowerCase()} botanical design with flowing stems and leaves.`, "Lovely on nursery walls, wardrobe doors, tote bags and cushions.", layered ? "Two layers: blooms and foliage, for a two-colour finish." : ""),
    });
  }
  const NATURE_NAMES = ["Tropical Palm", "Fern Frond", "Ocean Waves", "Mountain Range", "Flying Birds", "Boho Feather"];
  for (let i = 0; i < 25; i++) {
    const d = D.nature(5000 + i);
    const base = { palm: "Tropical Palm", fern: "Fern Frond", waves: "Ocean Waves", mountains: "Mountain Range", birds: "Flying Birds", feather: "Boho Feather" }[d.motif] ?? NATURE_NAMES[i % 6];
    queue({
      name: `${base} Stencil No. ${i + 1}`, type: "STOCK_PHYSICAL", design: d, cols: ["nature", "wall", "furniture", "fabric"], sizes: WALL_SIZES.slice(0, 3),
      mat: "m10", tags: ["nature", d.motif], digital: true,
      short: `${base} motif — calm, natural and great for feature walls.`,
      desc: desc(`A ${base.toLowerCase()} design inspired by the outdoors.`, "Try it on a bathroom wall, a headboard or a canvas."),
    });
  }
  const COFFEE_NAMES: Record<string, string> = { heart: "Latte Heart", rosetta: "Rosetta Leaf", star: "Lucky Star", snowflake: "Winter Snowflake", smile: "Happy Face", paw: "Puppy Paw", crown: "Royal Crown", moon: "Crescent & Star", flower: "Blossom", cup: "Steaming Cup" };
  let coffeeI = 0;
  for (const motif of Object.keys(COFFEE_NAMES)) {
    for (const mat of ["pet", "steel"] as const) {
      for (let k = 0; k < 2; k++) {
        queue({
          name: `${COFFEE_NAMES[motif]} Coffee Stencil${mat === "steel" ? " — Stainless" : ""}${k ? " (Café 4-pack)" : ""}`, type: "STOCK_PHYSICAL",
          design: D.coffee(6000 + coffeeI++, motif as never), cols: ["coffee", "cake-cookie"], sizes: COFFEE_SIZES.map((s) => ({ ...s, price: Math.round(s.price * (mat === "steel" ? 2.6 : 1) * (k ? 3.2 : 1)) })),
          mat, tags: ["coffee", "latte", "food-safe", motif], foodSafe: true, featured: coffeeI < 3,
          short: `Food-safe ${COFFEE_NAMES[motif].toLowerCase()} for cocoa, cinnamon and matcha art${k ? " — four stencils for busy bars" : ""}.`,
          desc: `Hold the ${mat === "steel" ? "stainless steel" : "food-grade PET"} stencil just above the crema and dust with cocoa, cinnamon or matcha through a fine shaker. ${mat === "steel" ? "Dishwasher-safe and built for café service." : "Lightweight and easy to clean."}\n\nFits standard cappuccino cups and mugs. Want your café logo instead? Make it in the Custom Stencil Studio.`,
        });
      }
    }
  }
  const CAKE = [
    ["Damask Cake Side", () => D.moroccan(7000)], ["Lace Heart Cookie", () => D.coffee(7001, "heart")], ["Snowflake Cookie", () => D.coffee(7002, "snowflake")],
    ["Birthday Lettering Cake Topper", () => D.lettering(7003, "HAPPY BIRTHDAY", 40)], ["Mini Mandala Cookie", () => D.mandala(7004)], ["Polka Cake Wrap", () => D.geometric(7005)],
    ["Blossom Cupcake", () => D.coffee(7006, "flower")], ["Star Sprinkle", () => D.kids(7007)], ["Eid Mubarak Cake Topper", () => D.lettering(7008, "EID MUBARAK", 46)],
    ["Wedding Monogram Frame", () => D.sign(7009, "A & S")], ["Paw Print Cookie", () => D.coffee(7010, "paw")], ["Crown Cookie", () => D.coffee(7011, "crown")],
    ["Floral Cake Panel", () => D.floral(7012)], ["Moon & Star Cookie", () => D.coffee(7013, "moon")], ["Smiley Cookie", () => D.coffee(7014, "smile")],
    ["Love Lettering Cookie", () => D.lettering(7015, "LOVE", 120)], ["Easter Egg Cookie", () => D.seasonal(7016, "egg")], ["Pumpkin Cookie", () => D.seasonal(7017, "pumpkin")],
    ["Christmas Tree Cookie", () => D.seasonal(7018, "tree")], ["Hearts Confetti", () => D.seasonal(7019, "hearts")],
  ] as const;
  for (const [i, [name, fn]] of CAKE.entries()) {
    queue({
      name: `${name} Stencil`, type: "STOCK_PHYSICAL", design: fn(), cols: ["cake-cookie", i > 15 ? "seasonal" : "craft-journal"], sizes: SMALL_SIZES, mat: "pet",
      tags: ["cake", "cookie", "food-safe"], foodSafe: true,
      short: `Food-safe ${name.toLowerCase()} stencil for royal icing, airbrush and dusting.`,
      desc: `Food-grade PET stencil for royal icing, buttercream, airbrush colour and dusting sugar. Use a stencil holder or clip for cookies; a scraper gives the crispest edges.\n\nWash in warm soapy water after use and dry flat.`,
    });
  }
  const PHRASES = ["HOME SWEET HOME", "WELCOME", "BISMILLAH", "GOOD VIBES", "DREAM BIG", "LOVE", "COFFEE", "BAKE SHOP", "KITCHEN", "FARMHOUSE", "BE KIND", "HELLO", "FAMILY", "GATHER", "CHAI", "OPEN"];
  for (const [i, phrase] of PHRASES.entries()) {
    queue({
      name: `"${phrase[0]}${phrase.slice(1).toLowerCase()}" Lettering Stencil`, type: "STOCK_PHYSICAL", design: D.lettering(8000 + i, phrase),
      cols: ["lettering", "sign-logo", "wall", "furniture"], sizes: [{ label: "30 cm wide", w: 300, h: 100, price: 1900 }, { label: "60 cm wide", w: 600, h: 200, price: 3400 }],
      mat: "m10", tags: ["lettering", "words", "sign"], digital: true,
      short: `Bold "${phrase.toLowerCase()}" lettering with stencil bridges — for signs, walls and crates.`,
      desc: desc(`Bold "${phrase.toLowerCase()}" lettering with vertical stencil bridges.`, "Paint it on wooden signs, crates, walls, doormats and pillows."),
    });
  }
  const ALPHA = [
    ["A–Z Alphabet Set", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"], ["Numbers 0–9 Set", "0123456789"], ["House Number Set", "0123456789#"], ["Uppercase A–M", "ABCDEFGHIJKLM"], ["Uppercase N–Z", "NOPQRSTUVWXYZ"],
  ] as const;
  for (const [i, [name, chars]] of ALPHA.entries()) {
    queue({
      name: `${name} Stencil`, type: "STOCK_PHYSICAL", design: D.alphabet(8100 + i, chars), cols: ["lettering", "sign-logo", "craft-journal"],
      sizes: [{ label: "Letters 2.5 cm", w: 200, h: 200, price: 1500 }, { label: "Letters 5 cm", w: 400, h: 400, price: 2600 }, { label: "Letters 10 cm", w: 600, h: 600, price: 4200 }],
      mat: "m10", tags: ["alphabet", "letters", "numbers"], digital: true,
      short: `${name} in a bold stencil font with bridges in every closed letter.`,
      desc: desc(`${name} with bridges built into O, A, B, D, P, Q, R and the numbers.`, "Label crates, paint signs, mark storage bins or number houses."),
    });
  }
  const SIGNS = ["NO PARKING", "PRIVATE", "EXIT", "DELIVERIES", "CAFE", "STAFF ONLY", "KEEP CLEAR", "FIRE EXIT", "PARKING", "RECEPTION", "TOILETS", "PUSH", "PULL", "LOADING BAY", "OFFICE"];
  for (const [i, t] of SIGNS.entries()) {
    queue({
      name: `"${t}" Sign Stencil`, type: "MADE_TO_ORDER", design: D.sign(8200 + i, t), cols: ["sign-logo"],
      sizes: [{ label: "40×25 cm", w: 400, h: 250, price: 2900 }, { label: "80×50 cm", w: 800, h: 500, price: 5600 }, { label: "120×75 cm (pavement)", w: 1200, h: 750, price: 9800 }],
      mat: "m14", tags: ["sign", "business", "pavement"], digital: true,
      short: `Heavy-duty 14 mil "${t.toLowerCase()}" stencil for walls, doors and pavement marking.`,
      desc: desc(`Heavy-duty "${t.toLowerCase()}" signage stencil with a framed border.`, "Use with spray paint or road-marking paint on concrete, asphalt, metal and walls."),
    });
  }
  const SEASON: [string, Parameters<typeof D.seasonal>[1], string][] = [
    ["Christmas Tree", "tree", "christmas"], ["Falling Snow", "snow", "christmas"], ["Eid Crescent", "eid", "eid-ramadan"], ["Halloween Pumpkin", "pumpkin", "halloween"],
    ["Easter Egg", "egg", "easter"], ["Valentine Hearts", "hearts", "valentines"],
  ];
  for (let i = 0; i < 18; i++) {
    const [name, motif, occ] = SEASON[i % SEASON.length];
    queue({
      name: `${name} Stencil${i >= 6 ? ` Vol. ${Math.floor(i / 6) + 1}` : ""}`, type: "STOCK_PHYSICAL", design: D.seasonal(9000 + i, motif), cols: ["seasonal", occ, "craft-journal", "wall"],
      sizes: SMALL_SIZES.concat(WALL_SIZES.slice(1, 2)), mat: "m7", tags: ["seasonal", occ], digital: true,
      short: `${name} motif for windows, cards, gifts and seasonal décor.`,
      desc: desc(`A festive ${name.toLowerCase()} design.`, "Use it on windows with spray snow, on gift wrap, cards, tote bags or a feature wall."),
    });
  }
  for (const [i, t] of ["Ramadan Kareem", "Merry Christmas", "Happy Halloween", "Eid Mubarak", "Be Mine", "Happy Easter", "Season's Greetings"].entries()) {
    queue({
      name: `"${t}" Greeting Stencil`, type: "STOCK_PHYSICAL", design: D.lettering(9100 + i, t.toUpperCase()), cols: ["seasonal", "lettering", "craft-journal"],
      sizes: [{ label: "30 cm wide", w: 300, h: 100, price: 1700 }], mat: "m7", tags: ["seasonal", "greeting"], digital: true,
      short: `"${t}" lettering for windows, banners and cards.`, desc: desc(`"${t}" in bold bridged lettering.`, "Paint banners, chalkboards, windows and cards."),
    });
  }
  const KIDS = ["Rainbow", "Rocket", "Cloud", "Starry Night"];
  for (let i = 0; i < 16; i++) {
    const d = D.kids(9500 + i);
    const name = { rainbow: "Rainbow", rocket: "Rocket", clouds: "Cloud", stars: "Starry Night" }[d.motif] ?? KIDS[i % 4];
    queue({
      name: `${name} Kids Stencil No. ${i + 1}`, type: "STOCK_PHYSICAL", design: d, cols: ["kids", "wall", "craft-journal", "fabric"], sizes: WALL_SIZES.slice(0, 3), mat: "m7",
      tags: ["kids", "nursery", d.motif], digital: true,
      short: `Playful ${name.toLowerCase()} motif for nurseries, play rooms and kids' crafts.`,
      desc: desc(`A playful ${name.toLowerCase()} design that kids can help paint.`, "Great for nursery walls, toy boxes, t-shirts and party crafts."),
    });
  }
  for (let i = 0; i < 20; i++) {
    const d = [D.mandala, D.geometric, D.floral, D.nature, D.kids][i % 5](9700 + i);
    queue({
      name: `Mini ${["Mandala", "Pattern", "Bloom", "Nature", "Doodle"][i % 5]} Journal Stencil ${i + 1}`, type: "STOCK_PHYSICAL", design: d,
      cols: ["craft-journal"], sizes: [{ label: "10×10 cm", w: 100, h: 100, price: 650 }, { label: "15×15 cm", w: 150, h: 150, price: 850 }], mat: "m5",
      tags: ["mini", "journal", "mixed media"],
      short: "Thin 5 mil mini stencil for journals, cards and mixed-media pages.",
      desc: "A thin, flexible 5 mil stencil for ink blending, texture paste, gel prints and spray inks.\n\nPerfect for bullet journals, card making and art journals.",
    });
  }
  const toolSvg = (paths: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><g data-layer="1" style="fill:var(--l1,currentColor)">${paths}</g></svg>`;
  const TOOLS: [string, number, string, string][] = [
    ["Stencil Brush Set (3 sizes)", 1500, `<rect x="90" y="60" width="40" height="200" rx="8"/><rect x="85" y="250" width="50" height="90" rx="10"/><rect x="180" y="80" width="34" height="180" rx="8"/><rect x="175" y="250" width="44" height="80" rx="10"/><rect x="265" y="100" width="28" height="160" rx="8"/><rect x="261" y="250" width="36" height="70" rx="10"/>`, "Natural-bristle stencil brushes for dabbing and swirling."],
    ["High-Density Foam Roller 10 cm", 950, `<rect x="80" y="80" width="240" height="90" rx="40"/><rect x="190" y="160" width="20" height="120"/><rect x="175" y="270" width="50" height="90" rx="14"/>`, "Dense foam roller that holds just enough paint — no bleed."],
    ["Repositionable Stencil Adhesive Spray", 2200, `<rect x="140" y="120" width="120" height="240" rx="18"/><rect x="170" y="70" width="60" height="55" rx="8"/><rect x="190" y="40" width="20" height="35"/>`, "Light-tack spray adhesive that holds stencils flat and lifts clean."],
    ["Low-Tack Painter's Tape (3-pack)", 1100, `<circle cx="130" cy="200" r="80"/><circle cx="270" cy="200" r="80"/>`, "Delicate-surface tape for fixing stencils to fresh walls."],
    ["Stencil Cream Paint Set (6 colours)", 3400, `<rect x="60" y="120" width="80" height="80" rx="16"/><rect x="160" y="120" width="80" height="80" rx="16"/><rect x="260" y="120" width="80" height="80" rx="16"/><rect x="60" y="220" width="80" height="80" rx="16"/><rect x="160" y="220" width="80" height="80" rx="16"/><rect x="260" y="220" width="80" height="80" rx="16"/>`, "Quick-drying cream paints that won't bleed under the stencil."],
    ["Fine-Mesh Cocoa Shaker", 1250, `<rect x="140" y="140" width="120" height="200" rx="20"/><rect x="130" y="100" width="140" height="50" rx="12"/>`, "Stainless shaker for even cocoa and cinnamon dusting."],
    ["Stencil Cleaning Brush & Tray", 900, `<rect x="70" y="220" width="260" height="70" rx="12"/><rect x="180" y="70" width="40" height="150" rx="8"/>`, "Soft brush and flat tray to clean stencils without bending them."],
    ["Cookie Stencil Holder Frame", 1600, `<rect x="70" y="70" width="260" height="260" rx="14"/><rect x="110" y="110" width="180" height="180" rx="8" fill="#000" opacity=".0"/>`, "Magnetic frame that holds cookie stencils perfectly still."],
    ["Spray Paint Nozzle Pack (fine/wide)", 700, `<circle cx="120" cy="200" r="40"/><circle cx="200" cy="200" r="40"/><circle cx="280" cy="200" r="40"/>`, "Swap nozzles for fine detail or wide coverage."],
    ["Laser Level for Allover Patterns", 5200, `<rect x="90" y="150" width="220" height="110" rx="18"/><rect x="0" y="198" width="90" height="8"/><rect x="310" y="198" width="90" height="8"/>`, "Projects straight lines so your repeats stay level."],
  ];
  for (const [name, price, svg, short] of TOOLS) {
    queue({
      name, type: "TOOL", svg: toolSvg(svg), cols: ["tools"], sizes: [{ label: "Standard", w: 0, h: 0, price }], mat: "m10", tags: ["tool"],
      short, desc: `${short}\n\nA staple in every stencil kit — pairs with any wall, furniture or craft stencil.`,
    });
  }
  const KITS: [string, number, string][] = [
    ["Wall Makeover Kit", 8900, "1 allover wall stencil (M) + foam roller + adhesive spray + painter's tape."],
    ["Barista Starter Kit", 4200, "4 food-safe coffee stencils + fine-mesh cocoa shaker."],
    ["Baker's Cookie Kit", 3900, "5 cookie stencils + stencil holder frame."],
    ["Beginner Stencil Kit", 3500, "1 mandala stencil (S) + 3 brushes + cream paint (2 colours)."],
    ["Sign Maker Kit", 6900, "Alphabet set (5 cm) + numbers set + foam roller + adhesive spray."],
  ];
  for (const [i, [name, price, short]] of KITS.entries()) {
    queue({
      name, type: "STOCK_PHYSICAL", design: [() => D.moroccan(9900), () => D.coffee(9901, "cup"), () => D.coffee(9902, "heart"), () => D.mandala(9903), () => D.alphabet(9904, "ABC123")][i](), cols: ["kits"],
      sizes: [{ label: "Kit", w: 300, h: 300, price }], mat: "m10", tags: ["kit", "bundle", "gift"], featured: i < 2,
      short, desc: `${short}\n\nEverything in one box — a great gift and the easiest way to start.`,
    });
  }

  const CONCURRENCY = Number(process.env.SEED_CONCURRENCY || 8);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < jobs.length) await jobs[next++]();
    }),
  );

  // ── opening balances journal ──
  await db.$transaction(async (tx) => {
    await postJournal(tx, {
      memo: "Opening balances — stock, materials and owner's capital",
      sourceType: "opening",
      date: new Date(Date.now() - 60 * 86400_000),
      byId: admin.id,
      lines: [
        { code: ACC.INV_FINISHED, debit: finishedValue },
        { code: ACC.INV_RAW, debit: rawValue },
        { code: ACC.BANK, debit: P(250000) },
        { code: ACC.FIXED_ASSETS, debit: P(450000) },
        { code: ACC.CAPITAL, credit: finishedValue + rawValue + P(250000) + P(450000) },
      ],
    });
  });
  await db.fixedAsset.create({ data: { name: "CO₂ laser cutter 60×40 cm", cost: P(380000), salvage: P(40000), lifeMonths: 60, purchasedAt: new Date() } });
  await db.fixedAsset.create({ data: { name: "Design workstation", cost: P(70000), salvage: P(5000), lifeMonths: 36, purchasedAt: new Date() } });

  // ── shipping ──
  const zones: [string, string[], [string, number, number | null, number, number][]][] = [
    ["Pakistan", ["PK"], [["Standard (TCS / Leopards)", 250, 5000, 2, 4], ["Express next day", 550, null, 1, 2]]],
    ["UK & Europe", ["GB", "IE", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "PT", "FI", "GR", "SE", "DK", "PL"], [["International Standard", 3500, 20000, 7, 12], ["DHL Express", 8500, null, 3, 5]]],
    ["USA & Canada", ["US", "CA"], [["International Standard", 4000, 22000, 8, 14], ["DHL Express", 9000, null, 3, 5]]],
    ["Gulf", ["AE", "SA", "QA", "KW", "OM", "BH"], [["International Standard", 2500, 15000, 4, 8], ["DHL Express", 6500, null, 2, 4]]],
    ["Rest of world", ["*"], [["International Standard", 4500, 25000, 8, 16], ["DHL Express", 9500, null, 3, 6]]],
  ];
  for (const [i, [name, countries, rates]] of zones.entries()) {
    await db.shippingZone.create({
      data: { name, countries, sort: i, rates: { create: rates.map(([n, price, free, min, max]) => ({ name: n, priceBase: P(price), freeOverBase: free ? P(free) : null, minDays: min, maxDays: max })) } },
    });
  }

  // ── promotions ──
  await db.discountCode.createMany({
    data: [
      { code: "WELCOME10", kind: "PERCENT", value: 10, firstOrderOnly: true },
      { code: "FREESHIP", kind: "FREESHIP", value: 0, minSubtotalBase: P(3000) },
      { code: "BULK15", kind: "PERCENT", value: 15, minSubtotalBase: P(15000) },
    ],
  });

  // ── content ──
  const sections: [string, string | null, string | null, object][] = [
    ["hero", null, null, {}],
    ["problem_solution", "Stencilling shouldn't be guesswork", "The four things that go wrong with stencils — and how we fixed each one.", {
      items: [
        { problem: "Paint bleeds under flimsy stencils", solution: "Thick, flat mylar with a published Cut-Quality Passport for every design." },
        { problem: "“Will it even fit my wall?”", solution: "Repeat & paint calculator on every wall stencil, in cm or inches." },
        { problem: "Custom stencils take weeks of emails", solution: "Upload your logo, get bridges added automatically and an instant price." },
        { problem: "Not sure it'll look good", solution: "Preview the painted result on walls, cakes, coffee and fabric before you pay." },
      ],
    }],
    ["surfaces", "What are you stencilling?", "Shop by surface — sizes and materials adapt to the job.", {}],
    ["product_tabs", "Fresh off the laser", null, { tabs: ["best", "new", "featured"] }],
    ["studio_teaser", "Your logo, lettering or sketch — cut-ready in two minutes", "Drop an image. We trace it, add bridges so nothing falls out, and price it live in your currency.", {}],
    ["styles", "Shop by style", null, {}],
    ["layer_explorer", "Paint in layers", "Multi-layer stencils stack perfectly. Pick a colour for each layer and see the finished piece.", {}],
    ["project_stories", "Project ideas", "Real techniques, step by step — see what you can make.", {}],
    ["testimonials", "What customers say", null, {}],
    ["kits", "Kits & bundles", "Everything you need, in one box.", {}],
    ["passport", "The Cut-Quality Passport", "Every stencil lists its material, thickness, smallest bridge, finest detail, reuse estimate and food-safety — so you know exactly what you're buying.", {}],
    ["why_us", "Why Creative Corner", null, {
      rows: [
        ["Instant custom stencils with auto-bridging", true, false, false],
        ["Preview on your surface before buying", true, false, false],
        ["Material & thickness published for every design", true, "sometimes", false],
        ["Food-safe lines for coffee & cake", true, "sometimes", "rarely"],
        ["Physical + digital cut files", true, false, "sometimes"],
        ["Pay in your own currency", true, false, true],
        ["Live production tracking", true, false, false],
      ],
    }],
    ["business", "Cafés, bakeries & brands", "Save your logo once, reorder coffee and cookie stencils in one tap, get bulk pricing and invoices in your currency.", {}],
    ["blog", "Tutorials & guides", null, {}],
    ["faq", "Questions, answered", null, {}],
    ["final_cta", "Ready to make something?", "Shop hundreds of original designs or create your own in minutes.", {}],
  ];
  for (const [i, [type, title, subtitle, data]] of sections.entries()) await db.pageSection.create({ data: { type, title, subtitle, data, sort: i } });

  const faqs: [string, string][] = [
    ["What are your stencils made of?", "Most designs are laser-cut from reusable mylar film (5, 7, 10 or 14 mil). Coffee, cake and cookie stencils use food-grade PET or stainless steel. Every product page shows the exact material in its Cut-Quality Passport."],
    ["How many times can I reuse a stencil?", "With gentle cleaning, mylar stencils last for 50–200+ uses. Stainless coffee stencils last for years."],
    ["Are your coffee and cake stencils food-safe?", "Yes — anything marked food-safe is cut from food-grade PET or 304 stainless steel. Wash before first use."],
    ["How does the Custom Stencil Studio work?", "Upload a logo, photo or sketch (or type text). We convert it to a cut path, add bridges automatically so nothing falls out, check that details aren't too fine for the material, and show the price instantly. If anything needs a human check, we'll email you a proof before cutting."],
    ["Can I order a stencil in a custom size?", "Yes. In the Studio you can choose any size from 3 cm up to 120 cm. For larger or multi-panel stencils, send us a message."],
    ["Which currencies can I pay in?", "Pick your currency at the top of the page. Prices, shipping and your receipt are all shown in that currency."],
    ["How long does shipping take?", "In-stock stencils ship within 1 business day. Made-to-order and custom stencils are cut within 2–3 business days. Delivery times by region are shown at checkout."],
    ["Do you charge customs duties?", "International orders may be subject to import duties in your country, payable on delivery. These are set by your local customs office."],
    ["What can I do with a digital cut file?", "Digital files (SVG) are for cutting on your own Cricut, Silhouette or laser cutter. The personal licence covers your own projects; contact us for a commercial licence."],
    ["What is your return policy?", "Unused stock stencils can be returned within 30 days. Custom stencils and digital files are made just for you, so they can't be returned unless they arrive damaged or incorrect — in which case we'll remake them free."],
  ];
  await db.faq.createMany({ data: faqs.map(([question, answer], i) => ({ question, answer, sort: i })) });

  const posts: [string, string, string, string][] = [
    ["how-to-stencil-a-wall-without-bleeding", "How to stencil a wall without paint bleeding", "tutorial", "The secret is almost-dry paint. Here's the full method, from prep to the last repeat."],
    ["choosing-stencil-thickness", "5, 7, 10 or 14 mil? Choosing stencil thickness", "blog", "Thin stencils flex around curves; thick ones lie flat on walls and floors. Here's when to use each."],
    ["latte-art-with-stencils", "Latte art with stencils: a barista's guide", "tutorial", "Cocoa, cinnamon or matcha — get crisp designs on every cup with the right shaker, height and milk foam."],
    ["stencil-a-tile-floor", "Stencilling a tile floor: patterned tiles on a budget", "tutorial", "Turn plain tiles or a concrete floor into a patterned showpiece with floor paint and a sealer."],
    ["how-stencil-bridges-work", "What are stencil bridges (and why your logo needs them)?", "blog", "Letters like O, A and R have centres that would fall out. Bridges keep them in place — here's how we add them automatically."],
    ["cleaning-and-storing-stencils", "Cleaning and storing stencils so they last for years", "blog", "Warm water, a soft brush and flat storage. Plus what to do about dried-on paint."],
  ];
  const BODY: Record<string, string> = {
    "how-to-stencil-a-wall-without-bleeding": `## What you need\n- Stencil (10 mil mylar is ideal for walls)\n- High-density foam roller\n- Repositionable adhesive spray and low-tack tape\n- Paint, paper towels, a laser level or spirit level\n\n## 1. Prep the wall\nClean and dry the wall. Paint the base colour and let it cure for at least 24 hours.\n\n## 2. Fix the stencil\nMist the back of the stencil with adhesive spray and wait 30 seconds. Start at the top centre and level it.\n\n## 3. Load the roller — then unload it\nRoll through a little paint, then roll most of it off on paper towel. The roller should look almost dry. This is the single most important step.\n\n## 4. Roll with light pressure\nBuild colour in two or three light passes instead of one heavy one.\n\n## 5. Repeat\nLift straight off, line up the registration marks with the painted section and continue. Use the repeat calculator on the product page to plan placements.\n\n## 6. Touch up\nFix small gaps with an artist's brush once everything is dry.`,
    "choosing-stencil-thickness": `## 5 mil (0.125 mm)\nFlexible — best for journals, cards and curved surfaces.\n\n## 7 mil (0.19 mm)\nAll-rounder for furniture, fabric and small walls.\n\n## 10 mil (0.25 mm)\nOur standard for walls and floors. Lies flat, survives hundreds of uses.\n\n## 14 mil (0.35 mm)\nHeavy-duty — pavement, parking, signage and spray paint.\n\nEvery product shows its thickness in the Cut-Quality Passport.`,
    "latte-art-with-stencils": `## The basics\nPour a smooth microfoam, hold the stencil 1–2 cm above the cup and dust from about 10 cm with a fine-mesh shaker.\n\n## Powders\nCocoa gives the strongest contrast; cinnamon is warmer; matcha looks great on hot chocolate.\n\n## Café service\nStainless steel stencils survive the dishwasher. Keep a set per station.\n\n## Your logo on every cup\nUpload your logo in the Custom Stencil Studio and choose stainless steel.`,
    "stencil-a-tile-floor": `## Prep\nDegrease the tiles, sand glossy surfaces lightly and prime with a bonding primer.\n\n## Paint\nUse floor paint for the base and the pattern. Stencil one tile at a time, alternating so you don't step on wet paint.\n\n## Seal\nFinish with two or three coats of a water-based floor sealer.`,
    "how-stencil-bridges-work": `A stencil is a sheet with holes. Any part of the design that is completely surrounded by a hole — the inside of an O, the centre of a ring — has nothing holding it in place, so it falls out.\n\n**Bridges** are thin strips that connect these "islands" back to the sheet. Good bridges are thin enough to disappear when you paint, and thick enough not to tear.\n\nOur Custom Stencil Studio finds islands automatically and adds bridges at the right width for the material you choose. You can see exactly where they are before you order.`,
    "cleaning-and-storing-stencils": `## Clean straight after use\nSoak in warm soapy water for a few minutes, then wipe gently with a soft brush on a flat surface.\n\n## Dried paint\nSoak longer, or use a little isopropyl alcohol on acrylic paint (not on food-safe stencils).\n\n## Storage\nStore flat — between sheets of card or in the backing board they came with.`,
  };
  for (const [i, [slug, title, kind, excerpt]] of posts.entries()) {
    await db.blogPost.create({ data: { slug, title, kind, excerpt, body: BODY[slug], coverSvg: [() => D.moroccan(11000), () => D.geometric(11001), () => D.coffee(11002, "rosetta"), () => D.geometric(11003), () => D.lettering(11004, "BRIDGE"), () => D.mandala(11005)][i]().svg, tags: [kind], publishedAt: new Date(Date.now() - i * 5 * 86400000) } });
  }

  const stories: [string, string, string, number, string[]][] = [
    ["Moroccan accent wall in a weekend", "wall", "An allover lattice in two tones of terracotta turned a plain living-room wall into the focal point. Planned with the repeat calculator: 14 placements on a 3.2 × 2.6 m wall.", 9, ["marrakech-allover-wall-stencil"]],
    ["Café logo on every cappuccino", "coffee", "A stainless logo stencil made in the Studio. Cocoa through a fine shaker, held 1 cm over the foam — about four seconds per cup.", 1, ["latte-heart-coffee-stencil-stainless"]],
    ["Patterned tiles without new tiles", "floor-tile", "Old beige tiles primed, painted and stencilled with a geometric repeat, then sealed with three coats of floor varnish.", 14, ["harlequin-geometric-stencil"]],
  ];
  for (const [i, [title, surface, summary, hours, productSlugs]] of stories.entries()) {
    await db.projectStory.create({ data: { title, surface, summary, hours, productSlugs, sort: i, afterSvg: [D.moroccan(2000).svg, D.coffee(6000, "heart").svg, D.geometric(3000).svg][i] } });
  }

  // marker read by prisma/seed-if-empty.ts: a seed that was cut off mid-way is redone on the next deploy
  await db.setting.upsert({ where: { key: "seedState" }, create: { key: "seedState", value: { completedAt: new Date().toISOString() } }, update: { value: { completedAt: new Date().toISOString() } } });
  console.log(`✔ ${await db.product.count()} products, ${await db.variant.count()} variants, ${await db.collection.count()} collections`);
  console.log(`✔ Admin user: ${admin.email} (password from ADMIN_PASSWORD${process.env.ADMIN_PASSWORD ? "" : " not set — default ChangeMe123!, change it now"})`);

  if (process.env.SEED_DEMO === "true") {
    const { seedDemo } = await import("./seed-demo");
    await seedDemo(db);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
