"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";
import { setCurrency } from "@/app/actions/prefs";
import type { MenuItem } from "@/lib/storefront";
import { LogoMark } from "./BrandLogo";

/** Sticky header band (deep green). */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  return <header className="sticky top-0 z-50 border-t border-[#2A4A41] bg-stone text-[#E8EFEA]">{children}</header>;
}

/** Top strip: three short lines in gold capitals. */
export function AnnouncementBar({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-7 gap-y-1.5 bg-stone px-4 py-2.5 text-center text-[13px] uppercase tracking-[.1em] text-mustard">
      {items.filter(Boolean).map((t, i) => <span key={t} className={i === 1 ? "hidden sm:inline" : ""}>{t}</span>)}
    </div>
  );
}

type Suggest = { products: { slug: string; name: string; price: string; image: string | null }[]; collections: { slug: string; name: string }[] };

export function SearchBox({ autoFocus = false, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const [s, setS] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return setS(null);
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(t)}`, { signal: ctl.signal }).then((r) => r.json()).then((d) => { setS(d); setOpen(true); }).catch(() => {});
    }, 220);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [q]);
  useEffect(() => {
    const off = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);
  const go = (href: string) => { setOpen(false); setQ(""); onDone?.(); router.push(href); };
  return (
    <div ref={box} className="relative w-full">
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`); }} className="flex flex-wrap gap-2.5">
        <label htmlFor={id} className="sr-only">Search products</label>
        <input id={id} autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => s && setOpen(true)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search stencils, gifts, t-shirts, art..." autoComplete="off"
          className="min-w-0 flex-[1_1_280px] rounded-[2px] border border-mustard bg-stone px-4 py-[13px] text-base text-white placeholder:text-[#9db3aa] focus:outline-none" />
        <button className="rounded-[2px] bg-mustard px-[22px] py-[13px] font-semibold text-[#0E2F28]">Search →</button>
      </form>
      {open && s && (s.products.length > 0 || s.collections.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-line bg-bg text-ink shadow-[0_18px_40px_rgba(0,0,0,.25)]">
          {s.collections.length > 0 && (
            <div className="border-b border-line p-2">
              {s.collections.map((c) => <button key={c.slug} onClick={() => go(`/c/${c.slug}`)} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-s1">{c.name}</button>)}
            </div>
          )}
          <div className="p-2">
            {s.products.map((p) => (
              <button key={p.slug} onClick={() => go(`/p/${p.slug}`)} className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left hover:bg-s1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="h-10 w-10 rounded bg-s1" />}
                <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                <span className="text-sm font-semibold">{p.price}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const circleBtn = "relative grid h-[42px] w-[42px] place-items-center rounded-full border border-[#2A4A41] bg-transparent text-[#E8EFEA] transition hover:border-mustard";

/** The whole header row: logo, dropdown navigation, custom-order button, search, bag and the phone menu. */
export function HeaderBar({ menu, name, tagline }: { menu: MenuItem[]; name: string; tagline: string }) {
  const path = usePathname();
  const { count, setOpen: openCart } = useCart();
  const [search, setSearch] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setSearch(false); setMobile(false); }, [path]);
  const flat = menu.flatMap((m) => (m.children.length ? m.children : [m]));
  const custom = (
    <Link href="/custom-stencils" className="whitespace-nowrap rounded-full bg-mustard px-[18px] py-[11px] text-sm font-semibold text-[#0E2F28] transition hover:brightness-110">✦ Create a Custom Order</Link>
  );
  return (
    <>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-7 gap-y-2 px-5 sm:px-10">
        <Link href="/" aria-label={`${name} home`} className="flex items-center gap-2.5 py-3">
          <LogoMark size={46} />
          <span className="flex flex-col">
            <span className="font-display text-[22px] font-bold leading-none tracking-[.03em] text-[#F3F5F1] sm:text-[27px]">{name}</span>
            {tagline && <small className="mt-1 hidden text-[10px] uppercase tracking-[.2em] text-mustard sm:block">{tagline}</small>}
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-[26px] min-[1180px]:flex">
          <Link className="py-[26px] text-[15px] hover:text-mustard" href="/">Home</Link>
          {menu.map((m) => (
            <div key={m.label} className="group relative flex">
              <Link href={m.href} className="inline-flex items-center gap-1.5 py-[26px] text-[15px] hover:text-mustard">{m.label}{m.children.length > 0 && <span aria-hidden>⌄</span>}</Link>
              {m.children.length > 0 && (
                <div className="invisible absolute left-[-16px] top-full z-30 flex min-w-[250px] flex-col gap-0.5 rounded-md border border-mustard bg-stone p-3.5 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,.35)] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="px-2.5 py-1.5 text-xs uppercase tracking-[.14em] text-mustard">{m.label} collections</div>
                  <Link href={m.href} className="rounded px-2.5 py-[9px] text-[15px] font-semibold hover:bg-[#1B5A4B] hover:text-mustard">Shop all {m.label}</Link>
                  {m.children.map((c) => <Link key={c.label} href={c.href} className="rounded px-2.5 py-[9px] text-[15px] hover:bg-[#1B5A4B] hover:text-mustard">{c.label}</Link>)}
                </div>
              )}
            </div>
          ))}
          <Link className="py-[26px] text-[15px] hover:text-mustard" href="/about">Our Story</Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline">{custom}</span>
          <button type="button" aria-label="Search products" onClick={() => setSearch((v) => !v)} className={circleBtn}><Search size={20} strokeWidth={1.8} /></button>
          <button type="button" aria-label="Open shopping bag" onClick={() => openCart(true)} className={circleBtn}>
            <ShoppingBag size={21} strokeWidth={1.8} />
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-mustard px-1 text-xs font-bold text-[#0E2F28]">{count}</span>
          </button>
          <button type="button" aria-label="Open mobile menu" onClick={() => setMobile((v) => !v)} className={`${circleBtn} text-xl min-[1180px]:hidden`}>☰</button>
        </div>
      </div>
      {search && <div className="border-t border-[#2A4A41] bg-[#143D33]"><div className="mx-auto max-w-[1280px] px-5 py-3.5 sm:px-10"><SearchBox autoFocus onDone={() => setSearch(false)} /></div></div>}
      {mobile && (
        <div className="border-t border-[#2A4A41] bg-[#143D33]">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-0.5 px-5 pb-5 pt-3 sm:px-10">
            <span className="mb-2 sm:hidden">{custom}</span>
            <Link href="/shop" className="py-[11px] text-base">Shop All</Link>
            {flat.map((m) => <Link key={m.label + m.href} href={m.href} className="border-t border-[#2A4A41] py-[11px] text-base">{m.label}</Link>)}
            <Link href="/about" className="border-t border-[#2A4A41] py-[11px] text-base">Our Story</Link>
            <Link href="/account" className="border-t border-[#2A4A41] py-[11px] text-base">Log in</Link>
            <Link href="/track" className="border-t border-[#2A4A41] py-[11px] text-base">Track an order</Link>
          </div>
        </div>
      )}
    </>
  );
}

export function CurrencySelect({ currencies, current }: { currencies: string[]; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className={`flex items-center gap-1.5 text-xs ${pending ? "opacity-60" : ""}`}>
      <span className="sr-only">Currency</span>
      <select className="rounded border border-[#2A4A41] bg-stone px-2 py-1.5 text-xs text-[#E8EFEA]" value={current} onChange={(e) => start(async () => { await setCurrency(e.target.value); router.refresh(); })}>
        {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );
}
