import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { orderToken } from "@/lib/tokens";
import { customerLogout } from "@/app/actions/store";
import { DesignArt } from "@/components/DesignArt";
import { ReorderDesign } from "@/components/store/ReorderDesign";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function Account() {
  const c = await getCustomer();
  if (!c) redirect("/account/login");
  const [orders, designs, wishlist, currencies] = await Promise.all([
    db.order.findMany({ where: { OR: [{ customerId: c.id }, { email: c.email }] }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.customDesign.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, include: { material: true } }),
    db.wishlistItem.findMany({ where: { customerId: c.id }, include: { product: true } }),
    db.currency.findMany(),
  ]);
  const exp = (code: string) => currencies.find((x) => x.code === code)?.exponent ?? 2;
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="text-3xl font-bold">Hi {c.name || c.email}</h1>
          <p className="text-sm text-ink2">{c.loyaltyPoints} loyalty points{c.business && <> · Business account: <b className="capitalize">{c.business.status}</b>{c.business.status === "approved" && ` (${c.business.discountPct}% off)`}</>}</p>
        </div>
        <form action={customerLogout}><button className="btn btn-ghost btn-sm">Sign out</button></form>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Orders</h2>
        {orders.length === 0 ? <p className="text-ink2">No orders yet. <Link href="/shop" className="text-accent underline">Start shopping</Link></p> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Order</th><th>Date</th><th>Status</th><th className="num">Total</th><th /></tr></thead>
              <tbody>{orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono">{o.number}</td><td>{o.createdAt.toLocaleDateString()}</td>
                  <td><span className="badge badge-muted">{o.status.replace(/_/g, " ").toLowerCase()}</span></td>
                  <td className="num">{formatMoney(o.total, o.currency, exp(o.currency))}</td>
                  <td><Link className="text-accent" href={`/order/${o.number}?t=${orderToken(o.id)}`}>View</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Project Wallet — your custom designs</h2>
        {designs.length === 0 ? <p className="text-ink2">Designs you create in the <Link href="/custom-stencils" className="text-accent underline">Custom Studio</Link> are saved here for one-click reorders.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {designs.map((d) => (
              <div key={d.id} className="card p-4">
                <div className="art-tile mb-3 aspect-square rounded-xl p-4 text-accent"><DesignArt svg={d.svg} uid={`w${d.id}`} /></div>
                <p className="line-clamp-1 font-semibold">{d.name}</p>
                <p className="text-xs text-ink3">{d.widthMm}×{d.heightMm} mm · {d.material.name}</p>
                <ReorderDesign designId={d.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {wishlist.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Wishlist</h2>
          <div className="flex flex-wrap gap-2">{wishlist.map((w) => <Link key={w.id} href={`/p/${w.product.slug}`} className="chip">{w.product.name}</Link>)}</div>
        </section>
      )}
      {!c.business && <p className="text-sm text-ink2">Buying for a café, bakery or brand? <Link href="/business" className="text-accent underline">Apply for a business account</Link>.</p>}
    </div>
  );
}
