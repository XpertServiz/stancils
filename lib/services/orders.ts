import { randomBytes } from "crypto";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db, type Tx } from "../db";
import { ACC, postJournal, type JLine } from "../accounting";
import { convertMinor, toBaseMinor, type CurrencyInfo } from "../money";
import { getCurrencies, getSettings, toInfo } from "../settings";
import { variantPrice } from "./pricing";
import { moveVariant, moveMaterial } from "./inventory";
import { sendOrderEmail } from "../email";

export type CartLineInput = { variantId?: string; customDesignId?: string; qty: number };

export type QuotedLine = {
  key: string;
  variantId?: string;
  customDesignId?: string;
  productId?: string;
  slug?: string;
  name: string;
  variantName: string;
  sku: string;
  kind: "stock" | "made_to_order" | "custom" | "digital" | "tool";
  qty: number;
  unitPrice: bigint;
  total: bigint;
  available: number | null;
  designSvg?: string | null;
  error?: string;
};

export type Quote = {
  currency: CurrencyInfo;
  base: CurrencyInfo;
  lines: QuotedLine[];
  subtotal: bigint;
  discount: bigint;
  discountLabel?: string;
  discountError?: string;
  shippingOptions: { id: string; name: string; price: bigint; days: string }[];
  shippingId?: string;
  shippingFee: bigint;
  tax: bigint;
  taxInclusive: boolean;
  total: bigint;
  needsShipping: boolean;
  freeShippingThreshold: bigint | null;
  errors: string[];
};

const KIND_BY_TYPE: Record<string, QuotedLine["kind"]> = {
  STOCK_PHYSICAL: "stock",
  MADE_TO_ORDER: "made_to_order",
  DIGITAL: "digital",
  BUNDLE: "stock",
  TOOL: "tool",
};

