/* eslint-disable no-console */
// One-time presentation updates, run during `vercel-build` (each step has its own marker, so the owner's later edits stick):
//   • row-banners-v1 — give the homepage product sections their banner pictures (the girl banners in /public/images/rows)
//   • splash-on-v1   — turn the 3D splash screen on (it is on by default for new stores; this covers stores that had it off)
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "../lib/db-url";

const BANNERS: Record<string, string> = {
  "carpet-design-stencils": "/images/rows/persian-carpet.jpg",
  "all-calligraphy-stencils": "/images/rows/islamic-calligraphy.jpg",
  "wall-and-canvas-stencils": "/images/rows/wall-stencils.jpg",
  "all-art-and-craft-stencils": "/images/rows/canvas-painting.jpg",
  "furniture-stencils": "/images/rows/furniture-stencils.jpg",
};

const db = new PrismaClient({ datasourceUrl: databaseUrl() });
const marked = async (key: string, version: string) => ((await db.setting.findUnique({ where: { key } }))?.value as { version?: string } | null)?.version === version;
const mark = (key: string, version: string) => db.setting.upsert({ where: { key }, create: { key, value: { version, at: new Date().toISOString() } }, update: { value: { version, at: new Date().toISOString() } } });

async function banners() {
  if (await marked("homeBanners", "row-banners-v1")) return;
  const row = await db.setting.findUnique({ where: { key: "storeHome" } });
  const cur = (row?.value ?? {}) as { rows?: { collection: string; banner?: string }[] };
  if (Array.isArray(cur.rows)) {
    let n = 0;
    const rows = cur.rows.map((r) => {
      const want = BANNERS[r.collection];
      if (want && (!r.banner || r.banner.startsWith("/catalog/"))) { n++; return { ...r, banner: want }; }
      return r;
    });
    const value = JSON.parse(JSON.stringify({ ...cur, rows }));
    await db.setting.upsert({ where: { key: "storeHome" }, create: { key: "storeHome", value }, update: { value } });
    console.log(`home-banners: set ${n} banners.`);
  }
  await mark("homeBanners", "row-banners-v1");
}

async function splash() {
  if (await marked("splashOn", "splash-on-v1")) return;
  const cur = (await db.setting.findUnique({ where: { key: "splash" } }))?.value as Record<string, unknown> | undefined;
  if (cur && cur.enabled === false) {
    const value = JSON.parse(JSON.stringify({ ...cur, enabled: true }));
    await db.setting.update({ where: { key: "splash" }, data: { value } });
    console.log("home-banners: splash screen turned on.");
  }
  await mark("splashOn", "splash-on-v1");
}

async function main() {
  await banners();
  await splash();
}

main().catch((e) => console.error("home-banners: failed —", e instanceof Error ? e.message : e)).finally(() => db.$disconnect());
