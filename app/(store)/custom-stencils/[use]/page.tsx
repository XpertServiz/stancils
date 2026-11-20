import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioPage } from "@/components/store/StudioPage";
import { STUDIO_USES } from "@/lib/studio-pages";

export function generateStaticParams() {
  return Object.keys(STUDIO_USES).map((use) => ({ use }));
}

export async function generateMetadata({ params }: { params: Promise<{ use: string }> }): Promise<Metadata> {
  const u = STUDIO_USES[(await params).use];
  if (!u) return {};
  return { title: u.title, description: u.intro, alternates: { canonical: `/custom-stencils/${(await params).use}` } };
}

export default async function UsePage({ params }: { params: Promise<{ use: string }> }) {
  const u = STUDIO_USES[(await params).use];
  if (!u) notFound();
  return <StudioPage h1={u.h1} intro={u.intro} material={u.material} faqs={u.faqs} />;
}
