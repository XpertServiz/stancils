"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ShoppingBag, Menu, X, Search, Sun, Moon, User } from "lucide-react";
import Link from "next/link";
import { useCart } from "./CartContext";
import { setCurrency, setUnits } from "@/app/actions/prefs";

export function CurrencyUnits({ currencies, current, units }: { currencies: { code: string; symbol: string }[]; current: string; units: "cm" | "in" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-1.5 ${pending ? "opacity-60" : ""}`}>
      <label className="sr-only" htmlFor="ccy">Currency</label>
      <select
        id="ccy"
        className="max-w-[88px] rounded-lg border border-line bg-s1 px-1.5 py-1.5 text-xs font-semibold"
        value={current}
        onChange={(e) => start(async () => { await setCurrency(e.target.value); router.refresh(); })}
      >
        {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
      </select>
      <button
        className="hidden rounded-lg border border-line bg-s1 px-2 py-1.5 text-xs font-semibold sm:inline-flex"
        aria-label={`Units: ${units}. Switch`}
        onClick={() => start(async () => { await setUnits(units === "cm" ? "in" : "cm"); router.refresh(); })}
      >
        {units}
      </button>
    </div>
  );
}

/** Visitor lighter/darker toggle: swaps between the owner's theme and its companion. */
export function ThemeToggle() {
  return (
    <button
      className="hidden rounded-lg p-2 text-ink2 hover:text-ink sm:inline-flex"
      aria-label="Toggle lighter / darker"
      onClick={() => {
        const el = document.documentElement;
        const owner = el.dataset.owner!;
        const alt = el.dataset.alt!;
        const useAlt = el.dataset.theme === owner;
        el.dataset.theme = useAlt ? alt : owner;
        try { localStorage.setItem("cc_alt", useAlt ? "1" : "0"); } catch {}
      }}
    >
      <Sun size={18} />
      <Moon size={18} className="-ml-1 opacity-60" />
    </button>
  );
}

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button onClick={() => setOpen(true)} className="relative rounded-lg p-2 hover:bg-s1" aria-label={`Cart, ${count} items`}>
      <ShoppingBag size={20} />
      {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-onaccent">{count}</span>}
    </button>
  );
}

export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => { e.preventDefault(); router.push(`/shop?q=${encodeURIComponent(q)}`); }}
    >
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mandala, latte, letters…" aria-label="Search" className="input !rounded-full !py-2 pl-9 text-sm" />
    </form>
  );
}

/**
 * Full-screen mobile menu. Rendered into <body> with a portal: the header uses backdrop-blur,
 * which would otherwise trap a position:fixed child inside the header's 64px box.
 */
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <>
      <button className="rounded-lg p-2 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button>
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[90] overflow-y-auto bg-bg p-5 lg:hidden">
          <div className="mb-6 flex justify-end"><button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button></div>
          <SearchBox className="mb-6" />
          <nav className="flex flex-col gap-1">
            {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg font-semibold hover:bg-s1">{l.label}</Link>)}
            <Link href="/account" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg font-semibold hover:bg-s1"><User size={18} className="mr-2 inline" />Account</Link>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
