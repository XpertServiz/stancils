import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Pager } from "@/components/admin/ui";

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AuditLogWhereInput = sp.q ? { OR: [{ action: { contains: sp.q } }, { entity: { contains: sp.q } }, { entityId: sp.q }] } : {};
  const [total, logs] = await Promise.all([db.auditLog.count({ where }), db.auditLog.findMany({ where, orderBy: { at: "desc" }, skip: (page - 1) * 50, take: 50, include: { actor: true } })]);
  return (
    <div>
      <PageHeader title="Audit log" sub="Every sensitive action with before/after values." />
      <form className="mb-3 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Action, entity or id" className="input max-w-sm" /><button className="btn btn-soft">Search</button></form>
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Change</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-ink2">{l.at.toLocaleString()}</td>
                <td>{l.actor?.name ?? "system"}</td>
                <td className="font-mono text-xs">{l.action}</td>
                <td className="text-xs">{l.entity} <span className="text-ink3">{l.entityId}</span></td>
                <td className="max-w-md text-xs">
                  {l.before != null && <div className="truncate text-danger/80" title={JSON.stringify(l.before)}>− {JSON.stringify(l.before)}</div>}
                  {l.after != null && <div className="truncate text-mint" title={JSON.stringify(l.after)}>+ {JSON.stringify(l.after)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={Math.ceil(total / 50)} href={(p) => `?page=${p}${sp.q ? `&q=${sp.q}` : ""}`} />
    </div>
  );
}
