import { db, type Tx } from "./db";
import type { AccountType } from "@prisma/client";

/** System chart of accounts (5-digit blocks). Owner can add more in Admin → Accounts. */
export const ACC = {
  BANK: 10100,
  CASH: 10110,
  CLEARING_STRIPE: 10200,
  CLEARING_PAYPAL: 10210,
  CLEARING_CARD: 10220,
  COD_RECEIVABLE: 10300,
  AR_B2B: 10400,
  INV_FINISHED: 10500,
  INV_RAW: 10510,
  WIP: 10520,
  FIXED_ASSETS: 10600,
  ACC_DEPRECIATION: 10610,
  AP: 20100,
  TAX_PAYABLE: 20200,
  CUSTOMER_DEPOSITS: 20300,
  STORE_CREDIT: 20500,
  ACCRUED: 20600,
  CAPITAL: 30100,
  DRAWINGS: 30200,
  RETAINED: 30300,
  SALES_STENCILS: 40100,
  SALES_CUSTOM: 40200,
  SALES_DIGITAL: 40300,
  SALES_TOOLS: 40400,
  SALES_B2B: 40500,
  SHIPPING_INCOME: 40600,
  SALES_DISCOUNTS: 40700,
  SALES_RETURNS: 40800,
  FX_GAIN: 40900,
  COGS: 50100,
  SCRAP: 50200,
  SHIPPING_COST: 50300,
  GATEWAY_FEES: 60100,
  MARKETING: 60200,
  SOFTWARE: 60300,
  RENT: 60400,
  SALARIES: 60500,
  UTILITIES: 60600,
  BANK_CHARGES: 60700,
  FX_LOSS: 60800,
  DEPRECIATION: 60900,
  MISC: 61000,
  SHRINKAGE: 61100,
} as const;

export const CHART: { code: number; name: string; type: AccountType; subtype: string }[] = [
  { code: ACC.BANK, name: "Bank – Main", type: "ASSET", subtype: "bank" },
  { code: ACC.CASH, name: "Cash", type: "ASSET", subtype: "cash" },
  { code: ACC.CLEARING_STRIPE, name: "Gateway Clearing – Stripe", type: "ASSET", subtype: "clearing" },
  { code: ACC.CLEARING_PAYPAL, name: "Gateway Clearing – PayPal", type: "ASSET", subtype: "clearing" },
  { code: ACC.CLEARING_CARD, name: "Gateway Clearing – Card (test/local)", type: "ASSET", subtype: "clearing" },
  { code: ACC.COD_RECEIVABLE, name: "COD Receivable – Courier", type: "ASSET", subtype: "ar" },
  { code: ACC.AR_B2B, name: "Accounts Receivable – B2B", type: "ASSET", subtype: "ar" },
  { code: ACC.INV_FINISHED, name: "Inventory – Finished Goods", type: "ASSET", subtype: "inventory" },
  { code: ACC.INV_RAW, name: "Inventory – Raw Materials", type: "ASSET", subtype: "inventory" },
  { code: ACC.WIP, name: "Work in Progress", type: "ASSET", subtype: "inventory" },
  { code: ACC.FIXED_ASSETS, name: "Fixed Assets – Equipment", type: "ASSET", subtype: "fixed_asset" },
  { code: ACC.ACC_DEPRECIATION, name: "Accumulated Depreciation", type: "ASSET", subtype: "contra_asset" },
  { code: ACC.AP, name: "Accounts Payable", type: "LIABILITY", subtype: "ap" },
  { code: ACC.TAX_PAYABLE, name: "Sales Tax / VAT Payable", type: "LIABILITY", subtype: "tax" },
  { code: ACC.CUSTOMER_DEPOSITS, name: "Customer Deposits", type: "LIABILITY", subtype: "deposit" },
  { code: ACC.STORE_CREDIT, name: "Store Credit Liability", type: "LIABILITY", subtype: "deposit" },
  { code: ACC.ACCRUED, name: "Accrued Freight & Customs", type: "LIABILITY", subtype: "accrued" },
  { code: ACC.CAPITAL, name: "Owner's Capital", type: "EQUITY", subtype: "capital" },
  { code: ACC.DRAWINGS, name: "Owner's Drawings", type: "EQUITY", subtype: "drawings" },
  { code: ACC.RETAINED, name: "Retained Earnings", type: "EQUITY", subtype: "retained_earnings" },
  { code: ACC.SALES_STENCILS, name: "Sales – Stencils", type: "REVENUE", subtype: "revenue" },
  { code: ACC.SALES_CUSTOM, name: "Sales – Custom Stencils", type: "REVENUE", subtype: "revenue" },
  { code: ACC.SALES_DIGITAL, name: "Sales – Digital Downloads", type: "REVENUE", subtype: "revenue" },
  { code: ACC.SALES_TOOLS, name: "Sales – Tools & Kits", type: "REVENUE", subtype: "revenue" },
  { code: ACC.SALES_B2B, name: "Sales – B2B", type: "REVENUE", subtype: "revenue" },
  { code: ACC.SHIPPING_INCOME, name: "Shipping Income", type: "REVENUE", subtype: "revenue" },
  { code: ACC.SALES_DISCOUNTS, name: "Sales Discounts", type: "REVENUE", subtype: "contra_revenue" },
  { code: ACC.SALES_RETURNS, name: "Sales Returns & Refunds", type: "REVENUE", subtype: "contra_revenue" },
  { code: ACC.FX_GAIN, name: "FX Gain", type: "REVENUE", subtype: "other_income" },
  { code: ACC.COGS, name: "Cost of Goods Sold", type: "EXPENSE", subtype: "cogs" },
  { code: ACC.SCRAP, name: "Scrap & Wastage", type: "EXPENSE", subtype: "cogs" },
  { code: ACC.SHIPPING_COST, name: "Shipping Cost", type: "EXPENSE", subtype: "cogs" },
  { code: ACC.GATEWAY_FEES, name: "Payment Gateway Fees", type: "EXPENSE", subtype: "opex" },
  { code: ACC.MARKETING, name: "Marketing & Ads", type: "EXPENSE", subtype: "opex" },
  { code: ACC.SOFTWARE, name: "Software & Hosting", type: "EXPENSE", subtype: "opex" },
  { code: ACC.RENT, name: "Rent", type: "EXPENSE", subtype: "opex" },
  { code: ACC.SALARIES, name: "Salaries", type: "EXPENSE", subtype: "opex" },
  { code: ACC.UTILITIES, name: "Utilities", type: "EXPENSE", subtype: "opex" },
  { code: ACC.BANK_CHARGES, name: "Bank Charges", type: "EXPENSE", subtype: "opex" },
  { code: ACC.FX_LOSS, name: "FX Loss", type: "EXPENSE", subtype: "opex" },
  { code: ACC.DEPRECIATION, name: "Depreciation", type: "EXPENSE", subtype: "opex" },
  { code: ACC.MISC, name: "Miscellaneous", type: "EXPENSE", subtype: "opex" },
  { code: ACC.SHRINKAGE, name: "Inventory Shrinkage", type: "EXPENSE", subtype: "opex" },
];

