import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { formatMoney, majorString } from "@/lib/money";
import { PageHeader, Tabs, Panel, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { adjustMat, saveMaterial } from "@/app/admin/actions/inventory";

export default async function Materials() {
  await requireStaff("inventory.view");
  const [mats, { base }] = await Promise.all([db.material.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }), getCurrencies()]);
  const fm = (m: bigint) => formatMoney(m, base.code, base.exponent);
  const value = mats.reduce((a, m) => a + (BigInt(Math.max(0, m.onHand)) * m.costPerK) / 1000n, 0n);
  const tabs = [{ key: "stock", label: "Stock levels", href: "/admin/inventory" }, { key: "moves", label: "Movements", href: "/admin/inventory?tab=moves" }, { key: "mat", label: "Raw materials", href: "/admin/inventory/materials" }, { key: "import", label: "Import / export / media", href: "/admin/inventory/import" }];
  return (
    <div className="space-y-6">
      <PageHeader title="Raw materials" sub={`Valued at ${fm(value)}. Sheet materials are counted in cm²; packaging in pieces. Buy them through Purchases to update cost.`} />
      <Tabs tabs={tabs} active="mat" />
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Code</th><th>Material</th><th className="num">On hand</th><th className="num">Reorder at</th><th className="num">Cost / 1k units</th><th className="num">Studio rate / 100 cm²</th><th>Min bridge</th><th>Adjust (± qty)</th></tr></thead>
          <tbody>
            {mats.map((m) => (
              <tr key={m.id}>
                <td className="font-mono text-xs">{m.code}</td>
                <td>
                  <details>
                    <summary className="cursor-pointer">{m.name} {m.foodSafe && <span className="badge badge-mint">food-safe</span>} {!m.active && <span className="badge badge-muted">inactive</span>}</summary>
                    <ActionForm action={saveMaterial} className="mt-2 grid gap-2 sm:grid-cols-3">
                      <input type="hidden" name="id" value={m.id} />
                      <input name="code" defaultValue={m.code} className="input !py-1" aria-label="Code" />
                      <input name="name" defaultValue={m.name} className="input !py-1 sm:col-span-2" aria-label="Name" />
                      <select name="kind" defaultValue={m.kind} className="select !py-1"><option>MYLAR</option><option>PET</option><option>STEEL</option><option>VINYL</option><option>PACKAGING</option></select>
                      <select name="unit" defaultValue={m.unit} className="select !py-1"><option value="cm2">cm²</option><option value="pcs">pcs</option></select>
                      <input name="thicknessUm" defaultValue={m.thicknessUm ?? ""} placeholder="Thickness µm" className="input !py-1" />
                      <input name="reorderLevel" defaultValue={m.reorderLevel} placeholder="Reorder level" className="input !py-1" />
                      <input name="minBridgeMm" defaultValue={m.minBridgeMm} placeholder="Min bridge mm" className="input !py-1" />
                      <input name="rate" defaultValue={majorString(m.rateCm2Base, base.exponent)} placeholder="Studio rate / 100cm²" className="input !py-1" />
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="foodSafe" defaultChecked={m.foodSafe} />Food-safe</label>
                      <select name="active" defaultValue={m.active ? "on" : "off"} className="select !py-1"><option value="on">Active</option><option value="off">Inactive</option></select>
                      <button className="btn btn-soft btn-sm">Save</button>
                    </ActionForm>
                  </details>
                </td>
                <td className={`num ${m.onHand <= m.reorderLevel ? "text-mustard" : ""}`}>{m.onHand.toLocaleString()} {m.unit}</td>
                <td className="num text-ink3">{m.reorderLevel.toLocaleString()}</td>
                <td className="num">{fm(m.costPerK)}</td>
                <td className="num">{m.unit === "cm2" ? fm(m.rateCm2Base) : "—"}</td>
                <td>{m.unit === "cm2" ? `${m.minBridgeMm} mm` : ""}</td>
                <td>
                  <ActionForm action={adjustMat} className="flex gap-1">
                    <input type="hidden" name="id" value={m.id} />
                    <input name="qty" type="number" required className="input !w-24 !py-1" aria-label="Quantity" />
                    <input name="reason" required placeholder="Reason" className="input !w-36 !py-1 text-xs" aria-label="Reason" />
                    <button className="btn btn-soft btn-sm">Apply</button>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Panel title="Add material">
        <ActionForm action={saveMaterial} className="grid gap-3 sm:grid-cols-4">
          <Field label="Code"><input name="code" required className="input" /></Field>
          <Field label="Name" className="sm:col-span-2"><input name="name" required className="input" /></Field>
          <Field label="Kind"><select name="kind" className="select"><option>MYLAR</option><option>PET</option><option>STEEL</option><option>VINYL</option><option>PACKAGING</option></select></Field>
          <Field label="Unit"><select name="unit" className="select"><option value="cm2">cm²</option><option value="pcs">pcs</option></select></Field>
          <Field label="Thickness µm"><input name="thicknessUm" className="input" /></Field>
          <Field label="Min bridge mm"><input name="minBridgeMm" defaultValue="1.5" className="input" /></Field>
          <Field label={`Studio rate / 100 cm² (${base.code})`}><input name="rate" className="input" /></Field>
          <Field label="Reorder level"><input name="reorderLevel" className="input" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="foodSafe" />Food-safe</label>
          <div className="sm:col-span-4"><button className="btn btn-primary">Add material</button></div>
        </ActionForm>
      </Panel>
    </div>
  );
}