export async function quoteCart(input: {
  lines: CartLineInput[];
  currency: string;
  country: string;
  discountCode?: string | null;
  shippingId?: string | null;
  email?: string | null;
  businessDiscountPct?: number;
}): Promise<Quote> {
  const { list, base: baseRow } = await getCurrencies();
  const curRow = list.find((c) => c.code === input.currency && c.enabled) ?? baseRow;
  const cur = toInfo(curRow);
  const base = toInfo(baseRow);
  const settings = await getSettings();
  const errors: string[] = [];

  const variantIds = input.lines.filter((l) => l.variantId).map((l) => l.variantId!);
  const designIds = input.lines.filter((l) => l.customDesignId).map((l) => l.customDesignId!);
  const [variants, designs] = await Promise.all([
    db.variant.findMany({ where: { id: { in: variantIds } }, include: { product: true, prices: true } }),
    db.customDesign.findMany({ where: { id: { in: designIds } }, include: { material: true } }),
  ]);

  const lines: QuotedLine[] = [];
  for (const l of input.lines) {
    const qty = Math.max(1, Math.min(999, Math.floor(l.qty || 1)));
    if (l.variantId) {
      const v = variants.find((x) => x.id === l.variantId);
      if (!v || !v.active || v.product.status !== "ACTIVE") {
        errors.push("An item in your cart is no longer available and was removed.");
        continue;
      }
      const kind = v.isDigital ? "digital" : KIND_BY_TYPE[v.product.type] ?? "stock";
      const { price } = variantPrice(v, cur, base);
      const tracks = kind === "stock" || kind === "tool";
      const available = tracks ? Math.max(0, v.onHand - v.reserved) : null;
      const line: QuotedLine = {
        key: `v:${v.id}`, variantId: v.id, productId: v.productId, slug: v.product.slug, name: v.product.name,
        variantName: v.name, sku: v.sku, kind, qty, unitPrice: price, total: price * BigInt(qty), available,
        designSvg: v.product.designSvg,
      };
      if (tracks && available !== null && qty > available) line.error = available === 0 ? "Out of stock" : `Only ${available} left`;
      lines.push(line);
    } else if (l.customDesignId) {
      const d = designs.find((x) => x.id === l.customDesignId);
      if (!d) continue;
      const price = convertMinor(d.priceBase, base, cur, "price");
      lines.push({
        key: `d:${d.id}`, customDesignId: d.id, name: d.name, variantName: `${d.widthMm}×${d.heightMm} mm · ${d.material.name}`,
        sku: `CUSTOM-${d.id.slice(-6).toUpperCase()}`, kind: "custom", qty, unitPrice: price, total: price * BigInt(qty),
        available: null, designSvg: d.svg,
      });
    }
  }
  lines.forEach((l) => l.error && errors.push(`${l.name}: ${l.error}`));

  const subtotal = lines.reduce((a, l) => a + l.total, 0n);
  const subtotalBase = toBaseMinor(subtotal, cur.exponent, cur.rate, base.exponent);
  const needsShipping = lines.some((l) => l.kind !== "digital");

  // discounts
  let discount = 0n;
  let discountLabel: string | undefined;
  let discountError: string | undefined;
  let freeShip = false;
  if (input.discountCode) {
    const code = await db.discountCode.findUnique({ where: { code: input.discountCode.trim().toUpperCase() } });
    const now = new Date();
    if (!code || !code.active) discountError = "That code isn't valid.";
    else if (code.startsAt && code.startsAt > now) discountError = "That code isn't active yet.";
    else if (code.endsAt && code.endsAt < now) discountError = "That code has expired.";
    else if (code.usageLimit !== null && code.used >= code.usageLimit) discountError = "That code has been fully used.";
    else if (subtotalBase < code.minSubtotalBase) discountError = `Spend ${formatThreshold(code.minSubtotalBase, base, cur)} to use this code.`;
    else if (code.firstOrderOnly && input.email && (await db.order.count({ where: { email: input.email.toLowerCase(), paymentStatus: "paid" } })) > 0)
      discountError = "This code is for first orders only.";
    else {
      if (code.kind === "PERCENT") discount = (subtotal * BigInt(Math.round(code.value * 100))) / 10000n;
      if (code.kind === "FIXED") discount = convertMinor(BigInt(Math.round(code.value * 10 ** base.exponent)), base, cur);
      if (code.kind === "FREESHIP") freeShip = true;
      discountLabel = code.code;
    }
  }
  if (input.businessDiscountPct && input.businessDiscountPct > 0) {
    discount += (subtotal * BigInt(Math.round(input.businessDiscountPct * 100))) / 10000n;
    discountLabel = discountLabel ? `${discountLabel} + Business` : "Business pricing";
  }
  if (discount > subtotal) discount = subtotal;

  // shipping
  let shippingOptions: Quote["shippingOptions"] = [];
  let freeShippingThreshold: bigint | null = null;
  if (needsShipping) {
    const zones = await db.shippingZone.findMany({ include: { rates: { where: { active: true } } }, orderBy: { sort: "asc" } });
    const zone = zones.find((z) => z.countries.includes(input.country)) ?? zones.find((z) => z.countries.includes("*"));
    if (!zone) errors.push(`We don't ship to ${input.country} yet — contact us for a quote.`);
    else {
      shippingOptions = zone.rates.map((r) => {
        const free = freeShip || (r.freeOverBase !== null && subtotalBase >= r.freeOverBase);
        if (r.freeOverBase !== null) freeShippingThreshold = convertMinor(r.freeOverBase, base, cur);
        return { id: r.id, name: r.name, price: free ? 0n : convertMinor(r.priceBase, base, cur), days: `${r.minDays}–${r.maxDays} business days` };
      });
    }
  }
  const selected = shippingOptions.find((o) => o.id === input.shippingId) ?? shippingOptions[0];
  const shippingFee = selected?.price ?? 0n;

  // tax
  const rate = settings.tax.ratePct / 100;
  const taxable = subtotal - discount;
  const tax = rate > 0 ? (settings.tax.inclusive ? BigInt(Math.round(Number(taxable) - Number(taxable) / (1 + rate))) : BigInt(Math.round(Number(taxable) * rate))) : 0n;
  const total = taxable + shippingFee + (settings.tax.inclusive ? 0n : tax);

  return {
    currency: cur, base, lines, subtotal, discount, discountLabel, discountError, shippingOptions, shippingId: selected?.id,
    shippingFee, tax, taxInclusive: settings.tax.inclusive, total, needsShipping, freeShippingThreshold, errors,
  };
}

function formatThreshold(baseMinor: bigint, base: CurrencyInfo, cur: CurrencyInfo) {
  const v = convertMinor(baseMinor, base, cur);
  return `${cur.symbol}${(Number(v) / 10 ** cur.exponent).toFixed(cur.exponent)}`;
}

