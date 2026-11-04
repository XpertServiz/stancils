import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, StatusBadge, Tabs, Empty } from "@/components/admin/ui";
import { Submit } from "@/components/admin/Submit";
import { updateInquiry } from "@/app/admin/actions/crm";

export default async function Inbox({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff("inbox.manage");
  const status = (await searchParams).status ?? "open";
  const [items, staff] = await Promise.all([
    db.inquiry.findMany({ where: status === "all" ? {} : { status }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.staffUser.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Inbox" sub="Contact form, custom-stencil questions and business requests." />
      <Tabs active={status} tabs={["open", "in_progress", "closed", "all"].map((s) => ({ key: s, label: s.replace("_", " "), href: `/admin/inbox?status=${s}` }))} />
      {items.length === 0 ? <Empty>Inbox zero.</Empty> : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2"><b>{i.subject || `${i.kind} inquiry`}</b><StatusBadge s={i.status} /><span className="badge badge-muted">{i.kind}</span><span className="text-xs text-ink3">{i.createdAt.toLocaleString()}</span></div>
              <p className="mt-1 text-sm text-ink3">{i.name} · <a href={`mailto:${i.email}?subject=Re: ${encodeURIComponent(i.subject ?? "your message")}`} className="text-accent">{i.email}</a>{i.phone && <> · <a className="text-accent" href={`https://wa.me/${i.phone.replace(/\D/g, "")}`}>{i.phone}</a></>}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{i.message}</p>
              <form action={updateInquiry} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={i.id} />
                <select name="status" defaultValue={i.status} className="select !w-36 !py-1.5"><option value="open">open</option><option value="in_progress">in progress</option><option value="closed">closed</option></select>
                <select name="assignedTo" defaultValue={i.assignedTo ?? ""} className="select !w-40 !py-1.5"><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                <input name="notes" defaultValue={i.notes ?? ""} placeholder="Internal notes" className="input !py-1.5 flex-1" />
                <Submit className="btn btn-soft btn-sm">Update</Submit>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
