import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveStory } from "@/app/admin/actions/website";

export default async function Stories() {
  await requireStaff("content.edit");
  const stories = await db.projectStory.findMany({ orderBy: { sort: "asc" } });
  const Fields = ({ s }: { s?: (typeof stories)[number] }) => (
    <>
      <input type="hidden" name="id" value={s?.id ?? ""} />
      <div className="grid gap-2 sm:grid-cols-3"><input name="title" defaultValue={s?.title} placeholder="Title" required className="input sm:col-span-2" /><input name="surface" defaultValue={s?.surface ?? "wall"} placeholder="Surface" className="input" /></div>
      <textarea name="summary" defaultValue={s?.summary} placeholder="What was made and how" rows={3} required className="textarea" />
      <div className="grid gap-2 sm:grid-cols-4">
        <input name="quote" defaultValue={s?.quote ?? ""} placeholder="Customer quote (with consent)" className="input sm:col-span-2" />
        <input name="author" defaultValue={s?.author ?? ""} placeholder="Customer name" className="input" />
        <input name="hours" type="number" defaultValue={s?.hours ?? ""} placeholder="Hours" className="input" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input name="productSlugs" defaultValue={s?.productSlugs.join(", ")} placeholder="Product slugs used" className="input flex-1" />
        <input name="sort" type="number" defaultValue={s?.sort ?? 0} className="input !w-20" aria-label="Order" />
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="visible" defaultChecked={s?.visible ?? true} />Visible</label>
        <button name="op" value="save" className="btn btn-soft btn-sm">Save</button>
        {s && <button name="op" value="delete" className="btn btn-ghost btn-sm text-danger">Delete</button>}
      </div>
    </>
  );
  return (
    <div>
      <PageHeader title="Project stories" sub="Case studies for the homepage. Only publish customer quotes and photos with their permission." />
      <WebsiteTabs active="stories" />
      <div className="space-y-3">
        {stories.map((s) => <ActionForm key={s.id} action={saveStory} className="card space-y-2 p-4"><Fields s={s} /></ActionForm>)}
        <Panel title="New story"><ActionForm action={saveStory}><Fields /></ActionForm></Panel>
      </div>
    </div>
  );
}
