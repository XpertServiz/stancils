import type { Metadata } from "next";
import { db } from "@/lib/db";
import { OrderView, orderInclude } from "@/components/store/OrderView";

export const metadata: Metadata = { title: "Track your order", description: "Track your Creative Corner order — production, shipping and delivery.", alternates: { canonical: "/track" } };

export default async function Track({ searchParams }: { searchParams: Promise<{ order?: string; email?: string }> }) {
  const sp = await searchParams;
  const number = sp.order?.trim().toUpperCase();
  const email = sp.email?.trim().toLowerCase();
  const order = number && email ? await db.order.findFirst({ where: { number, email }, include: orderInclude }) : null;
  const cur = order ? await db.currency.findUnique({ where: { code: order.currency } }) : null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">Track your order</h1>
      <form className="card mb-8 grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto]">
        <input name="order" defaultValue={sp.order} placeholder="Order number (CC-…)" className="input" required aria-label="Order number" />
        <input name="email" type="email" defaultValue={sp.email} placeholder="Email used at checkout" className="input" required aria-label="Email" />
        <button className="btn btn-primary">Track</button>
      </form>
      {number && email && !order && <p className="text-danger">We couldn&apos;t find that order. Check the number and email.</p>}
      {order && <OrderView order={order} exponent={cur?.exponent ?? 2} />}
    </div>
  );
}
