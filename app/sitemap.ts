import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { STUDIO_USES } from "@/lib/studio-pages";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [products, collections, posts] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true, featured: true } }),
    db.collection.findMany({ select: { slug: true } }),
    db.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const now = new Date();
  const statics = ["", "/shop", "/custom-stencils", "/business", "/tutorials", "/faq", "/contact", "/about", "/track", "/legal/privacy", "/legal/terms", "/legal/shipping", "/legal/returns"];
  return [
    ...statics.map((p) => ({ url: `${site}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...Object.keys(STUDIO_USES).map((u) => ({ url: `${site}/custom-stencils/${u}`, lastModified: now, priority: 0.8 })),
    ...collections.map((c) => ({ url: `${site}/c/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${site}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: p.featured ? 0.9 : 0.6, images: [`${site}/p/${p.slug}/opengraph-image`] })),
    ...posts.map((p) => ({ url: `${site}/tutorials/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
  ];
}
