import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getMenu, slugify } from "@/lib/storefront";
import { ShopView } from "@/components/store/ShopView";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await db.collection.findUnique({ where: { slug: (await params).slug } });
  if (!c) return {};
  return { title: c.seoTitle ?? c.name, description: c.seoDesc ?? c.description ?? `Shop ${c.name} — reusable stencils and decor.`, alternates: { canonical: `/c/${c.slug}` } };
}

export default async function CollectionPage({ params, searchParams }: P) {
  const { slug } = await params;
  const sp = await searchParams;
  let c: { id?: string; slug: string; name: string; description: string | null } | null = await db.collection.findUnique({ where: { slug } });
  if (!c) {
    // a menu link whose collection has no products yet: show an empty collection page instead of an error
    const menu = await getMenu();
    const hit = menu.flatMap((m) => [m, ...m.children]).find((m) => slugify(m.label) === slug || m.href === `/c/${slug}`);
    if (hit) c = { slug, name: hit.label, description: null };
  }
  if (!c) {
    const r = await db.redirect.findUnique({ where: { from: `/c/${slug}` } });
    if (r) return <meta httpEquiv="refresh" content={`0;url=${r.to}`} />;
    notFound();
  }
  const filtered = Object.keys(sp).some((k) => k !== "page");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: site || "/" }, { "@type": "ListItem", position: 2, name: c.name, item: `${site}/c/${c.slug}` }] };
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      {filtered && <meta name="robots" content="noindex,follow" />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <nav className="mb-3 text-xs text-ink3" aria-label="Breadcrumb"><Link href="/" className="hover:text-ink">Home</Link> / <Link href="/collections" className="hover:text-ink">Collections</Link> / <span>{c.name}</span></nav>
      <h1 className="text-center font-display text-[32px] font-bold md:text-[40px]">{c.name}</h1>
      {c.description && <p className="mx-auto mb-8 mt-3 max-w-3xl text-center text-ink2">{c.description}</p>}
      {!c.description && <div className="mb-8" />}
      <ShopView sp={sp} collection={c.slug} basePath={`/c/${c.slug}`} />
    </div>
  );
}
