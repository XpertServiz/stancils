/* eslint-disable no-console */
// One-time: give the homepage product sections their banner pictures (the girl banners in /public/images/rows).
// Replaces the earlier stock-photo banners, once. Runs during `vercel-build`; later edits in the admin are kept.
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "../lib/db-url";

const VERSION = "row-banners-v1";
const BANNERS: Record<string, string> = {
  "carpet-design-stencils": "/images/rows/persian-carpet.jpg",
  "all-calligraphy-stencils": "/images/rows/islamic-calligraphy.jpg",
  "wall-and-canvas-stencils": "/images/rows/wall-stencils.jpg",
  "all-art-and-craft-stencils": "/images/rows/canvas-painting.jpg",
  "furniture-stencils": "/images/rows/furniture-stencils.jpg",
};

const db = new PrismaClient({ datasourceUrl: databaseUrl() });

async function main() {
  const done = await db.setting.findUnique({ where: { key: "homeBanners" } });
  if ((done?.value as { version?: string } | null)?.version === VERSION) return console.log("home-banners: already applied.");
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
  } else console.log("home-banners: no custom rows saved — the defaults already use the banners.");
  const value = { version: VERSION, at: new Date().toISOString() };
  await db.setting.upsert({ where: { key: "homeBanners" }, create: { key: "homeBanners", value }, update: { value } });
}

main().catch((e) => console.error("home-banners: failed —", e instanceof Error ? e.message : e)).finally(() => db.$disconnect());
