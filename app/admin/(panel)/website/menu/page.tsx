import { requireStaff } from "@/lib/auth";
import { getMenu, getMenuText } from "@/lib/storefront";
import { PageHeader, Panel } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { resetMenu, saveMenu } from "@/app/admin/actions/storefront";

export default async function MenuPage() {
  await requireStaff("content.edit");
  const [text, menu] = await Promise.all([getMenuText(), getMenu()]);
  return (
    <div>
      <PageHeader title="Menu" sub="The links across the top of every page. Type one per line." />
      <WebsiteTabs active="menu" />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Edit the menu">
          <ActionForm action={saveMenu}>
            <textarea name="menu" rows={22} defaultValue={text} spellCheck={false} className="textarea font-mono text-sm" aria-label="Menu" />
            <details className="rounded-xl border border-line p-3 text-sm">
              <summary className="cursor-pointer font-semibold">How this works (30 seconds)</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink2">
                <li>Each line is one menu link. Just type its name, for example <code>Mandala Designs</code>.</li>
                <li>Put <b>two spaces</b> at the start of a line to tuck it under the line above — that makes a dropdown.</li>
                <li>A link goes to a collection with the same name. We create the collection for you if it does not exist yet.</li>
                <li>Want it to go somewhere else? Add <code> | /shop</code> after the name, e.g. <code>All Stencils | /shop</code>.</li>
                <li>To put a product in a menu collection, choose that name as the <b>Category</b> when you add the product.</li>
              </ul>
            </details>
            <button className="btn btn-primary">Save menu</button>
          </ActionForm>
          <ActionForm action={resetMenu} confirm="Replace your menu with the starter menu?">
            <button className="btn btn-ghost btn-sm">Restore the starter menu</button>
          </ActionForm>
        </Panel>
        <Panel title="Preview">
          <ul className="space-y-3 text-sm">
            {menu.map((m) => (
              <li key={m.label}>
                <b>{m.label}</b> <span className="text-ink3">→ {m.href}</span>
                {m.children.length > 0 && <ul className="mt-1 space-y-0.5 border-l border-line pl-4 text-ink2">{m.children.map((c) => <li key={c.label}>{c.label}</li>)}</ul>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
