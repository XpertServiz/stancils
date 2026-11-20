import type { Metadata } from "next";
import { HomePage } from "@/components/store/HomePage";
import { getLandingSettings } from "@/lib/landing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getLandingSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    title: { absolute: p.seoTitle },
    description: p.seoDesc,
    keywords: p.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    alternates: { canonical: "/" },
    openGraph: { type: "website", title: p.seoTitle, description: p.seoDesc, url: site, images: [{ url: "/naqsh/stencils.jpg" }] },
    twitter: { card: "summary_large_image", title: p.seoTitle, description: p.seoDesc },
  };
}

export default function Home() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const ld = { "@context": "https://schema.org", "@type": "WebSite", url: site, potentialAction: { "@type": "SearchAction", target: `${site}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\u003c") }} />
      <HomePage />
    </>
  );
}
