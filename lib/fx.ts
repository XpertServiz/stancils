import { db } from "./db";

/**
 * FxProvider: fetches rates relative to the base currency.
 * Default source is open.er-api.com (free, no key); set FX_API_URL to use another
 * endpoint returning { rates: { CODE: number } } for base {BASE}.
 */
export async function refreshFxRates() {
  const base = await db.currency.findFirstOrThrow({ where: { isBase: true } });
  const url = (process.env.FX_API_URL || "https://open.er-api.com/v6/latest/{BASE}").replace("{BASE}", base.code);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`FX provider returned ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  if (!data.rates) throw new Error("FX provider returned no rates");
  const updated: string[] = [];
  for (const c of await db.currency.findMany({ where: { isBase: false, rateFrozen: false } })) {
    const r = data.rates[c.code];
    if (!r || !isFinite(r)) continue;
    await db.currency.update({ where: { code: c.code }, data: { rate: r } });
    await db.fxRate.create({ data: { code: c.code, rate: r, source: new URL(url).host } });
    updated.push(c.code);
  }
  return updated;
}
