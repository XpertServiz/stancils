import { formatMoney } from "./money";
import type { Quote } from "./services/orders";

/** Client-safe representation of a quote with formatted money. */
export function quoteToJson(q: Quote) {
  const fm = (m: bigint) => formatMoney(m, q.currency.code, q.currency.exponent);
  return {
    currency: q.currency.code,
    lines: q.lines.map((l) => ({
      key: l.key, variantId: l.variantId, customDesignId: l.customDesignId, slug: l.slug, name: l.name, variantName: l.variantName,
      sku: l.sku, kind: l.kind, qty: l.qty, unitPrice: fm(l.unitPrice), total: fm(l.total), available: l.available, error: l.error, svg: l.designSvg ?? null,
    })),
    subtotal: fm(q.subtotal),
    subtotalMinor: Number(q.subtotal),
    discount: q.discount > 0n ? fm(q.discount) : null,
    discountLabel: q.discountLabel ?? null,
    discountError: q.discountError ?? null,
    shippingOptions: q.shippingOptions.map((o) => ({ ...o, price: o.price === 0n ? "Free" : fm(o.price) })),
    shippingId: q.shippingId ?? null,
    shippingFee: q.needsShipping ? (q.shippingFee === 0n ? "Free" : fm(q.shippingFee)) : null,
    tax: q.tax > 0n ? fm(q.tax) : null,
    taxInclusive: q.taxInclusive,
    total: fm(q.total),
    needsShipping: q.needsShipping,
    freeShippingThreshold: q.freeShippingThreshold !== null ? fm(q.freeShippingThreshold) : null,
    freeShippingRemaining: q.freeShippingThreshold !== null && q.freeShippingThreshold > q.subtotal ? fm(q.freeShippingThreshold - q.subtotal) : null,
    freeShippingProgress: q.freeShippingThreshold ? Math.min(1, Number(q.subtotal) / Number(q.freeShippingThreshold)) : 1,
    errors: q.errors,
  };
}
export type QuoteJson = ReturnType<typeof quoteToJson>;
