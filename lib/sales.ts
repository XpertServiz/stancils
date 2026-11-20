import { db } from "./db";
import { memo, clearMemo } from "./memo";

/**
 * Sitewide sales: automatic percentage discounts that need no code (e.g. "Diwali — 10% off everything").
 * Not to be confused with discount codes (DiscountCode table), which a customer types in at checkout.
 * DECISION: stored as a JSON list in `Setting` (like the landing products) — a sale is a handful of rows
 * edited by the owner, so no migration is needed. At checkout it posts to Sales Discounts like a code does.
 */
export type SiteSale = {
  id: number;
  name: string;
  percent: number;
  /** "all" = every product; otherwise the name of a catalogue collection / landing section it applies to */
  scope: "all" | "collection";
  collection: string;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
};

const KEY = "siteSales";

export async function getSales(): Promise<SiteSale[]> {
  const row = await memo(KEY, () => db.setting.findUnique({ where: { key: KEY } })).catch(() => null);
  return Array.isArray(row?.value) ? (row!.value as SiteSale[]) : [];
}

export async function saveSales(list: SiteSale[]) {
  const value = JSON.parse(JSON.stringify(list));
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  clearMemo(KEY);
}

export function isLive(s: SiteSale, now = new Date()) {
  if (!s.active) return false;
  if (s.startsAt && new Date(s.startsAt) > now) return false;
  if (s.endsAt && new Date(s.endsAt) < now) return false;
  return true;
}

export async function getLiveSales(now = new Date()) {
  return (await getSales()).filter((s) => isLive(s, now));
}

export function cleanSale(input: Record<string, unknown>, id: number): SiteSale {
  const name = String(input.name ?? "").trim().slice(0, 60);
  if (!name) throw new Error("Give the sale a name, e.g. “Eid Sale”.");
  if (/[<>`\\]|\$\{/.test(name)) throw new Error("The name can’t contain < > ` \\ or ${.");
  const percent = Number(input.percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 90) throw new Error("Percent off must be between 1 and 90.");
  const scope = input.scope === "collection" ? "collection" : "all";
  const collection = String(input.collection ?? "").trim().slice(0, 80);
  if (scope === "collection" && !collection) throw new Error("Choose which collection the sale applies to.");
  if (/[<>`\\]|\$\{/.test(collection)) throw new Error("Invalid collection.");
  const date = (k: string) => {
    const v = String(input[k] ?? "").trim();
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) throw new Error("Check the start / end date.");
    return d.toISOString();
  };
  const startsAt = date("startsAt");
  const endsAt = date("endsAt");
  if (startsAt && endsAt && endsAt <= startsAt) throw new Error("The end date must be after the start date.");
  return { id, name, percent: Math.round(percent * 100) / 100, scope, collection: scope === "collection" ? collection : "", startsAt, endsAt, active: input.active === "on" || input.active === true };
}

const norm = (s: string) => s.trim().toLowerCase();

/** Does the sale cover an item that sits in these collections / landing sections? */
export function saleCovers(s: SiteSale, names: string[]) {
  return s.scope === "all" || names.some((n) => norm(n) === norm(s.collection));
}

/**
 * Discount (in the line currency's minor units) for a list of cart lines.
 * Each line gets the single best sale that covers it — sales never stack on each other.
 */
export function saleDiscount(lines: { total: bigint; collections: string[] }[], sales: SiteSale[]) {
  let discount = 0n;
  const used = new Map<number, SiteSale>();
  for (const l of lines) {
    let best: SiteSale | undefined;
    for (const s of sales) if (saleCovers(s, l.collections) && (!best || s.percent > best.percent)) best = s;
    if (!best) continue;
    discount += (l.total * BigInt(Math.round(best.percent * 100))) / 10000n;
    used.set(best.id, best);
  }
  return { discount, applied: [...used.values()] };
}

/** Best live sale percent for a landing product (presentation only; checkout recomputes from the catalogue). */
export function landingPercent(sales: SiteSale[], p: { cat: string; subcat: string }) {
  let best = 0;
  for (const s of sales) if (saleCovers(s, [p.cat, p.subcat]) && s.percent > best) best = s.percent;
  return best;
}
