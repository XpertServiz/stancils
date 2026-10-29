import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Trash2, RotateCcw } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { rollbackVersion, saveSection, sectionOp } from "@/app/admin/actions/website";
import { SECTION_LIBRARY } from "@/lib/sections";

function OpBtn({ id, op, label, children }: { id: string; op: string; label: string; children: React.ReactNode }) {
  return <form action={sectionOp}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} /><button className="rounded-lg p-1.5 text-ink3 hover:bg-s2 hover:text-ink" aria-label={label} title={label}>{children}</button></form>;
}

export default async function Website() {
  await requireStaff("content.edit");
  const [sections, trash, versions] = await Promise.all([
    db.pageSection.findMany({ where: { page: "home", deletedAt: null }, orderBy: { sort: "asc" } }),
    db.pageSection.findMany({ where: { page: "home", deletedAt: { not: null, gt: new Date(Date.now() - 30 * 86400_000) } }, orderBy: { deletedAt: "desc" } }),
    db.contentVersion.findMany({ where: { page: "home" }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Website" sub="Every homepage section can be edited, hidden, reordered, duplicated or deleted. Changes go live immediately and each change is saved as a version you can roll back to." />
      <WebsiteTabs active="sections" />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {sections.map((s, i) => {
            const data = (s.data ?? {}) as Record<string, unknown>;
            const items = (data.items as { problem: string; solution: string }[]) ?? [];
            return (
              <div key={s.id} className={`card p-4 ${s.visible ? "" : "opacity-60"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold"><span className="mr-2 font-mono text-xs text-ink3">{i + 1}</span>{s.title || SECTION_LIBRARY[s.type]} <span className="badge badge-muted ml-1">{SECTION_LIBRARY[s.type] ?? s.type}</span>{!s.visible && <span className="badge badge-mustard ml-1">hidden</span>}</p>
                  <div className="flex">
                    <OpBtn id={s.id} op="up" label="Move up"><ArrowUp size={15} /></OpBtn>
                    <OpBtn id={s.id} op="down" label="Move down"><ArrowDown size={15} /></OpBtn>
                    <OpBtn id={s.id} op="toggle" label={s.visible ? "Hide" : "Show"}>{s.visible ? <Eye size={15} /> : <EyeOff size={15} />}</OpBtn>
                    <OpBtn id={s.id} op="duplicate" label="Duplicate"><Copy size={15} /></OpBtn>
                    <OpBtn id={s.id} op="delete" label="Delete (30-day trash)"><Trash2 size={15} /></OpBtn>
                  </div>
                </div>
                {s.type !== "hero" && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-accent">Edit content</summary>
                    <ActionForm action={saveSection} className="mt-3 space-y-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input name="title" defaultValue={s.title ?? ""} placeholder="Title" className="input" />
                      <textarea name="subtitle" defaultValue={s.subtitle ?? ""} placeholder="Subtitle" rows={2} className="textarea" />
                      {s.type === "problem_solution" && [0, 1, 2, 3, 4, 5].map((k) => (
                        <div key={k} className="grid gap-2 sm:grid-cols-2"><input name={`p${k}`} defaultValue={items[k]?.problem} placeholder={`Problem ${k + 1}`} className="input" /><input name={`s${k}`} defaultValue={items[k]?.solution} placeholder={`Solution ${k + 1}`} className="input" /></div>
                      ))}
                      {s.type === "text" && <><textarea name="body" defaultValue={String(data.body ?? "")} rows={6} placeholder="Body (## headings, - lists, **bold**)" className="textarea" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="stone" defaultChecked={Boolean(data.stone)} />Light (stone) band</label></>}
                      {s.type === "why_us" && <details><summary className="cursor-pointer text-xs text-ink3">Advanced (JSON rows: [label, us, shop, marketplace])</summary><textarea name="data" defaultValue={JSON.stringify(data, null, 1)} rows={8} className="textarea font-mono text-xs" /></details>}
                      <button className="btn btn-primary btn-sm">Publish</button>
                    </ActionForm>
                  </details>
                )}
                {s.type === "hero" && <p className="mt-1 text-sm text-ink3">Edit in <a href="/admin/website/hero" className="text-accent">Hero & site</a>.</p>}
              </div>
            );
          })}
        </div>
        <div className="space-y-6">
          <Panel title="Add a section">
            <form action={sectionOp} className="flex gap-2">
              <input type="hidden" name="op" value="add" /><input type="hidden" name="page" value="home" />
              <select name="type" className="select">{Object.entries(SECTION_LIBRARY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <button className="btn btn-primary">Add</button>
            </form>
          </Panel>
          <Panel title="Versions">
            <ul className="space-y-1 text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between"><span className="text-ink2">{v.createdAt.toLocaleString()}</span><form action={rollbackVersion}><input type="hidden" name="id" value={v.id} /><button className="text-accent hover:underline">Restore</button></form></li>
              ))}
              {versions.length === 0 && <li className="text-ink3">No changes yet.</li>}
            </ul>
          </Panel>
          <Panel title="Trash (30 days)">
            <ul className="space-y-1 text-sm">
              {trash.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2"><span className="line-clamp-1 text-ink2">{t.title || t.type}</span><span className="flex"><OpBtn id={t.id} op="restore" label="Restore"><RotateCcw size={14} /></OpBtn><OpBtn id={t.id} op="purge" label="Delete forever"><Trash2 size={14} /></OpBtn></span></li>
              ))}
              {trash.length === 0 && <li className="text-ink3">Empty.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
