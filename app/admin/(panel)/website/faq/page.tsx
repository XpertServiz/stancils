import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveFaq } from "@/app/admin/actions/website";

export default async function Faq() {
  await requireStaff("content.edit");
  const faqs = await db.faq.findMany({ orderBy: [{ page: "asc" }, { sort: "asc" }] });
  const Fields = ({ f }: { f?: (typeof faqs)[number] }) => (
    <>
      <input type="hidden" name="id" value={f?.id ?? ""} />
      <input name="question" defaultValue={f?.question} placeholder="Question" className="input" />
      <textarea name="answer" defaultValue={f?.answer} placeholder="Answer" rows={3} className="textarea" />
      <div className="flex flex-wrap items-center gap-2">
        <input name="page" defaultValue={f?.page ?? "home"} className="input !w-32 !py-1.5" aria-label="Page" />
        <input name="sort" type="number" defaultValue={f?.sort ?? 0} className="input !w-20 !py-1.5" aria-label="Order" />
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="visible" defaultChecked={f?.visible ?? true} />Visible</label>
        <button name="op" value="save" className="btn btn-soft btn-sm">Save</button>
        {f && <button name="op" value="delete" className="btn btn-ghost btn-sm text-danger">Delete</button>}
      </div>
    </>
  );
  return (
    <div>
      <PageHeader title="FAQ" sub="Feeds the FAQ section, the /faq page and FAQPage structured data." />
      <WebsiteTabs active="faq" />
      <div className="space-y-3">
        {faqs.map((f) => <ActionForm key={f.id} action={saveFaq} className="card space-y-2 p-4"><Fields f={f} /></ActionForm>)}
        <Panel title="Add question"><ActionForm action={saveFaq}><Fields /></ActionForm></Panel>
      </div>
    </div>
  );
}
