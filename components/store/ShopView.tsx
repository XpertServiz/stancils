import Link from "next/link";
import { listProducts, type ListFilters } from "@/lib/catalog";
import { getActiveCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { ProductGrid } from "./ProductCard";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(sp: SP, collection?: string): ListFilters {
  const n = (k: string) => (one(sp[k]) ? Number(one(sp[k])) : undefined);
  return {
    q: one(sp.q)?.slice(0, 80),
    collection: collection ?? one(sp.c),
    type: one(sp.type),
    foodSafe: one(sp.food) === "1",
    digital: one(sp.digital) === "1",
    inStock: one(sp.stock) === "1",
    layers: n("layers"),
    material: one(sp.mat),
    min: n("min"),
    max: n("max"),
    sort: one(sp.sort),
    page: n("page"),
  };
}

export async function ShopView({ sp, collection, basePath }: { sp: SP; collection?: string; basePath: string }) {
  const f = parseFilters(sp, collection);
  const { cur, base } = await getActiveCurrency();
  const [{ cards, total, page, perPage }, surfaces, styles] = await Promise.all([
    listProducts(f, cur, base),
    db.collection.findMany({ where: { type: "SURFACE" }, orderBy: { sort: "asc" } }),
    db.collection.findMany({ where: { type: { in: ["STYLE", "OCCASION"] } }, orderBy: [{ type: "asc" }, { sort: "asc" }] }),
  ]);
  const pages = Math.ceil(total / perPage);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (one(v)) p.set(k, one(v)!);
    for (const [k, v] of Object.entries(patch)) (v ? p.set(k, v) : p.delete(k));
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const toggle = (k: string) => (one(sp[k]) === "1" ? undefined : "1");
  const active = (k: string, v = "1") => one(sp[k]) === v;

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-6 text-sm" aria-label="Filters">
        <form action={basePath} className="space-y-2">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={f.q} className="input" placeholder="mandala, latte, A–Z…" />
        </form>
        <div>
          <p className="label">Surface</p>
          <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
            {surfaces.map((s) => (
              <Link key={s.id} href={`/c/${s.slug}`} className={`chip ${collection === s.slug ? "!border-accent text-accent" : ""}`}>{s.name}</Link>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Options</p>
          <div className="flex flex-col gap-1.5">
            {[["food", "Food-safe"], ["digital", "Digital file available"], ["stock", "In stock / made to order"]].map(([k, l]) => (
              <Link key={k} href={qs({ [k]: toggle(k), page: undefined })} className="flex items-center gap-2">
                <span className={`grid h-4 w-4 place-items-center rounded border ${active(k) ? "border-accent bg-accent text-onaccent" : "border-line"}`}>{active(k) ? "✓" : ""}</span>{l}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Layers</p>
          <div className="flex gap-1.5">
            {[["", "Any"], ["1", "Single"], ["2", "Multi"]].map(([v, l]) => (
              <Link key={l} href={qs({ layers: v || undefined, page: undefined })} className={`chip ${(one(sp.layers) ?? "") === v ? "!border-accent text-accent" : ""}`}>{l}</Link>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Material</p>
          <div className="flex flex-wrap gap-1.5">
            {[["", "Any"], ["MYLAR", "Mylar"], ["PET", "Food PET"], ["STEEL", "Steel"]].map(([v, l]) => (
              <Link key={l} href={qs({ mat: v || undefined, page: undefined })} className={`chip ${(one(sp.mat) ?? "") === v ? "!border-accent text-accent" : ""}`}>{l}</Link>
            ))}
          </div>
        </div>
        <form action={basePath} className="space-y-2">
          {Object.entries(sp).filter(([k]) => !["min", "max", "page"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={one(v)} />)}
          <p className="label">Price ({cur.code})</p>
          <div className="flex items-center gap-2">
            <input name="min" type="number" min={0} defaultValue={f.min} placeholder="Min" className="input !py-1.5" aria-label="Minimum price" />
            <span>–</span>
            <input name="max" type="number" min={0} defaultValue={f.max} placeholder="Max" className="input !py-1.5" aria-label="Maximum price" />
          </div>
          <button className="btn btn-soft btn-sm w-full">Apply</button>
        </form>
        <div>
          <p className="label">Style & occasion</p>
          <div className="flex flex-wrap gap-1.5">
            {styles.map((s) => <Link key={s.id} href={`/c/${s.slug}`} className={`chip ${collection === s.slug ? "!border-accent text-accent" : ""}`}>{s.name}</Link>)}
          </div>
        </div>
      </aside>

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink3">{total} {total === 1 ? "design" : "designs"}{f.q ? ` for “${f.q}”` : ""}</p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[["", "Popular"], ["new", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"], ["rating", "Top rated"]].map(([v, l]) => (
              <Link key={l} href={qs({ sort: v || undefined, page: undefined })} className={`chip ${(one(sp.sort) ?? "") === v ? "!border-accent text-accent" : ""}`}>{l}</Link>
            ))}
          </div>
        </div>
        <ProductGrid cards={cards} />
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
