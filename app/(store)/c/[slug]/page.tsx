import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getMenu, slugify } from "@/lib/storefront";
import { ShopView } from "@/components/store/ShopView";
import { COLLECTION_SEO } from "@/lib/seo-copy";

/** Owner-written text wins; otherwise our keyword copy; otherwise the plain name. */
const own = (v: string | null | undefined, name: string) => (v && v.trim() && v.trim() !== name ? v : null);

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await db.collection.findUnique({ where: { slug: (await params).slug } });
  if (!c) return {};
  const k = COLLECTION_SEO[c.slug];
  const title = own(c.seoTitle, c.name) ?? k?.title ?? c.name;
  const description = own(c.seoDesc, c.name) ?? c.description ?? k?.desc ?? `Shop ${c.name} — stencils, gifts, custom T-shirts and art.`;
  return { title, description, alternates: { canonical: `/c/${c.slug}` }, openGraph: { title, description, type: "website" } };
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
      {(c.description || COLLECTION_SEO[c.slug]) ? <p className="mx-auto mb-8 mt-3 max-w-3xl text-center text-ink2">{c.description || COLLECTION_SEO[c.slug].intro}</p> : <div className="mb-8" />}
      <ShopView sp={sp} collection={c.slug} basePath={`/c/${c.slug}`} />
    </div>
  );
}