export function newOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `CC-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export type PlaceOrderInput = {
  idempotencyKey: string;
  lines: CartLineInput[];
  currency: string;
  email: string;
  name: string;
  phone?: string;
  address: { line1: string; line2?: string; city: string; state?: string; postcode?: string; country: string };
  shippingId?: string;
  discountCode?: string;
  paymentMethod: "card_demo" | "stripe" | "paypal" | "bank" | "cod" | "b2b_terms";
  notes?: string;
  customerId?: string | null;
  businessDiscountPct?: number;
};

export async function placeOrder(input: PlaceOrderInput) {
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;

  const q = await quoteCart({
    lines: input.lines, currency: input.currency, country: input.address.country, discountCode: input.discountCode,
    shippingId: input.shippingId, email: input.email, businessDiscountPct: input.businessDiscountPct,
  });
  if (q.lines.length === 0) throw new Error("Your cart is empty.");
  if (q.errors.length) throw new Error(q.errors.join(" "));
  const settings = await getSettings();
  const totalBase = toBaseMinor(q.total, q.currency.exponent, q.currency.rate, q.base.exponent);
  const expiresAt = ["bank"].includes(input.paymentMethod) ? new Date(Date.now() + settings.orders.expiryHours * 3600_000) : null;

  return db.$transaction(async (tx) => {
    // reserve stock atomically
    for (const l of q.lines) {
      if ((l.kind === "stock" || l.kind === "tool") && l.variantId) {
        const n = await tx.$executeRaw`UPDATE "Variant" SET reserved = reserved + ${l.qty} WHERE id = ${l.variantId} AND "onHand" - reserved >= ${l.qty}`;
        if (n !== 1) throw new Error(`${l.name} just sold out — please update your cart.`);
      }
    }
    const shippingName = q.shippingOptions.find((o) => o.id === q.shippingId)?.name;
    const order = await tx.order.create({
      data: {
        number: newOrderNumber(),
        idempotencyKey: input.idempotencyKey,
        customerId: input.customerId ?? null,
        email: input.email.toLowerCase().trim(),
        name: input.name.trim(),
        phone: input.phone,
        shipping: input.address as unknown as Prisma.InputJsonValue,
        country: input.address.country,
        currency: q.currency.code,
        fxRate: q.currency.rate,
        subtotal: q.subtotal,
        discount: q.discount,
        shippingFee: q.shippingFee,
        tax: q.tax,
        total: q.total,
        totalBase,
        status: input.paymentMethod === "cod" || input.paymentMethod === "b2b_terms" ? "CONFIRMED" : "PENDING_PAYMENT",
        paymentMethod: input.paymentMethod,
        shippingMethod: q.needsShipping ? shippingName : "Digital delivery",
        discountCode: q.discountLabel,
        notes: input.notes,
        expiresAt,
        items: {
          create: q.lines.map((l) => ({
            productId: l.productId, variantId: l.variantId, customDesignId: l.customDesignId, kind: l.kind,
            name: l.name + (l.variantName ? ` — ${l.variantName}` : ""), sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, total: l.total,
          })),
        },
        events: { create: { status: "PLACED", note: `Order placed (${input.paymentMethod})` } },
      },
      include: { items: true },
    });
    if (q.discountLabel && input.discountCode) {
      await tx.discountCode.updateMany({ where: { code: input.discountCode.trim().toUpperCase() }, data: { used: { increment: 1 } } });
    }
    for (const l of q.lines) if (l.customDesignId) await tx.customDesign.update({ where: { id: l.customDesignId }, data: { status: "locked" } });
    if (input.paymentMethod === "b2b_terms") await recordPayment(tx, order.id, { provider: "b2b_terms", amount: order.total, byId: null });
    return order;
  });
}

const CLEARING: Record<string, number> = {
  stripe: ACC.CLEARING_STRIPE,
  paypal: ACC.CLEARING_PAYPAL,
  card_demo: ACC.CLEARING_CARD,
  bank: ACC.BANK,
  cod: ACC.COD_RECEIVABLE,
  b2b_terms: ACC.AR_B2B,
  manual: ACC.BANK,
};

const REVENUE: Record<string, number> = {
  stock: ACC.SALES_STENCILS,
  made_to_order: ACC.SALES_STENCILS,
  custom: ACC.SALES_CUSTOM,
  digital: ACC.SALES_DIGITAL,
  tool: ACC.SALES_TOOLS,
};

/** Idempotent: records payment, moves stock, posts the sale journal, creates production jobs & downloads. */
export async function markPaid(orderId: string, p: { provider: string; providerRef?: string; amount?: bigint; byId?: string | null }) {
  const result = await db.$transaction(async (tx) => recordPayment(tx, orderId, p), { timeout: 30000 });
  if (result.newlyPaid) await sendOrderEmail(orderId, "paid").catch(() => {});
  return result;
}

async function recordPayment(tx: Tx, orderId: string, p: { provider: string; providerRef?: string; amount?: bigint; byId?: string | null }) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { product: true, bom: true } }, customDesign: true } } },
  });
  if (order.paymentStatus === "paid") return { order, newlyPaid: false };
  if (order.status === "CANCELLED") throw new Error("Order was cancelled");
  if (p.providerRef) {
    const dupe = await tx.payment.findUnique({ where: { providerRef: p.providerRef } });
    if (dupe) return { order, newlyPaid: false };
  }
  const { base: baseRow, list } = await getCurrencies();
  const cur = list.find((c) => c.code === order.currency) ?? baseRow;
  const toBase = (m: bigint) => toBaseMinor(m, cur.exponent, order.fxRate, baseRow.exponent);

  await tx.payment.create({
    data: { orderId, provider: p.provider, providerRef: p.providerRef ?? null, amount: p.amount ?? order.total, currency: order.currency, status: "succeeded" },
  });

  // ── stock & COGS ──
  const lines: JLine[] = [];
  let cogs = 0n;
  for (const it of order.items) {
    if ((it.kind === "stock" || it.kind === "tool") && it.variantId) {
      await tx.variant.update({ where: { id: it.variantId }, data: { reserved: { decrement: it.qty } } });
      const { unitCost } = await moveVariant(tx, it.variantId, -it.qty, "SALE", null, { refType: "order", refId: order.id, byId: p.byId });
      await tx.orderItem.update({ where: { id: it.id }, data: { unitCostBase: unitCost } });
      cogs += unitCost * BigInt(it.qty);
    }
    if (it.kind === "made_to_order" || it.kind === "custom") {
      for (let i = 0; i < it.qty; i++) await tx.productionJob.create({ data: { orderItemId: it.id } });
    }
    if (it.kind === "digital") {
      await tx.download.create({ data: { token: randomBytes(18).toString("base64url"), orderItemId: it.id, remaining: 5, expiresAt: new Date(Date.now() + 30 * 86400_000) } });
    }
    if (it.variant) await tx.product.update({ where: { id: it.variant.productId }, data: { salesCount: { increment: it.qty } } });
  }
  if (cogs > 0n) lines.push({ code: ACC.COGS, debit: cogs, memo: "Cost of goods shipped from stock" }, { code: ACC.INV_FINISHED, credit: cogs });

  // ── revenue ──
  const totalBase = order.totalBase;
  const discountBase = toBase(order.discount);
  const shippingBase = toBase(order.shippingFee);
  const settings = await getSettings();
  const taxBase = toBase(order.tax);
  const revByCode = new Map<number, bigint>();
  for (const it of order.items) {
    const code = REVENUE[it.kind] ?? ACC.SALES_STENCILS;
    revByCode.set(code, (revByCode.get(code) ?? 0n) + toBase(it.total));
  }
  if (settings.tax.inclusive && taxBase > 0n) {
    // carve tax out of the largest revenue bucket
    const [code, amt] = [...revByCode.entries()].sort((a, b) => Number(b[1] - a[1]))[0];
    revByCode.set(code, amt - taxBase);
  }
  const debitTotal = totalBase + discountBase;
  let creditTotal = [...revByCode.values()].reduce((a, b) => a + b, 0n) + shippingBase + taxBase;
  if (creditTotal !== debitTotal) {
    // FX rounding: settle on the largest revenue line
    const [code, amt] = [...revByCode.entries()].sort((a, b) => Number(b[1] - a[1]))[0];
    revByCode.set(code, amt + (debitTotal - creditTotal));
    creditTotal = debitTotal;
  }
  const clearing = CLEARING[p.provider] ?? ACC.BANK;
  lines.push({ code: clearing, debit: totalBase, memo: `Payment via ${p.provider}` });
  if (discountBase > 0n) lines.push({ code: ACC.SALES_DISCOUNTS, debit: discountBase, memo: order.discountCode ?? "Discount" });
  for (const [code, amt] of revByCode) lines.push({ code, credit: amt });
  if (shippingBase > 0n) lines.push({ code: ACC.SHIPPING_INCOME, credit: shippingBase });
  if (taxBase > 0n) lines.push({ code: ACC.TAX_PAYABLE, credit: taxBase });

  await postJournal(tx, {
    memo: `Sale ${order.number} (${order.currency})`,
    sourceType: "order",
    sourceId: order.id,
    currency: order.currency,
    fxRate: order.fxRate,
    byId: p.byId,
    lines,
  });

  const hasProduction = order.items.some((i) => i.kind === "made_to_order" || i.kind === "custom");
  const onlyDigital = order.items.every((i) => i.kind === "digital");
  const status: OrderStatus = onlyDigital ? "FULFILLED" : hasProduction ? "IN_PRODUCTION" : order.status === "SHIPPED" || order.status === "DELIVERED" ? order.status : "PAID";
  const updated = await tx.order.update({
    where: { id: orderId },
    data: { paymentStatus: "paid", paidAt: new Date(), status, expiresAt: null, events: { create: { status: "PAID", note: `Payment received via ${p.provider}`, byId: p.byId } } },
  });
  if (order.customerId) {
    await tx.customer.update({ where: { id: order.customerId }, data: { loyaltyPoints: { increment: Math.floor(Number(totalBase) / 10 ** baseRow.exponent) } } });
  }
  return { order: updated, newlyPaid: true };
}

export async function setOrderStatus(orderId: string, status: OrderStatus, note: string | undefined, byId: string | null, extra: { carrier?: string; trackingNumber?: string } = {}) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (status === "CANCELLED") return cancelOrder(orderId, note, byId);
  if (status === "DELIVERED" && order.paymentMethod === "cod" && order.paymentStatus !== "paid") {
    await markPaid(orderId, { provider: "cod", byId });
  }
  const updated = await db.order.update({
    where: { id: orderId },
    data: { status, ...extra, events: { create: { status, note: note || (extra.trackingNumber ? `${extra.carrier ?? "Carrier"} tracking ${extra.trackingNumber}` : undefined), byId } } },
  });
  if (status === "SHIPPED" || status === "DELIVERED") await sendOrderEmail(orderId, status.toLowerCase() as "shipped").catch(() => {});
  return updated;
}

export async function cancelOrder(orderId: string, note: string | undefined, byId: string | null) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status === "CANCELLED") return order;
    if (order.paymentStatus === "paid") throw new Error("Order is paid — issue a refund instead of cancelling.");
    for (const it of order.items) {
      if ((it.kind === "stock" || it.kind === "tool") && it.variantId) {
        await tx.variant.update({ where: { id: it.variantId }, data: { reserved: { decrement: it.qty } } });
      }
    }
    return tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", events: { create: { status: "CANCELLED", note, byId } } } });
  });
}

/** Refund in the order currency. Optionally returns stock-item quantities to inventory. */
export async function refundOrder(orderId: string, amount: bigint, opts: { restock: boolean; reason?: string; byId: string | null }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, refunds: true, payments: true } });
    if (order.paymentStatus !== "paid" && order.paymentStatus !== "partial_refund") throw new Error("Only paid orders can be refunded.");
    const already = order.refunds.reduce((a, r) => a + r.amount, 0n);
    if (amount <= 0n || amount + already > order.total) throw new Error("Refund exceeds the amount paid.");
    const { base: baseRow, list } = await getCurrencies();
    const cur = list.find((c) => c.code === order.currency) ?? baseRow;
    const amountBase = toBaseMinor(amount, cur.exponent, order.fxRate, baseRow.exponent);
    const provider = order.payments[0]?.provider ?? order.paymentMethod;
    const lines: JLine[] = [
      { code: ACC.SALES_RETURNS, debit: amountBase, memo: opts.reason },
      { code: CLEARING[provider] ?? ACC.BANK, credit: amountBase },
    ];
    if (opts.restock) {
      let value = 0n;
      for (const it of order.items) {
        if ((it.kind === "stock" || it.kind === "tool") && it.variantId) {
          await moveVariant(tx, it.variantId, it.qty, "RETURN_IN", it.unitCostBase, { refType: "refund", refId: order.id, byId: opts.byId });
          value += it.unitCostBase * BigInt(it.qty);
        }
      }
      if (value > 0n) lines.push({ code: ACC.INV_FINISHED, debit: value }, { code: ACC.COGS, credit: value });
    }
    const refund = await tx.refund.create({ data: { orderId, amount, amountBase, reason: opts.reason, restock: opts.restock, byId: opts.byId } });
    await postJournal(tx, { memo: `Refund ${order.number}`, sourceType: "refund", sourceId: refund.id, currency: order.currency, fxRate: order.fxRate, byId: opts.byId, lines });
    const full = amount + already === order.total;
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: full ? "refunded" : "partial_refund",
        status: full ? "REFUNDED" : "PARTIALLY_REFUNDED",
        events: { create: { status: full ? "REFUNDED" : "PARTIALLY_REFUNDED", note: opts.reason, byId: opts.byId } },
      },
    });
    await tx.alert.create({ data: { type: "refund", severity: "info", message: `Refund issued on ${order.number}`, link: `/admin/orders/${order.id}` } });
    return refund;
  });
}

/** Cancel unpaid bank-transfer orders past their expiry and release stock. */
export async function expireUnpaidOrders() {
  const stale = await db.order.findMany({ where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } }, select: { id: true } });
  for (const o of stale) await cancelOrder(o.id, "Expired — payment not received", null).catch(() => {});
  return stale.length;
}

// ───────────── production ─────────────

/** Consume raw materials for a job (BOM, else sheet area) → WIP. */
export async function startProductionJob(jobId: string, byId: string | null, machine?: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.productionJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { orderItem: { include: { variant: { include: { bom: true } }, customDesign: true, order: true } } },
    });
    if (job.consumedAt) return tx.productionJob.update({ where: { id: jobId }, data: { status: "cutting", machine } });
    const it = job.orderItem;
    const uses: { materialId: string; qty: number }[] = [];
    if (it.variant?.bom.length) it.variant.bom.forEach((b) => uses.push({ materialId: b.materialId, qty: b.qty }));
    else if (it.customDesign) uses.push({ materialId: it.customDesign.materialId, qty: Math.ceil(((it.customDesign.widthMm + 20) * (it.customDesign.heightMm + 20)) / 100) });
    else if (it.variant?.materialId && it.variant.widthMm && it.variant.heightMm)
      uses.push({ materialId: it.variant.materialId, qty: Math.ceil(((it.variant.widthMm + 20) * (it.variant.heightMm + 20)) / 100) });
    let value = 0n;
    for (const u of uses) value += await moveMaterial(tx, u.materialId, -u.qty, "PRODUCTION_CONSUME", null, { refType: "job", refId: jobId, byId });
    if (value > 0n) {
      await postJournal(tx, { memo: `Materials to WIP — ${it.order.number} ${it.sku}`, sourceType: "production_job", sourceId: jobId, byId, lines: [{ code: ACC.WIP, debit: value }, { code: ACC.INV_RAW, credit: value }] });
    }
    await tx.orderItem.update({ where: { id: it.id }, data: { unitCostBase: value } });
    return tx.productionJob.update({ where: { id: jobId }, data: { status: "cutting", machine, consumedAt: new Date(), startedAt: new Date() } });
  });
}

export async function advanceProductionJob(jobId: string, status: string, byId: string | null, notes?: string, photoUrl?: string) {
  const job = await db.productionJob.findUniqueOrThrow({ where: { id: jobId }, include: { orderItem: true } });
  if (!job.consumedAt && status !== "queued") await startProductionJob(jobId, byId);
  return db.$transaction(async (tx) => {
    const done = status === "done" || status === "ready_to_pack";
    const updated = await tx.productionJob.update({
      where: { id: jobId },
      data: { status, notes: notes ?? undefined, photoUrl: photoUrl ?? undefined, completedAt: done ? new Date() : null },
    });
    if (done && !job.completedAt) {
      const item = await tx.orderItem.findUniqueOrThrow({ where: { id: job.orderItemId }, include: { order: true } });
      const perUnit = item.qty > 0 ? item.unitCostBase : 0n;
      if (perUnit > 0n) {
        await postJournal(tx, { memo: `WIP to COGS — ${item.order.number} ${item.sku}`, sourceType: "production_done", sourceId: jobId, byId, lines: [{ code: ACC.COGS, debit: perUnit }, { code: ACC.WIP, credit: perUnit }] });
      }
      const open = await tx.productionJob.count({ where: { orderItem: { orderId: item.orderId }, completedAt: null, id: { not: jobId } } });
      if (open === 0 && item.order.status === "IN_PRODUCTION") {
        await tx.order.update({ where: { id: item.orderId }, data: { status: "QUALITY_CHECK", events: { create: { status: "QUALITY_CHECK", note: "All items cut — quality check", byId } } } });
      }
    }
    return updated;
  });
}
