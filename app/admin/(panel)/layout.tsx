import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ROLES } from "@/lib/permissions";
import { Sidebar, type NavItem } from "@/components/admin/Sidebar";
import { staffLogout } from "../actions/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const s = await getSettings();
  const [alerts, pendingOrders, queued, inbox, pendingReviews] = await Promise.all([
    db.alert.count({ where: { read: false } }),
    db.order.count({ where: { status: { in: ["PAID", "CONFIRMED", "QUALITY_CHECK", "PACKED"] } } }),
    db.productionJob.count({ where: { completedAt: null } }),
    db.inquiry.count({ where: { status: "open" } }),
    db.review.count({ where: { status: "pending" } }),
  ]);
  const has = (p: string) => staff.perms.has(p);
  const items: (NavItem & { perm?: string })[] = [
    { href: "/admin", label: "Cockpit", icon: "LayoutDashboard", perm: "dashboard.view" },
    { href: "/admin/orders", label: "Orders", icon: "ShoppingCart", perm: "orders.view", badge: pendingOrders },
    { href: "/admin/production", label: "Production", icon: "Scissors", perm: "production.manage", badge: queued },
    { href: "/admin/products", label: "Products", icon: "Package", perm: "inventory.view" },
    { href: "/admin/inventory", label: "Inventory", icon: "Boxes", perm: "inventory.view" },
    { href: "/admin/purchases", label: "Purchases", icon: "Truck", perm: "purchases.manage" },
    { href: "/admin/customers", label: "Customers", icon: "Users", perm: "customers.view" },
    { href: "/admin/b2b", label: "Business accounts", icon: "Building2", perm: "b2b.manage" },
    { href: "/admin/discounts", label: "Promotions", icon: "Percent", perm: "promotions.manage" },
    { href: "/admin/reviews", label: "Reviews", icon: "Star", perm: "reviews.moderate", badge: pendingReviews },
    { href: "/admin/website", label: "Website", icon: "Globe", perm: "content.edit" },
    { href: "/admin/inbox", label: "Inbox", icon: "Inbox", perm: "inbox.manage", badge: inbox },
    { href: "/admin/accounts", label: "Accounts", icon: "BookOpen", perm: "accounts.view" },
    { href: "/admin/reports", label: "Reports", icon: "BarChart3", perm: "reports.financial.view" },
    { href: "/admin/staff", label: "Staff & roles", icon: "UserCog", perm: "staff.manage" },
    { href: "/admin/audit", label: "Audit log", icon: "History", perm: "audit.view" },
    { href: "/admin/settings", label: "Settings", icon: "Settings", perm: "settings.manage" },
  ];
  return (
    <div className="flex min-h-screen">
      <Sidebar items={items.filter((i) => !i.perm || has(i.perm)).map(({ perm: _p, ...i }) => i)} brand={s.business.name} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur no-print">
          <Link href="/" target="_blank" className="flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ExternalLink size={15} />View store</Link>
          <Link href="/admin/alerts" className="relative rounded-lg p-2 hover:bg-s1" aria-label={`${alerts} alerts`}>
            <Bell size={18} />
            {alerts > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-onaccent">{alerts}</span>}
          </Link>
          <span className="hidden text-sm text-ink2 sm:inline">{staff.name} · <span className="text-ink3">{ROLES[staff.role]?.label ?? staff.role}</span></span>
          <form action={staffLogout}><button className="btn btn-ghost btn-sm">Sign out</button></form>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
