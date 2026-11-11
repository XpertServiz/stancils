import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveLegal } from "@/app/admin/actions/website";

const PAGES = [["privacy", "Privacy policy"], ["terms", "Terms of service"], ["shipping", "Shipping"], ["returns", "Returns & refunds"]];

export default async function Legal() {
  await requireStaff("content.publish");
  const rows = await db.pageSection.findMany({ where: { page: { startsWith: "legal:" } } });
  return (
    <div>
      <PageHeader title="Policy pages" sub="Leave a page blank to use the built-in default text. Have a lawyer review these before launch." />
      <WebsiteTabs active="legal" />
      <div className="grid gap-4 xl:grid-cols-2">
        {PAGES.map(([slug, title]) => {
          const r = rows.find((x) => x.page === `legal:${slug}`);
          return (
            <Panel key={slug} title={title}>
              <ActionForm action={saveLegal}>
                <input type="hidden" name="slug" value={slug} />
                <input name="title" defaultValue={r?.title ?? title} className="input" />
                <textarea name="body" defaultValue={(r?.data as { body?: string } | undefined)?.body ?? ""} rows={10} placeholder="(using default text)" className="textarea text-sm" />
                <button className="btn btn-soft btn-sm">Publish</button>
              </ActionForm>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
