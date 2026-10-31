/* eslint-disable no-console */
// First-deploy helper: runs the production seed (prisma/seed.ts) only when the store has never been
// seeded successfully and has no orders. prisma/seed.ts TRUNCATEs every table, so it must never run
// on a live store. A seed that was cut off part-way (e.g. a build timeout) is detected — no
// "seedState" marker and no opening-balances journal — and redone. Runs during `vercel-build`.
// DECISION: opt-out with SEED_ON_DEPLOY=false; a non-empty or unreachable database is never seeded.
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  if (process.env.SEED_ON_DEPLOY === "false") {
    console.log("seed-if-empty: SEED_ON_DEPLOY=false — skipping.");
    return;
  }
  const db = new PrismaClient();
  let products = -1;
  let orders = -1;
  let completed = false;
  try {
    products = await db.product.count();
    orders = await db.order.count();
    const marker = await db.setting.findUnique({ where: { key: "seedState" } });
    const opening = await db.journalEntry.count({ where: { sourceType: "opening" } });
    completed = Boolean(marker) || opening > 0;
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
