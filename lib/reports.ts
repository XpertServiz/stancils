import { db } from "./db";
import { accountBalances, balanceSheet, profitAndLoss, trialBalance, type Balance } from "./accounting";
import { cashFlow } from "./services/closing";

export type Table = { title: string; head: string[]; rows: (string | number)[][]; foot?: (string | number)[] };
const m = (v: bigint, exp = 2) => Number(v) / 10 ** exp;

export async function buildReport(tab: string, from: Date, to: Date, opts: { account?: number } = {}): Promise<Table[]> {
  if (tab === "pl") {
    const len = to.getTime() - from.getTime();
    const [cur, prev] = await Promise.all([profitAndLoss(from, to), profitAndLoss(new Date(from.getTime() - len), from)]);
    const pv = (code: number, rows: Balance[]) => rows.find((r) => r.code === code)?.balance ?? 0n;
    const sec = (label: string, a: Balance[], b: Balance[]) => a.filter((r) => r.balance !== 0n || pv(r.code, b) !== 0n).map((r) => [label, `${r.code} ${r.name}`, m(r.balance), m(pv(r.code, b))]);
    return [{
      title: "Profit & loss",
      head: ["Section", "Account", "This period", "Previous period"],
      rows: [
        ...sec("Revenue", cur.revenue, prev.revenue), ["", "Net revenue", m(cur.netRevenue), m(prev.netRevenue)],
        ...sec("Cost of sales", cur.cogs, prev.cogs), ["", "Gross profit", m(cur.grossProfit), m(prev.grossProfit)],
        ["", "Gross margin %", cur.netRevenue ? Math.round(Number((cur.grossProfit * 1000n) / cur.netRevenue)) / 10 : 0, prev.netRevenue ? Math.round(Number((prev.grossProfit * 1000n) / prev.netRevenue)) / 10 : 0],
        ...sec("Other income", cur.otherIncome, prev.otherIncome),
        ...sec("Operating expenses", cur.opex, prev.opex),
      ],
      foot: ["", "Net profit", m(cur.netProfit), m(prev.netProfit)],
    }];
  }
  if (tab === "bs") {
    const b = await balanceSheet(to);
    const rows = (label: string, xs: Balance[]) => xs.filter((r) => r.balance !== 0n).map((r) => [label, `${r.code} ${r.name}`, m(r.balance)]);
    return [{
      title: `Balance sheet as of ${to.toISOString().slice(0, 10)}`,
      head: ["Section", "Account", "Amount"],
      rows: [...rows("Assets", b.assets), ["", "Total assets", m(b.totalAssets)], ...rows("Liabilities", b.liabilities), ["", "Total liabilities", m(b.totalLiabilities)], ...rows("Equity", b.equity), ["Equity", "Current earnings (unclosed)", m(b.earnings)], ["", "Total equity", m(b.totalEquity)]],
      foot: ["", b.balanced ? "Assets = Liabilities + Equity ✓" : "DOES NOT BALANCE ✗", m(b.totalLiabilities + b.totalEquity)],
    }];
  }
  if (tab === "tb") {
    const t = await trialBalance(to);
    return [{ title: `Trial balance as of ${to.toISOString().slice(0, 10)}`, head: ["Code", "Account", "Debit", "Credit"], rows: t.rows.map((r) => [r.code, r.name, m(r.dr), m(r.cr)]), foot: ["", t.balanced ? "Balanced ✓" : "UNBALANCED ✗", m(t.totalDr), m(t.totalCr)] }];
  }
  if (tab === "cf") {
    const c = await cashFlow(from, to);
    return [{
      title: "Cash flow (indirect method)",
      head: ["Line", "Amount"],
      rows: [["Net profit", m(c.netProfit)], ["+ Depreciation", m(c.depreciation)], ["± Change in receivables & inventory", m(c.workingCapitalAssets)], ["± Change in liabilities", m(c.workingCapitalLiabilities)], ["Cash from operations", m(c.operating)], ["Cash from investing", m(c.investing)], ["Cash from financing (capital / drawings)", m(c.financing)], ["Opening cash (bank, cash, gateway clearing)", m(c.cashStart)]],
      foot: ["Closing cash", m(c.cashEnd)],
    }];
  }
  if (tab === "gl") {
    const accounts = await db.account.findMany({ orderBy: { code: "asc" } });
    const acc = accounts.find((a) => a.code === (opts.account ?? 10100)) ?? accounts[0];
    const opening = (await accountBalances({ to: from })).find((r) => r.id === acc.id)?.balance ?? 0n;
    const lines = await db.journalLine.findMany({ where: { accountId: acc.id, entry: { date: { gte: from, lt: to } } }, include: { entry: true }, orderBy: { entry: { date: "asc" } } });
    const natural = acc.type === "ASSET" || acc.type === "EXPENSE" ? 1n : -1n;
    let run = opening;
    return [{
      title: `General ledger — ${acc.code} ${acc.name}`,
      head: ["Date", "Journal", "Memo", "Debit", "Credit", "Balance"],
      rows: [["", "", "Opening balance", "", "", m(opening)], ...lines.map((l) => { run += natural * (l.debit - l.credit); return [l.entry.date.toISOString().slice(0, 10), `#${l.entry.number}`, l.entry.memo, m(l.debit), m(l.credit), m(run)]; })],
      foot: ["", "", "Closing balance", "", "", m(run)],
    }];
  }
  if (tab === "sales") {
    const paid = { paidAt: { gte: from, lt: to } };
    const [byProduct, byCurrency, byCountry, byMethod, byCollection] = await Promise.all([
      db.orderItem.groupBy({ by: ["name"], where: { order: paid }, _sum: { qty: true }, _count: true, orderBy: { _sum: { qty: "desc" } }, take: 50 }),
      db.order.groupBy({ by: ["currency"], where: paid, _sum: { total: true, totalBase: true }, _count: true }),
      db.order.groupBy({ by: ["country"], where: paid, _sum: { totalBase: true }, _count: true, orderBy: { _sum: { totalBase: "desc" } } }),
      db.order.groupBy({ by: ["paymentMethod"], where: paid, _sum: { totalBase: true }, _count: true }),
      db.$queryRaw<{ name: string; qty: bigint }[]>`SELECT c.name, SUM(oi.qty)::bigint qty FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" JOIN "Variant" v ON v.id = oi."variantId" JOIN "ProductCollection" pc ON pc."productId" = v."productId" JOIN "Collection" c ON c.id = pc."collectionId" WHERE o."paidAt" >= ${from} AND o."paidAt" < ${to} GROUP BY c.name ORDER BY qty DESC`,
    ]);
    return [
      { title: "By currency", head: ["Currency", "Orders", "Total (in currency)", "Total (base)"], rows: byCurrency.map((r) => [r.currency, r._count, m(r._sum.total ?? 0n), m(r._sum.totalBase ?? 0n)]) },
      { title: "By country", head: ["Country", "Orders", "Total (base)"], rows: byCountry.map((r) => [r.country, r._count, m(r._sum.totalBase ?? 0n)]) },
      { title: "By payment method", head: ["Method", "Orders", "Total (base)"], rows: byMethod.map((r) => [r.paymentMethod, r._count, m(r._sum.totalBase ?? 0n)]) },
      { title: "By collection (units)", head: ["Collection", "Units"], rows: byCollection.map((r) => [r.name, Number(r.qty)]) },
      { title: "Top products (units)", head: ["Item", "Lines", "Units"], rows: byProduct.map((r) => [r.name, r._count, r._sum.qty ?? 0]) },
    ];
  }
  if (tab === "inventory") {
    const [variants, mats] = await Promise.all([
      db.variant.findMany({ where: { isDigital: false, onHand: { not: 0 } }, include: { product: true }, orderBy: { sku: "asc" } }),
      db.material.findMany({ orderBy: { code: "asc" } }),
    ]);
    const lastSale = await db.stockMovement.groupBy({ by: ["variantId"], where: { type: "SALE" }, _max: { createdAt: true } });
    const ls = new Map(lastSale.map((x) => [x.variantId, x._max.createdAt]));
    const days = (d?: Date | null) => (d ? Math.floor((Date.now() - d.getTime()) / 86400_000) : "never");
    return [
      { title: "Finished goods valuation (weighted average)", head: ["SKU", "Product", "On hand", "Avg cost", "Value", "Days since last sale"], rows: variants.map((v) => [v.sku, `${v.product.name} — ${v.name}`, v.onHand, m(v.avgCost), m(v.avgCost * BigInt(v.onHand)), days(ls.get(v.id))]), foot: ["", "Total", variants.reduce((a, v) => a + v.onHand, 0), "", m(variants.reduce((a, v) => a + v.avgCost * BigInt(v.onHand), 0n)), ""] },
      { title: "Raw materials valuation", head: ["Code", "Material", "On hand", "Cost / 1k", "Value"], rows: mats.map((x) => [x.code, x.name, `${x.onHand} ${x.unit}`, m(x.costPerK), m((BigInt(x.onHand) * x.costPerK) / 1000n)]) },
    ];
  }
  return [];
}
