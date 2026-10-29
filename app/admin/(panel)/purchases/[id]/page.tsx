import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { formatMoney, majorString } from "@/lib/money";
import { PageHeader, Panel, StatusBadge, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { pay, receive, removeLine, updatePO } from "@/app/admin/actions/purchases";

export default async function PO({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("purchases.manage");
  const po = await db.purchaseOrder.findUnique({ where: { id: (await params).id }, include: { supplier: true, lines: { include: { variant: { include: { product: true } }, material: true } } } });
  if (!po) notFound();
  const { base } = await getCurrencies();
  const fm = (m: bigint) => formatMoney(m, po.currency, 2);
  const lineValue = (l: (typeof po.lines)[number]) => (l.materialId ? (BigInt(l.qty) * l.unitCost) / 1000n : BigInt(l.qty) * l.unitCost);
  const goods = po.lines.reduce((a, l) => a + lineValue(l), 0n);
  const open = po.lines.some((l) => l.received < l.qty);
  return (
    <div className="space-y-6">
      <PageHeader title={`${po.number} · ${po.supplier.name}`} sub={<><StatusBadge s={po.status} /> · {po.currency} · paid so far {formatMoney(po.paidBase, base.code, base.exponent)}</>} />
      <Panel title="Lines">
        <table className="tbl">
          <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Unit cost ({po.currency})</th><th className="num">Value</th><th className="num">Received</th><th /></tr></thead>
          <tbody>
            {po.lines.map((l) => (
              <tr key={l.id}>
                <td>{l.variant ? `${l.variant.sku} · ${l.variant.product.name} — ${l.variant.name}` : `${l.material?.code} · ${l.material?.name}`}{l.materialId && <span className="ml-1 text-xs text-ink3">(cost per 1000 {l.material?.unit})</span>}</td>
                <td className="num">{l.qty.toLocaleString()}</td><td className="num">{fm(l.unitCost)}</td><td className="num">{fm(lineValue(l))}</td><td className="num">{l.received.toLocaleString()}</td>
                <td>{l.received === 0 && <form action={removeLine}><input type="hidden" name="id" value={l.id} /><button className="text-ink3 hover:text-danger" aria-label="Remove"><Trash2 size={14} /></button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-right text-sm">Goods {fm(goods)} + extra charges {fm(po.extraCharges)} = <b>{fm(goods + po.extraCharges)}</b> · ≈ {formatMoney(BigInt(Math.round(Number(goods + po.extraCharges) / po.fxRate)), base.code, base.exponent)}</p>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Edit / add line">
          <ActionForm action={updatePO}>
            <input type="hidden" name="id" value={po.id} />
            <div className="grid grid-cols-3 gap-2">
              <Field label="SKU or material code" className="col-span-3"><input name="item" className="input" placeholder="CC-1042 or MYL-10" /></Field>
              <Field label="Qty"><input name="qty" type="number" min={1} className="input" /></Field>
              <Field label={`Unit cost (${po.currency})`} className="col-span-2"><input name="unitCost" className="input" placeholder="per piece, or per 1000 cm²" /></Field>
            </div>
            <Field label={`Freight / customs / clearing (${po.currency})`}><input name="extra" defaultValue={majorString(po.extraCharges)} className="input" /></Field>
            <Field label={`FX rate (${po.currency} per 1 ${base.code})`}><input name="fxRate" defaultValue={po.fxRate} className="input" /></Field>
            <Field label="Status"><select name="status" defaultValue={po.status} className="select"><option value="draft">draft</option><option value="ordered">ordered</option><option value="partial" disabled>partial</option><option value="received" disabled>received</option><option value="cancelled">cancelled</option></select></Field>
            <textarea name="notes" defaultValue={po.notes ?? ""} placeholder="Notes" className="textarea" />
            <button className="btn btn-soft">Save</button>
          </ActionForm>
        </Panel>
        {open && (
          <Panel title="Receive goods">
            <ActionForm action={receive}>
              <input type="hidden" name="id" value={po.id} />
              {po.lines.filter((l) => l.received < l.qty).map((l) => (
                <Field key={l.id} label={`${l.variant?.sku ?? l.material?.code} (open ${l.qty - l.received})`}><input name={`rcv_${l.id}`} type="number" min={0} max={l.qty - l.received} defaultValue={l.qty - l.received} className="input" /></Field>
              ))}
              <button className="btn btn-primary w-full">Receive & post landed cost</button>
            </ActionForm>
          </Panel>
        )}
        <Panel title="Pay supplier">
          <ActionForm action={pay}>
            <input type="hidden" name="id" value={po.id} />
            <Field label={`Amount (${base.code})`}><input name="amount" required className="input" /></Field>
            <select name="kind" className="select"><option value="goods">Supplier invoice (Accounts Payable)</option><option value="extras">Freight / customs (Accrued)</option></select>
            <button className="btn btn-soft w-full">Post payment from bank</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
