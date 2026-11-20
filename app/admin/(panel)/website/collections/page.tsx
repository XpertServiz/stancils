import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveCollection } from "@/app/admin/actions/website";

export default async function Collections() {
  await requireStaff("content.edit");
  const cols = await db.collection.findMany({ orderBy: [{ type: "asc" }, { sort: "asc" }], include: { _count: { select: { products: true } } } });
  const Fields = ({ c }: { c?: (typeof cols)[number] }) => (
    <>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <input name="name" defaultValue={c?.name} placeholder="Name" required className="input !py-1.5" />
      <input name="slug" defaultValue={c?.slug} placeholder="slug" required className="input !py-1.5 font-mono text-xs" />
      <select name="type" defaultValue={c?.type ?? "STYLE"} className="select !py-1.5"><option>SURFACE</option><option>STYLE</option><option>OCCASION</option></select>
      <input name="sort" type="number" defaultValue={c?.sort ?? 0} className="input !py-1.5" aria-label="Order" />
      <input name="description" defaultValue={c?.description ?? ""} placeholder="Description" className="input !py-1.5 md:col-span-2" />
      <input name="seoTitle" defaultValue={c?.seoTitle ?? ""} placeholder="SEO title" className="input !py-1.5" />
      <input name="seoDesc" defaultValue={c?.seoDesc ?? ""} placeholder="Meta description" className="input !py-1.5 md:col-span-2" />
      <button className="btn btn-soft btn-sm">Save</button>
    </>
  );
  return (
    <div>
      <PageHeader title="Collections" sub="Surfaces, styles and occasions. Renaming a slug adds a 301 redirect." />
      <WebsiteTabs active="collections" />
      <div className="space-y-2">
        {cols.map((c) => <div key={c.id}><ActionForm action={saveCollection} className="grid items-center gap-2 md:grid-cols-10"><Fields c={c} /></ActionForm><p className="text-xs text-ink3">{c._count.products} products</p></div>)}
        <Panel title="New collection"><ActionForm action={saveCollection} className="grid items-center gap-2 md:grid-cols-10"><Fields /></ActionForm></Panel>
      </div>
    </div>
  );
}
