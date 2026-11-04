import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrencies } from "@/lib/settings";
import { getLandingProducts, getLandingSettings } from "@/lib/landing";
import { DEFAULT_LANDING_PRODUCTS } from "@/lib/landing/defaults";
import { getHome } from "@/lib/storefront";
import { ProductFields } from "@/components/admin/SimpleProductFields";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { landingProductOp, resetLanding, saveLandingPage, saveLandingProduct, syncLanding } from "@/app/admin/actions/landing";
import { saveHomeRows, saveHomeTop } from "@/app/admin/actions/storefront";

export default async function LandingProducts() {
  await requireStaff("content.edit");
  const [list, seo, home, { base }, reviewCount, cols] = await Promise.all([
    getLandingProducts(), getLandingSettings(), getHome(), getCurrencies(),
    db.review.count({ where: { status: "published" } }),
    db.collection.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
  ]);
  const names = cols.map((c) => c.name);
  const notReady = list.filter((p) => p.price > 0 && !p.variantId).length;
  const noPrice = list.filter((p) => p.price <= 0).length;
  const rows = [...home.rows, { title: "", intro: "", collection: "", banner: "", count: 8 }];
  return (
    <div>
      <PageHeader title="Homepage" sub="Everything on your homepage in one place. Changes go live within about 30 seconds." />
      <WebsiteTabs active="landing" />
      <div className="space-y-6">
        <Panel title="1. Add a product">
          <ActionForm action={saveLandingProduct}>
            <ProductFields base={base.code} collections={names} />
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Add product</button>
              <span className="text-xs text-ink3">It shows in its category on the homepage and in the shop. Adding many? <Link href="/admin/inventory/import" className="text-accent underline">Use the spreadsheet</Link>.</span>
            </div>
          </ActionForm>
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
              <Field label="Photo on the right" hint="Tall photo works best (JPG or PNG)." className="sm:col-span-2"><input name="heroPhoto" type="file" accept="image/*" className="input" /></Field>
              {home.heroImage && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={home.heroImage} alt="" className="h-14 w-12 rounded object-cover" />
                  <input type="checkbox" name="remove_hero" /> Go back to the original photo
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

        {(notReady > 0 || noPrice > 0) && (
          <Panel title="Make products ready to sell">
            <ActionForm action={syncLanding}>
              <p className="text-sm text-ink2">
                {notReady > 0 && <>{notReady} product{notReady === 1 ? " has" : "s have"} a price but customers can’t buy {notReady === 1 ? "it" : "them"} yet. </>}
                {noPrice > 0 && <>{noPrice} {noPrice === 1 ? "has" : "have"} no price yet. Open a product below and type a price to sell it. </>}
              </p>
              {notReady > 0 && <button className="btn btn-primary">Make all {notReady} ready to sell</button>}
            </ActionForm>
          </Panel>
        )}

        <Panel title={`Products added here (${list.length})`}>
          <ul className="divide-y divide-line/60">
            {list.map((p, i) => (
              <li key={p.id} className="py-3">
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg text-xl" style={{ background: p.bg }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : p.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-ink3">{p.cat}{p.subcat ? ` · ${p.subcat}` : ""}</span>
                    </span>
                    <span className="tabular text-sm">{p.price ? `${base.code} ${p.price.toFixed(2)}` : "No price"}</span>
                    {p.variantId ? <span className="badge badge-mint">For sale</span> : <span className="badge badge-muted">Not for sale</span>}
                    <span className="btn btn-soft btn-sm">Edit</span>
                  </summary>
                  <div className="mt-4 rounded-xl border border-line/60 p-4">
                    <ActionForm action={saveLandingProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <ProductFields p={p} base={base.code} collections={names} />
                      <button className="btn btn-primary btn-sm">Save changes</button>
                    </ActionForm>
                  </div>
                </details>
                <div className="mt-2 flex gap-2">
                  {(["up", "down", "delete"] as const).map((op) => (
                    <form key={op} action={landingProductOp}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value={op} />
                      <button
                        className={`btn btn-sm ${op === "delete" ? "btn-ghost text-danger" : "btn-ghost"}`}
                        disabled={(op === "up" && i === 0) || (op === "down" && i === list.length - 1)}
                        aria-label={`${op === "delete" ? "Delete" : `Move ${op}`} ${p.name}`}
                      >
                        {op === "up" ? "↑" : op === "down" ? "↓" : "Delete"}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Start over">
          <ActionForm action={resetLanding} confirm="Replace the products added here with the starter list? Your own products will be hidden from the shop.">
            <p className="text-sm text-ink2">Brings back the {DEFAULT_LANDING_PRODUCTS.length} starter products. Products you added here are hidden from the shop.</p>
            <button className="btn btn-ghost btn-sm">Restore starter products</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
