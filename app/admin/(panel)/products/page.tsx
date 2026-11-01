import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader, StatusBadge, Pager, Empty } from "@/components/admin/ui";
import { DesignArt } from "@/components/DesignArt";
import { Submit } from "@/components/admin/Submit";
import { bulkProducts } from "@/app/admin/actions/products";
import { SelectAll } from "@/components/admin/SelectAll";

export default async function Products({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("inventory.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(sp.type ? { type: sp.type as never } : {}),
    ...(sp.source ? { source: sp.source as never } : {}),
    ...(sp.c ? { collections: { some: { collection: { slug: sp.c } } } } : {}),
    ...(sp.review ? { needsReview: true } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } }, { tags: { has: sp.q.toLowerCase() } }] } : {}),
  };
  const [total, products, collections, { base }] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { variants: { where: { active: true } }, _count: { select: { collections: true } } } }),
    db.collection.findMany({ orderBy: [{ type: "asc" }, { sort: "asc" }] }),
    getCurrencies(),
  ]);
  const qs = (p: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ ...sp, ...p }).filter(([, v]) => v) as [string, string][]).toString();
  const can = (p: string) => staff.perms.has(p);
  return (
    <div>
      <PageHeader
        title="Products"
        sub={`${total} products · prices in ${base.code}`}
        actions={<>
          {can("inventory.import") && <Link href="/admin/inventory/import" className="btn btn-ghost btn-sm">Import / export</Link>}
          {can("inventory.edit") && <Link href="/admin/products/new" className="btn btn-primary btn-sm">New product</Link>}
        </>}
      />
      {sp.deleted && <p className="mb-4 rounded-xl bg-mint/15 p-3 text-sm text-mint">Product deleted.</p>}
      <p className="mb-3 text-xs text-ink3">To delete products: tick them and choose <b>Delete</b> below (or pick <b>ALL products</b>). Products that have been sold are archived instead, to keep order history and accounts correct. To wipe test data, use Settings → Reset data.</p>
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Name, SKU or tag" className="input max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="select max-w-[140px]"><option value="">Any status</option><option>ACTIVE</option><option>DRAFT</option><option>ARCHIVED</option></select>
        <select name="type" defaultValue={sp.type ?? ""} className="select max-w-[170px]"><option value="">Any type</option><option value="STOCK_PHYSICAL">Stock</option><option value="MADE_TO_ORDER">Made to order</option><option value="DIGITAL">Digital</option><option value="TOOL">Tool</option></select>
        <select name="source" defaultValue={sp.source ?? ""} className="select max-w-[140px]"><option value="">Any source</option><option>SEED</option><option>IMPORT</option><option>MANUAL</option></select>
        <select name="c" defaultValue={sp.c ?? ""} className="select max-w-[180px]"><option value="">Any collection</option>{collections.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
        <button className="btn btn-soft">Filter</button>
        <Link href="/admin/products?review=1" className="btn btn-ghost">Needs review</Link>
      </form>

      <form action={bulkProducts}>
        <div className="card mb-3 flex flex-wrap items-center gap-2 p-3 text-sm">
          <span className="text-ink3">Bulk:</span>
          <select name="bulk" className="select !w-auto !py-1.5" required defaultValue="">
            <option value="" disabled>Choose action…</option>
            <option value="publish">Publish</option><option value="draft">Move to draft</option><option value="archive">Archive</option>
            <option value="feature">Feature</option><option value="unfeature">Unfeature</option><option value="reviewed">Mark reviewed</option>
            <option value="collection">Add to collection →</option><option value="price">Change price by % →</option>
            {can("inventory.delete") && <option value="delete">Delete (archives if sold)</option>}
          </select>
          <select name="collectionId" className="select !w-auto !py-1.5" defaultValue=""><option value="">(collection)</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input name="pct" type="number" step="0.1" placeholder="% e.g. 10 or -5" className="input !w-36 !py-1.5" />
          <select name="scope" className="select !w-auto !py-1.5"><option value="selected">Selected rows</option><option value="filtered">All {total} matching filter</option><option value="seed">All seeded products</option><option value="all">ALL products</option></select>
          <input type="hidden" name="filter" value={JSON.stringify(where)} />
          <Submit className="btn btn-primary btn-sm" confirm="Apply this bulk action?">Apply</Submit>
        </div>
        <div className="card overflow-x-auto">
          {products.length === 0 ? <Empty>No products match.</Empty> : (
            <table className="tbl">
              <thead><tr><th className="w-8"><SelectAll /></th><th /><th>Product</th><th>Type</th><th>Status</th><th className="num">Variants</th><th className="num">Stock</th><th className="num">From</th><th>Source</th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const physical = p.variants.filter((v) => !v.isDigital);
                  const stock = physical.reduce((a, v) => a + v.onHand, 0);
                  const min = p.variants.reduce<bigint | null>((a, v) => (a === null || v.basePrice < a ? v.basePrice : a), null);
                  return (
                    <tr key={p.id}>
                      <td><input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} /></td>
                      <td className="w-12"><div className="art-tile h-10 w-10 rounded-lg p-1 text-accent"><DesignArt svg={p.designSvg} colors={p.layerColors} uid={`al${p.id}`} /></div></td>
                      <td><Link href={`/admin/products/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link>{p.needsReview && <span className="badge badge-mustard ml-2">review copy</span>}{p.featured && <span className="badge badge-coral ml-1">featured</span>}<div className="text-xs text-ink3">/p/{p.slug}</div></td>
                      <td className="text-xs">{p.type.replace("_", " ").toLowerCase()}</td>
                      <td><StatusBadge s={p.status} /></td>
                      <td className="num">{p.variants.length}</td>
                      <td className={`num ${p.type === "STOCK_PHYSICAL" && stock <= 5 ? "text-mustard" : ""}`}>{p.type === "STOCK_PHYSICAL" || p.type === "TOOL" ? stock : "—"}</td>
                      <td className="num">{min !== null ? formatMoney(min, base.code, base.exponent) : "—"}</td>
                      <td className="text-xs text-ink3">{p.source.toLowerCase()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </form>
      <Pager page={page} pages={Math.ceil(total / 50)} href={(p) => qs({ page: String(p) })} />
    </div>
  );
}
