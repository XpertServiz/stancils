import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Empty } from "@/components/admin/ui";
import { Submit } from "@/components/admin/Submit";
import { markAlerts } from "@/app/admin/actions/crm";

export default async function Alerts() {
  await requireStaff("dashboard.view");
  const alerts = await db.alert.findMany({ orderBy: [{ read: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <div>
      <PageHeader title="Alerts" actions={<form action={markAlerts}><Submit className="btn btn-ghost btn-sm">Mark all read</Submit></form>} />
      {alerts.length === 0 ? <Empty>No alerts.</Empty> : (
        <div className="card divide-y divide-line/50">
          {alerts.map((a) => (
            <div key={a.id} className={`flex items-center gap-3 p-3 text-sm ${a.read ? "opacity-60" : ""}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${a.severity === "critical" ? "bg-danger" : a.severity === "warning" ? "bg-mustard" : "bg-mint"}`} />
              <span className="w-36 shrink-0 text-xs text-ink3">{a.createdAt.toLocaleString()}</span>
              <span className="flex-1">{a.link ? <Link href={a.link} className="hover:text-accent">{a.message}</Link> : a.message}</span>
              {!a.read && <form action={markAlerts}><input type="hidden" name="id" value={a.id} /><Submit className="btn btn-ghost btn-sm">Done</Submit></form>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
