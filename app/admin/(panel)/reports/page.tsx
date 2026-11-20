import { requireStaff } from "@/lib/auth";
import { getCurrencies, getSettings } from "@/lib/settings";
import { parseRange } from "@/lib/dates";
import { buildReport } from "@/lib/reports";
import { db } from "@/lib/db";
import { PageHeader, Tabs } from "@/components/admin/ui";
import { PrintButton } from "@/components/admin/PrintButton";

const TABS = [["pl", "Profit & loss"], ["bs", "Balance sheet"], ["tb", "Trial balance"], ["cf", "Cash flow"], ["gl", "General ledger"], ["sales", "Sales"], ["inventory", "Inventory valuation"]];

export default async function Reports({ searchParams }: { searchParams: Promise<{ tab?: string; from?: string; to?: string; account?: string }> }) {
  await requireStaff("reports.financial.view");
  const sp = await searchParams;
  const tab = sp.tab ?? "pl";
  const s = await getSettings();
  const { base } = await getCurrencies();
  const r = parseRange(sp, s.business.timezone, 30);
  const tables = await buildReport(tab, r.from, r.to, { account: sp.account ? Number(sp.account) : undefined });
  const accounts = tab === "gl" ? await db.account.findMany({ orderBy: { code: "asc" } }) : [];
  const qs = new URLSearchParams({ tab, from: r.fromKey, to: r.toKey, ...(sp.account ? { account: sp.account } : {}) }).toString();
  const fmt = (v: string | number) => (typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v);
  return (
    <div>
      <PageHeader title="Reports" sub={`Live from the ledger · amounts in ${base.code}`} actions={<><a href={`/admin/export/report?${qs}`} className="btn btn-ghost btn-sm">Export CSV (Excel)</a><PrintButton /></>} />
      <Tabs active={tab} tabs={TABS.map(([key, label]) => ({ key, label, href: `/admin/reports?tab=${key}&from=${r.fromKey}&to=${r.toKey}` }))} />
      <form className="no-print mb-5 flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value={tab} />
        {!["bs", "tb"].includes(tab) && <label><span className="label">From</span><input type="date" name="from" defaultValue={r.fromKey} className="input" /></label>}
        <label><span className="label">{["bs", "tb"].includes(tab) ? "As of" : "To"}</span><input type="date" name="to" defaultValue={r.toKey} className="input" /></label>
        {tab === "gl" && <label><span className="label">Account</span><select name="account" defaultValue={sp.account ?? "10100"} className="select">{accounts.map((a) => <option key={a.id} value={a.code}>{a.code} {a.name}</option>)}</select></label>}
        <button className="btn btn-soft">Run</button>
      </form>
      <div className="space-y-6">
        {tables.map((t) => (
          <section key={t.title} className="card overflow-x-auto p-4">
            <h2 className="mb-3 font-semibold">{t.title}</h2>
            <table className="tbl">
              <thead><tr>{t.head.map((h, i) => <th key={h} className={i >= t.head.length - (tab === "gl" ? 3 : 2) && i > 0 ? "num" : ""}>{h}</th>)}</tr></thead>
              <tbody>{t.rows.map((row, i) => <tr key={i} className={row[0] === "" ? "font-semibold" : ""}>{row.map((c, j) => <td key={j} className={typeof c === "number" ? "num" : ""}>{fmt(c)}</td>)}</tr>)}</tbody>
              {t.foot && <tfoot><tr className="border-t-2 border-line font-bold">{t.foot.map((c, j) => <td key={j} className={typeof c === "number" ? "num" : "py-2"}>{fmt(c)}</td>)}</tr></tfoot>}
            </table>
            {t.rows.length === 0 && <p className="py-6 text-center text-sm text-ink3">No data for this period.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