export type JLine = { code: number; debit?: bigint; credit?: bigint; memo?: string };

export class LedgerError extends Error {}

/** Post a balanced journal entry. Must be called inside the same transaction as the business event. */
export async function postJournal(
  tx: Tx,
  input: {
    memo: string;
    sourceType: string;
    sourceId?: string | null;
    date?: Date;
    currency?: string;
    fxRate?: number;
    byId?: string | null;
    lines: JLine[];
    reversalOfId?: string;
  },
) {
  const lines = input.lines
    .map((l) => ({ ...l, debit: l.debit ?? 0n, credit: l.credit ?? 0n }))
    .flatMap((l) => {
      // normalise negatives to the opposite side
      const net = l.debit - l.credit;
      if (net === 0n) return [];
      return [{ code: l.code, memo: l.memo, debit: net > 0n ? net : 0n, credit: net < 0n ? -net : 0n }];
    });
  if (lines.length === 0) return null;
  const d = lines.reduce((a, l) => a + l.debit, 0n);
  const c = lines.reduce((a, l) => a + l.credit, 0n);
  if (d !== c) throw new LedgerError(`Unbalanced journal "${input.memo}": debit ${d} ≠ credit ${c}`);

  const date = input.date ?? new Date();
  const lock = await tx.periodLock.findFirst({ orderBy: { upTo: "desc" } });
  if (lock && date < lock.upTo) throw new LedgerError(`Period is closed up to ${lock.upTo.toISOString().slice(0, 10)}`);

  const codes = [...new Set(lines.map((l) => l.code))];
  const accounts = await tx.account.findMany({ where: { code: { in: codes } } });
  const byCode = new Map(accounts.map((a) => [a.code, a.id]));
  for (const code of codes) if (!byCode.has(code)) throw new LedgerError(`Unknown account ${code}`);

  return tx.journalEntry.create({
    data: {
      memo: input.memo,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      date,
      currency: input.currency,
      fxRate: input.fxRate,
      byId: input.byId ?? null,
      reversalOfId: input.reversalOfId,
      lines: { create: lines.map((l) => ({ accountId: byCode.get(l.code)!, debit: l.debit, credit: l.credit, memo: l.memo })) },
    },
  });
}

