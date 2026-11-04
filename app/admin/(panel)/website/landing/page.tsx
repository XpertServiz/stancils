import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrencies } from "@/lib/settings";
import { getLandingProducts, getLandingSettings } from "@/lib/landing";
import { DEFAULT_LANDING_PRODUCTS } from "@/lib/landing/defaults";
import { ProductFields } from "@/components/admin/SimpleProductFields";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { landingProductOp, resetLanding, saveLandingPage, saveLandingProduct, syncLanding } from "@/app/admin/actions/landing";

export default async function LandingProducts() {
  await requireStaff("content.edit");
  const [list, page, { base }, reviewCount] = await Promise.all([getLandingProducts(), getLandingSettings(), getCurrencies(), db.review.count({ where: { status: "published" } })]);
  const notReady = list.filter((p) => p.price > 0 && !p.variantId).length;
  const noPrice = list.filter((p) => p.price <= 0).length;
  return (
    <div>
      <PageHeader title="Homepage" sub="Everything on your homepage in one place. Changes go live within about 30 seconds." />
      <WebsiteTabs active="landing" />
      <div className="space-y-6">
        <Panel title="Add a product">
          <ActionForm action={saveLandingProduct}>
            <ProductFields base={base.code} />
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Add to homepage</button>
              <span className="text-xs text-ink3">Adding many? <Link href="/admin/inventory/import" className="text-accent underline">Use the spreadsheet</Link>.</span>
            </div>
          </ActionForm>
        </Panel>

        {(notReady > 0 || noPrice > 0) && (
          <Panel title="Make products ready to sell">
            <ActionForm action={syncLanding}>
              <p className="text-sm text-ink2">
                {notReady > 0 && <>{notReady} product{notReady === 1 ? " has" : "s have"} a price but customers can’t buy {notReady === 1 ? "it" : "them"} yet. </>}
                {noPrice > 0 && <>{noPrice} {noPrice === 1 ? "has" : "have"} no price, so {noPrice === 1 ? "it shows" : "they show"} “Get a quote”. Open a product below and type a price to sell it. </>}
              </p>
              {notReady > 0 && <button className="btn btn-primary">Make all {notReady} ready to sell</button>}
            </ActionForm>
          </Panel>
        )}

        <Panel title={`Products on the homepage (${list.length})`}>
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
                    <span className="tabular text-sm">{p.price ? `${base.code} ${p.price.toFixed(2)}` : "Get a quote"}</span>
                    {p.variantId ? <span className="badge badge-mint">For sale</span> : <span className="badge badge-muted">Not for sale</span>}
                    <span className="btn btn-soft btn-sm">Edit</span>
                  </summary>
                  <div className="mt-4 rounded-xl border border-line/60 p-4">
                    <ActionForm action={saveLandingProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <ProductFields p={p} base={base.code} />
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

        <Panel title="Top of the page">
          <ActionForm action={saveLandingPage}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Big headline" hint="Keep it short."><input name="headline" maxLength={60} defaultValue={page.headline} className="input" /></Field>
              <Field label="One line under it"><input name="sub" maxLength={90} defaultValue={page.sub} className="input" /></Field>
              <Field label="Photo of your model holding a stencil" hint="Replaces the drawing. A tall photo works best (JPG or PNG)." className="sm:col-span-2">
                <input name="heroPhoto" type="file" accept="image/*" className="input" />
              </Field>
              {page.heroImage && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.heroImage} alt="" className="h-12 w-12 rounded object-cover" />
                  <input type="checkbox" name="remove_hero" /> Go back to the drawing
                </label>
              )}
            </div>
            <details className="rounded-xl border border-line p-3" open>
              <summary className="cursor-pointer text-sm font-semibold">Google search (helps people find you)</summary>
              <div className="mt-3 space-y-3">
                <Field label="Page title" hint={`${page.seoTitle.length}/60 — the blue link people see on Google.`}><input name="seoTitle" maxLength={70} defaultValue={page.seoTitle} className="input" /></Field>
                <Field label="Short description" hint={`${page.seoDesc.length}/160 — the grey text under the link.`}><textarea name="seoDesc" maxLength={170} rows={2} defaultValue={page.seoDesc} className="textarea" /></Field>
                <Field label="Keywords" hint="What would a customer type into Google? Separate with commas."><textarea name="keywords" maxLength={300} rows={2} defaultValue={page.keywords} className="textarea" /></Field>
              </div>
            </details>
            <button className="btn btn-primary">Save</button>
          </ActionForm>
        </Panel>

        <Panel title="Customer reviews">
          <p className="text-sm text-ink2">{reviewCount} review{reviewCount === 1 ? " is" : "s are"} showing on your homepage. Featured reviews show first.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Link href="/admin/reviews" className="btn btn-soft btn-sm">Manage reviews</Link><Link href="/admin/reviews#add" className="btn btn-ghost btn-sm">Add a review I received</Link></div>
        </Panel>

        <Panel title="Start over">
          <ActionForm action={resetLanding} confirm="Replace the homepage products with the starter list? Your own products will be hidden from the shop.">
            <p className="text-sm text-ink2">Brings back the {DEFAULT_LANDING_PRODUCTS.length} starter products. Your own homepage products are removed.</p>
            <button className="btn btn-ghost btn-sm">Restore starter products</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
