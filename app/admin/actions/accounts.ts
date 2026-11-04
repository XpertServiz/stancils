"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { parseMajor } from "@/lib/money";
import { ACC, postJournal, reverseJournal } from "@/lib/accounting";
import { closePeriod, recordPayout, runDailyClose, runDepreciation, yearEndClose } from "@/lib/services/closing";
import { saveUpload } from "@/lib/storage";

type R = { ok: boolean; msg: string } | null;
const ok = (msg: string): R => { revalidatePath("/admin/accounts", "layout"); return { ok: true, msg }; };
const err = (e: unknown): R => ({ ok: false, msg: (e as Error).message });

export async function manualJournal(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.journal.create");
    const lines = [0, 1, 2, 3, 4, 5].map((i) => ({ code: Number(fd.get(`acc${i}`)), debit: parseMajor(String(fd.get(`dr${i}`) || "0")), credit: parseMajor(String(fd.get(`cr${i}`) || "0")), memo: String(fd.get(`m${i}`) || "") || undefined })).filter((l) => l.code && (l.debit || l.credit));
    if (lines.length < 2) return { ok: false, msg: "Add at least two lines." };
    const date = fd.get("date") ? new Date(String(fd.get("date"))) : new Date();
    const j = await db.$transaction((tx) => postJournal(tx, { memo: String(fd.get("memo") || "Manual journal"), sourceType: "manual", byId: s.id, date, lines }));
    await audit(s.id, "journal.manual", "journal", j?.id, undefined, { lines: lines.length });
    return ok(`Posted journal #${j?.number}.`);
  } catch (e) { return err(e); }
}

export async function reverse(fd: FormData) {
  const s = await requirePermission("accounts.journal.create");
  const id = String(fd.get("id"));
  await db.$transaction((tx) => reverseJournal(tx, id, s.id));
  await audit(s.id, "journal.reverse", "journal", id);
  revalidatePath("/admin/accounts");
}

export async function addAccount(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.journal.create");
    const code = Number(fd.get("code"));
    const type = String(fd.get("type")) as "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
    const ranges: Record<string, [number, number]> = { ASSET: [10000, 19999], LIABILITY: [20000, 29999], EQUITY: [30000, 39999], REVENUE: [40000, 49999], EXPENSE: [50000, 69999] };
    if (code < ranges[type][0] || code > ranges[type][1]) return { ok: false, msg: `${type} accounts use codes ${ranges[type][0]}–${ranges[type][1]}.` };
    await db.account.create({ data: { code, name: String(fd.get("name")), type, subtype: String(fd.get("subtype") || "opex") } });
    await audit(s.id, "account.create", "account", String(code));
    return ok("Account added.");
  } catch (e) { return err(e); }
}

export async function addExpense(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.journal.create");
    const account = await db.account.findUniqueOrThrow({ where: { id: String(fd.get("accountId")) } });
    const from = await db.account.findUniqueOrThrow({ where: { id: String(fd.get("paidFrom")) } });
    const amount = parseMajor(String(fd.get("amount")));
    if (amount <= 0n) return { ok: false, msg: "Enter an amount." };
    const receipt = fd.get("receipt") as File | null;
    const receiptUrl = receipt && receipt.size > 0 ? await saveUpload(receipt) : null;
    const date = fd.get("date") ? new Date(String(fd.get("date"))) : new Date();
    await db.$transaction(async (tx) => {
      const e = await tx.expense.create({ data: { date, accountId: account.id, paidFrom: from.id, amount, vendor: String(fd.get("vendor") || "") || null, memo: String(fd.get("memo") || "") || null, receipt: receiptUrl } });
      const j = await postJournal(tx, { memo: `Expense: ${e.vendor ?? account.name}${e.memo ? ` — ${e.memo}` : ""}`, sourceType: "expense", sourceId: e.id, date, byId: s.id, lines: [{ code: account.code, debit: amount }, { code: from.code, credit: amount }] });
      await tx.expense.update({ where: { id: e.id }, data: { entryId: j?.id } });
    });
    await audit(s.id, "expense.create", "expense", null, undefined, { account: account.code, amount });
    return ok("Expense posted.");
  } catch (e) { return err(e); }
}

