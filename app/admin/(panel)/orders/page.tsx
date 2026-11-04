import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { PageHeader, StatusBadge, Pager, Empty } from "@/components/admin/ui";

const STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "PAID", "IN_PRODUCTION", "QUALITY_CHECK", "PACKED", "SHIPPED", "DELIVERED", "FULFILLED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];

export default async function Orders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; method?: string }> }) {
  await requireStaff("orders.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(sp.method ? { paymentMethod: sp.method } : {}),
    ...(sp.q ? { OR: [{ number: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { name: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [total, orders, counts] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30, include: { _count: { select: { items: true } } } }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const qs = (p: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ ...sp, ...p }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <div>
      <PageHeader title="Orders" sub={`${total} orders`} actions={<a className="btn btn-ghost btn-sm" href={`/admin/export/orders${qs({ page: undefined })}`}>Export CSV</a>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/admin/orders" className={`chip ${!sp.status ? "!border-accent text-accent" : ""}`}>All</Link>
        {STATUSES.map((s) => {
          const n = counts.find((c) => c.status === s)?._count ?? 0;
          return n ? <Link key={s} href={qs({ status: s, page: undefined })} className={`chip ${sp.status === s ? "!border-accent text-accent" : ""}`}>{s.replace(/_/g, " ").toLowerCase()} · {n}</Link> : null;
        })}
      </div>
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Search number, email or name" className="input max-w-sm" />{sp.status && <input type="hidden" name="status" value={sp.status} />}<button className="btn btn-soft">Search</button></form>
      <div className="card overflow-x-auto">
        {orders.length === 0 ? <Empty>No orders match.</Empty> : (
          <table className="tbl">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Country</th><th>Payment</th><th>Status</th><th className="num">Items</th><th className="num">Total</th><th className="num">Base</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-accent">{o.number}</Link></td>
                  <td className="whitespace-nowrap text-ink2">{o.createdAt.toLocaleString()}</td>
                  <td><div>{o.name}</div><div className="text-xs text-ink3">{o.email}</div></td>
                  <td>{o.country}</td>
                  <td><span className="text-xs">{o.paymentMethod}</span> <StatusBadge s={o.paymentStatus} /></td>
                  <td><StatusBadge s={o.status} /></td>
                  <td className="num">{o._count.items}</td>
                  <td className="num">{formatMoney(o.total, o.currency, 2)}</td>
                  <td className="num text-ink3">{(Number(o.totalBase) / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager page={page} pages={Math.ceil(total / 30)} href={(p) => qs({ page: String(p) })} />
    </div>
  );
}
