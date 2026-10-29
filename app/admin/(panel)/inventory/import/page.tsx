import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Tabs, Panel, StatusBadge } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Submit } from "@/components/admin/Submit";
import { bulkMedia, rollback } from "@/app/admin/actions/inventory";
import { ImportForm } from "./ImportForm";

export default async function ImportPage() {
  await requireStaff("inventory.import");
  const batches = await db.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  const tabs = [{ key: "stock", label: "Stock levels", href: "/admin/inventory" }, { key: "moves", label: "Movements", href: "/admin/inventory?tab=moves" }, { key: "mat", label: "Raw materials", href: "/admin/inventory/materials" }, { key: "import", label: "Import / export / media", href: "/admin/inventory/import" }];
  return (
    <div className="space-y-6">
      <PageHeader title="Import, export & bulk media" />
      <Tabs tabs={tabs} active="import" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Import catalogue (CSV)">
          <p className="mb-3 text-sm text-ink2">Use our template or a <b>Shopify product export</b>. Rows are grouped into products by slug; variants are matched by SKU (existing SKUs are updated). Opening stock on new SKUs is posted to the ledger. Every import is a batch you can roll back.</p>
          <p className="mb-4 text-sm"><a href="/admin/export/products?template=1" className="text-accent underline">Download template</a> · <a href="/admin/export/products" className="text-accent underline">Export full catalogue</a></p>
          <ImportForm />
        </Panel>
        <Panel title="Bulk images & artwork">
          <p className="mb-3 text-sm text-ink2">Drop many files at once. Each file is matched by name to a <b>SKU</b> (e.g. <code>CC-1042.jpg</code>) or a <b>product slug</b> (e.g. <code>lotus-mandala-stencil-2.png</code>). <code>.svg</code> files replace the stencil artwork; photos are added to the gallery.</p>
          <ActionForm action={bulkMedia}>
            <input type="file" name="files" multiple accept="image/*,.svg" className="text-sm" required />
            <button className="btn btn-primary">Upload & match</button>
          </ActionForm>
        </Panel>
      </div>
      <Panel title="Import history">
        <table className="tbl">
          <thead><tr><th>When</th><th>File</th><th>Format</th><th className="num">Rows</th><th className="num">New</th><th className="num">Updated</th><th>Status</th><th /></tr></thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>{b.createdAt.toLocaleString()}</td><td>{b.filename}</td><td>{b.kind}</td><td className="num">{b.rows}</td><td className="num">{b.created}</td><td className="num">{b.updated}</td>
                <td><StatusBadge s={b.status} /></td>
                <td>{b.status === "committed" && <form action={rollback}><input type="hidden" name="id" value={b.id} /><Submit className="btn btn-ghost btn-sm" confirm="Delete products created by this import and reverse its opening stock?">Roll back</Submit></form>}</td>
              </tr>
            ))}
            {batches.length === 0 && <tr><td colSpan={8} className="text-center text-ink3">No imports yet.</td></tr>}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
