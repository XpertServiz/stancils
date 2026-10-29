"use server";
import Papa from "papaparse";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACC } from "@/lib/accounting";

export type RecState = { error?: string; rows?: { date: string; desc: string; amount: number; match: number | null }[]; matched?: number; unmatched?: number; ledgerOnly?: number } | null;

export async function reconcile(_: RecState, fd: FormData): Promise<RecState> {
  await requirePermission("accounts.view");
  const f = fd.get("file") as File | null;
  if (!f || f.size === 0) return { error: "Choose a CSV file." };
  const parsed = Papa.parse<Record<string, string>>((await f.text()).replace(/^﻿/, ""), { header: true, skipEmptyLines: true });
  const key = (r: Record<string, string>, names: string[]) => Object.keys(r).find((k) => names.includes(k.trim().toLowerCase()));
  const lines = parsed.data.map((r) => {
    const d = key(r, ["date", "transaction date", "value date"]);
    const a = key(r, ["amount", "net", "value"]);
    const desc = key(r, ["description", "details", "narration", "memo"]);
    const cr = key(r, ["credit", "deposit"]);
    const dr = key(r, ["debit", "withdrawal"]);
    const amount = a ? Number(String(r[a]).replace(/[^0-9.-]/g, "")) : Number(String(r[cr!] ?? "0").replace(/[^0-9.-]/g, "") || 0) - Number(String(r[dr!] ?? "0").replace(/[^0-9.-]/g, "") || 0);
    return { date: d ? r[d] : "", desc: desc ? r[desc] : "", amount };
  }).filter((l) => l.date && !isNaN(l.amount));
  if (!lines.length) return { error: "Couldn't find date/amount columns." };
  const dates = lines.map((l) => new Date(l.date).getTime()).filter((x) => !isNaN(x));
  const from = new Date(Math.min(...dates) - 4 * 86400_000);
  const to = new Date(Math.max(...dates) + 4 * 86400_000);
  const bank = await db.account.findUniqueOrThrow({ where: { code: ACC.BANK } });
  const ledger = await db.journalLine.findMany({ where: { accountId: bank.id, entry: { date: { gte: from, lte: to } } }, include: { entry: true } });
  const used = new Set<string>();
  const rows = lines.map((l) => {
    const t = new Date(l.date).getTime();
    const minor = Math.round(l.amount * 100);
    const m = ledger.find((x) => !used.has(x.id) && Number(x.debit - x.credit) === minor && Math.abs(x.entry.date.getTime() - t) <= 3 * 86400_000);
    if (m) used.add(m.id);
    return { ...l, match: m ? m.entry.number : null };
  });
  return { rows, matched: rows.filter((r) => r.match).length, unmatched: rows.filter((r) => !r.match).length, ledgerOnly: ledger.length - used.size };
}
