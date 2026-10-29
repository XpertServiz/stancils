"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

export function ThemeToggle() {
  return (
    <button
      className="hidden rounded-lg p-2 text-ink2 hover:text-ink sm:inline-flex"
      aria-label="Toggle lighter / darker"
      onClick={() => {
        const el = document.documentElement;
        const next = el.dataset.theme === "stone" ? "dusk" : "stone";
        el.dataset.theme = next;
        try { localStorage.setItem("cc_theme", next); } catch {}
      }}
    >
      <Sun size={18} className="hidden [[data-theme=stone]_&]:block" />
      <Moon size={18} className="[[data-theme=stone]_&]:hidden" />
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

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="rounded-lg p-2 lg:hidden" aria-label="Menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
      {open && (
        <div className="fixed inset-0 z-[70] bg-bg/95 p-5 backdrop-blur lg:hidden">
          <div className="mb-6 flex justify-end"><button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button></div>
          <SearchBox className="mb-6" />
          <nav className="flex flex-col gap-1">
            {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg font-semibold hover:bg-s1">{l.label}</Link>)}
            <Link href="/account" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg font-semibold hover:bg-s1"><User size={18} className="mr-2 inline" />Account</Link>
          </nav>
        </div>
      )}
    </>
  );
}
