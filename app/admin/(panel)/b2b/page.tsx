import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { majorString } from "@/lib/money";
import { PageHeader, StatusBadge, Empty } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { updateBusiness } from "@/app/admin/actions/crm";

export default async function B2B() {
  await requireStaff("b2b.manage");
  const accounts = await db.businessAccount.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { customer: { include: { _count: { select: { orders: true } } } } } });
  return (
    <div>
      <PageHeader title="Business accounts" sub="Approve cafés, bakeries and brands. Approved accounts get their discount automatically; accounts with payment terms can check out on invoice (posted to Accounts Receivable – B2B)." />
      {accounts.length === 0 ? <Empty>No applications yet — they arrive from /business.</Empty> : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-semibold">{a.company} <StatusBadge s={a.status} /></p><p className="text-sm text-ink3">{a.customer.email} · {a.country} {a.taxId && `· Tax ID ${a.taxId}`} · {a.customer._count.orders} orders</p></div>
              </div>
              <ActionForm action={updateBusiness} className="grid items-end gap-2 sm:grid-cols-6">
                <input type="hidden" name="id" value={a.id} />
                <label><span className="label">Status</span><select name="status" defaultValue={a.status} className="select"><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option></select></label>
                <label><span className="label">Discount %</span><input name="discountPct" type="number" step="0.5" defaultValue={a.discountPct} className="input" /></label>
                <label><span className="label">Terms (days)</span><input name="termsDays" type="number" defaultValue={a.termsDays} className="input" /></label>
                <label><span className="label">Credit limit</span><input name="creditLimit" defaultValue={majorString(a.creditLimit)} className="input" /></label>
                <label className="sm:col-span-1"><span className="label">Notes</span><input name="notes" defaultValue={a.notes ?? ""} className="input" /></label>
                <button className="btn btn-primary">Save</button>
              </ActionForm>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
