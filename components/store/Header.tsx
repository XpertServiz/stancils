import Link from "next/link";
import { User } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getActiveCurrency, getUnits } from "@/lib/currency";
import { CartButton, CurrencyUnits, MobileMenu, SearchBox, ThemeToggle } from "./HeaderControls";
import { Logo } from "./Logo";

export const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/c/wall", label: "Wall" },
  { href: "/c/coffee", label: "Coffee" },
  { href: "/c/cake-cookie", label: "Cake & Cookie" },
  { href: "/custom-stencils", label: "Custom Studio" },
  { href: "/c/kits", label: "Kits" },
  { href: "/tutorials", label: "Tutorials" },
  { href: "/business", label: "Business" },
];

export async function Header() {
  const [s, { cur, enabled }, units] = await Promise.all([getSettings(), getActiveCurrency(), getUnits()]);
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <MobileMenu links={NAV} />
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${s.business.name} home`}>
          <Logo />
          <span className="font-display text-lg font-bold tracking-tight">{s.business.name}</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-ink2 hover:text-ink ${l.href === "/custom-stencils" ? "!text-accent" : ""} ${["/tutorials", "/business", "/c/kits"].includes(l.href) ? "hidden xl:block" : ""}`}>{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <SearchBox className="hidden w-52 2xl:block" />
          <CurrencyUnits currencies={enabled.map((c) => ({ code: c.code, symbol: c.symbol }))} current={cur.code} units={units} />
          <ThemeToggle />
          <Link href="/account" className="hidden rounded-lg p-2 hover:bg-s1 sm:inline-flex" aria-label="Account"><User size={20} /></Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
