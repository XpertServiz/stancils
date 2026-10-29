import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { majorString } from "@/lib/money";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveDiscount } from "@/app/admin/actions/crm";

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 16) : "");

function DiscountFields({ c, base }: { c?: Awaited<ReturnType<typeof db.discountCode.findFirst>>; base: string }) {
  return (
    <>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <input name="code" defaultValue={c?.code} required placeholder="CODE" className="input !py-1.5 font-mono" aria-label="Code" />
      <select name="kind" defaultValue={c?.kind ?? "PERCENT"} className="select !py-1.5" aria-label="Type"><option value="PERCENT">% off</option><option value="FIXED">Fixed ({base})</option><option value="FREESHIP">Free shipping</option></select>
      <input name="value" type="number" step="0.01" defaultValue={c?.value ?? ""} placeholder="Value" className="input !py-1.5" aria-label="Value" />
      <input name="min" defaultValue={c ? majorString(c.minSubtotalBase) : ""} placeholder={`Min order (${base})`} className="input !py-1.5" aria-label="Minimum order" />
      <input name="limit" type="number" defaultValue={c?.usageLimit ?? ""} placeholder="Usage limit" className="input !py-1.5" aria-label="Usage limit" />
      <input name="starts" type="datetime-local" defaultValue={d(c?.startsAt ?? null)} className="input !py-1.5" aria-label="Starts" />
      <input name="ends" type="datetime-local" defaultValue={d(c?.endsAt ?? null)} className="input !py-1.5" aria-label="Ends" />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} />Active</label>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="first" defaultChecked={c?.firstOrderOnly} />1st order</label>
      <button className="btn btn-soft btn-sm">Save</button>
    </>
  );
}

export default async function Discounts() {
  await requireStaff("promotions.manage");
  const [codes, { base }] = await Promise.all([db.discountCode.findMany({ orderBy: { createdAt: "desc" } }), getCurrencies()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Promotions" sub="Discount codes apply at checkout in every currency and post to Sales Discounts in the ledger. Announcement bar text lives in Website → Settings." />
      <Panel title="Codes">
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.id}>
              <ActionForm action={saveDiscount} className="grid grid-cols-2 items-center gap-2 md:grid-cols-11"><DiscountFields c={c} base={base.code} /></ActionForm>
              <p className="mt-1 text-xs text-ink3">Used {c.used}×</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="New code">
        <ActionForm action={saveDiscount} className="grid grid-cols-2 items-center gap-2 md:grid-cols-11"><DiscountFields base={base.code} /></ActionForm>
      </Panel>
    </div>
  );
}
