/* eslint-disable no-console */
// First-deploy helper: runs the production seed (prisma/seed.ts) only when the store has never been
// seeded successfully and has no orders. prisma/seed.ts TRUNCATEs every table, so it must never run
// on a live store. A seed that was cut off part-way (e.g. a build timeout) is detected — no
// "seedState" marker and no opening-balances journal — and redone. Runs during `vercel-build`.
// DECISION: opt-out with SEED_ON_DEPLOY=false; a non-empty or unreachable database is never seeded.
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "../lib/db-url";

async function main() {
  if (process.env.SEED_ON_DEPLOY === "false") {
    console.log("seed-if-empty: SEED_ON_DEPLOY=false — skipping.");
    return;
  }
  const db = new PrismaClient({ datasourceUrl: databaseUrl() });
  let products = -1;
  let orders = -1;
  let completed = false;
  try {
    products = await db.product.count();
    orders = await db.order.count();
    const marker = await db.setting.findUnique({ where: { key: "seedState" } });
    const opening = await db.journalEntry.count({ where: { sourceType: "opening" } });
    completed = Boolean(marker) || opening > 0;
    if (orders !== 0 || completed) await applyStudioLookOnce(db);
  } finally {
    await db.$disconnect();
  }
  if (orders !== 0 || completed) {
    console.log(`seed-if-empty: store already set up (products=${products}, orders=${orders}) — not seeding.`);
    return;
  }
  if (products > 0) console.log(`seed-if-empty: found an unfinished seed (${products} products, no orders) — redoing it.`);
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.log("seed-if-empty: database is empty but ADMIN_EMAIL/ADMIN_PASSWORD are not set — skipping seed.");
    return;
  }
  console.log("seed-if-empty: running production seed (no demo data)…");
  const env = { ...process.env };
  delete env.SEED_DEMO; // never create demo customers/orders on deploy
  const r = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit", env });
  if (r.status !== 0) throw new Error(`seed failed with exit code ${r.status}`);
}

/**
 * One-time switch of an existing store to the owner's approved "Stencil & Gift Studio" page (theme,
 * fonts, hero copy, brand name, announcement, splash off). Runs once per version, marked by the
 * "uiRefresh" setting, so the owner's later edits in Admin stick.
 * DECISION: only presentation settings change; products, orders and accounts are never touched.
 */
const UI_VERSION = "creative-corner-v1";
async function applyStudioLookOnce(db: PrismaClient) {
  const done = await db.setting.findUnique({ where: { key: "uiRefresh" } });
  if ((done?.value as { version?: string } | null)?.version === UI_VERSION) return;
  const merge = async (key: string, patch: Record<string, unknown>) => {
    const cur = ((await db.setting.findUnique({ where: { key } }))?.value ?? {}) as Record<string, unknown>;
    if (Object.keys(cur).length === 0) return; // nothing saved — the new defaults already apply
    await db.setting.update({ where: { key }, data: { value: { ...cur, ...patch } as object } });
  };
  await merge("theme", { preset: "corner", accent: "", header: "", highlight: "", displayFont: "Fraunces", bodyFont: "Inter" });
  await merge("business", { name: "Creative Corner", tagline: "Reusable Stencils & Art Supplies" });
  await merge("announcement", { enabled: true, text: "Exclusive Offer: 50% Flat Discount" });
  await merge("splash", { enabled: false });
  await merge("hero", {
    mode: "collage",
    imageUrl: "/hero/studio-collage.webp",
    eyebrow: "Your ideas, our creative touch",
    headline: "Make something *beautifully yours.*",
    sub: "Expressive stencils, joyful gifts, custom T-shirts and bold artwork. Designed with personality and made for the moments that matter.",
    primaryCta: { label: "Explore collections", href: "/#collections" },
    secondaryCta: { label: "Make something custom", href: "/custom-stencils" },
    trust: ["Made to order", "USA & Canada"],
  });
  const value = { version: UI_VERSION, at: new Date().toISOString() };
  await db.setting.upsert({ where: { key: "uiRefresh" }, create: { key: "uiRefresh", value }, update: { value } });
  console.log(`seed-if-empty: applied the Stencil & Gift Studio page (${UI_VERSION}, one time).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
