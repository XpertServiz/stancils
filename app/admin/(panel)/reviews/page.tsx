import Link from "next/link";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, StatusBadge, Tabs, Empty, Panel, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Submit } from "@/components/admin/Submit";
import { addReview, moderateReview } from "@/app/admin/actions/crm";

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff("reviews.moderate");
  const status = (await searchParams).status ?? "pending";
  const reviews = await db.review.findMany({ where: status === "all" ? {} : { status }, orderBy: { createdAt: "desc" }, take: 100, include: { product: true } });
  const counts = await db.review.groupBy({ by: ["status"], _count: true });
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const btn = (id: string, op: string, label: string, cls = "btn btn-ghost btn-sm") => (
    <form action={moderateReview}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} /><Submit className={cls} confirm={op === "delete" ? "Delete this review permanently?" : undefined}>{label}</Submit></form>
  );
  return (
    <div>
      <PageHeader title="Reviews" sub="New reviews from your customers wait in the Pending tab. Press Publish to show one on your homepage; Feature puts it first." />
      <Panel title="Add a review I received" className="mb-5">
        <div id="add" />
        <ActionForm action={addReview}>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field label="Customer name"><input name="name" required maxLength={60} className="input" placeholder="e.g. Sarah M." /></Field>
            <Field label="Stars"><select name="rating" defaultValue="5" className="select">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select></Field>
          </div>
          <Field label="What they said"><textarea name="body" required maxLength={1000} rows={2} className="textarea" placeholder="Paste or type the review" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" />Show first on the homepage</label>
          <button className="btn btn-primary btn-sm">Add review</button>
        </ActionForm>
      </Panel>
      <Tabs active={status} tabs={["pending", "published", "hidden", "rejected", "all"].map((s) => ({ key: s, label: `${s} ${s !== "all" ? `(${n(s)})` : ""}`, href: `/admin/reviews?status=${s}` }))} />
      {reviews.length === 0 ? <Empty>Nothing here.</Empty> : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className={i < r.rating ? "fill-mustard text-mustard" : "text-line"} />)}</span>
                  <b>{r.name}</b><span className="text-xs text-ink3">{r.email} · {r.createdAt.toLocaleString()}</span>
                  <StatusBadge s={r.status} />{r.verified && <span className="badge badge-mint">verified</span>}{r.featured && <span className="badge badge-coral">featured</span>}
                </div>
                {r.product && <Link href={`/p/${r.product.slug}`} target="_blank" className="text-xs text-accent">{r.product.name}</Link>}
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="text-sm text-ink2">{r.body}</p>
              <form action={moderateReview} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="reply" />
                <input name="reply" defaultValue={r.reply ?? ""} placeholder="Public reply" className="input !py-1.5" />
                <Submit className="btn btn-soft btn-sm">Reply</Submit>
              </form>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.status !== "published" && btn(r.id, "published", "Publish", "btn btn-primary btn-sm")}
                {r.status !== "hidden" && btn(r.id, "hidden", "Hide")}
                {r.status !== "rejected" && btn(r.id, "rejected", "Reject")}
                {btn(r.id, "feature", r.featured ? "Unfeature" : "Feature on homepage")}
                {btn(r.id, "delete", "Delete", "btn btn-ghost btn-sm text-danger")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