export async function reverseJournal(tx: Tx, entryId: string, byId?: string | null, memo?: string) {
  const e = await tx.journalEntry.findUnique({ where: { id: entryId }, include: { lines: { include: { account: true } }, reversedBy: true } });
  if (!e) throw new LedgerError("Journal not found");
  if (e.reversedBy) throw new LedgerError("Journal already reversed");
  if (e.reversalOfId) throw new LedgerError("Cannot reverse a reversal");
  return postJournal(tx, {
    memo: memo ?? `Reversal of #${e.number}: ${e.memo}`,
    sourceType: "reversal",
    sourceId: e.id,
    byId,
    reversalOfId: e.id,
    lines: e.lines.map((l) => ({ code: l.account.code, debit: l.credit, credit: l.debit, memo: l.memo ?? undefined })),
  });
}

// ───────────── reporting ─────────────

export type Balance = { id: string; code: number; name: string; type: AccountType; subtype: string; debit: bigint; credit: bigint; balance: bigint };

/** Natural-sign balance: assets/expenses = debit − credit; others = credit − debit. */
export async function accountBalances(opts: { from?: Date; to?: Date } = {}): Promise<Balance[]> {
  const where = {
    entry: {
      date: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lt: opts.to } : {}) },
    },
  };
  const [accounts, sums] = await Promise.all([
    db.account.findMany({ orderBy: { code: "asc" } }),
    db.journalLine.groupBy({ by: ["accountId"], where, _sum: { debit: true, credit: true } }),
  ]);
  const m = new Map(sums.map((s) => [s.accountId, s._sum]));
  return accounts.map((a) => {
    const s = m.get(a.id);
    const debit = s?.debit ?? 0n;
    const credit = s?.credit ?? 0n;
    const natural = a.type === "ASSET" || a.type === "EXPENSE" ? debit - credit : credit - debit;
    return { id: a.id, code: a.code, name: a.name, type: a.type, subtype: a.subtype, debit, credit, balance: natural };
  });
}

export async function trialBalance(to?: Date) {
  const rows = (await accountBalances({ to })).filter((r) => r.debit !== 0n || r.credit !== 0n);
  const net = rows.map((r) => {
    const n = r.debit - r.credit;
    return { ...r, dr: n > 0n ? n : 0n, cr: n < 0n ? -n : 0n };
  });
  const totalDr = net.reduce((a, r) => a + r.dr, 0n);
  const totalCr = net.reduce((a, r) => a + r.cr, 0n);
  return { rows: net, totalDr, totalCr, balanced: totalDr === totalCr };
}

export async function profitAndLoss(from: Date, to: Date) {
  const rows = (await accountBalances({ from, to })).filter((r) => r.type === "REVENUE" || r.type === "EXPENSE");
  const revenue = rows.filter((r) => r.type === "REVENUE" && r.subtype !== "other_income");
  const otherIncome = rows.filter((r) => r.subtype === "other_income");
  const cogs = rows.filter((r) => r.subtype === "cogs");
  const opex = rows.filter((r) => r.type === "EXPENSE" && r.subtype !== "cogs");
  const sum = (xs: Balance[]) => xs.reduce((a, r) => a + r.balance, 0n);
  const netRevenue = sum(revenue);
  const grossProfit = netRevenue - sum(cogs);
  const netProfit = grossProfit + sum(otherIncome) - sum(opex);
  return { revenue, otherIncome, cogs, opex, netRevenue, totalCogs: sum(cogs), grossProfit, totalOpex: sum(opex), totalOther: sum(otherIncome), netProfit };
}

export async function balanceSheet(asOf: Date) {
  const rows = await accountBalances({ to: asOf });
  const assets = rows.filter((r) => r.type === "ASSET");
  const liabilities = rows.filter((r) => r.type === "LIABILITY");
  const equity = rows.filter((r) => r.type === "EQUITY");
  const earnings = rows
    .filter((r) => r.type === "REVENUE" || r.type === "EXPENSE")
    .reduce((a, r) => a + (r.type === "REVENUE" ? r.balance : -r.balance), 0n);
  const sum = (xs: Balance[]) => xs.reduce((a, r) => a + r.balance, 0n);
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const totalEquity = sum(equity) + earnings;
  return { assets, liabilities, equity, earnings, totalAssets, totalLiabilities, totalEquity, balanced: totalAssets === totalLiabilities + totalEquity };
}
