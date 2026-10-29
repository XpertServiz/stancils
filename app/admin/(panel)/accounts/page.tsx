import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { majorString } from "@/lib/money";
import { PageHeader, Panel, Pager } from "@/components/admin/ui";
import { AccountsTabs } from "@/components/admin/AccountsTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { Submit } from "@/components/admin/Submit";
import { manualJournal, reverse } from "@/app/admin/actions/accounts";

export default async function Journals({ searchParams }: { searchParams: Promise<{ entry?: string; source?: string; page?: string; q?: string }> }) {
  const staff = await requireStaff("accounts.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { base } = await getCurrencies();
  const where: Prisma.JournalEntryWhereInput = { ...(sp.source ? { sourceType: sp.source } : {}), ...(sp.q ? { memo: { contains: sp.q, mode: "insensitive" } } : {}) };
  const [total, entries, accounts, sources, lock] = await Promise.all([
    db.journalEntry.count({ where }),
    db.journalEntry.findMany({ where, orderBy: { number: "desc" }, skip: (page - 1) * 30, take: 30, include: { lines: { include: { account: true } }, reversedBy: true } }),
    db.account.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    db.journalEntry.groupBy({ by: ["sourceType"], _count: true }),
    db.periodLock.findFirst({ orderBy: { upTo: "desc" } }),
  ]);
  const focus = sp.entry ? await db.journalEntry.findUnique({ where: { id: sp.entry }, include: { lines: { include: { account: true } }, reversedBy: true } }) : null;
  const list = focus ? [focus] : entries;
  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" sub={<>Double-entry ledger in {base.code}. Journals are immutable — corrections are made by reversal. {lock && <>Books locked up to <b>{lock.upTo.toISOString().slice(0, 10)}</b>.</>}</>} />
      <AccountsTabs active="journals" />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div>
          <form className="mb-3 flex flex-wrap gap-2">
            <input name="q" defaultValue={sp.q} placeholder="Search memo" className="input max-w-xs" />
            <select name="source" defaultValue={sp.source ?? ""} className="select max-w-[200px]"><option value="">All sources</option>{sources.map((s) => <option key={s.sourceType} value={s.sourceType}>{s.sourceType} ({s._count})</option>)}</select>
            <button className="btn btn-soft">Filter</button>
            {focus && <Link href="/admin/accounts" className="btn btn-ghost">Show all</Link>}
          </form>
          <div className="space-y-3">
            {list.map((j) => {
              const dr = j.lines.reduce((a, l) => a + l.debit, 0n);
              return (
                <div key={j.id} className="card p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm"><b className="font-mono">#{j.number}</b> · {j.memo} <span className="text-xs text-ink3">· {j.date.toLocaleString()} · {j.sourceType}{j.currency && j.currency !== base.code ? ` · ${j.currency}` : ""}</span>{j.reversalOfId && <span className="badge badge-muted ml-2">reversal</span>}{j.reversedBy && <span className="badge badge-danger ml-2">reversed by #{j.reversedBy.number}</span>}</p>
                    {!j.reversedBy && !j.reversalOfId && staff.perms.has("accounts.journal.create") && j.sourceType === "manual" && (
                      <form action={reverse}><input type="hidden" name="id" value={j.id} /><Submit className="btn btn-ghost btn-sm" confirm="Post a reversing entry?">Reverse</Submit></form>
                    )}
                  </div>
                  <table className="tbl"><tbody>
                    {j.lines.map((l) => <tr key={l.id}><td className="w-20 font-mono text-xs">{l.account.code}</td><td>{l.account.name}{l.memo && <span className="text-xs text-ink3"> — {l.memo}</span>}</td><td className="num">{l.debit ? majorString(l.debit, base.exponent) : ""}</td><td className="num">{l.credit ? majorString(l.credit, base.exponent) : ""}</td></tr>)}
                    <tr><td /><td className="text-right text-xs text-ink3">Total</td><td className="num font-semibold">{majorString(dr, base.exponent)}</td><td className="num font-semibold">{majorString(dr, base.exponent)}</td></tr>
                  </tbody></table>
                </div>
              );
            })}
          </div>
          {!focus && <Pager page={page} pages={Math.ceil(total / 30)} href={(p) => `?page=${p}${sp.source ? `&source=${sp.source}` : ""}`} />}
        </div>
        {staff.perms.has("accounts.journal.create") && (
          <Panel title="Manual journal" className="h-fit">
            <ActionForm action={manualJournal}>
              <input name="memo" required placeholder="Memo" className="input" />
              <input name="date" type="date" className="input" aria-label="Date" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px] gap-1">
                  <select name={`acc${i}`} className="select !py-1 text-xs" defaultValue=""><option value="">— account —</option>{accounts.map((a) => <option key={a.id} value={a.code}>{a.code} {a.name}</option>)}</select>
                  <input name={`dr${i}`} placeholder="Debit" className="input !py-1" />
                  <input name={`cr${i}`} placeholder="Credit" className="input !py-1" />
                </div>
              ))}
              <p className="text-xs text-ink3">Debits must equal credits. The database rejects anything unbalanced.</p>
              <button className="btn btn-primary w-full">Post journal</button>
            </ActionForm>
          </Panel>
        )}
      </div>
    </div>
  );
}
