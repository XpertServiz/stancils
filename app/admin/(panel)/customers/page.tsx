import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader, Pager } from "@/components/admin/ui";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("customers.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { base } = await getCurrencies();
  const q = sp.q?.trim();
  // customers = registered accounts + guest checkout emails, aggregated from orders
  const stats = await db.order.groupBy({
    by: ["email"],
    where: { paymentStatus: { in: ["paid", "partial_refund"] }, ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}) },
    _sum: { totalBase: true }, _count: true, _max: { createdAt: true },
    orderBy: { _sum: { totalBase: "desc" } },
  });
  const accounts = await db.customer.findMany({ where: { email: { in: stats.map((s) => s.email) } }, include: { business: true } });
  const rows = stats.slice((page - 1) * 50, page * 50);
  const subs = await db.subscriber.count();
  return (
    <div>
      <PageHeader title="Customers" sub={`${stats.length} paying customers · ${await db.customer.count()} accounts · ${subs} newsletter subscribers`} />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Email or name" className="input max-w-sm" /><button className="btn btn-soft">Search</button></form>
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Email</th><th>Account</th><th className="num">Orders</th><th className="num">Lifetime value ({base.code})</th><th>Last order</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const a = accounts.find((x) => x.email === r.email);
              return (
                <tr key={r.email}>
                  <td><Link href={`/admin/orders?q=${encodeURIComponent(r.email)}`} className="hover:text-accent">{r.email}</Link>{a?.name && <div className="text-xs text-ink3">{a.name}</div>}</td>
                  <td>{a ? <span className="badge badge-mint">account{a.business ? ` · ${a.business.company}` : ""}</span> : <span className="badge badge-muted">guest</span>}</td>
                  <td className="num">{r._count}</td>
                  <td className="num">{formatMoney(r._sum.totalBase ?? 0n, base.code, base.exponent)}</td>
                  <td>{r._max.createdAt?.toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={Math.ceil(stats.length / 50)} href={(p) => `?page=${p}${q ? `&q=${q}` : ""}`} />
    </div>
  );
}
