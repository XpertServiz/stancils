import { db } from "@/lib/db";
import { HomeSections } from "@/components/store/HomeSections";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [sections, s] = await Promise.all([
    db.pageSection.findMany({ where: { page: "home", visible: true, deletedAt: null }, orderBy: { sort: "asc" } }),
    getSettings(),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const ld = { "@context": "https://schema.org", "@type": "WebSite", name: s.business.name, url: site, potentialAction: { "@type": "SearchAction", target: `${site}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <HomeSections sections={sections} />
    </>
  );
}
