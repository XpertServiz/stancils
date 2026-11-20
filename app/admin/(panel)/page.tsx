import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies, getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { profitAndLoss } from "@/lib/accounting";
import { PageHeader, Panel, Stat, StatusBadge, Empty } from "@/components/admin/ui";
import { RevenueChart, HBar } from "@/components/admin/Charts";

export default async function Cockpit({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const s = await getSettings();
  const { base } = await getCurrencies();
  const tz = s.business.timezone;
  const today = startOfDay(tz);
  const from30 = addDays(today, -29);
  const fm = (m: bigint | number) => formatMoney(BigInt(m), base.code, base.exponent);

  const [paid30, paidToday, ordersToday, pendingPay, production, lowStock, lowMat, openInbox, recent, alerts, refunds30, top] = await Promise.all([
    db.order.findMany({ where: { paidAt: { gte: from30 }, paymentStatus: { in: ["paid", "partial_refund", "refunded"] } }, select: { paidAt: true, totalBase: true, currency: true } }),
    db.order.aggregate({ where: { paidAt: { gte: today } }, _sum: { totalBase: true }, _count: true }),
    db.order.count({ where: { createdAt: { gte: today } } }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.productionJob.count({ where: { completedAt: null } }),
    db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint n FROM "Variant" v JOIN "Product" p ON p.id = v."productId" WHERE p.type IN ('STOCK_PHYSICAL','TOOL') AND v."isDigital" = false AND v.active AND v."onHand" - v.reserved <= v."reorderLevel"`,
    db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint n FROM "Material" WHERE active AND "onHand" <= "reorderLevel"`,
    db.inquiry.count({ where: { status: "open" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.alert.findMany({ where: { read: false }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.refund.aggregate({ where: { createdAt: { gte: from30 } }, _sum: { amountBase: true } }),
    db.orderItem.groupBy({ by: ["name"], where: { order: { paidAt: { gte: from30 } } }, _sum: { qty: true }, orderBy: { _sum: { qty: "desc" } }, take: 6 }),
  ]);
  const pl = await profitAndLoss(from30, addDays(today, 1));
  const byDay = new Map<string, { value: number; orders: number }>();
  for (let i = 0; i < 30; i++) byDay.set(dayKey(tz, addDays(from30, i)), { value: 0, orders: 0 });
  const byCur = new Map<string, number>();
  let rev30 = 0n;
  for (const o of paid30) {
    const k = dayKey(tz, o.paidAt!);
    const d = byDay.get(k);
    if (d) { d.value += Number(o.totalBase) / 10 ** base.exponent; d.orders++; }
    byCur.set(o.currency, (byCur.get(o.currency) ?? 0) + Number(o.totalBase) / 10 ** base.exponent);
    rev30 += o.totalBase;
  }
  const chart = [...byDay.entries()].map(([day, v]) => ({ day: day.slice(5), value: Math.round(v.value), orders: v.orders }));
  const aov = paid30.length ? rev30 / BigInt(paid30.length) : 0n;
  const margin = pl.netRevenue > 0n ? Number((pl.grossProfit * 1000n) / pl.netRevenue) / 10 : 0;

  return (
    <div className="space-y-6">
      {sp.denied && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">You don&apos;t have permission for that page ({sp.denied}).</p>}
      <PageHeader title={`Good ${new Date().getHours() < 12 ? "morning" : "day"}, ${staff.name.split(" ")[0]}`} sub={`All money in ${base.code} (base currency) · ${tz}`} actions={<Link href="/admin/reports" className="btn btn-ghost btn-sm">Reports</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Revenue today" value={fm(paidToday._sum.totalBase ?? 0n)} sub={`${paidToday._count} paid · ${ordersToday} placed`} tone="coral" />
        <Stat label="Revenue 30d" value={fm(rev30)} sub={`${paid30.length} orders`} />
        <Stat label="Avg order" value={fm(aov)} sub="last 30 days" />
        <Stat label="Gross margin" value={`${margin.toFixed(1)}%`} sub={`Net profit ${fm(pl.netProfit)}`} tone={margin >= 50 ? "mint" : "mustard"} />
        <Stat label="Refunds 30d" value={fm(refunds30._sum.amountBase ?? 0n)} />
        <Stat label="To do" value={`${pendingPay + production}`} sub={`${pendingPay} awaiting payment · ${production} to cut`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Revenue — last 30 days"><RevenueChart data={chart} currency={base.code} /></Panel>
        <Panel title="Sales by checkout currency (in base)">
          {byCur.size ? <HBar data={[...byCur.entries()].map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value)} currency={base.code} label="Revenue" /> : <Empty>No paid orders yet.</Empty>}
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Recent orders" actions={<Link href="/admin/orders" className="text-sm text-accent">All</Link>} className="xl:col-span-2">
          {recent.length === 0 ? <Empty>No orders yet.</Empty> : (
            <table className="tbl">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-accent">{o.number}</Link></td>
                    <td className="text-ink2">{o.name}</td>
                    <td><StatusBadge s={o.status} /></td>
                    <td className="num">{formatMoney(o.total, o.currency, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Alerts" actions={<Link href="/admin/alerts" className="text-sm text-accent">All</Link>}>
            {alerts.length === 0 ? <Empty>All clear.</Empty> : (
              <ul className="space-y-2 text-sm">{alerts.map((a) => <li key={a.id}><Link href={a.link ?? "/admin/alerts"} className="flex gap-2 hover:text-accent"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.severity === "critical" ? "bg-danger" : a.severity === "warning" ? "bg-mustard" : "bg-mint"}`} />{a.message}</Link></li>)}</ul>
            )}
          </Panel>
          <Panel title="Health">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><Link href="/admin/inventory?low=1" className="hover:text-accent">Low-stock variants</Link><b className={Number(lowStock[0].n) ? "text-mustard" : ""}>{Number(lowStock[0].n)}</b></li>
              <li className="flex justify-between"><Link href="/admin/inventory/materials" className="hover:text-accent">Low raw materials</Link><b className={Number(lowMat[0].n) ? "text-mustard" : ""}>{Number(lowMat[0].n)}</b></li>
              <li className="flex justify-between"><Link href="/admin/inbox" className="hover:text-accent">Open inquiries</Link><b>{openInbox}</b></li>
            </ul>
          </Panel>
          <Panel title="Top sellers (30d)">
            {top.length === 0 ? <Empty>No sales yet.</Empty> : <ul className="space-y-1.5 text-sm">{top.map((t) => <li key={t.name} className="flex justify-between gap-3"><span className="line-clamp-1 text-ink2">{t.name}</span><b className="tabular">{t._sum.qty}</b></li>)}</ul>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
