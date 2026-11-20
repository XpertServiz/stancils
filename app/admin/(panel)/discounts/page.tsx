import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { majorString } from "@/lib/money";
import { getSales, isLive, type SiteSale } from "@/lib/sales";
import { DEPARTMENTS } from "@/lib/landing/defaults";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { deleteSale, saveDiscount, saveSale } from "@/app/admin/actions/crm";

const d = (x: Date | string | null) => (x ? new Date(x).toISOString().slice(0, 16) : "");
type Code = Awaited<ReturnType<typeof db.discountCode.findFirst>>;

function SaleForm({ s, scopes }: { s?: SiteSale; scopes: string[] }) {
  return (
    <>
      <input type="hidden" name="id" value={s?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name of the sale" hint="Customers see this."><input name="name" required maxLength={60} defaultValue={s?.name} placeholder="e.g. Eid Sale" className="input" /></Field>
        <Field label="% off"><input name="percent" required type="number" min={1} max={90} step="0.5" defaultValue={s?.percent ?? 10} className="input" /></Field>
        <Field label="Applies to">
          <select name="scope" defaultValue={s?.scope === "collection" ? s.collection : "all"} className="select">
            <option value="all">Everything on the website</option>
            {scopes.map((c) => <option key={c} value={c}>Only: {c}</option>)}
          </select>
        </Field>
      </div>
      <details className="text-sm" open={!!(s?.startsAt || s?.endsAt)}>
        <summary className="cursor-pointer text-ink3">Set start / end dates (optional)</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label="Starts"><input name="startsAt" type="datetime-local" defaultValue={d(s?.startsAt ?? null)} className="input" /></Field>
          <Field label="Ends"><input name="endsAt" type="datetime-local" defaultValue={d(s?.endsAt ?? null)} className="input" /></Field>
        </div>
      </details>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} />Turned on</label>
      <button className="btn btn-primary btn-sm">{s ? "Save changes" : "Start this sale"}</button>
    </>
  );
}

function CodeForm({ c, base }: { c?: Code; base: string }) {
  return (
    <>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Code customers type" hint="Letters and numbers, e.g. WELCOME10"><input name="code" required defaultValue={c?.code} placeholder="WELCOME10" className="input font-mono uppercase" /></Field>
        <Field label="What it gives">
          <select name="kind" defaultValue={c?.kind ?? "PERCENT"} className="select"><option value="PERCENT">% off the order</option><option value="FIXED">Money off ({base})</option><option value="FREESHIP">Free shipping</option></select>
        </Field>
        <Field label="Amount" hint="10 = 10% or 10 money. Ignored for free shipping."><input name="value" type="number" step="0.01" defaultValue={c?.value ?? 10} className="input" /></Field>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink3">More rules (optional)</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={`Minimum order (${base})`}><input name="min" defaultValue={c ? majorString(c.minSubtotalBase) : ""} className="input" /></Field>
          <Field label="Max times it can be used"><input name="limit" type="number" defaultValue={c?.usageLimit ?? ""} className="input" /></Field>
          <Field label="Starts"><input name="starts" type="datetime-local" defaultValue={d(c?.startsAt ?? null)} className="input" /></Field>
          <Field label="Ends"><input name="ends" type="datetime-local" defaultValue={d(c?.endsAt ?? null)} className="input" /></Field>
        </div>
        <label className="mt-2 flex items-center gap-2"><input type="checkbox" name="first" defaultChecked={c?.firstOrderOnly} />Only for a customer’s first order</label>
      </details>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} />Turned on</label>
      <button className="btn btn-primary btn-sm">{c ? "Save changes" : "Create code"}</button>
    </>
  );
}

const describe = (c: NonNullable<Code>, base: string) => (c.kind === "PERCENT" ? `${c.value}% off` : c.kind === "FIXED" ? `${base} ${c.value} off` : "Free shipping");

export default async function Discounts() {
  await requireStaff("promotions.manage");
  const [codes, sales, collections, { base }] = await Promise.all([
    db.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    getSales(),
    db.collection.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    getCurrencies(),
  ]);
  const scopes = [...new Set([...DEPARTMENTS, ...collections.map((c) => c.name)])];
  return (
    <div className="space-y-8">
      <PageHeader title="Promotions" sub="Two different tools. Use a sale to mark prices down for everyone, or a code to reward people who have it." />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">① Website sale</h2>
            <p className="text-sm text-ink2">Automatic. No code needed — every customer gets it when they check out, and the homepage shows the new prices. Example: “10% off everything this week”.</p>
          </div>
          <Panel title="Start a sale">
            <ActionForm action={saveSale}><SaleForm scopes={scopes} /></ActionForm>
          </Panel>
          {sales.length > 0 && (
            <Panel title="Your sales">
              <ul className="divide-y divide-line/60">
                {sales.map((s) => (
                  <li key={s.id} className="py-3">
                    <details>
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                        <span className="min-w-0 flex-1"><b>{s.name}</b><span className="block text-xs text-ink3">{s.percent}% off · {s.scope === "all" ? "everything" : s.collection}</span></span>
                        {isLive(s) ? <span className="badge badge-mint">Live now</span> : <span className="badge badge-muted">{s.active ? "Scheduled / ended" : "Off"}</span>}
                        <span className="btn btn-soft btn-sm">Edit</span>
                      </summary>
                      <div className="mt-3 rounded-xl border border-line/60 p-4">
                        <ActionForm action={saveSale}><SaleForm s={s} scopes={scopes} /></ActionForm>
                        <form action={deleteSale} className="mt-3"><input type="hidden" name="id" value={s.id} /><button className="btn btn-ghost btn-sm text-danger">Delete sale</button></form>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">② Discount codes</h2>
            <p className="text-sm text-ink2">Customers type the code at checkout. Good for newsletters, influencers and thank-you gifts. Works together with a website sale.</p>
          </div>
          <Panel title="Make a code">
            <ActionForm action={saveDiscount}><CodeForm base={base.code} /></ActionForm>
          </Panel>
          {codes.length > 0 && (
            <Panel title="Your codes">
              <ul className="divide-y divide-line/60">
                {codes.map((c) => (
                  <li key={c.id} className="py-3">
                    <details>
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                        <span className="min-w-0 flex-1"><b className="font-mono">{c.code}</b><span className="block text-xs text-ink3">{describe(c, base.code)} · used {c.used}×</span></span>
                        <span className={`badge ${c.active ? "badge-mint" : "badge-muted"}`}>{c.active ? "On" : "Off"}</span>
                        <span className="btn btn-soft btn-sm">Edit</span>
                      </summary>
                      <div className="mt-3 rounded-xl border border-line/60 p-4"><ActionForm action={saveDiscount}><CodeForm c={c} base={base.code} /></ActionForm></div>
                    </details>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </section>
      </div>
    </div>
  );
}
