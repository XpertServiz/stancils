"use server";
// Danger zone: owner-only resets. Journal lines are immutable by trigger, but TRUNCATE bypasses
// row triggers, so a reset clears the whole ledger and re-posts opening balances from what is kept.
import { clearMemo } from "@/lib/memo";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ACC, postJournal } from "@/lib/accounting";

type R = { ok: boolean; msg: string } | null;

const TRANSACTION_TABLES = [
  "JournalLine", "JournalEntry", "StockMovement", "Download", "ProductionJob", "Refund", "Payment", "OrderEvent", "OrderItem", "Order",
  "CustomDesign", "WishlistItem", "BusinessAccount", "Customer", "Review", "Inquiry", "Subscriber", "Alert", "BusinessDay", "PeriodLock",
  "GatewayPayout", "Expense", "WebhookEvent", "PurchaseLine", "PurchaseOrder",
];

async function requireOwner() {
  const s = await requirePermission("settings.manage");
  if (s.role !== "super_admin") throw new Error("Only the owner (Super Admin) can reset data.");
  return s;
}

/** Re-create opening stock movements and one opening journal from the stock and assets that remain. */
async function postOpeningBalances(byId: string) {
  const [variants, materials, assets] = await Promise.all([
    db.variant.findMany({ where: { onHand: { gt: 0 }, isDigital: false } }),
    db.material.findMany({ where: { onHand: { gt: 0 } } }),
    db.fixedAsset.findMany(),
  ]);
  await db.$transaction(async (tx) => {
    let fg = 0n;
    let raw = 0n;
    for (const v of variants) {
      await tx.stockMovement.create({ data: { variantId: v.id, qty: v.onHand, unitCost: v.avgCost, type: "OPENING", note: "Opening balance after reset", byId } });
      fg += v.avgCost * BigInt(v.onHand);
    }
    for (const m of materials) {
      await tx.stockMovement.create({ data: { materialId: m.id, qty: m.onHand, unitCost: m.costPerK, type: "OPENING", note: "Opening balance after reset", byId } });
      raw += (BigInt(m.onHand) * m.costPerK) / 1000n;
    }
    const fa = assets.reduce((a, x) => a + x.cost, 0n);
    const total = fg + raw + fa;
    if (total > 0n) {
      await postJournal(tx, {
        memo: "Opening balances after data reset",
        sourceType: "opening",
        byId,
        lines: [{ code: ACC.INV_FINISHED, debit: fg }, { code: ACC.INV_RAW, debit: raw }, { code: ACC.FIXED_ASSETS, debit: fa }, { code: ACC.CAPITAL, credit: total }],
      });
    }
  }, { timeout: 120_000 });
}

