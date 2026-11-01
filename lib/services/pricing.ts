import { convertMinor, type CurrencyInfo } from "../money";

type V = { basePrice: bigint; compareAt?: bigint | null; prices?: { currency: string; price: bigint }[] };

/** Selling price of a variant in a currency: manual override wins, else auto FX + markup + rounding. */
export function variantPrice(v: V, cur: CurrencyInfo, base: CurrencyInfo): { price: bigint; compareAt: bigint | null } {
  if (cur.isBase) return { price: v.basePrice, compareAt: v.compareAt ?? null };
  const manual = v.prices?.find((p) => p.currency === cur.code);
  const price = manual ? manual.price : convertMinor(v.basePrice, base, cur, "price");
  const compareAt = v.compareAt ? convertMinor(v.compareAt, base, cur, "price") : null;
  return { price, compareAt };
}

export function lowestPrice(variants: V[], cur: CurrencyInfo, base: CurrencyInfo) {
  let best: { price: bigint; compareAt: bigint | null } | null = null;
  for (const v of variants) {
    const p = variantPrice(v, cur, base);
    if (!best || p.price < best.price) best = p;
  }
  return best;
}
