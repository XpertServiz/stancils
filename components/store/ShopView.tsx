import Link from "next/link";
import { listProducts, type ListFilters } from "@/lib/catalog";
import { getActiveCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { getMenu, slugsFor } from "@/lib/storefront";
import { ProductGrid } from "./ProductCard";
import { SortSelect } from "./SortSelect";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(sp: SP, collection?: string): ListFilters {
  const n = (k: string) => (one(sp[k]) ? Number(one(sp[k])) : undefined);
  return {
    q: one(sp.q)?.slice(0, 80),
    collection: collection ?? one(sp.c),
    inStock: one(sp.stock) === "1",
    min: n("min"),
    max: n("max"),
    sort: one(sp.sort),
    page: n("page"),
  };
}

const SORTS: [string, string][] = [["", "Featured"], ["rating", "Best selling"], ["price_asc", "Price, low to high"], ["price_desc", "Price, high to low"], ["new", "Date, new to old"]];

export async function ShopView({ sp, collection, basePath }: { sp: SP; collection?: string; basePath: string }) {
  const f = parseFilters(sp, collection);
  const menu = await getMenu();
  if (f.collection) f.collections = slugsFor(f.collection, menu);
  const { cur, base } = await getActiveCurrency();
  const [{ cards, total, page, perPage }, collections] = await Promise.all([
    listProducts(f, cur, base),
    db.collection.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], take: 40, select: { slug: true, name: true } }),
  ]);
  const pages = Math.ceil(total / perPage);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (one(v)) p.set(k, one(v)!);
    for (const [k, v] of Object.entries(patch)) (v ? p.set(k, v) : p.delete(k));
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const stockOn = one(sp.stock) === "1";

  return (
    <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
      <aside className="space-y-6 text-sm" aria-label="Filters">
        <details className="group lg:open:block" open>
          <summary className="mb-2 flex cursor-pointer list-none items-center justify-between font-bold uppercase tracking-wider lg:pointer-events-none">Availability</summary>
          <Link href={qs({ stock: stockOn ? undefined : "1", page: undefined })} className="flex items-center gap-2">
            <span className={`grid h-4 w-4 place-items-center rounded border text-[11px] ${stockOn ? "border-accent bg-accent text-onaccent" : "border-line"}`}>{stockOn ? "✓" : ""}</span>In stock / made to order
          </Link>
        </details>
        <form action={basePath} className="space-y-2">
          {Object.entries(sp).filter(([k]) => !["min", "max", "page"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={one(v)} />)}
          <p className="font-bold uppercase tracking-wider">Price ({cur.code})</p>
          <div className="flex items-center gap-2">
            <input name="min" type="number" min={0} defaultValue={f.min} placeholder="From" className="input !py-1.5" aria-label="Minimum price" />
            <span>–</span>
            <input name="max" type="number" min={0} defaultValue={f.max} placeholder="To" className="input !py-1.5" aria-label="Maximum price" />
          </div>
          <button className="btn btn-sm w-full border border-line hover:border-accent hover:text-accent">Apply</button>
        </form>
        <div>
          <p className="mb-2 font-bold uppercase tracking-wider">Collections</p>
          <ul className="space-y-1.5">
            <li><Link href="/shop" className={!collection ? "font-bold text-accent" : "hover:text-accent"}>All stencils</Link></li>
            {collections.map((c) => <li key={c.slug}><Link href={`/c/${c.slug}`} className={collection === c.slug ? "font-bold text-accent" : "hover:text-accent"}>{c.name}</Link></li>)}
          </ul>
        </div>
      </aside>

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-3"><span className="text-xs font-bold uppercase tracking-wider text-ink3">Sort by</span>
            <SortSelect value={one(sp.sort) ?? ""} options={SORTS} hrefs={Object.fromEntries(SORTS.map(([v]) => [v, qs({ sort: v || undefined, page: undefined })]))} />
          </label>
          <p className="text-ink3">{total} product{total === 1 ? "" : "s"}{f.q ? ` for “${f.q}”` : ""}</p>
        </div>
        <ProductGrid cards={cards} cols={3} />
        {pages > 1 && (
          <nav className="mt-10 flex flex-wrap justify-center gap-1.5" aria-label="Pagination">
            {Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2).map((p, i, arr) => (
              <span key={p} className="flex items-center gap-1.5">
                {i > 0 && arr[i - 1] !== p - 1 && <span className="text-ink3">…</span>}
                <Link href={qs({ page: p === 1 ? undefined : String(p) })} aria-current={p === page ? "page" : undefined} className={`grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-sm ${p === page ? "border-accent bg-accent text-onaccent" : "border-line"}`}>{p}</Link>
              </span>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
