import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck, RotateCcw, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getActiveCurrency, getCountry, getUnits } from "@/lib/currency";
import { variantPrice } from "@/lib/services/pricing";
import { cardInclude, toCard } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { DesignArt } from "@/components/DesignArt";
import { Markdown } from "@/components/Markdown";
import { ProductBuy, type BuyVariant } from "@/components/store/ProductBuy";
import { SurfacePreview } from "@/components/store/SurfacePreview";
import { RepeatCalculator } from "@/components/store/RepeatCalculator";
import { ProductGrid } from "@/components/store/ProductCard";
import { ReviewForm } from "@/components/store/ReviewForm";

type P = { params: Promise<{ slug: string }> };

const load = (slug: string) =>
  db.product.findUnique({
    where: { slug },
    include: {
      variants: { where: { active: true }, include: { prices: true, material: true }, orderBy: { sort: "asc" } },
      collections: { include: { collection: true } },
      reviews: { where: { status: "published" }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return {
    title: p.seoTitle?.replace(/ \| .*$/, "") ?? p.name,
    description: p.seoDesc ?? p.shortDesc ?? undefined,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.name, description: p.shortDesc ?? undefined, images: [`/og/${p.slug}`] },
    robots: p.status === "ACTIVE" ? undefined : { index: false },
  };
}

export default async function ProductPage({ params }: P) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p || p.status === "ARCHIVED") {
    const r = await db.redirect.findUnique({ where: { from: `/p/${slug}` } });
    if (r) return <meta httpEquiv="refresh" content={`0;url=${r.to}`} />;
    notFound();
  }
  const [{ cur, base }, units, country] = await Promise.all([getActiveCurrency(), getUnits(), getCountry()]);
  const tracked = p.type === "STOCK_PHYSICAL" || p.type === "TOOL";
  const variants: BuyVariant[] = p.variants.map((v) => {
    const { price, compareAt } = variantPrice(v, cur, base);
    const available = v.isDigital || !tracked ? null : Math.max(0, v.onHand - v.reserved);
    return {
      id: v.id, name: v.name, isDigital: v.isDigital, widthMm: v.widthMm, heightMm: v.heightMm, material: v.material?.name ?? null,
      price: formatMoney(price, cur.code, cur.exponent), compareAt: compareAt && compareAt > price ? formatMoney(compareAt, cur.code, cur.exponent) : null,
      available,
      stockLabel: v.isDigital ? "Instant download after payment" : !tracked ? "Made to order · cut and shipped in 2–3 business days" : available === 0 ? "Out of stock" : available! <= 5 ? `Only ${available} left · ships in 24h` : "In stock · ships within 24h",
    };
  });
  const zones = await db.shippingZone.findMany({ include: { rates: { where: { active: true }, orderBy: { priceBase: "asc" } } } });
  const zone = zones.find((z) => z.countries.includes(country)) ?? zones.find((z) => z.countries.includes("*"));
  const fastest = zone?.rates.reduce((a, r) => (r.minDays < a.minDays ? r : a), zone.rates[0]);
  const passport = (p.passport ?? null) as Record<string, string | number | boolean> | null;
  const related = await db.product.findMany({
    where: { status: "ACTIVE", id: { not: p.id }, collections: { some: { collectionId: { in: p.collections.map((c) => c.collectionId) } } } },
    include: cardInclude, orderBy: { salesCount: "desc" }, take: 4,
  });
  const isWall = p.collections.some((c) => ["wall", "floor-tile"].includes(c.collection.slug)) && p.repeatWmm;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const baseVariant = p.variants.find((v) => !v.isDigital) ?? p.variants[0];
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDesc,
    sku: baseVariant?.sku,
    image: [`${site}/og/${p.slug}`],
    brand: { "@type": "Brand", name: "Creative Corner" },
    ...(p.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } } : {}),
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      priceCurrency: base.code,
      price: (Number(v.basePrice) / 10 ** base.exponent).toFixed(base.exponent),
      availability: v.isDigital || !tracked || v.onHand - v.reserved > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site}/p/${p.slug}`,
      hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy", returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: 30 },
    })),
  };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Shop", item: `${site}/shop` }, ...(p.collections[0] ? [{ "@type": "ListItem", position: 2, name: p.collections[0].collection.name, item: `${site}/c/${p.collections[0].collection.slug}` }] : []), { "@type": "ListItem", position: 3, name: p.name }] };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <nav className="mb-5 text-xs text-ink3" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        {p.collections[0] && <> / <Link href={`/c/${p.collections[0].collection.slug}`} className="hover:text-ink">{p.collections[0].collection.name}</Link></>}
        {" "}/ <span>{p.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="art-tile relative aspect-square rounded-[24px] border border-line p-10 text-accent">
            <DesignArt svg={p.designSvg} colors={p.layerColors} uid={`pd${p.id}`} title={p.name} className="h-full w-full" />
            {p.foodSafe && <span className="badge badge-mint absolute left-4 top-4">Food-safe</span>}
          </div>
          {p.designSvg && <SurfacePreview svg={p.designSvg} layers={p.layers} initialColors={p.layers > 1 ? p.layerColors : ["#2E3140"]} />}
        </div>
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">{p.collections.slice(0, 3).map((c) => <Link key={c.collectionId} href={`/c/${c.collection.slug}`} className="chip">{c.collection.name}</Link>)}</div>
            <h1 className="text-3xl font-bold md:text-4xl">{p.name}</h1>
            {p.ratingCount > 0 && <a href="#reviews" className="mt-2 flex items-center gap-1 text-sm text-ink2"><Star size={14} className="fill-mustard text-mustard" />{p.ratingAvg.toFixed(1)} · {p.ratingCount} reviews</a>}
            {p.shortDesc && <p className="mt-3 text-ink2">{p.shortDesc}</p>}
          </div>
          <ProductBuy productId={p.id} variants={variants} units={units} />
          <ul className="grid gap-2 text-sm text-ink2 sm:grid-cols-3">
            <li className="flex items-center gap-2"><Truck size={16} className="text-mint" />{fastest ? `Delivery to ${country}: ${fastest.minDays}–${fastest.maxDays} days` : "Ships worldwide"}</li>
            <li className="flex items-center gap-2"><RotateCcw size={16} className="text-mint" />30-day returns on stock items</li>
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-mint" />Remade free if damaged</li>
          </ul>
          {passport && (
            <div className="holo card p-5">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink3">Cut-Quality Passport</p>
              <dl className="grid grid-cols-2 gap-3 font-mono text-sm">
                <div><dt className="text-[11px] uppercase text-ink3">Material</dt><dd>{String(passport.material)}</dd></div>
                <div><dt className="text-[11px] uppercase text-ink3">Thickness</dt><dd>{String(passport.thicknessUm)} µm</dd></div>
                <div><dt className="text-[11px] uppercase text-ink3">Min bridge</dt><dd>{String(passport.minBridgeMm)} mm</dd></div>
                <div><dt className="text-[11px] uppercase text-ink3">Finest detail</dt><dd>{String(passport.finestDetailMm)} mm</dd></div>
                <div><dt className="text-[11px] uppercase text-ink3">Reuse</dt><dd>{String(passport.reuse)}</dd></div>
                <div><dt className="text-[11px] uppercase text-ink3">Food-safe</dt><dd>{passport.foodSafe ? "Yes" : "No"}</dd></div>
                <div className="col-span-2"><dt className="text-[11px] uppercase text-ink3">Cleaning</dt><dd>{String(passport.cleaning)}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="mb-2 text-2xl font-bold">About this stencil</h2>
          {p.description && <Markdown text={p.description} />}
        </div>
        {isWall && <RepeatCalculator repeatWmm={p.repeatWmm!} repeatHmm={p.repeatHmm ?? p.repeatWmm!} units={units} />}
      </div>

      <section id="reviews" className="mt-16">
        <h2 className="mb-6 text-2xl font-bold">Reviews {p.ratingCount > 0 && <span className="text-ink3">({p.ratingCount})</span>}</h2>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            {p.reviews.length === 0 && <p className="text-ink2">No reviews yet — be the first to share your project.</p>}
            {p.reviews.map((r) => (
              <article key={r.id} className="card p-5">
                <div className="mb-1 flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className={i < r.rating ? "fill-mustard text-mustard" : "text-line"} />)}</div>
                {r.title && <p className="font-semibold">{r.title}</p>}
                <p className="text-sm text-ink2">{r.body}</p>
                <p className="mt-2 text-xs text-ink3">{r.name} · {r.createdAt.toLocaleDateString()} {r.verified && <span className="badge badge-mint ml-1">Verified purchase</span>}</p>
                {r.reply && <p className="mt-3 rounded-lg bg-s2 p-3 text-xs text-ink2"><b>Reply:</b> {r.reply}</p>}
              </article>
            ))}
          </div>
          <ReviewForm productId={p.id} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">You might also like</h2>
          <ProductGrid cards={related.map((r) => toCard(r, cur, base))} />
        </section>
      )}
    </div>
  );
}
