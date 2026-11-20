import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { AccountsTabs } from "@/components/admin/AccountsTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { addExpense } from "@/app/admin/actions/accounts";

export default async function Expenses() {
  await requireStaff("accounts.view");
  const [expenses, accounts, { base }] = await Promise.all([db.expense.findMany({ orderBy: { date: "desc" }, take: 100 }), db.account.findMany({ where: { active: true }, orderBy: { code: "asc" } }), getCurrencies()]);
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";
  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" />
      <AccountsTabs active="expenses" />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Recent expenses">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Account</th><th>Vendor / memo</th><th>Paid from</th><th className="num">Amount</th><th /></tr></thead>
            <tbody>{expenses.map((e) => <tr key={e.id}><td>{e.date.toLocaleDateString()}</td><td>{name(e.accountId)}</td><td>{e.vendor} <span className="text-ink3">{e.memo}</span></td><td>{name(e.paidFrom)}</td><td className="num">{formatMoney(e.amount, base.code, base.exponent)}</td><td>{e.receipt && <a href={e.receipt} target="_blank" className="text-accent">receipt</a>}</td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel title="Record expense" className="h-fit">
          <ActionForm action={addExpense}>
            <Field label="Expense account"><select name="accountId" className="select">{accounts.filter((a) => a.type === "EXPENSE").map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></Field>
            <Field label="Paid from"><select name="paidFrom" className="select">{accounts.filter((a) => ["bank", "cash"].includes(a.subtype) || a.code === 20100).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></Field>
            <Field label={`Amount (${base.code})`}><input name="amount" required className="input" inputMode="decimal" /></Field>
            <Field label="Date"><input name="date" type="date" className="input" /></Field>
            <Field label="Vendor"><input name="vendor" className="input" /></Field>
            <Field label="Memo"><input name="memo" className="input" /></Field>
            <Field label="Receipt (image)"><input name="receipt" type="file" accept="image/*" className="text-sm" /></Field>
            <button className="btn btn-primary w-full">Post expense</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
