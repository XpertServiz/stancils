import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "All Collections",
  description: "Every stencil collection in one place — calligraphy, mandala, floral, carpet, furniture, fabric and art supplies.",
  alternates: { canonical: "/collections" },
};
export const dynamic = "force-dynamic";

export default async function Collections() {
  const cols = await db.collection.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { product: { images: { some: {} }, status: "ACTIVE" } } } } }, products: { take: 1, where: { product: { images: { some: {} }, status: "ACTIVE" } }, include: { product: { select: { images: { take: 1, orderBy: { sort: "asc" } } } } } } },
  });
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      <nav className="mb-3 text-xs text-ink3" aria-label="Breadcrumb"><Link href="/" className="hover:text-ink">Home</Link> / <span>Collections</span></nav>
      <h1 className="mb-8 text-center font-display text-[32px] font-bold md:text-[40px]">All Collections</h1>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {cols.map((c) => {
          const img = c.products[0]?.product.images[0]?.url;
          return (
            <Link key={c.id} href={`/c/${c.slug}`} className="group overflow-hidden rounded-[10px] border border-line bg-bg shadow-[0_1px_2px_rgba(0,0,0,.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,.10)]">
              <span className="relative block aspect-[4/3] overflow-hidden bg-s1">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-[400ms] group-hover:scale-[1.04]" />
                ) : (
                  <span className="diag absolute inset-0 grid place-items-center text-4xl font-bold text-accent/60">{c.name.slice(0, 1)}</span>
                )}
              </span>
              <span className="block p-3"><b className="block">{c.name}</b><span className="text-xs text-ink3">{c._count.products} product{c._count.products === 1 ? "" : "s"}</span></span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
