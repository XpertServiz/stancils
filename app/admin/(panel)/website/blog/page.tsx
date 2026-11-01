import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { Submit } from "@/components/admin/Submit";
import { deletePost, savePost } from "@/app/admin/actions/website";

export default async function Blog({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  await requireStaff("content.edit");
  const sp = await searchParams;
  const posts = await db.blogPost.findMany({ orderBy: { publishedAt: "desc" } });
  const p = sp.edit ? posts.find((x) => x.id === sp.edit) : undefined;
  return (
    <div>
      <PageHeader title="Blog & tutorials" actions={<Link href="/admin/website/blog?new=1" className="btn btn-primary btn-sm">New post</Link>} />
      <WebsiteTabs active="blog" />
      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Panel title="Posts">
          <ul className="space-y-1 text-sm">{posts.map((x) => <li key={x.id}><Link href={`/admin/website/blog?edit=${x.id}`} className={`block rounded-lg px-2 py-1.5 hover:bg-s2 ${x.id === sp.edit ? "bg-s2" : ""}`}>{x.title} {!x.published && <span className="badge badge-muted">draft</span>}</Link></li>)}</ul>
        </Panel>
        {(p || sp.new) && (
          <Panel title={p ? "Edit post" : "New post"}>
            <ActionForm action={savePost}>
              <input type="hidden" name="id" value={p?.id ?? ""} />
              <Field label="Title"><input name="title" defaultValue={p?.title} required className="input" /></Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Slug"><input name="slug" defaultValue={p?.slug} className="input" /></Field>
                <Field label="Kind"><select name="kind" defaultValue={p?.kind ?? "blog"} className="select"><option value="blog">Blog</option><option value="tutorial">Tutorial</option></select></Field>
                <Field label="YouTube URL"><input name="videoUrl" defaultValue={p?.videoUrl ?? ""} className="input" /></Field>
              </div>
              <Field label="Excerpt"><textarea name="excerpt" defaultValue={p?.excerpt ?? ""} rows={2} className="textarea" /></Field>
              <Field label="Body" hint="## headings, - lists, **bold**"><textarea name="body" defaultValue={p?.body} rows={14} className="textarea font-mono text-sm" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="SEO title"><input name="seoTitle" defaultValue={p?.seoTitle ?? ""} className="input" /></Field>
                <Field label="Tags"><input name="tags" defaultValue={p?.tags.join(", ")} className="input" /></Field>
              </div>
              <Field label="Meta description"><input name="seoDesc" defaultValue={p?.seoDesc ?? ""} className="input" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={p?.published ?? true} />Published</label>
              <button className="btn btn-primary">Save</button>
            </ActionForm>
            {p && <form action={deletePost} className="mt-3"><input type="hidden" name="id" value={p.id} /><Submit className="btn btn-ghost btn-sm text-danger" confirm="Delete this post?">Delete post</Submit></form>}
          </Panel>
        )}
      </div>
    </div>
  );
}
