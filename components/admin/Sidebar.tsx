"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Scissors, Package, Boxes, Truck, Users, Building2, Percent, Star, Globe, Inbox,
  BookOpen, BarChart3, UserCog, History, Settings, Menu, X, Bell,
} from "lucide-react";

const ICONS = { LayoutDashboard, ShoppingCart, Scissors, Package, Boxes, Truck, Users, Building2, Percent, Star, Globe, Inbox, BookOpen, BarChart3, UserCog, History, Settings, Bell };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export function Sidebar({ items, brand }: { items: NavItem[]; brand: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-accent/15 text-accent" : "text-ink2 hover:bg-s2 hover:text-ink"}`}>
            <Icon size={17} />
            <span className="flex-1">{i.label}</span>
            {i.badge ? <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-onaccent">{i.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      <button className="fixed left-3 top-3 z-50 rounded-lg border border-line bg-s1 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-line bg-s1/60 lg:block">
        <div className="border-b border-line px-5 py-4 font-display text-lg font-bold">{brand}</div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-bg lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><span className="font-bold">{brand}</span><button onClick={() => setOpen(false)} aria-label="Close"><X /></button></div>
          {nav}
        </div>
      )}
    </>
  );
}