/** Removes all orders, customers, payments, accounting entries and messages. Keeps products, stock levels, settings, content and staff. */
export async function resetTransactions(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requireOwner();
    if (String(fd.get("confirm")).trim().toUpperCase() !== "RESET") return { ok: false, msg: 'Type RESET to confirm.' };
    const counts = { orders: await db.order.count(), customers: await db.customer.count(), journals: await db.journalEntry.count() };
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${TRANSACTION_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
    await db.variant.updateMany({ data: { reserved: 0 } });
    await db.product.updateMany({ data: { salesCount: 0, ratingAvg: 0, ratingCount: 0 } });
    await db.discountCode.updateMany({ data: { used: 0 } });
    await db.fixedAsset.updateMany({ data: { depreciated: 0n, lastRunMonth: null } });
    await postOpeningBalances(s.id);
    await audit(s.id, "data.reset_transactions", "system", null, counts);
    clearMemo(); revalidatePath("/", "layout");
    return { ok: true, msg: `Cleared ${counts.orders} orders, ${counts.customers} customers and ${counts.journals} journal entries. Products, stock, settings and staff were kept; opening balances were re-posted.` };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** Removes every product, variant and import batch too (after clearing transactions). Collections, materials, settings, content and staff stay. */
export async function deleteCatalogue(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requireOwner();
    if (String(fd.get("confirm")).trim().toUpperCase() !== "DELETE ALL") return { ok: false, msg: 'Type DELETE ALL to confirm.' };
    const products = await db.product.count();
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${TRANSACTION_TABLES.map((t) => `"${t}"`).join(", ")}, "VariantPrice", "BomLine", "ProductImage", "ProductCollection", "Variant", "Product", "ImportBatch" RESTART IDENTITY CASCADE`);
    await db.projectStory.updateMany({ data: { productSlugs: [] } });
    await db.discountCode.updateMany({ data: { used: 0 } });
    await db.fixedAsset.updateMany({ data: { depreciated: 0n, lastRunMonth: null } });
    await postOpeningBalances(s.id);
    await audit(s.id, "data.delete_catalogue", "system", null, { products });
    clearMemo(); revalidatePath("/", "layout");
    return { ok: true, msg: `Deleted all ${products} products along with all orders and accounting entries. Raw materials, settings, content and staff were kept.` };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/**
 * Switch the store's base (accounting) currency to US dollars: every base-currency amount (prices, costs, shipping rates,
 * credit limits, studio fees …) is multiplied by the stored PKR→USD rate, all exchange rates are re-based, then the ledger is
 * cleared and opening balances are re-posted in dollars. Refuses to run if any order exists (those would need converting too).
 * DECISION: owner-only and typed-confirmation, because it rewrites money columns; the data changes run in ONE transaction.
 */
export async function switchBaseToUsd(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requireOwner();
    if (String(fd.get("confirm")).trim().toUpperCase() !== "USD") return { ok: false, msg: "Type USD to confirm." };
    const [base, usd, orders] = await Promise.all([db.currency.findFirst({ where: { isBase: true } }), db.currency.findUnique({ where: { code: "USD" } }), db.order.count()]);
    if (!base || !usd) return { ok: false, msg: "Currencies are not set up (USD is missing)." };
    if (base.code === "USD") return { ok: true, msg: "The base currency is already USD." };
    if (orders > 0) return { ok: false, msg: `There are ${orders} orders. Clear the test orders first (Clear test transactions), or ask your developer to migrate real orders.` };
    if (base.exponent !== usd.exponent) return { ok: false, msg: "The currencies use different decimal places; this switch needs a developer." };
    const f = usd.rate; // USD per 1 unit of the old base
    if (!(f > 0)) return { ok: false, msg: "The USD exchange rate is missing. Set it in Settings → Currencies first." };
    const conv = (table: string, cols: string[]) => cols.map((c) => `UPDATE "${table}" SET "${c}" = ROUND("${c}" * $1::numeric) WHERE "${c}" IS NOT NULL`);
    const sql = [
      ...conv("ShippingRate", ["priceBase", "freeOverBase"]), ...conv("BusinessAccount", ["creditLimit"]), ...conv("Material", ["costPerK", "rateCm2Base"]),
      ...conv("Variant", ["basePrice", "compareAt", "avgCost"]), ...conv("CustomDesign", ["priceBase"]), ...conv("DiscountCode", ["minSubtotalBase"]),
      ...conv("FixedAsset", ["cost", "salvage"]),
    ];
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${TRANSACTION_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
      for (const q of sql) await tx.$executeRawUnsafe(q, f);
      for (const c of await tx.currency.findMany()) await tx.currency.update({ where: { code: c.code }, data: { rate: c.code === "USD" ? 1 : c.rate / f, isBase: c.code === "USD", ...(c.code === "USD" ? { rounding: "NONE", enabled: true } : {}) } });
      await tx.variant.updateMany({ data: { reserved: 0 } });
      await tx.product.updateMany({ data: { salesCount: 0, ratingAvg: 0, ratingCount: 0 } });
      await tx.discountCode.updateMany({ data: { used: 0 } });
      await tx.fixedAsset.updateMany({ data: { depreciated: 0n, lastRunMonth: null } });
      const row = await tx.setting.findUnique({ where: { key: "studio" } });
      if (row) {
        const v = row.value as Record<string, number>;
        const next = { ...v };
        for (const k of ["baseFeeBase", "complexityPerMeterBase", "setupFeeBase"]) if (typeof v[k] === "number") next[k] = Math.round(v[k] * f);
        await tx.setting.update({ where: { key: "studio" }, data: { value: next } });
      }
    }, { timeout: 120_000 });
    await postOpeningBalances(s.id);
    await audit(s.id, "data.switch_base_usd", "system", null, { from: base.code, factor: f });
    clearMemo(); revalidatePath("/", "layout"); revalidatePath("/admin", "layout");
    return { ok: true, msg: `Done. The base currency is now USD (was ${base.code}). Prices and costs were converted at ${f}. Open Settings → Currencies and refresh the exchange rates, and check your prices.` };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}
