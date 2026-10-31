/* eslint-disable no-console */
// First-deploy helper: runs the production seed (prisma/seed.ts) ONLY when the database has no
// products and no orders. prisma/seed.ts TRUNCATEs every table, so it must never run on a live
// store. Runs during `vercel-build` after `prisma migrate deploy`.
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
  try {
    products = await db.product.count();
    orders = await db.order.count();
  } finally {
    await db.$disconnect();
  }
  if (products !== 0 || orders !== 0) {
    console.log(`seed-if-empty: database already has data (products=${products}, orders=${orders}) — not seeding.`);
    return;
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.log("seed-if-empty: database is empty but ADMIN_EMAIL/ADMIN_PASSWORD are not set — skipping seed.");
    return;
  }
  console.log("seed-if-empty: database is empty — running production seed (no demo data)…");
  const env = { ...process.env };
  delete env.SEED_DEMO; // never create demo customers/orders on deploy
  const r = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit", env });
  if (r.status !== 0) throw new Error(`seed failed with exit code ${r.status}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
