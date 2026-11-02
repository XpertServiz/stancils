"use client";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

export type ShopItem = { key: string; dept: string; name: string; sub: string; tag: string; price: string; href: string; cta: string; art: ReactNode };

const BG = ["#f3e5ee", "#efe7f6", "#e1e6f1", "#f1e4d9", "#e5f0e7", "#f6ebdf", "#dfe9f1", "#fce4ea"];

/** "Shop the studio": department pills + live search over the homepage items. */
export function ShopStudio({ items, departments }: { items: ShopItem[]; departments: string[] }) {
  const [dept, setDept] = useState("All");
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => (dept === "All" || i.dept === dept) && `${i.name} ${i.sub}`.toLowerCase().includes(needle));
  }, [items, dept, q]);

  return (
    <>
      <div className="sgs-top">
        <div>
          <div className="sgs-eyebrow">Made to inspire</div>
          <h2 className="sgs-h2">Shop the studio</h2>
          <p className="sgs-sub">Browse products by category, or search for something specific.</p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
          className="mt-3 w-full max-w-none rounded-full border border-[#eae8f5] bg-white px-4 py-3 text-sm outline-none focus:border-[#e95387] sm:mt-0 sm:max-w-[280px]"
        />
      </div>
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Departments">
        {departments.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={d === dept}
            onClick={() => setDept(d)}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${d === dept ? "border-[#e95387] bg-[#e95387] text-white" : "border-[#eadce3] bg-white text-[#2c2640] hover:border-[#e95387]"}`}
          >
            {d}
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="grid grid-cols-1 gap-[17px] min-[481px]:grid-cols-2 lg:grid-cols-4">
          {shown.map((p, i) => (
            <article key={p.key} className="overflow-hidden rounded-[15px] border border-[#f0e8f5] bg-white transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_16px_30px_#00000010]">
              <Link href={p.href} className="relative block h-[215px] overflow-hidden" style={{ background: BG[i % BG.length] }} aria-label={p.name}>
                <b className="absolute left-3 top-3 z-[1] rounded-md bg-[#fffefa] px-2 py-1.5 text-[10px] font-bold uppercase tracking-[.07em] shadow-[0_4px_10px_#00000010]">{p.tag}</b>
                <div className="absolute inset-0 flex items-center justify-center p-7 pt-10">{p.art}</div>
              </Link>
              <div className="p-4">
                <div className="text-[10px] font-extrabold uppercase tracking-[.09em] text-[#a36d10]">{p.dept}</div>
                <div className="mt-0.5 text-[11px] text-[#6b6680]">{p.sub}</div>
                <h3 className="my-2 line-clamp-2 min-h-[40px] text-[15px] font-semibold">
                  <Link href={p.href} className="hover:text-[#e95387]">{p.name}</Link>
                </h3>
                <div className="flex items-center justify-between gap-2 font-extrabold">
                  <span className="tabular text-sm">{p.price}</span>
                  <Link href={p.href} className="shrink-0 rounded-full bg-[#6e66c6] px-3 py-2 text-xs font-semibold text-white hover:brightness-110">{p.cta}</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="py-10 text-[#6b6680]">No products found for this selection yet.</p>
      )}
      <div className="mt-8 text-center">
        <Link href="/shop" className="sgs-textlink">View all stencils <span className="ml-2">→</span></Link>
      </div>
    </>
  );
}
