/* eslint-disable no-console */
// Demo customers and orders for testing — run only with SEED_DEMO=true. Not for production.
// Orders go through the real services so stock, production and the ledger are exercised.
import type { PrismaClient } from "@prisma/client";
import { placeOrder, markPaid, setOrderStatus, refundOrder, advanceProductionJob } from "../lib/services/orders";
import { ACC, postJournal } from "../lib/accounting";
import { rng } from "../lib/designs";

const COUNTRIES = [
  { country: "PK", currency: "PKR", city: "Karachi", pay: "cod" as const },
  { country: "PK", currency: "PKR", city: "Lahore", pay: "card_demo" as const },
  { country: "GB", currency: "GBP", city: "London", pay: "card_demo" as const },
  { country: "US", currency: "USD", city: "Austin", pay: "card_demo" as const },
  { country: "DE", currency: "EUR", city: "Berlin", pay: "card_demo" as const },
  { country: "AE", currency: "AED", city: "Dubai", pay: "card_demo" as const },
];

export async function seedDemo(db: PrismaClient) {
  console.log("Seeding demo orders (SEED_DEMO=true)…");
  const r = rng(42);
  const variants = await db.variant.findMany({ where: { active: true }, include: { product: true } });
  const stock = variants.filter((v) => !v.isDigital && v.onHand > 3 && v.product.type !== "MADE_TO_ORDER");
  const mto = variants.filter((v) => v.product.type === "MADE_TO_ORDER");
  const digital = variants.filter((v) => v.isDigital);
  const admin = await db.staffUser.findFirstOrThrow();

  for (let i = 0; i < 40; i++) {
    const c = COUNTRIES[Math.floor(r() * COUNTRIES.length)];
    const email = `demo.customer${i % 18}@example.com`;
    const customer = await db.customer.upsert({ where: { email }, create: { email, name: `Demo Customer ${i % 18}`, country: c.country }, update: {} });
    const lines = [{ variantId: stock[Math.floor(r() * stock.length)].id, qty: 1 + Math.floor(r() * 2) }];
    if (r() > 0.6) lines.push({ variantId: mto[Math.floor(r() * mto.length)].id, qty: 1 });
    if (r() > 0.7) lines.push({ variantId: digital[Math.floor(r() * digital.length)].id, qty: 1 });
    try {
      const order = await placeOrder({
        idempotencyKey: `demo-${i}`, lines, currency: c.currency, email, name: customer.name!, phone: "+10000000000",
        address: { line1: `${10 + i} Demo Street`, city: c.city, country: c.country, postcode: "00000" },
        paymentMethod: c.pay, customerId: customer.id,
      });
      const created = new Date(Date.now() - (40 - i) * 18 * 3600_000);
      await db.order.update({ where: { id: order.id }, data: { createdAt: created } });
      if (c.pay === "cod") {
        if (r() > 0.3) await setOrderStatus(order.id, "DELIVERED", "Delivered & cash collected", admin.id);
        continue;
      }
      await markPaid(order.id, { provider: "card_demo", providerRef: `demo_${order.id}`, byId: admin.id });
      // backdate demo history so charts and period reports look realistic
      const paidAt = new Date(created.getTime() + 3600_000);
      await db.order.update({ where: { id: order.id }, data: { paidAt } });
      await db.journalEntry.updateMany({ where: { sourceId: order.id }, data: { date: paidAt } });
      await db.orderEvent.updateMany({ where: { orderId: order.id }, data: { at: paidAt } });
      const jobs = await db.productionJob.findMany({ where: { orderItem: { orderId: order.id } } });
      for (const j of jobs) if (r() > 0.4) await advanceProductionJob(j.id, "ready_to_pack", admin.id);
      if (r() > 0.4 && jobs.every(() => true)) await setOrderStatus(order.id, "SHIPPED", undefined, admin.id, { carrier: "DHL", trackingNumber: `JD${100000 + i}` });
      if (i % 13 === 0) {
        const o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
        await refundOrder(order.id, o.total / 2n, { restock: false, reason: "Demo partial refund", byId: admin.id });
      }
    } catch (e) {
      console.warn("demo order skipped:", (e as Error).message);
    }
  }

  // a few expenses
  await db.$transaction(async (tx) => {
    for (const [code, amt, memo] of [[ACC.SOFTWARE, 850000n, "Hosting & domain"], [ACC.MARKETING, 2500000n, "Instagram ads"], [ACC.SHIPPING_COST, 1200000n, "Courier invoices"]] as const) {
      const e = await tx.expense.create({ data: { accountId: (await tx.account.findUniqueOrThrow({ where: { code } })).id, paidFrom: (await tx.account.findUniqueOrThrow({ where: { code: ACC.BANK } })).id, amount: amt, memo } });
      const j = await postJournal(tx, { memo: `Expense: ${memo}`, sourceType: "expense", sourceId: e.id, byId: admin.id, lines: [{ code, debit: amt }, { code: ACC.BANK, credit: amt }] });
      await tx.expense.update({ where: { id: e.id }, data: { entryId: j?.id } });
    }
  });
  console.log(`✔ demo: ${await db.order.count()} orders`);
}
