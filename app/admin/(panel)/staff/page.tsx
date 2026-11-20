import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PERMISSIONS, ROLES, effectivePerms } from "@/lib/permissions";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveStaff } from "@/app/admin/actions/staff";

export default async function Staff() {
  await requireStaff("staff.manage");
  const users = await db.staffUser.findMany({ orderBy: { createdAt: "asc" } });
  type U = (typeof users)[number];
  const Matrix = ({ u }: { u?: U }) => (
    <details className="rounded-xl border border-line p-3">
      <summary className="cursor-pointer text-sm font-semibold">Permission overrides {u && `(${effectivePerms(u).size} effective)`}</summary>
      <div className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        {Object.entries(PERMISSIONS).map(([k, label]) => {
          const v = u?.permsGrant.includes(k) ? "grant" : u?.permsRevoke.includes(k) ? "revoke" : "role";
          const inRole = u ? ROLES[u.role]?.perms.includes(k as never) : false;
          return (
            <label key={k} className="flex items-center justify-between gap-2 py-0.5">
              <span>{label} <span className="font-mono text-ink3">{k}</span>{u && inRole && <span className="text-mint"> ✓role</span>}</span>
              <select name={`perm_${k}`} defaultValue={v} className="select !w-24 !py-0.5 text-xs"><option value="role">role</option><option value="grant">grant</option><option value="revoke">revoke</option></select>
            </label>
          );
        })}
      </div>
    </details>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Staff & permissions" sub="Roles give a default set of permissions; override any permission per person. Deactivate people instead of deleting them so the audit trail stays intact." />
      {users.map((u) => (
        <Panel key={u.id} title={`${u.name} · ${u.email}`} actions={<span className="text-xs text-ink3">{u.lastLoginAt ? `last login ${u.lastLoginAt.toLocaleString()}` : "never logged in"}</span>}>
          <ActionForm action={saveStaff}>
            <input type="hidden" name="id" value={u.id} />
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Name"><input name="name" defaultValue={u.name} className="input" /></Field>
              <Field label="Role"><select name="role" defaultValue={u.role} className="select">{Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></Field>
              <Field label="New password"><input name="password" type="password" placeholder="(unchanged)" className="input" autoComplete="new-password" /></Field>
              <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} />Active</label>
            </div>
            <Matrix u={u} />
            <button className="btn btn-soft btn-sm">Save</button>
          </ActionForm>
        </Panel>
      ))}
      <Panel title="Invite staff">
        <ActionForm action={saveStaff}>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Name"><input name="name" required className="input" /></Field>
            <Field label="Email"><input name="email" type="email" required className="input" /></Field>
            <Field label="Role"><select name="role" className="select" defaultValue="order_handler">{Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></Field>
            <Field label="Temporary password"><input name="password" type="password" required minLength={10} className="input" autoComplete="new-password" /></Field>
          </div>
          <Matrix />
          <button className="btn btn-primary">Add staff member</button>
        </ActionForm>
      </Panel>
    </div>
  );
}
