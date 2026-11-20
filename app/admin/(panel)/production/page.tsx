import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, StatusBadge, Tabs, Empty } from "@/components/admin/ui";
import { DesignArt } from "@/components/DesignArt";
import { Submit } from "@/components/admin/Submit";
import { jobAction, reviewDesign } from "@/app/admin/actions/orders";

const FLOW: Record<string, { next: string; label: string }> = {
  queued: { next: "cutting", label: "Start cutting" },
  cutting: { next: "cleaning", label: "Cut done → clean" },
  cleaning: { next: "quality_check", label: "Cleaned → QC" },
  quality_check: { next: "ready_to_pack", label: "QC passed" },
};

export default async function Production({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff("production.manage");
  const tab = (await searchParams).tab ?? "queue";
  const [jobs, designs, doneCount] = await Promise.all([
    db.productionJob.findMany({
      where: tab === "done" ? { completedAt: { not: null } } : { completedAt: null },
      orderBy: { createdAt: tab === "done" ? "desc" : "asc" },
      take: 200,
      include: { orderItem: { include: { order: true, customDesign: { include: { material: true } }, variant: { include: { product: true, material: true } } } } },
    }),
    db.customDesign.findMany({ where: { status: "needs_review" }, orderBy: { createdAt: "asc" }, include: { material: true, orderItems: { include: { order: true } } } }),
    db.productionJob.count({ where: { completedAt: { not: null } } }),
  ]);
  return (
    <div>
      <PageHeader title="Production" sub="Made-to-order and custom stencils. Starting a job consumes raw materials (BOM) into work-in-progress; finishing moves the cost to COGS." />
      <Tabs active={tab} tabs={[{ key: "queue", label: `Queue (${tab === "queue" ? jobs.length : "…"})`, href: "/admin/production" }, { key: "designs", label: `Design checks (${designs.length})`, href: "/admin/production?tab=designs" }, { key: "done", label: `Done (${doneCount})`, href: "/admin/production?tab=done" }]} />
      {tab === "designs" ? (
        designs.length === 0 ? <Empty>No designs waiting for a check.</Empty> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {designs.map((d) => (
              <div key={d.id} className="card p-4">
                <div className="mb-3 aspect-square rounded-xl bg-[#e9eef2] p-4 text-[#2E3140]"><DesignArt svg={d.svg} uid={`dr${d.id}`} /></div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-ink3">{d.widthMm}×{d.heightMm} mm · {d.material.name} · {d.email ?? "guest"}</p>
                <div className="mt-1 flex flex-wrap gap-1">{d.flags.map((f) => <span key={f} className="badge badge-mustard">{f.replace("_", " ")}</span>)}</div>
                <p className="mt-1 text-xs text-ink3">Orders: {d.orderItems.map((i) => i.order.number).join(", ") || "not ordered yet"}</p>
                <div className="mt-3 flex gap-2">
                  <a className="btn btn-ghost btn-sm" href={`/admin/export/design/${d.id}`}>Cut file</a>
                  <form action={reviewDesign}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="decision" value="approve" /><Submit className="btn btn-primary btn-sm">Approve</Submit></form>
                </div>
              </div>
            ))}
          </div>
        )
      ) : jobs.length === 0 ? <Empty>{tab === "done" ? "No finished jobs yet." : "Nothing to cut. 🎉"}</Empty> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th /><th>Order</th><th>Item</th><th>Material · size</th><th>Status</th><th>Age</th><th /></tr></thead>
            <tbody>
              {jobs.map((j) => {
                const it = j.orderItem;
                const svg = it.customDesign?.svg ?? it.variant?.product.designSvg;
                const mat = it.customDesign?.material.name ?? it.variant?.material?.name;
                const size = it.customDesign ? `${it.customDesign.widthMm}×${it.customDesign.heightMm} mm` : it.variant?.widthMm ? `${it.variant.widthMm}×${it.variant.heightMm} mm` : "";
                const hours = Math.round((Date.now() - it.order.createdAt.getTime()) / 3600_000);
                const flow = FLOW[j.status];
                return (
                  <tr key={j.id}>
                    <td className="w-14"><div className="h-12 w-12 rounded-lg bg-[#e9eef2] p-1 text-[#2E3140]"><DesignArt svg={svg} uid={`pj${j.id}`} /></div></td>
                    <td><Link href={`/admin/orders/${it.orderId}`} className="font-mono text-accent">{it.order.number}</Link><div className="text-xs text-ink3">{it.order.country}</div></td>
                    <td><div className="font-medium">{it.name}</div>{it.customDesign && it.customDesign.status === "needs_review" && <span className="badge badge-mustard">needs design check</span>}</td>
                    <td className="text-sm text-ink2">{mat}<br />{size}</td>
                    <td><StatusBadge s={j.status} />{j.machine && <div className="text-xs text-ink3">{j.machine}</div>}</td>
                    <td className={hours > 72 ? "text-danger" : "text-ink2"}>{hours}h</td>
                    <td className="whitespace-nowrap">
                      {it.customDesign && <a className="btn btn-ghost btn-sm mr-1" href={`/admin/export/design/${it.customDesign.id}`}>Cut file</a>}
                      {flow && (
                        <form action={jobAction} className="inline-flex gap-1">
                          <input type="hidden" name="id" value={j.id} />
                          <input type="hidden" name="status" value={flow.next} />
                          {j.status === "queued" && <input name="machine" placeholder="Machine" className="input !w-24 !py-1 text-xs" />}
                          {j.status === "quality_check" && <input name="photo" placeholder="Photo URL" className="input !w-28 !py-1 text-xs" />}
                          <Submit className="btn btn-primary btn-sm">{flow.label}</Submit>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