export async function dailyClose(_: R): Promise<R> {
  try {
    const s = await requirePermission("accounts.period.close");
    const d = await runDailyClose(s.id);
    await audit(s.id, "close.day", "business_day", d.date);
    return ok(`Business day ${d.date} closed, locked and emailed.`);
  } catch (e) { return err(e); }
}

export async function periodClose(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.period.close");
    const upTo = new Date(`${String(fd.get("upTo"))}T00:00:00Z`);
    await closePeriod(upTo, "month", s.id);
    await audit(s.id, "close.period", "period_lock", upTo.toISOString());
    return ok(`Locked all journals before ${upTo.toISOString().slice(0, 10)}.`);
  } catch (e) { return err(e); }
}

export async function yearClose(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.period.close");
    const start = new Date(`${String(fd.get("start"))}T00:00:00Z`);
    const end = new Date(`${String(fd.get("end"))}T00:00:00Z`);
    const r = await yearEndClose(start, end, s.id);
    await audit(s.id, "close.year", "period_lock", end.toISOString());
    return ok(`Year closed. ${r.profit >= 0n ? "Profit" : "Loss"} moved to Retained Earnings.`);
  } catch (e) { return err(e); }
}

export async function depreciation(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.journal.create");
    const month = String(fd.get("month"));
    const total = await runDepreciation(month, s.id);
    await audit(s.id, "depreciation.run", "fixed_asset", month);
    return ok(total > 0n ? `Depreciation for ${month} posted.` : "Nothing to depreciate for that month.");
  } catch (e) { return err(e); }
}

export async function addAsset(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.journal.create");
    const cost = parseMajor(String(fd.get("cost")));
    const paid = String(fd.get("paid")) === "bank";
    await db.$transaction(async (tx) => {
      const a = await tx.fixedAsset.create({ data: { name: String(fd.get("name")), cost, salvage: parseMajor(String(fd.get("salvage") || "0")), lifeMonths: Number(fd.get("life")) || 36, purchasedAt: new Date(String(fd.get("date") || new Date().toISOString())) } });
      await postJournal(tx, { memo: `Fixed asset: ${a.name}`, sourceType: "fixed_asset", sourceId: a.id, byId: s.id, lines: [{ code: ACC.FIXED_ASSETS, debit: cost }, { code: paid ? ACC.BANK : ACC.AP, credit: cost }] });
    });
    return ok("Asset added and posted.");
  } catch (e) { return err(e); }
}

export async function payout(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.journal.create");
    await recordPayout({ provider: String(fd.get("provider")), grossBase: parseMajor(String(fd.get("gross"))), feesBase: parseMajor(String(fd.get("fees") || "0")), netReceivedBase: parseMajor(String(fd.get("net"))), reference: String(fd.get("ref") || "") || undefined, byId: s.id });
    await audit(s.id, "payout.record", "gateway_payout", null);
    return ok("Payout posted — clearing account settled into the bank.");
  } catch (e) { return err(e); }
}

export async function ownerEquity(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.journal.create");
    const amount = parseMajor(String(fd.get("amount")));
    const kind = String(fd.get("kind"));
    await db.$transaction((tx) => postJournal(tx, {
      memo: kind === "capital" ? "Owner capital introduced" : "Owner drawings", sourceType: "equity", byId: s.id,
      lines: kind === "capital" ? [{ code: ACC.BANK, debit: amount }, { code: ACC.CAPITAL, credit: amount }] : [{ code: ACC.DRAWINGS, debit: amount }, { code: ACC.BANK, credit: amount }],
    }));
    return ok("Posted.");
  } catch (e) { return err(e); }
}
