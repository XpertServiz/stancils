"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "./CartContext";
import { setCurrency } from "@/app/actions/prefs";
import type { MenuItem } from "@/lib/storefront";

/** Sticky header that gets a little shorter after the visitor scrolls. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const on = () => setSmall(window.scrollY > 80);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header data-small={small} className="group/h sticky top-0 z-50 border-b border-white/10 bg-stone text-stone-ink shadow-[0_1px_2px_rgba(0,0,0,.06)]">
      {children}
    </header>
  );
}

/** Announcement strip: dismiss it once and it stays hidden on this browser. */
export function DismissibleBar({ children, id }: { children: React.ReactNode; id: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(`cc_ann_${id}`) === "1") setHidden(true);
    } catch {}
  }, [id]);
  if (hidden) return null;
  return (
    <div className="relative bg-mustard px-10 py-2.5 text-center text-[13px] font-bold text-[#1c1b1a] sm:text-sm">
      {children}
      <button
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full hover:bg-black/10"
        onClick={() => {
          setHidden(true);
          try { localStorage.setItem(`cc_ann_${id}`, "1"); } catch {}
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

type Suggest = { products: { slug: string; name: string; price: string; image: string | null }[]; collections: { slug: string; name: string }[] };

export function SearchBox({ className = "", autoFocus = false, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [s, setS] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setS(null);
      return;
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(t)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d) => { setS(d); setOpen(true); })
        .catch(() => {});
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
    <div ref={box} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`); }}
        className="flex overflow-hidden rounded-[8px] bg-white"
      >
        <label htmlFor="site-search" className="sr-only">Search products</label>
        <input
          id="site-search"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => s && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="What are you looking for? Type here (e.g. mandala)"
          autoComplete="off"
          className="min-w-0 flex-1 bg-white px-4 py-3 text-sm text-[#1c1b1a] placeholder:text-[#8a857d] focus:outline-none"
        />
        <button className="grid w-12 place-items-center bg-mustard text-[#1c1b1a] hover:brightness-95" aria-label="Search"><Search size={19} /></button>
      </form>
      {open && s && (s.products.length > 0 || s.collections.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[10px] border border-line bg-bg text-ink shadow-[0_8px_24px_rgba(0,0,0,.18)]">
          {s.collections.length > 0 && (
            <div className="border-b border-line p-2">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink3">Collections</p>
              {s.collections.map((c) => <button key={c.slug} onClick={() => go(`/c/${c.slug}`)} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-s1">{c.name}</button>)}
            </div>
          )}
          {s.products.length > 0 && (
            <div className="p-2">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink3">Products</p>
              {s.products.map((p) => (
                <button key={p.slug} onClick={() => go(`/p/${p.slug}`)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-s1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="h-10 w-10 rounded bg-s1" />}
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className="text-sm font-semibold">{p.price}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Desktop navigation with dropdowns that open on hover or keyboard focus. */
export function MegaNav({ menu }: { menu: MenuItem[] }) {
  const path = usePathname();
  const [open, setOpen] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (i: number | null, delay = 0) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(i), delay);
  };
  useEffect(() => setOpen(null), [path]);
  return (
    <nav aria-label="Main navigation" className="mx-auto hidden max-w-[1280px] items-center justify-center gap-1 px-6 lg:flex" onKeyDown={(e) => e.key === "Escape" && setOpen(null)}>
      {menu.map((m, i) => {
        const active = path === m.href || (m.href !== "/" && path.startsWith(`${m.href}/`)) || m.children.some((c) => c.href === path);
        return (
          <div key={m.label} className="relative" onMouseEnter={() => m.children.length && show(i, 120)} onMouseLeave={() => show(null, 120)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && show(null)}>
            <Link
              href={m.href}
              aria-haspopup={m.children.length ? "true" : undefined}
              aria-expanded={m.children.length ? open === i : undefined}
              onFocus={() => m.children.length && show(i)}
              className={`flex items-center gap-1 whitespace-nowrap px-3 py-3.5 text-[14px] font-medium hover:text-mustard ${active ? "text-mustard shadow-[inset_0_-3px_0_rgb(var(--accent))]" : ""}`}
            >
              {m.label}
              {m.children.length > 0 && <ChevronDown size={13} />}
            </Link>
            {m.children.length > 0 && open === i && (
              <div className="absolute left-0 top-full z-50 w-64 rounded-b-[10px] border border-line bg-bg py-2 text-ink shadow-[0_8px_24px_rgba(0,0,0,.14)]" style={m.children.length > 8 ? { width: 440, columnCount: 2 } : undefined}>
                {m.children.map((c) => <Link key={c.label} href={c.href} className="block break-inside-avoid px-4 py-2 text-sm hover:bg-s1 hover:text-accent">{c.label}</Link>)}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Phone menu: a drawer from the left with sub-menus that fold open. */
export function MobileNav({ menu, name }: { menu: MenuItem[]; name: string }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<number | null>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <>
      <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white/10 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={22} /></button>
      <div className={`fixed inset-0 z-[70] lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside className={`absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-bg text-ink shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display text-lg font-bold">{name}</span>
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-s1"><X size={20} /></button>
          </div>
          <div className="p-3"><SearchBox onDone={() => setOpen(false)} /></div>
          <nav className="flex-1 overflow-y-auto px-2 pb-6">
            {menu.map((m, i) => (
              <div key={m.label} className="border-b border-line/60">
                {m.children.length ? (
                  <>
                    <button className="flex w-full items-center justify-between px-3 py-3.5 text-left font-semibold" aria-expanded={sub === i} onClick={() => setSub(sub === i ? null : i)}>
                      {m.label}<ChevronDown size={18} className={`transition-transform ${sub === i ? "rotate-180" : ""}`} />
                    </button>
                    {sub === i && (
                      <div className="pb-2 pl-3">
                        {m.children.map((c) => <Link key={c.label} href={c.href} className="block px-3 py-2.5 text-sm text-ink2 hover:text-accent">{c.label}</Link>)}
                      </div>
                    )}
                  </>
                ) : (
                  <Link href={m.href} className="block px-3 py-3.5 font-semibold">{m.label}</Link>
                )}
              </div>
            ))}
            <Link href="/account" className="mt-2 flex items-center gap-2 px-3 py-3.5 font-semibold"><User size={18} />Log in</Link>
            <Link href="/track" className="block px-3 py-3 text-sm text-ink2">Track an order</Link>
          </nav>
        </aside>
      </div>
    </>
  );
}

export function BagButton() {
  const { count, setOpen } = useCart();
  return (
    <button onClick={() => setOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-lg hover:bg-white/10" aria-label={`Cart, ${count} items`}>
      <ShoppingBag size={22} />
      {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-onaccent">{count}</span>}
    </button>
  );
}

export function MobileSearch() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white/10 md:hidden" aria-label="Search" onClick={() => setOpen(true)}><Search size={21} /></button>
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/60 p-3 md:hidden" onClick={() => setOpen(false)}>
          <div className="rounded-xl bg-bg p-3" onClick={(e) => e.stopPropagation()}>
            <SearchBox autoFocus onDone={() => setOpen(false)} />
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
      <select className="rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-ink" value={current} onChange={(e) => start(async () => { await setCurrency(e.target.value); router.refresh(); })}>
        {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );
}

/** Footer on a phone: each column folds open like an accordion; on desktop it is always open. */
export function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line/70 py-3 md:border-0 md:py-0 md:open:block" open>
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold uppercase tracking-wider md:pointer-events-none md:mb-3">
        {title}<ChevronDown size={16} className="transition-transform group-open:rotate-180 md:hidden" />
      </summary>
      <div className="mt-3 text-sm md:mt-0">{children}</div>
    </details>
  );
}
