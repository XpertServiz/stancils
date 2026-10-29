import { db } from "../db";
import { ACC, accountBalances, postJournal, trialBalance } from "../accounting";
import { getSettings } from "../settings";
import { addDays, dayKey, startOfDay } from "../dates";
import { sendEmail } from "../email";
import { formatMoney } from "../money";
import { expireUnpaidOrders } from "./orders";

/** Daily close for the last complete business day (yesterday by default): summarise, lock, email. Idempotent per day. */
export async function runDailyClose(byId: string | null, at = new Date(Date.now() - 86400_000)) {
  const s = await getSettings();
  const tz = s.business.timezone;
  const from = startOfDay(tz, at);
  const to = addDays(from, 1);
  const key = dayKey(tz, from);
  const existing = await db.businessDay.findUnique({ where: { date: key } });
  if (existing) return existing;
  await expireUnpaidOrders();
  const base = await db.currency.findFirstOrThrow({ where: { isBase: true } });
  const [paid, placed, refunds, byCurrency, byMethod, jobsDone, top, tb, alerts] = await Promise.all([
    db.order.aggregate({ where: { paidAt: { gte: from, lt: to } }, _sum: { totalBase: true }, _count: true }),
    db.order.count({ where: { createdAt: { gte: from, lt: to } } }),
    db.refund.aggregate({ where: { createdAt: { gte: from, lt: to } }, _sum: { amountBase: true }, _count: true }),
    db.order.groupBy({ by: ["currency"], where: { paidAt: { gte: from, lt: to } }, _sum: { total: true, totalBase: true }, _count: true }),
    db.order.groupBy({ by: ["paymentMethod"], where: { paidAt: { gte: from, lt: to } }, _sum: { totalBase: true }, _count: true }),
    db.productionJob.count({ where: { completedAt: { gte: from, lt: to } } }),
    db.orderItem.groupBy({ by: ["name"], where: { order: { paidAt: { gte: from, lt: to } } }, _sum: { qty: true }, orderBy: { _sum: { qty: "desc" } }, take: 5 }),
    trialBalance(to),
    db.alert.count({ where: { read: false } }),
  ]);
  const report = {
    date: key,
    revenueBase: Number(paid._sum.totalBase ?? 0n),
    paidOrders: paid._count,
    placedOrders: placed,
    refundsBase: Number(refunds._sum.amountBase ?? 0n),
    refunds: refunds._count,
    byCurrency: byCurrency.map((c) => ({ currency: c.currency, orders: c._count, total: Number(c._sum.total ?? 0n), totalBase: Number(c._sum.totalBase ?? 0n) })),
    byMethod: byMethod.map((m) => ({ method: m.paymentMethod, orders: m._count, totalBase: Number(m._sum.totalBase ?? 0n) })),
    productionDone: jobsDone,
    top: top.map((t) => ({ name: t.name, qty: t._sum.qty ?? 0 })),
    trialBalanced: tb.balanced,
    openAlerts: alerts,
  };
  const day = await db.businessDay.create({ data: { date: key, byId, report } });
  // lock the ledger up to the end of the closed day
  await db.periodLock.create({ data: { upTo: to, kind: "day", byId } });
  const fm = (m: number) => formatMoney(BigInt(m), base.code, base.exponent);
  const html = `<h2>${s.business.name} — daily close ${key}</h2>
    <p><b>Revenue:</b> ${fm(report.revenueBase)} from ${report.paidOrders} paid orders (${report.placedOrders} placed)</p>
    <p><b>Refunds:</b> ${fm(report.refundsBase)} (${report.refunds})</p>
    <p><b>By currency:</b> ${report.byCurrency.map((c) => `${c.currency} ${c.orders} orders`).join(" · ") || "—"}</p>
    <p><b>Production finished:</b> ${jobsDone} · <b>Open alerts:</b> ${alerts}</p>
    <p><b>Top items:</b> ${report.top.map((t) => `${t.qty}× ${t.name}`).join(", ") || "—"}</p>
    <p>Trial balance ${tb.balanced ? "balances ✓" : "DOES NOT BALANCE ✗"}</p>`;
  await sendEmail(s.business.email, `Daily close ${key}: ${fm(report.revenueBase)}`, html).catch(() => {});
  return day;
}

/** Month/period close with pre-checks. Locks all journals dated before `upTo`. */
export async function closePeriod(upTo: Date, kind: "month" | "year", byId: string) {
  const tb = await trialBalance(upTo);
  if (!tb.balanced) throw new Error("Trial balance does not balance — investigate before closing.");
  const pending = await db.order.count({ where: { status: "PENDING_PAYMENT", createdAt: { lt: upTo } } });
  if (pending > 0) throw new Error(`${pending} orders before this date are still awaiting payment — verify or cancel them first.`);
  return db.periodLock.create({ data: { upTo, kind, byId } });
}

