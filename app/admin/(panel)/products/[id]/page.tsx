import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies, toInfo } from "@/lib/settings";
import { formatMoney, majorString } from "@/lib/money";
import { variantPrice } from "@/lib/services/pricing";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Submit } from "@/components/admin/Submit";
import { DesignArt } from "@/components/DesignArt";
import { deleteImage, deleteProduct, deleteVariant, saveBom, saveProduct, saveVariants, uploadImages } from "@/app/admin/actions/products";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ archived?: string }> }) {
  const staff = await requireStaff("inventory.view");
  const { id } = await params;
  const archivedNotice = (await searchParams).archived;
  const [p, collections, materials, { list, base }] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { sort: "asc" }, include: { prices: true, bom: { include: { material: true } }, material: true } }, images: { orderBy: { sort: "asc" } }, collections: true },
    }),
    db.collection.findMany({ orderBy: [{ type: "asc" }, { sort: "asc" }] }),
    db.material.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getCurrencies(),
  ]);
  if (!p) notFound();
  const others = list.filter((c) => !c.isBase && c.enabled);
  const pp = (p.passport ?? {}) as Record<string, string | number>;
  const can = (x: string) => staff.perms.has(x);
  const sheetMats = materials.filter((m) => m.unit === "cm2");

  return (
    <div className="space-y-6">
      {archivedNotice && <p className="rounded-xl bg-mustard/15 p-3 text-sm text-mustard">This product has orders or stock history, so it was archived (hidden from the shop) instead of deleted. Your order history and accounts stay intact.</p>}
      <PageHeader
        title={p.name}
        sub={<>{p.source.toLowerCase()} · updated {p.updatedAt.toLocaleString()}</>}
        actions={<>
          <Link href={`/p/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm"><ExternalLink size={15} />View on site</Link>
          {can("inventory.delete") && (
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={p.id} />
              <Submit className="btn btn-ghost btn-sm text-danger" confirm="Delete this product? If it has been sold it will be archived instead, to keep your order history.">
                <Trash2 size={15} />Delete product
              </Submit>
            </form>
          )}
        </>}
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Details">
          <ActionForm action={saveProduct} className="space-y-4">
            <input type="hidden" name="id" value={p.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><input name="name" defaultValue={p.name} required className="input" /></Field>
              <Field label="URL slug" hint="Changing it creates a 301 redirect automatically."><input name="slug" defaultValue={p.slug} className="input" /></Field>
              <Field label="Status"><select name="status" defaultValue={p.status} className="select"><option>ACTIVE</option><option>DRAFT</option><option>ARCHIVED</option></select></Field>
              <Field label="Type"><select name="type" defaultValue={p.type} className="select"><option value="STOCK_PHYSICAL">Stock</option><option value="MADE_TO_ORDER">Made to order</option><option value="DIGITAL">Digital</option><option value="TOOL">Tool</option><option value="BUNDLE">Bundle</option></select></Field>
            </div>
            <Field label="Short description"><input name="shortDesc" defaultValue={p.shortDesc ?? ""} maxLength={200} className="input" /></Field>
            <Field label="Description" hint="Supports ## headings, - lists and **bold**."><textarea name="description" defaultValue={p.description ?? ""} rows={8} className="textarea font-mono text-sm" /></Field>
            <Field label="Collections">
              <div className="flex max-h-40 flex-wrap gap-x-4 gap-y-1 overflow-y-auto rounded-xl border border-line p-3 text-sm">
                {collections.map((c) => <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" name="collections" value={c.id} defaultChecked={p.collections.some((x) => x.collectionId === c.id)} />{c.name}</label>)}
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Tags (comma separated)" className="sm:col-span-3"><input name="tags" defaultValue={p.tags.join(", ")} className="input" /></Field>
              <Field label="Layers"><input name="layers" type="number" min={1} max={4} defaultValue={p.layers} className="input" /></Field>
              <Field label="Layer colours" hint="#hex, comma separated" className="sm:col-span-2"><input name="layerColors" defaultValue={p.layerColors.join(", ")} className="input" /></Field>
              <Field label="Repeat width (mm)"><input name="repeatWmm" type="number" defaultValue={p.repeatWmm ?? ""} className="input" /></Field>
              <Field label="Repeat height (mm)"><input name="repeatHmm" type="number" defaultValue={p.repeatHmm ?? ""} className="input" /></Field>
              <Field label="HS code (customs)"><input name="hsCode" defaultValue={p.hsCode ?? ""} className="input" /></Field>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="foodSafe" defaultChecked={p.foodSafe} />Food-safe</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="reusable" defaultChecked={p.reusable} />Reusable</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={p.featured} />Featured</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="needsReview" defaultChecked={p.needsReview} />Copy needs review</label>
            </div>
            <details className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold">Cut-Quality Passport</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Material"><input name="pp_material" defaultValue={String(pp.material ?? "")} className="input" /></Field>
                <Field label="Thickness (µm)"><input name="pp_thickness" type="number" defaultValue={String(pp.thicknessUm ?? "")} className="input" /></Field>
                <Field label="Min bridge (mm)"><input name="pp_bridge" type="number" step="0.1" defaultValue={String(pp.minBridgeMm ?? "")} className="input" /></Field>
                <Field label="Finest detail (mm)"><input name="pp_detail" type="number" step="0.1" defaultValue={String(pp.finestDetailMm ?? "")} className="input" /></Field>
                <Field label="Reuse"><input name="pp_reuse" defaultValue={String(pp.reuse ?? "")} className="input" /></Field>
                <Field label="Cleaning"><input name="pp_cleaning" defaultValue={String(pp.cleaning ?? "")} className="input" /></Field>
              </div>
            </details>
            <details className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold">SEO</summary>
              <div className="mt-3 space-y-3">
                <Field label="SEO title" hint={`${(p.seoTitle ?? "").length}/60`}><input name="seoTitle" defaultValue={p.seoTitle ?? ""} maxLength={70} className="input" /></Field>
                <Field label="Meta description" hint="Aim for 120–160 characters."><textarea name="seoDesc" defaultValue={p.seoDesc ?? ""} maxLength={200} rows={2} className="textarea" /></Field>
              </div>
            </details>
            <details className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold">Stencil artwork (SVG)</summary>
              <div className="mt-3 space-y-3">
                <Field label="Upload SVG" hint="Replaces the artwork below. Scripts and external links are stripped."><input type="file" name="svgFile" accept=".svg,image/svg+xml" className="text-sm" /></Field>
                <textarea name="designSvg" defaultValue={p.designSvg ?? ""} rows={4} className="textarea font-mono text-xs" />
              </div>
            </details>
            {can("inventory.edit") && <button className="btn btn-primary">Save product</button>}
          </ActionForm>
        </Panel>

        <div className="space-y-6">
          <Panel title="Preview">
            <div className="art-tile aspect-square rounded-2xl p-8 text-accent"><DesignArt svg={p.designSvg} colors={p.layerColors} uid={`ap${p.id}`} /></div>
          </Panel>
          <Panel title="Photos">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {p.images.map((img) => (
                <div key={img.id} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? ""} className="aspect-square w-full rounded-lg object-cover" />
                  <form action={deleteImage} className="absolute right-1 top-1 opacity-0 group-hover:opacity-100"><input type="hidden" name="id" value={img.id} /><button className="rounded bg-black/70 p-1 text-white" aria-label="Delete image"><Trash2 size={14} /></button></form>
                </div>
              ))}
            </div>
            <ActionForm action={uploadImages}>
              <input type="hidden" name="productId" value={p.id} />
              <input type="file" name="images" multiple accept="image/*" className="text-sm" />
              <button className="btn btn-soft btn-sm">Upload</button>
            </ActionForm>
          </Panel>
        </div>
      </div>

      <Panel title={`Variants & prices (base: ${base.code})`}>
        <ActionForm action={saveVariants}>
          <input type="hidden" name="productId" value={p.id} />
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>SKU</th><th>Name</th><th>W×H mm</th><th>Material</th><th>Price {base.code}</th><th>Compare at</th>{others.map((c) => <th key={c.code} title={`Manual ${c.code} price — leave blank for automatic`}>{c.code}</th>)}<th className="num">On hand</th><th className="num">Reserved</th><th>Reorder at</th><th>Digital</th><th>Active</th><th /></tr></thead>
              <tbody>
                {p.variants.map((v) => (
                  <tr key={v.id}>
                    <td><input type="hidden" name="vid" value={v.id} /><input name={`sku_${v.id}`} defaultValue={v.sku} className="input !w-32 !py-1 font-mono text-xs" /></td>
                    <td><input name={`name_${v.id}`} defaultValue={v.name} className="input !w-40 !py-1" /></td>
                    <td className="whitespace-nowrap"><input name={`w_${v.id}`} defaultValue={v.widthMm ?? ""} className="input !w-16 !py-1" />×<input name={`h_${v.id}`} defaultValue={v.heightMm ?? ""} className="input !w-16 !py-1" /></td>
                    <td><select name={`mat_${v.id}`} defaultValue={v.materialId ?? ""} className="select !w-36 !py-1 text-xs"><option value="">—</option>{sheetMats.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select><input type="hidden" name={`th_${v.id}`} value={v.thicknessUm ?? ""} /><input type="hidden" name={`weight_${v.id}`} value={v.weightG} /></td>
                    <td><input name={`price_${v.id}`} defaultValue={majorString(v.basePrice, base.exponent)} className="input !w-24 !py-1" disabled={!can("pricing.edit")} /></td>
                    <td><input name={`compare_${v.id}`} defaultValue={v.compareAt ? majorString(v.compareAt, base.exponent) : ""} className="input !w-24 !py-1" disabled={!can("pricing.edit")} /></td>
                    {others.map((c) => {
                      const manual = v.prices.find((x) => x.currency === c.code);
                      const auto = variantPrice({ ...v, prices: [] }, toInfo(c), toInfo(base)).price;
                      return <td key={c.code}><input name={`px_${c.code}_${v.id}`} defaultValue={manual ? majorString(manual.price, c.exponent) : ""} placeholder={majorString(auto, c.exponent)} className="input !w-20 !py-1" disabled={!can("pricing.edit")} /></td>;
                    })}
                    <td className="num">{v.isDigital ? "∞" : v.onHand}</td>
                    <td className="num">{v.reserved}</td>
                    <td><input name={`reorder_${v.id}`} defaultValue={v.reorderLevel} className="input !w-16 !py-1" /></td>
                    <td><input type="checkbox" name={`digital_${v.id}`} defaultChecked={v.isDigital} /></td>
                    <td><input type="checkbox" name={`active_${v.id}`} defaultChecked={v.active} /></td>
                    <td>{can("inventory.delete") && <button formAction={async (fd: FormData) => { "use server"; fd.set("id", v.id); await deleteVariant(fd); }} className="text-ink3 hover:text-danger" aria-label="Delete variant"><Trash2 size={15} /></button>}</td>
                  </tr>
                ))}
                <tr className="bg-s2/30">
                  <td><input name="new_sku" placeholder="New SKU" className="input !w-32 !py-1 font-mono text-xs" /></td>
                  <td><input name="new_name" placeholder="Size name" className="input !w-40 !py-1" /></td>
                  <td className="whitespace-nowrap"><input name="new_w" placeholder="W" className="input !w-16 !py-1" />×<input name="new_h" placeholder="H" className="input !w-16 !py-1" /></td>
                  <td />
                  <td><input name="new_price" placeholder="0.00" className="input !w-24 !py-1" /></td>
                  <td colSpan={others.length + 4} className="text-xs text-ink3">Fill a new SKU to add a variant · <label><input type="checkbox" name="new_digital" /> digital</label></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink3">Blank currency cells use automatic pricing (FX rate + markup + rounding, shown as placeholder). Stock is changed only through Inventory → adjustments, purchases and sales so the ledger stays correct.</p>
          {can("inventory.edit") && <button className="btn btn-primary">Save variants</button>}
        </ActionForm>
      </Panel>

      {(p.type === "MADE_TO_ORDER" || p.variants.some((v) => v.bom.length)) && (
        <Panel title="Bill of materials (consumed at production)">
          <div className="space-y-4">
            {p.variants.filter((v) => !v.isDigital).map((v) => (
              <div key={v.id}>
                <p className="mb-1 text-sm font-semibold">{v.name} <span className="font-mono text-xs text-ink3">{v.sku}</span></p>
                <ul className="mb-2 space-y-1 text-sm">
                  {v.bom.map((b) => (
                    <li key={b.id} className="flex items-center gap-2">
                      <span className="text-ink2">{b.qty} {b.material.unit} · {b.material.name}</span>
                      <form action={saveBom}><input type="hidden" name="variantId" value={v.id} /><input type="hidden" name="remove" value={b.id} /><button className="text-ink3 hover:text-danger" aria-label="Remove"><Trash2 size={13} /></button></form>
                    </li>
                  ))}
                  {v.bom.length === 0 && <li className="text-xs text-ink3">No BOM — production uses the sheet area of the variant&apos;s material.</li>}
                </ul>
                <form action={saveBom} className="flex flex-wrap gap-2">
                  <input type="hidden" name="variantId" value={v.id} />
                  <select name="materialId" className="select !w-56 !py-1 text-sm">{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select>
                  <input name="qty" type="number" min={1} placeholder="Qty" className="input !w-24 !py-1" />
                  <Submit className="btn btn-soft btn-sm">Add line</Submit>
                </form>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <p className="text-xs text-ink3">Lowest price: {formatMoney(p.variants.reduce((a, v) => (v.basePrice < a ? v.basePrice : a), p.variants[0]?.basePrice ?? 0n), base.code, base.exponent)}</p>
    </div>
  );
}
