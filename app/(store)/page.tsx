import { db } from "@/lib/db";
import { HomeSections } from "@/components/store/HomeSections";
import { StudioHome } from "@/components/store/StudioHome";
import { getSettings } from "@/lib/settings";
import { memo } from "@/lib/memo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await getSettings();
  const studio = s.home.layout !== "sections";
  const sections = studio ? [] : await memo("home-sections", () => db.pageSection.findMany({ where: { page: "home", visible: true, deletedAt: null }, orderBy: { sort: "asc" } }));
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const ld = { "@context": "https://schema.org", "@type": "WebSite", name: s.business.name, url: site, potentialAction: { "@type": "SearchAction", target: `${site}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {studio ? <StudioHome /> : <HomeSections sections={sections} />}
    </>
  );
}