/** Year-end: move all revenue & expense balances for the year into Retained Earnings, then lock. */
export async function yearEndClose(yearStart: Date, yearEnd: Date, byId: string) {
  const already = await db.journalEntry.findFirst({ where: { sourceType: "year_end", sourceId: yearEnd.toISOString().slice(0, 10) } });
  if (already) throw new Error("This year has already been closed.");
  const rows = (await accountBalances({ from: yearStart, to: yearEnd })).filter((r) => (r.type === "REVENUE" || r.type === "EXPENSE") && r.debit !== r.credit);
  const lines = rows.map((r) => ({ code: r.code, debit: r.credit > r.debit ? r.credit - r.debit : 0n, credit: r.debit > r.credit ? r.debit - r.credit : 0n }));
  const net = lines.reduce((a, l) => a + l.debit - l.credit, 0n); // >0 ⇒ profit
  lines.push({ code: ACC.RETAINED, debit: net < 0n ? -net : 0n, credit: net > 0n ? net : 0n });
  await db.$transaction(async (tx) => {
    // closing entry is dated the last instant of the year so it lands inside the year
    await postJournal(tx, { memo: `Year-end close ${yearEnd.toISOString().slice(0, 10)}`, sourceType: "year_end", sourceId: yearEnd.toISOString().slice(0, 10), byId, date: new Date(yearEnd.getTime() - 1), lines });
    await tx.periodLock.create({ data: { upTo: yearEnd, kind: "year", byId } });
  });
  return { profit: net };
}

/** Straight-line monthly depreciation for every asset, once per month. */
export async function runDepreciation(monthKey: string, byId: string | null) {
  const assets = await db.fixedAsset.findMany();
  let total = 0n;
  await db.$transaction(async (tx) => {
    for (const a of assets) {
      if (a.lastRunMonth && a.lastRunMonth >= monthKey) continue;
      const monthly = (a.cost - a.salvage) / BigInt(a.lifeMonths);
      const remaining = a.cost - a.salvage - a.depreciated;
      const amt = monthly < remaining ? monthly : remaining;
      if (amt <= 0n) continue;
      await tx.fixedAsset.update({ where: { id: a.id }, data: { depreciated: { increment: amt }, lastRunMonth: monthKey } });
      total += amt;
    }
    if (total > 0n) {
      await postJournal(tx, { memo: `Depreciation ${monthKey}`, sourceType: "depreciation", sourceId: monthKey, byId, lines: [{ code: ACC.DEPRECIATION, debit: total }, { code: ACC.ACC_DEPRECIATION, credit: total }] });
    }
  });
  return total;
}

const CLEARING: Record<string, number> = { stripe: ACC.CLEARING_STRIPE, paypal: ACC.CLEARING_PAYPAL, card_demo: ACC.CLEARING_CARD, cod: ACC.COD_RECEIVABLE };

/** Gateway / courier payout: clears the settlement account into the bank; fees and FX differences expensed. */
export async function recordPayout(p: { provider: string; grossBase: bigint; feesBase: bigint; netReceivedBase: bigint; reference?: string; byId: string }) {
  const fx = p.netReceivedBase - (p.grossBase - p.feesBase); // >0 gain, <0 loss
  return db.$transaction(async (tx) => {
    const payout = await tx.gatewayPayout.create({ data: { provider: p.provider, grossBase: p.grossBase, feesBase: p.feesBase, netBase: p.netReceivedBase, fxDiffBase: fx, reference: p.reference } });
    const j = await postJournal(tx, {
      memo: `${p.provider} payout ${p.reference ?? ""}`.trim(),
      sourceType: "payout",
      sourceId: payout.id,
      byId: p.byId,
      lines: [
        { code: ACC.BANK, debit: p.netReceivedBase },
        { code: p.provider === "cod" ? ACC.SHIPPING_COST : ACC.GATEWAY_FEES, debit: p.feesBase },
        { code: fx < 0n ? ACC.FX_LOSS : ACC.FX_GAIN, debit: fx < 0n ? -fx : 0n, credit: fx > 0n ? fx : 0n },
        { code: CLEARING[p.provider] ?? ACC.CLEARING_STRIPE, credit: p.grossBase },
      ],
    });
    await tx.gatewayPayout.update({ where: { id: payout.id }, data: { entryId: j?.id } });
    return payout;
  });
}

/** Indirect-method cash flow statement for a period. Cash = bank + cash + gateway clearing. */
export async function cashFlow(from: Date, to: Date) {
  const [start, end, period] = await Promise.all([accountBalances({ to: from }), accountBalances({ to }), accountBalances({ from, to })]);
  const bal = (rows: typeof start, pred: (r: (typeof start)[number]) => boolean) => rows.filter(pred).reduce((a, r) => a + r.balance, 0n);
  const isCash = (r: (typeof start)[number]) => ["bank", "cash", "clearing"].includes(r.subtype);
  const netProfit = period.filter((r) => r.type === "REVENUE").reduce((a, r) => a + r.balance, 0n) - period.filter((r) => r.type === "EXPENSE").reduce((a, r) => a + r.balance, 0n);
  const depreciation = bal(period, (r) => r.code === ACC.DEPRECIATION);
  const delta = (pred: (r: (typeof start)[number]) => boolean) => bal(end, pred) - bal(start, pred);
  const wcAssets = delta((r) => r.type === "ASSET" && ["ar", "inventory"].includes(r.subtype));
  const wcLiab = delta((r) => r.type === "LIABILITY");
  const operating = netProfit + depreciation - wcAssets + wcLiab;
  const investing = -delta((r) => r.subtype === "fixed_asset");
  const financing = delta((r) => r.type === "EQUITY" && r.subtype !== "retained_earnings");
  const yearEndAdj = delta((r) => r.subtype === "retained_earnings"); // closing entries move profit into RE
  return {
    netProfit, depreciation, workingCapitalAssets: -wcAssets, workingCapitalLiabilities: wcLiab, operating, investing, financing,
    netChange: operating + investing + financing + yearEndAdj, cashStart: bal(start, isCash), cashEnd: bal(end, isCash),
  };
}
