import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { PageHeader, Panel, StatusBadge, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Submit } from "@/components/admin/Submit";
import { createPO, saveSupplier } from "@/app/admin/actions/purchases";

export default async function Purchases() {
  await requireStaff("purchases.manage");
  const [suppliers, pos, currencies] = await Promise.all([
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    db.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { supplier: true, lines: true } }),
    db.currency.findMany({ orderBy: { sort: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Purchases" sub="Purchase orders → goods received (with landed cost: freight, customs, FX) → supplier payments." />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Purchase orders">
          <table className="tbl">
            <thead><tr><th>PO</th><th>Supplier</th><th>Date</th><th>Status</th><th className="num">Lines</th><th className="num">Goods</th></tr></thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.id}>
                  <td><Link className="font-mono text-accent" href={`/admin/purchases/${p.id}`}>{p.number}</Link></td>
                  <td>{p.supplier.name}</td><td>{p.createdAt.toLocaleDateString()}</td><td><StatusBadge s={p.status} /></td><td className="num">{p.lines.length}</td>
                  <td className="num">{formatMoney(p.lines.reduce((a, l) => a + (l.materialId ? (BigInt(l.qty) * l.unitCost) / 1000n : BigInt(l.qty) * l.unitCost), 0n), p.currency, 2)}</td>
                </tr>
              ))}
              {pos.length === 0 && <tr><td colSpan={6} className="text-center text-ink3">No purchase orders yet.</td></tr>}
            </tbody>
          </table>
        </Panel>
        <div className="space-y-6">
          <Panel title="New purchase order">
            {suppliers.length === 0 ? <p className="text-sm text-ink3">Add a supplier first.</p> : (
              <form action={createPO} className="space-y-3">
                <select name="supplierId" className="select">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.currency})</option>)}</select>
                <Submit>Create PO</Submit>
              </form>
            )}
          </Panel>
          <Panel title="Add supplier">
            <ActionForm action={saveSupplier}>
              <Field label="Name"><input name="name" required className="input" /></Field>
              <div className="grid grid-cols-2 gap-2"><input name="email" placeholder="Email" className="input" /><input name="phone" placeholder="Phone" className="input" /></div>
              <div className="grid grid-cols-2 gap-2"><input name="country" placeholder="Country" className="input" /><select name="currency" className="select">{currencies.map((c) => <option key={c.code}>{c.code}</option>)}</select></div>
              <button className="btn btn-soft">Add supplier</button>
            </ActionForm>
            <ul className="mt-4 space-y-1 text-sm text-ink2">{suppliers.map((s) => <li key={s.id}>{s.name} · {s.currency} {s.country && `· ${s.country}`}</li>)}</ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
