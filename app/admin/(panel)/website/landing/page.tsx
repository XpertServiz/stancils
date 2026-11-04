import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLandingSettings } from "@/lib/landing";
import { getHome } from "@/lib/storefront";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveLandingPage } from "@/app/admin/actions/landing";
import { saveHomeRows, saveHomeTop } from "@/app/admin/actions/storefront";

export default async function LandingProducts() {
  await requireStaff("content.edit");
  const [seo, home, reviewCount, cols] = await Promise.all([
    getLandingSettings(), getHome(),
    db.review.count({ where: { status: "published" } }),
    db.collection.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
  ]);
  const rows = [...home.rows, { title: "", intro: "", collection: "", banner: "", count: 8 }];
  return (
    <div>
      <PageHeader title="Homepage" sub="Everything on your homepage in one place. Changes go live within about 30 seconds." />
      <WebsiteTabs active="landing" />
      <div className="space-y-6">
        <Panel title="1. Your products">
          <p className="text-sm text-ink2">Products show up on the homepage by their category. Add them in two clicks:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/products/new" className="btn btn-primary">Add a product</Link>
            <Link href="/admin/products/bulk" className="btn btn-soft">Add many from photos</Link>
            <Link href="/admin/inventory/import" className="btn btn-ghost">Use a spreadsheet</Link>
          </div>
        </Panel>

        <Panel title="2. Top of the page">
          <ActionForm action={saveHomeTop}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Small label above the headline"><input name="eyebrow" maxLength={40} defaultValue={home.eyebrow} className="input" /></Field>
              <Field label="Badge on the photo" hint="e.g. 50% OFF. Shows your sale % automatically while a sale is on."><input name="badge" maxLength={16} defaultValue={home.badge} className="input" /></Field>
              <Field label="Big headline"><input name="headline" maxLength={80} defaultValue={home.headline} className="input" /></Field>
              <Field label="One line under it"><input name="sub" maxLength={140} defaultValue={home.sub} className="input" /></Field>
              <Field label="Tick list" hint="One short line per tick (up to 6)." className="sm:col-span-2"><textarea name="checklist" rows={4} maxLength={400} defaultValue={home.checklist.join("\n")} className="textarea" /></Field>
              <Field label="Button text"><input name="cta_label" maxLength={24} defaultValue={home.cta.label} className="input" /></Field>
              <Field label="Button goes to" hint="e.g. /shop or /c/mandala-designs"><input name="cta_href" defaultValue={home.cta.href} className="input" /></Field>
              <Field label="How should the top look?" className="sm:col-span-2">
                <select name="heroLayout" defaultValue={home.heroLayout} className="select">
                  <option value="banner">One wide banner picture (like a poster)</option>
                  <option value="split">Words on the left, tall photo on the right</option>
                </select>
              </Field>
              <Field label="Top picture" hint="Banner: a wide picture, about 2000 × 1100. Split: a tall photo. JPG or PNG." className="sm:col-span-2"><input name="heroPhoto" type="file" accept="image/*" className="input" /></Field>
              {home.heroImage && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={home.heroImage} alt="" className="h-14 w-12 rounded object-cover" />
                  <input type="checkbox" name="remove_hero" /> Go back to the original banner
                </label>
              )}
            </div>
            <button className="btn btn-primary">Save top of page</button>
          </ActionForm>
        </Panel>

        <Panel title="3. Product rows on the homepage">
          <ActionForm action={saveHomeRows}>
            <p className="text-sm text-ink2">Each row shows products from one collection with a banner beside it. Rows alternate left and right. Use the empty box at the bottom to add a new row.</p>
            <div className="space-y-4">
              {rows.map((r, i) => (
                <fieldset key={i} className="rounded-xl border border-line p-4">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wider text-ink3">{r.title ? `Row ${i + 1}` : "Add a new row"}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Row heading"><input name={`title_${i}`} maxLength={80} defaultValue={r.title} placeholder="e.g. Persian Carpet Stencils" className="input" /></Field>
                    <Field label="Show products from">
                      <select name={`collection_${i}`} defaultValue={r.collection} className="select">
                        {!cols.some((c) => c.slug === r.collection) && <option value={r.collection}>{r.collection || "Choose a collection…"}</option>}
                        {cols.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Short line under the heading" className="sm:col-span-2"><input name={`intro_${i}`} maxLength={200} defaultValue={r.intro} className="input" /></Field>
                    <Field label="How many products"><input name={`count_${i}`} type="number" min={2} max={12} defaultValue={r.count} className="input" /></Field>
                    <Field label="Banner photo" hint="Optional. Without one we show a colour panel."><input name={`banner_${i}`} type="file" accept="image/*" className="input" /></Field>
                    <input type="hidden" name={`keep_${i}`} value={r.banner} />
                    {r.title && (
                      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
                        {r.banner && <label className="flex items-center gap-2"><input type="checkbox" name={`nobanner_${i}`} />Remove the banner photo</label>}
                        <label className="flex items-center gap-2 text-danger"><input type="checkbox" name={`remove_${i}`} />Delete this row</label>
                      </div>
                    )}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="“Our Collections” buttons" hint="One per line: name | link. Example: Mandala Stencils | /c/mandala-designs" className="sm:col-span-2"><textarea name="chips" rows={6} defaultValue={home.chips.map((c) => `${c.label} | ${c.href}`).join("\n")} className="textarea font-mono text-sm" /></Field>
              <Field label="Heading for the newest products"><input name="latestTitle" maxLength={60} defaultValue={home.latestTitle} className="input" /></Field>
              <Field label="Heading above the email box"><input name="newsletterTitle" maxLength={80} defaultValue={home.newsletterTitle} className="input" /></Field>
              <Field label="Store opening hours" hint="One per line: Day | hours. Shown on the homepage and footer."><textarea name="hours" rows={7} defaultValue={home.hours} className="textarea font-mono text-sm" /></Field>
              <Field label="Address for the map" hint="Leave empty to use your business address (Settings)."><input name="mapQuery" maxLength={160} defaultValue={home.mapQuery} className="input" /></Field>
            </div>
            <button className="btn btn-primary">Save rows</button>
          </ActionForm>
        </Panel>

        <Panel title="4. Google search (helps people find you)">
          <ActionForm action={saveLandingPage}>
            <Field label="Page title" hint={`${seo.seoTitle.length}/60 — the blue link people see on Google.`}><input name="seoTitle" maxLength={70} defaultValue={seo.seoTitle} className="input" /></Field>
            <Field label="Short description" hint={`${seo.seoDesc.length}/160 — the grey text under the link.`}><textarea name="seoDesc" maxLength={170} rows={2} defaultValue={seo.seoDesc} className="textarea" /></Field>
            <Field label="Keywords" hint="What would a customer type into Google? Separate with commas."><textarea name="keywords" maxLength={300} rows={2} defaultValue={seo.keywords} className="textarea" /></Field>
            <button className="btn btn-primary">Save</button>
          </ActionForm>
        </Panel>

        <Panel title="Customer reviews">
          <p className="text-sm text-ink2">{reviewCount} review{reviewCount === 1 ? " is" : "s are"} showing on your homepage. Featured reviews show first.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Link href="/admin/reviews" className="btn btn-soft btn-sm">Manage reviews</Link><Link href="/admin/reviews#add" className="btn btn-ghost btn-sm">Add a review I received</Link></div>
        </Panel>

      </div>
    </div>
  );
}
