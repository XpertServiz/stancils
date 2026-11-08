import type { Metadata } from "next";
import Link from "next/link";
import { ShopView } from "@/components/store/ShopView";

export const metadata: Metadata = {
  title: "Shop All",
  description: "Browse stencils, gift baskets, custom T-shirts and cybersigilism art.",
  alternates: { canonical: "/shop" },
};

export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      {filtered && <meta name="robots" content="noindex,follow" />}
      <nav className="mb-3 text-xs text-ink3" aria-label="Breadcrumb"><Link href="/" className="hover:text-ink">Home</Link> / <span>Shop All</span></nav>
      <h1 className="mb-8 text-center font-display text-[32px] font-bold md:text-[40px]">{typeof sp.q === "string" && sp.q ? `Search: ${sp.q}` : "Shop All"}</h1>
      <ShopView sp={sp} basePath="/shop" />
    </div>
  );
}
