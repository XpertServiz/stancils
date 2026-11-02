import { requireStaff } from "@/lib/auth";
import { getLandingProducts, type LandingProduct } from "@/lib/landing";
import { DEFAULT_LANDING_PRODUCTS, DEPARTMENTS, SUBCATEGORIES } from "@/lib/landing/defaults";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { landingProductOp, resetLanding, saveLandingProduct } from "@/app/admin/actions/landing";

function ProductFields({ p }: { p?: LandingProduct }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Product name" className="sm:col-span-2"><input name="name" required maxLength={120} defaultValue={p?.name} className="input" /></Field>
      <Field label="Main collection">
        <select name="cat" defaultValue={p?.cat ?? "Stencils"} className="select">{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
      </Field>
      <Field label="Subcategory" hint="Must belong to the main collection.">
        <select name="subcat" defaultValue={p?.subcat ?? ""} className="select">
          <option value="">— none —</option>
          {DEPARTMENTS.map((d) => (
            <optgroup key={d} label={d}>{SUBCATEGORIES[d].map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
          ))}
        </select>
      </Field>
      <Field label="Price (USD)" hint="0 shows “Price to be added”."><input name="price" type="number" min={0} step="0.01" defaultValue={p?.price ?? 0} className="input" /></Field>
      <Field label="Badge"><input name="tag" maxLength={30} defaultValue={p?.tag ?? "New"} className="input" /></Field>
      <Field label="Icon (emoji or symbol)"><input name="icon" maxLength={8} defaultValue={p?.icon ?? "✦"} className="input" /></Field>
      <Field label="Card background"><input name="bg" type="color" defaultValue={p?.bg && p.bg.length === 7 ? p.bg : "#f3e5ee"} className="input h-10 p-1" /></Field>
      <Field label="Photo (optional — replaces the icon)" className="sm:col-span-2"><input name="photo" type="file" accept="image/*" className="input" /></Field>
      {p?.image && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />
          <input type="checkbox" name="remove_photo" /> Remove photo
        </label>
      )}
    </div>
  );
}

export default async function LandingProducts() {
  await requireStaff("content.edit");
  const list = await getLandingProducts();
  return (
    <div>
      <PageHeader title="Landing products" sub="The products in “Shop the studio” on the homepage. Changes appear on the site within about 30 seconds." />
      <WebsiteTabs active="landing" />
      <div className="space-y-6">
        <Panel title="Add a product">
          <ActionForm action={saveLandingProduct}>
            <ProductFields />
            <div className="flex flex-wrap items-center gap-3">
              <select name="position" className="select !w-auto"><option value="end">Add at the end</option><option value="top">Add at the top</option></select>
              <button className="btn btn-primary">Add product</button>
            </div>
          </ActionForm>
        </Panel>

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
                      <span className="block truncate text-xs text-ink3">{p.cat}{p.subcat ? ` · ${p.subcat}` : ""} · {p.tag || "no badge"}</span>
                    </span>
                    <span className="tabular text-sm">{p.price ? `$${p.price.toFixed(2)}` : "Price to be added"}</span>
                    <span className="btn btn-soft btn-sm">Edit</span>
                  </summary>
                  <div className="mt-4 rounded-xl border border-line/60 p-4">
                    <ActionForm action={saveLandingProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <ProductFields p={p} />
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
          <ActionForm action={resetLanding} confirm="Replace the homepage products with the original list from the approved design?">
            <p className="text-sm text-ink2">Restores the {DEFAULT_LANDING_PRODUCTS.length} products exactly as in the approved design file. Your added products and edits are removed.</p>
            <button className="btn btn-ghost btn-sm">Restore original products</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
