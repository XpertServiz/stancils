import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage } from "@/components/store/StudioPage";
import { STUDIO_USES } from "@/lib/studio-pages";

export const metadata: Metadata = {
  title: "Custom Stencil Maker — Your Logo, Text or Image",
  description: "Upload a logo, photo or sketch, or type text. We auto-trace it, add bridges so nothing falls out, and price it instantly. Laser-cut and shipped worldwide.",
  alternates: { canonical: "/custom-stencils" },
};

export default async function CustomStencils({ searchParams }: { searchParams: Promise<{ text?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <StudioPage h1="Make a custom stencil" intro="Upload a logo, photo or sketch — or type your words. We trace it, add bridges so nothing falls out, check the detail for your material and price it instantly." text={sp.text?.slice(0, 60)} faqs={[["How does pricing work?", "Price depends on size, material and how much cutting your design needs. There's no setup fee, and bulk orders get up to 25% off."], ["Will someone check my design?", "Yes, if our checks flag very fine detail or a possible trademark, a person reviews it and emails you a proof before cutting."]]} />
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <p className="mb-3 text-sm font-semibold text-ink3">Popular custom stencils</p>
        <div className="flex flex-wrap gap-2">{Object.entries(STUDIO_USES).map(([k, v]) => <Link key={k} href={`/custom-stencils/${k}`} className="chip">{v.h1}</Link>)}</div>
      </div>
    </>
  );
}
