import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatMoney, majorString } from "@/lib/money";
import { orderToken } from "@/lib/tokens";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { DesignArt } from "@/components/DesignArt";
import { addNote, refund, updateStatus, verifyPayment } from "@/app/admin/actions/orders";

const NEXT: Record<string, string[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  CONFIRMED: ["PACKED", "SHIPPED", "DELIVERED", "CANCELLED"],
  PAID: ["PACKED", "SHIPPED"],
  IN_PRODUCTION: ["QUALITY_CHECK", "PACKED"],
  QUALITY_CHECK: ["PACKED", "SHIPPED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
};

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("orders.view");
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { include: { product: true } }, customDesign: { include: { material: true } }, jobs: true, downloads: true } },
      events: { orderBy: { at: "desc" } },
      payments: true,
      refunds: true,
      customer: true,
    },
  });
  if (!o) notFound();
  const cur = await db.currency.findUnique({ where: { code: o.currency } });
  const exp = cur?.exponent ?? 2;
  const fm = (m: bigint) => formatMoney(m, o.currency, exp);
  const journals = await db.journalEntry.findMany({ where: { OR: [{ sourceId: o.id }, { sourceId: { in: o.refunds.map((r) => r.id) } }, { sourceId: { in: o.items.flatMap((i) => i.jobs.map((j) => j.id)) } }] }, include: { lines: { include: { account: true } } }, orderBy: { number: "asc" } });
  const refunded = o.refunds.reduce((a, r) => a + r.amount, 0n);
  const ship = o.shipping as Record<string, string>;
  const can = (p: string) => staff.perms.has(p);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${o.number}`}
        sub={<>{o.createdAt.toLocaleString()} · <StatusBadge s={o.status} /> <StatusBadge s={o.paymentStatus} /> · {o.currency} @ {o.fxRate.toPrecision(5)} per base unit</>}
        actions={<>
          <Link href={`/admin/orders/${o.id}/invoice`} className="btn btn-ghost btn-sm"><Printer size={15} />Invoice / packing slip</Link>
          <Link href={`/order/${o.number}?t=${orderToken(o.id)}`} target="_blank" className="btn btn-ghost btn-sm">Customer view</Link>
        </>}
      />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items">
            <table className="tbl">
              <thead><tr><th /><th>Item</th><th>Kind</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Total</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td className="w-14"><div className="art-tile h-12 w-12 rounded-lg p-1 text-accent"><DesignArt svg={i.variant?.product.designSvg ?? i.customDesign?.svg} uid={`ao${i.id}`} /></div></td>
                    <td>
                      <div className="font-medium">{i.variant ? <Link className="hover:text-accent" href={`/admin/products/${i.variant.productId}`}>{i.name}</Link> : i.name}</div>
                      <div className="font-mono text-xs text-ink3">{i.sku}</div>
                      {i.customDesign && <div className="text-xs text-ink3">{i.customDesign.material.name} · {i.customDesign.islands} islands / {i.customDesign.bridges} bridges · <StatusBadge s={i.customDesign.status} /> {i.customDesign.flags.map((f) => <span key={f} className="badge badge-mustard ml-1">{f}</span>)} <a className="ml-2 text-accent" href={`/admin/export/design/${i.customDesign.id}`}>Cut file (SVG)</a></div>}
                      {i.jobs.length > 0 && <div className="mt-1 flex gap-1">{i.jobs.map((j) => <StatusBadge key={j.id} s={j.status} />)}</div>}
                    </td>
                    <td><span className="badge badge-muted">{i.kind}</span></td>
                    <td className="num">{i.qty}</td>
                    <td className="num">{fm(i.unitPrice)}</td>
                    <td className="num">{fm(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-ink2">Subtotal</dt><dd>{fm(o.subtotal)}</dd></div>
              {o.discount > 0n && <div className="flex justify-between"><dt className="text-ink2">Discount {o.discountCode && `(${o.discountCode})`}</dt><dd>−{fm(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink2">Shipping ({o.shippingMethod})</dt><dd>{fm(o.shippingFee)}</dd></div>
              {o.tax > 0n && <div className="flex justify-between"><dt className="text-ink2">Tax</dt><dd>{fm(o.tax)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>Total</dt><dd>{fm(o.total)}</dd></div>
              {refunded > 0n && <div className="flex justify-between text-danger"><dt>Refunded</dt><dd>−{fm(refunded)}</dd></div>}
              <div className="flex justify-between text-xs text-ink3"><dt>In base currency</dt><dd>{majorString(o.totalBase)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Ledger entries">
            {journals.length === 0 ? <p className="text-sm text-ink3">Nothing posted yet — journals post when payment is received.</p> : journals.map((j) => (
              <div key={j.id} className="mb-3">
                <p className="text-sm font-semibold"><Link href={`/admin/accounts?entry=${j.id}`} className="hover:text-accent">#{j.number}</Link> · {j.memo} <span className="text-xs text-ink3">{j.date.toLocaleString()}</span></p>
                <table className="tbl mt-1"><tbody>{j.lines.map((l) => <tr key={l.id}><td className="text-ink2">{l.account.code} {l.account.name}</td><td className="num">{l.debit ? majorString(l.debit) : ""}</td><td className="num">{l.credit ? majorString(l.credit) : ""}</td></tr>)}</tbody></table>
              </div>
            ))}
          </Panel>

          <Panel title="Timeline">
            <ul className="space-y-2 text-sm">
              {o.events.map((e) => <li key={e.id} className="flex gap-3"><span className="w-40 shrink-0 text-xs text-ink3">{e.at.toLocaleString()}</span><span><b>{e.status.replace(/_/g, " ").toLowerCase()}</b>{e.note && ` — ${e.note}`}{!e.public && <span className="badge badge-muted ml-2">internal</span>}</span></li>)}
            </ul>
            {can("orders.manage") && (
              <ActionForm action={addNote} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={o.id} />
                <input name="note" required placeholder="Add a note" className="input flex-1" />
                <label className="flex items-center gap-1 text-xs text-ink2"><input type="checkbox" name="public" />Show to customer</label>
                <button className="btn btn-soft btn-sm">Add</button>
              </ActionForm>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-semibold">{o.name}</p>
            <p className="text-sm text-ink2"><a href={`mailto:${o.email}`} className="hover:text-accent">{o.email}</a>{o.phone && <> · <a href={`https://wa.me/${o.phone.replace(/\D/g, "")}`} className="hover:text-accent">{o.phone}</a></>}</p>
            <p className="mt-2 text-sm text-ink2">{ship.line1}{ship.line2 && `, ${ship.line2}`}<br />{ship.city} {ship.state} {ship.postcode}<br />{o.country}</p>
            {o.notes && <p className="mt-2 rounded-lg bg-s2 p-2 text-sm">“{o.notes}”</p>}
            {o.customer && <Link href={`/admin/customers?q=${o.email}`} className="mt-2 inline-block text-sm text-accent">Customer profile →</Link>}
          </Panel>

          {o.paymentStatus === "unpaid" && o.status !== "CANCELLED" && can("orders.verify_payment") && (
            <Panel title="Record payment">
              <ActionForm action={verifyPayment}>
                <input type="hidden" name="id" value={o.id} />
                <select name="provider" defaultValue={o.paymentMethod === "cod" ? "cod" : "bank"} className="select"><option value="bank">Bank transfer</option><option value="cod">Cash on delivery (courier)</option><option value="manual">Other / manual</option></select>
                <input name="ref" placeholder="Bank / courier reference" className="input" />
                <button className="btn btn-primary w-full">Mark as paid · {fm(o.total)}</button>
              </ActionForm>
            </Panel>
          )}

          {can("orders.manage") && (NEXT[o.status]?.length ?? 0) > 0 && (
            <Panel title="Fulfilment">
              <ActionForm action={updateStatus}>
                <input type="hidden" name="id" value={o.id} />
                <select name="status" className="select">{NEXT[o.status].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}</select>
                <div className="grid grid-cols-2 gap-2">
                  <input name="carrier" defaultValue={o.carrier ?? ""} placeholder="Carrier (DHL, TCS…)" className="input" />
                  <input name="tracking" defaultValue={o.trackingNumber ?? ""} placeholder="Tracking number" className="input" />
                </div>
                <input name="note" placeholder="Note (optional, shown to customer)" className="input" />
                <button className="btn btn-primary w-full">Update status</button>
              </ActionForm>
            </Panel>
          )}

          {can("orders.refund") && ["paid", "partial_refund"].includes(o.paymentStatus) && (
            <Panel title="Refund">
              <ActionForm action={refund} confirm="Post this refund to the ledger?">
                <input type="hidden" name="id" value={o.id} />
                <label className="block"><span className="label">Amount ({o.currency})</span><input name="amount" defaultValue={majorString(o.total - refunded, exp)} className="input" inputMode="decimal" /></label>
                <input name="reason" placeholder="Reason" className="input" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" />Return stock items to inventory</label>
                <button className="btn btn-danger w-full">Issue refund</button>
              </ActionForm>
            </Panel>
          )}

          <Panel title="Payments">
            {o.payments.length === 0 ? <p className="text-sm text-ink3">None yet.</p> : <ul className="space-y-1 text-sm">{o.payments.map((p) => <li key={p.id} className="flex justify-between"><span>{p.provider} <span className="font-mono text-xs text-ink3">{p.providerRef}</span></span><span>{formatMoney(p.amount, p.currency, exp)}</span></li>)}</ul>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
