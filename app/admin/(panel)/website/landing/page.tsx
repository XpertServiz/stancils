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
  const [seo, home, reviewCount, pendingCount, cols] = await Promise.all([
    getLandingSettings(), getHome(),
    db.review.count({ where: { status: "published" } }),
    db.review.count({ where: { status: "pending" } }),
    db.collection.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
  ]);
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
              <Field label="Small label above the headline"><input name="eyebrow" maxLength={60} defaultValue={home.eyebrow} className="input" /></Field>
              <Field label="Big headline"><input name="headline" maxLength={80} defaultValue={home.headline} className="input" /></Field>
              <Field label="Text under the headline" className="sm:col-span-2"><textarea name="sub" rows={2} maxLength={200} defaultValue={home.sub} className="textarea" /></Field>
              <Field label="Green strip under the top (one per line, up to 6)" className="sm:col-span-2"><textarea name="checklist" rows={4} maxLength={400} defaultValue={home.checklist.join("\n")} className="textarea" /></Field>
              <Field label="Gold button text"><input name="cta_label" maxLength={24} defaultValue={home.cta.label} className="input" /></Field>
              <Field label="Gold button goes to" hint="e.g. /shop or /c/stencils"><input name="cta_href" defaultValue={home.cta.href} className="input" /></Field>
              <Field label="Outline button text (opens Custom Order)"><input name="button2" maxLength={30} defaultValue={home.heroButton2} className="input" /></Field>
              <Field label="Big arch picture" hint="A tall picture, about 880 × 1080. JPG or PNG."><input name="heroPhoto" type="file" accept="image/*" className="input" /></Field>
            </div>
            <button className="btn btn-primary">Save top of page</button>
          </ActionForm>
        </Panel>

        <Panel title="3. “Four ways to create joy” and the other sections">
          <ActionForm action={saveHomeRows}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Small label"><input name="deptEyebrow" maxLength={60} defaultValue={home.deptEyebrow} className="input" /></Field>
              <Field label="Heading"><input name="deptTitle" maxLength={80} defaultValue={home.deptTitle} className="input" /></Field>
            </div>
            <p className="text-sm text-ink2">The arch pictures. Each opens a category when clicked. Use the empty box at the bottom to add another.</p>
            {[...home.chips, { label: "", href: "", image: "", eyebrow: "", desc: "", cta: "" }].map((c, i) => (
              <fieldset key={i} className="rounded-xl border border-line p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-wider text-ink3">{c.label ? `Picture ${i + 1}` : "Add a new picture"}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name"><input name={`tile_label_${i}`} defaultValue={c.label} maxLength={40} className="input" placeholder="e.g. Stencils" /></Field>
                  <Field label="Opens category">
                    <select name={`tile_href_${i}`} defaultValue={c.href} className="select">
                      {c.href && !cols.some((k) => `/c/${k.slug}` === c.href) && <option value={c.href}>{c.href}</option>}
                      <option value="">Choose…</option>
                      {cols.map((k) => <option key={k.slug} value={`/c/${k.slug}`}>{k.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Small label above the name"><input name={`tile_eyebrow_${i}`} defaultValue={c.eyebrow} maxLength={40} className="input" placeholder="01 / Get creative" /></Field>
                  <Field label="One line under the name"><input name={`tile_desc_${i}`} defaultValue={c.desc} maxLength={90} className="input" /></Field>
                  <Field label="Link text"><input name={`tile_cta_${i}`} defaultValue={c.cta} maxLength={30} className="input" placeholder="Explore stencils" /></Field>
                  <Field label={c.image ? "Replace the picture" : "Picture"} hint="Tall (3:4) works best."><input name={`tile_img_${i}`} type="file" accept="image/*" className="input" /></Field>
                  <input type="hidden" name={`tile_keep_${i}`} value={c.image ?? ""} />
                  {c.label && <label className="flex items-center gap-2 text-sm text-danger"><input type="checkbox" name={`tile_remove_${i}`} />Delete this picture</label>}
                </div>
              </fieldset>
            ))}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Shop section: label"><input name="shop_eyebrow" maxLength={60} defaultValue={home.shop.eyebrow} className="input" /></Field>
              <Field label="Shop section: heading"><input name="shop_title" maxLength={80} defaultValue={home.shop.title} className="input" /></Field>
              <Field label="Shop section: sentence"><input name="shop_intro" maxLength={200} defaultValue={home.shop.intro} className="input" /></Field>
              <Field label="Custom box: label"><input name="custom_eyebrow" maxLength={60} defaultValue={home.custom.eyebrow} className="input" /></Field>
              <Field label="Custom box: heading"><input name="custom_title" maxLength={80} defaultValue={home.custom.title} className="input" /></Field>
              <Field label="Custom box: button"><input name="custom_button" maxLength={40} defaultValue={home.custom.button} className="input" /></Field>
              <Field label="Custom box: text" className="sm:col-span-3"><textarea name="custom_text" rows={2} maxLength={400} defaultValue={home.custom.text} className="textarea" /></Field>
              <Field label="Four benefits (one per line: Title | sentence)" className="sm:col-span-3"><textarea name="benefits" rows={5} defaultValue={home.benefits.map((b) => `${b.t} | ${b.d}`).join("\n")} className="textarea" /></Field>
              <Field label="Story: label"><input name="story_eyebrow" maxLength={80} defaultValue={home.story.eyebrow} className="input" /></Field>
              <Field label="Story: heading" className="sm:col-span-2"><input name="story_title" maxLength={90} defaultValue={home.story.title} className="input" /></Field>
              <Field label="Story: text" className="sm:col-span-3"><textarea name="story_text" rows={3} maxLength={500} defaultValue={home.story.text} className="textarea" /></Field>
              <Field label="Story: link text"><input name="story_link" maxLength={40} defaultValue={home.story.link} className="input" /></Field>
              <Field label="Story: arch picture" className="sm:col-span-2"><input name="storyPhoto" type="file" accept="image/*" className="input" /></Field>
              <Field label="Email box: heading"><input name="newsletterTitle" maxLength={80} defaultValue={home.newsletterTitle} className="input" /></Field>
              <Field label="Email box: sentence" className="sm:col-span-2"><input name="newsletterSub" maxLength={140} defaultValue={home.newsletterSub} className="input" /></Field>
            </div>
            <button className="btn btn-primary">Save sections</button>
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
          <p className="text-sm text-ink2">{reviewCount} review{reviewCount === 1 ? " is" : "s are"} showing on your homepage. Customers send reviews with the “Write a review” button, and they appear only after you approve them.</p>
          {pendingCount > 0 && <p className="mt-2 rounded-lg bg-mustard/20 p-3 text-sm font-semibold">{pendingCount} new {pendingCount === 1 ? "review is" : "reviews are"} waiting for your approval.</p>}
          <div className="mt-3 flex flex-wrap gap-2"><Link href="/admin/reviews" className="btn btn-soft btn-sm">Manage reviews</Link><Link href="/admin/reviews#add" className="btn btn-ghost btn-sm">Add a review I received</Link></div>
        </Panel>

      </div>
    </div>
  );
}
