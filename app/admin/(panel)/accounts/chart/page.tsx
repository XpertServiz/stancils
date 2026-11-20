import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { accountBalances } from "@/lib/accounting";
import { getCurrencies } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { AccountsTabs } from "@/components/admin/AccountsTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { addAccount } from "@/app/admin/actions/accounts";

export default async function Chart() {
  await requireStaff("accounts.view");
  const [rows, { base }] = await Promise.all([accountBalances(), getCurrencies()]);
  const groups = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
  return (
    <div className="space-y-6">
      <PageHeader title="Chart of accounts" sub="5-digit blocks: 1xxxx assets · 2xxxx liabilities · 3xxxx equity · 4xxxx revenue · 5xxxx cost of sales · 6xxxx expenses. Reports pick up new accounts automatically by type & subtype." />
      <AccountsTabs active="chart" />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {groups.map((g) => (
            <Panel key={g} title={g.charAt(0) + g.slice(1).toLowerCase()}>
              <table className="tbl"><tbody>
                {rows.filter((r) => r.type === g).map((r) => (
                  <tr key={r.id}><td className="w-20 font-mono text-xs">{r.code}</td><td><Link className="hover:text-accent" href={`/admin/reports?tab=gl&account=${r.code}`}>{r.name}</Link> <span className="text-xs text-ink3">{r.subtype}</span></td><td className="num">{formatMoney(r.balance, base.code, base.exponent)}</td></tr>
                ))}
              </tbody></table>
            </Panel>
          ))}
        </div>
        <Panel title="Add account" className="h-fit">
          <ActionForm action={addAccount}>
            <Field label="Code"><input name="code" type="number" required className="input" /></Field>
            <Field label="Name"><input name="name" required className="input" /></Field>
            <Field label="Type"><select name="type" className="select">{groups.map((g) => <option key={g}>{g}</option>)}</select></Field>
            <Field label="Subtype" hint="cash, bank, clearing, ar, inventory, fixed_asset, ap, accrued, tax, capital, revenue, other_income, contra_revenue, cogs, opex"><input name="subtype" defaultValue="opex" className="input" /></Field>
            <button className="btn btn-primary">Add</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
