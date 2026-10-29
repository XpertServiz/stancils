import type { Metadata } from "next";
import { ShopView } from "@/components/store/ShopView";

export const metadata: Metadata = {
  title: "Shop all stencils",
  description: "Browse hundreds of original laser-cut stencils for walls, furniture, floors, cakes, coffee, fabric and signs.",
  alternates: { canonical: "/shop" },
};

export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {filtered && <meta name="robots" content="noindex,follow" />}
      <p className="eyebrow mb-2">Shop</p>
      <h1 className="mb-8 text-4xl font-bold">All stencils</h1>
      <ShopView sp={sp} basePath="/shop" />
    </div>
  );
}
