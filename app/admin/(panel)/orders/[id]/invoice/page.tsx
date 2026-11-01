import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/admin/PrintButton";

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("orders.view");
  const o = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true } });
  if (!o) notFound();
  const s = await getSettings();
  const fm = (m: bigint) => formatMoney(m, o.currency, 2);
  const ship = o.shipping as Record<string, string>;
  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-[#22242E] print:p-0">
      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>
      <div className="flex justify-between">
        <div><h1 className="text-2xl font-bold">{s.business.name}</h1><p className="text-sm text-gray-600">{s.business.address}<br />{s.business.email}</p></div>
        <div className="text-right"><p className="text-xl font-bold">Invoice</p><p className="font-mono text-sm">{o.number}</p><p className="text-sm text-gray-600">{o.createdAt.toLocaleDateString()}</p></div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
        <div><p className="font-semibold">Bill / ship to</p><p>{o.name}<br />{ship.line1}{ship.line2 && `, ${ship.line2}`}<br />{ship.city} {ship.state} {ship.postcode}<br />{o.country}<br />{o.email} {o.phone}</p></div>
        <div><p className="font-semibold">Payment</p><p>{o.paymentMethod} · {o.paymentStatus}<br />Shipping: {o.shippingMethod}{o.trackingNumber && <><br />Tracking: {o.carrier} {o.trackingNumber}</>}</p></div>
      </div>
      <table className="mt-8 w-full text-sm">
        <thead><tr className="border-b-2 border-gray-300 text-left"><th className="py-2">Item</th><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr></thead>
        <tbody>{o.items.map((i) => <tr key={i.id} className="border-b border-gray-200"><td className="py-2">{i.name}</td><td className="font-mono text-xs">{i.sku}</td><td className="text-right">{i.qty}</td><td className="text-right">{fm(i.unitPrice)}</td><td className="text-right">{fm(i.total)}</td></tr>)}</tbody>
      </table>
      <dl className="ml-auto mt-4 w-64 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{fm(o.subtotal)}</dd></div>
        {o.discount > 0n && <div className="flex justify-between"><dt>Discount</dt><dd>−{fm(o.discount)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping</dt><dd>{fm(o.shippingFee)}</dd></div>
        {o.tax > 0n && <div className="flex justify-between"><dt>{s.tax.label}{s.tax.inclusive ? " (incl.)" : ""}</dt><dd>{fm(o.tax)}</dd></div>}
        <div className="flex justify-between border-t-2 border-gray-300 pt-1 text-base font-bold"><dt>Total ({o.currency})</dt><dd>{fm(o.total)}</dd></div>
      </dl>
      <p className="mt-10 text-center text-xs text-gray-500">Thank you for your order!</p>
    </div>
  );
}
