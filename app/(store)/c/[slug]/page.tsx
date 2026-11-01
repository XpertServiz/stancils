import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ShopView } from "@/components/store/ShopView";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await db.collection.findUnique({ where: { slug: (await params).slug } });
  if (!c) return {};
  return { title: c.seoTitle ?? `${c.name} Stencils`, description: c.seoDesc ?? c.description ?? undefined, alternates: { canonical: `/c/${c.slug}` } };
}

export default async function CollectionPage({ params, searchParams }: P) {
  const { slug } = await params;
  const sp = await searchParams;
  const c = await db.collection.findUnique({ where: { slug } });
  if (!c) {
    const r = await db.redirect.findUnique({ where: { from: `/c/${slug}` } });
    if (r) return <meta httpEquiv="refresh" content={`0;url=${r.to}`} />;
    notFound();
  }
  const filtered = Object.keys(sp).some((k) => k !== "page");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Shop", item: `${site}/shop` }, { "@type": "ListItem", position: 2, name: c.name, item: `${site}/c/${c.slug}` }] };
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {filtered && <meta name="robots" content="noindex,follow" />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <nav className="mb-3 text-xs text-ink3" aria-label="Breadcrumb"><Link href="/shop" className="hover:text-ink">Shop</Link> / <span>{c.name}</span></nav>
      <h1 className="text-4xl font-bold">{c.name} stencils</h1>
      {c.description && <p className="mb-8 mt-3 max-w-2xl text-ink2">{c.description}</p>}
      <ShopView sp={sp} collection={c.slug} basePath={`/c/${c.slug}`} />
    </div>
  );
}
