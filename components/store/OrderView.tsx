import Link from "next/link";
import { Check, Download, Package, Truck } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { DesignArt } from "../DesignArt";

export type OrderFull = Prisma.OrderGetPayload<{
  include: { items: { include: { downloads: true; jobs: true; customDesign: true; variant: { include: { product: true } } } }; events: true };
}>;

const STEPS = [
  { key: "PLACED", label: "Order placed" },
  { key: "PAID", label: "Payment confirmed" },
  { key: "IN_PRODUCTION", label: "Cutting" },
  { key: "QUALITY_CHECK", label: "Quality check" },
  { key: "PACKED", label: "Packed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];
const RANK: Record<string, number> = { PENDING_PAYMENT: 0, CONFIRMED: 1, PAID: 1, IN_PRODUCTION: 2, QUALITY_CHECK: 3, PACKED: 4, SHIPPED: 5, DELIVERED: 6, FULFILLED: 6 };

export async function OrderView({ order, exponent }: { order: OrderFull; exponent: number }) {
  const s = await getSettings();
  const fm = (m: bigint) => formatMoney(m, order.currency, exponent);
  const hasProduction = order.items.some((i) => i.kind === "custom" || i.kind === "made_to_order");
  const digitalOnly = order.items.every((i) => i.kind === "digital");
  const steps = STEPS.filter((st) => (hasProduction || !["IN_PRODUCTION", "QUALITY_CHECK"].includes(st.key)) && (!digitalOnly || ["PLACED", "PAID"].includes(st.key)));
  const rank = RANK[order.status] ?? 0;
  const cancelled = ["CANCELLED", "REFUNDED", "RETURNED"].includes(order.status);
  const shipping = order.shipping as Record<string, string>;
  const photos = order.items.flatMap((i) => i.jobs.filter((j) => j.photoUrl).map((j) => j.photoUrl!));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <div className="card p-6">
          <p className="text-sm text-ink3">Order {order.number}</p>
          <h1 className="mt-1 text-2xl font-bold">
            {cancelled ? `Order ${order.status.toLowerCase().replace("_", " ")}` : order.paymentStatus === "paid" ? (digitalOnly ? "Your files are ready" : "Thank you — your order is confirmed") : order.paymentMethod === "cod" ? "Order confirmed — pay on delivery" : "Awaiting payment"}
          </h1>
          {!cancelled && (
            <ol className="mt-6 space-y-0">
              {steps.map((st, i) => {
                const stepRank = RANK[st.key] ?? 0;
                const inProgress = ["IN_PRODUCTION", "QUALITY_CHECK"].includes(st.key);
                const done = st.key === "PLACED" || rank > stepRank || (rank === stepRank && !inProgress && order.status !== "PENDING_PAYMENT" && order.status !== "CONFIRMED");
                const prevDone = steps.slice(0, i).every((q) => q.key === "PLACED" || rank > (RANK[q.key] ?? 0) || (rank === (RANK[q.key] ?? 0) && !["IN_PRODUCTION", "QUALITY_CHECK"].includes(q.key)));
                const now = !done && prevDone;
                const ev = order.events.find((e) => e.status === st.key);
                return (
                  <li key={st.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < steps.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${done ? "bg-mint" : "bg-line"}`} />}
                    <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full ${done ? "bg-mint text-bg" : now ? "pulse-dot bg-accent" : "border-2 border-line bg-bg"}`}>{done && <Check size={14} />}</span>
                    <div>
                      <p className={`font-semibold ${done || now ? "" : "text-ink3"}`}>{st.label}</p>
                      {ev && <p className="text-xs text-ink3">{ev.at.toLocaleString()} {ev.note && `· ${ev.note}`}</p>}
                      {st.key === "SHIPPED" && order.trackingNumber && <p className="text-sm text-ink2"><Truck size={14} className="mr-1 inline" />{order.carrier} · {order.trackingNumber}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {order.paymentStatus !== "paid" && order.paymentMethod === "bank" && !cancelled && (
          <div className="card border-mustard/50 p-6">
            <h2 className="font-bold">Bank transfer details</h2>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-s2 p-4 font-mono text-sm">{s.payments.bankDetails}</pre>
            <p className="mt-3 text-sm text-ink2">Amount: <b>{fm(order.total)}</b> · Reference: <b>{order.number}</b>. Send your receipt to {s.business.email} or WhatsApp. We hold your items until {order.expiresAt?.toLocaleString() ?? "payment arrives"}.</p>
          </div>
        )}

        {order.items.some((i) => i.downloads.length > 0) && (
          <div className="card p-6">
            <h2 className="mb-3 font-bold">Downloads</h2>
            {order.items.flatMap((i) => i.downloads.map((d) => (
              <a key={d.token} href={`/download/${d.token}`} className="flex items-center justify-between rounded-xl border border-line p-3 hover:border-accent">
                <span className="flex items-center gap-2"><Download size={16} className="text-mint" />{i.name}</span>
                <span className="text-xs text-ink3">{d.remaining} downloads left</span>
              </a>
            )))}
          </div>
        )}

        {photos.length > 0 && (
          <div className="card p-6">
            <h2 className="mb-3 font-bold">Your stencil, before packing</h2>
            <div className="flex gap-3">{photos.map((p) => <img key={p} src={p} alt="Cut stencil photo" className="h-32 w-32 rounded-xl object-cover" />)}</div>
          </div>
        )}
      </div>

      <aside className="card h-fit space-y-4 p-6">
        <h2 className="font-bold">Summary</h2>
        <ul className="space-y-3">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3">
              <div className="art-tile h-12 w-12 shrink-0 rounded-lg p-1 text-accent"><DesignArt svg={i.variant?.product.designSvg ?? i.customDesign?.svg} uid={`ov${i.id}`} /></div>
              <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm">{i.qty} × {i.name}</p></div>
              <span className="text-sm tabular">{fm(i.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-ink2">Subtotal</dt><dd>{fm(order.subtotal)}</dd></div>
          {order.discount > 0n && <div className="flex justify-between text-mint"><dt>Discount</dt><dd>−{fm(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink2">Shipping</dt><dd>{order.shippingFee === 0n ? "Free" : fm(order.shippingFee)}</dd></div>
          {order.tax > 0n && <div className="flex justify-between"><dt className="text-ink2">Tax</dt><dd>{fm(order.tax)}</dd></div>}
          <div className="flex justify-between pt-2 text-base font-bold"><dt>Total</dt><dd>{fm(order.total)}</dd></div>
        </dl>
        {!digitalOnly && (
          <div className="border-t border-line pt-3 text-sm text-ink2">
            <p className="flex items-center gap-2 font-semibold text-ink"><Package size={16} />Ship to</p>
            <p>{order.name}<br />{shipping.line1}{shipping.line2 ? `, ${shipping.line2}` : ""}<br />{shipping.city} {shipping.postcode} · {order.country}</p>
            <p className="mt-1 text-xs text-ink3">{order.shippingMethod}</p>
          </div>
        )}
        <Link href="/shop" className="btn btn-ghost w-full">Continue shopping</Link>
        {order.paymentStatus === "paid" && <Link href={`/reviews/new?order=${order.number}`} className="btn btn-soft w-full">Review your order</Link>}
      </aside>
    </div>
  );
}

export const orderInclude = {
  items: { include: { downloads: true, jobs: true, customDesign: true, variant: { include: { product: true } } } },
  events: { orderBy: { at: "asc" as const } },
};
