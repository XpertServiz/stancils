import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import type { BankAccount } from "@/lib/settings";
import { Panel, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Submit } from "@/components/admin/Submit";
import { bankOp, saveBank, saveBankInstructions } from "@/app/admin/actions/settings";

function Fields({ b, currencies }: { b?: BankAccount; currencies: string[] }) {
  return (
    <>
      <input type="hidden" name="id" value={b?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Bank name"><input name="bankName" defaultValue={b?.bankName} required placeholder="e.g. Meezan Bank" className="input" /></Field>
        <Field label="Account title"><input name="accountTitle" defaultValue={b?.accountTitle} required placeholder="Name on the account" className="input" /></Field>
        <Field label="Account number"><input name="accountNumber" defaultValue={b?.accountNumber} className="input font-mono" /></Field>
        <Field label="IBAN"><input name="iban" defaultValue={b?.iban} placeholder="PK36 SCBL 0000 0011 2345 6702" className="input font-mono" /></Field>
        <Field label="Branch code (optional)"><input name="branchCode" defaultValue={b?.branchCode} className="input" /></Field>
        <Field label="SWIFT / BIC (optional)"><input name="swift" defaultValue={b?.swift} className="input font-mono" /></Field>
        <Field label="Show for currency" hint="Only customers paying in this currency see it. Leave as Any to show to everyone.">
          <select name="currency" defaultValue={b?.currency ?? ""} className="select"><option value="">Any currency</option>{currencies.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="active" defaultChecked={b?.active ?? true} />Show at checkout</label>
      </div>
    </>
  );
}

function Op({ id, op, label, children }: { id: string; op: string; label: string; children: React.ReactNode }) {
  return (
    <form action={bankOp}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <Submit className="rounded-lg p-1.5 text-ink3 hover:bg-s2 hover:text-ink" confirm={op === "remove" ? "Remove this bank account? Customers will no longer see it." : undefined}>
        <span className="sr-only">{label}</span>{children}
      </Submit>
    </form>
  );
}

export function BankAccountsTab({ banks, instructions, currencies }: { banks: BankAccount[]; instructions: string; currencies: string[] }) {
  return (
    <div className="space-y-4">
      {banks.length === 0 && <p className="card p-6 text-sm text-ink2">No bank accounts yet. Add your first one below.</p>}
      {banks.map((b, i) => (
        <Panel
          key={b.id}
          title={`${i + 1}. ${b.bankName} · ${b.accountTitle}`}
          actions={
            <div className="flex items-center gap-1">
              {!b.active && <span className="badge badge-mustard mr-2">hidden</span>}
              {b.currency && <span className="badge badge-muted mr-2">{b.currency} only</span>}
              <Op id={b.id} op="up" label="Move up"><ArrowUp size={15} /></Op>
              <Op id={b.id} op="down" label="Move down"><ArrowDown size={15} /></Op>
              <Op id={b.id} op="toggle" label={b.active ? "Hide at checkout" : "Show at checkout"}>{b.active ? <Eye size={15} /> : <EyeOff size={15} />}</Op>
              <Op id={b.id} op="remove" label="Remove"><Trash2 size={15} /></Op>
            </div>
          }
        >
          <ActionForm action={saveBank}>
            <Fields b={b} currencies={currencies} />
            <button className="btn btn-soft btn-sm">Save changes</button>
          </ActionForm>
        </Panel>
      ))}
      <Panel title="Add a bank account">
        <ActionForm action={saveBank}>
          <Fields currencies={currencies} />
          <button className="btn btn-primary">Add bank account</button>
        </ActionForm>
      </Panel>
      <Panel title="Instructions shown under the accounts">
        <ActionForm action={saveBankInstructions}>
          <textarea name="bankInstructions" defaultValue={instructions} rows={2} className="textarea" />
          <button className="btn btn-soft btn-sm">Save</button>
        </ActionForm>
      </Panel>
    </div>
  );
}
