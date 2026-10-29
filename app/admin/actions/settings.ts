"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { setSetting } from "@/lib/settings";
import { parseMajor } from "@/lib/money";
import { refreshFxRates } from "@/lib/fx";

type R = { ok: boolean; msg: string } | null;
const done = (msg: string): R => { revalidatePath("/", "layout"); return { ok: true, msg }; };

export async function saveBusiness(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("settings.manage");
  const keys = ["name", "tagline", "email", "phone", "whatsapp", "address", "country", "timezone", "instagram", "pinterest", "facebook", "youtube"];
  await setSetting("business", Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")])));
  await setSetting("tax", { ratePct: Number(fd.get("taxRate")) || 0, inclusive: fd.get("taxInclusive") === "on", label: String(fd.get("taxLabel") || "Tax") });
  await setSetting("orders", { expiryHours: Number(fd.get("expiryHours")) || 24 });
  await setSetting("units", { defaultUnit: String(fd.get("defaultUnit") || "cm"), inchCountries: String(fd.get("inchCountries") || "US").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) });
  await audit(s.id, "settings.business", "settings", "business");
  return done("Saved.");
}

export async function savePayments(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("settings.manage");
  await setSetting("payments", {
    demoCard: fd.get("demoCard") === "on", bankTransfer: fd.get("bankTransfer") === "on", cod: fd.get("cod") === "on",
    codCountries: String(fd.get("codCountries") || "").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean), bankDetails: String(fd.get("bankDetails") || ""),
  });
  await setSetting("studio", { baseFeeBase: Number(parseMajor(String(fd.get("baseFee") || "0"))), complexityPerMeterBase: Number(parseMajor(String(fd.get("perMeter") || "0"))), setupFeeBase: Number(parseMajor(String(fd.get("setupFee") || "0"))) });
  await audit(s.id, "settings.payments", "settings", "payments");
  return done("Saved.");
}

export async function saveCurrency(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("currency.manage");
    const code = String(fd.get("code")).toUpperCase().trim();
    if (!/^[A-Z]{3}$/.test(code)) return { ok: false, msg: "Use a 3-letter ISO code." };
    const existing = await db.currency.findUnique({ where: { code } });
    const data = {
      name: String(fd.get("name") || code), symbol: String(fd.get("symbol") || code), exponent: Number(fd.get("exponent") ?? 2),
      enabled: fd.get("enabled") === "on", rate: Number(fd.get("rate")) || 1, rateFrozen: fd.get("frozen") === "on", markupPct: Number(fd.get("markup")) || 0,
      rounding: String(fd.get("rounding") || "NONE") as never, pricingMode: String(fd.get("mode") || "AUTO") as never, sort: Number(fd.get("sort")) || 0,
    };
    if (existing?.isBase) {
      Object.assign(data, { rate: 1, enabled: true, markupPct: 0, rounding: "NONE" });
    }
    if (existing) {
      await db.currency.update({ where: { code }, data });
      if (existing.rate !== data.rate) await db.fxRate.create({ data: { code, rate: data.rate, source: "manual" } });
    } else await db.currency.create({ data: { code, ...data } });
    await audit(s.id, "currency.save", "currency", code, existing, data);
    return done(`${code} saved.`);
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function changeBase(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("currency.manage");
  if ((await db.journalEntry.count()) > 0) return { ok: false, msg: "The base currency is locked after the first journal. Changing it later needs a migration of all historical amounts — contact your developer." };
  const code = String(fd.get("code"));
  await db.$transaction([db.currency.updateMany({ data: { isBase: false } }), db.currency.update({ where: { code }, data: { isBase: true, rate: 1, enabled: true } })]);
  await audit(s.id, "currency.base", "currency", code);
  return done(`Base currency is now ${code}. Refresh FX rates next.`);
}

export async function fxRefresh(_: R): Promise<R> {
  try {
    const s = await requirePermission("currency.manage");
    const updated = await refreshFxRates();
    await audit(s.id, "fx.refresh", "currency", null, undefined, { updated });
    return done(`Updated ${updated.join(", ") || "no currencies (all frozen?)"}.`);
  } catch (e) { return { ok: false, msg: `FX refresh failed: ${(e as Error).message}. Enter rates manually or try later.` }; }
}

export async function saveZone(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("settings.manage");
  const id = String(fd.get("id") || "");
  if (fd.get("op") === "delete" && id) {
    await db.shippingZone.delete({ where: { id } });
    return done("Zone deleted.");
  }
  const countries = String(fd.get("countries") || "").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
  const zone = id ? await db.shippingZone.update({ where: { id }, data: { name: String(fd.get("name")), countries, sort: Number(fd.get("sort")) || 0 } }) : await db.shippingZone.create({ data: { name: String(fd.get("name")), countries, sort: Number(fd.get("sort")) || 0 } });
  const rateIds = fd.getAll("rid").map(String);
  for (const rid of rateIds) {
    const g = (k: string) => String(fd.get(`${k}_${rid}`) ?? "");
    if (g("del") === "on") { await db.shippingRate.delete({ where: { id: rid } }); continue; }
    await db.shippingRate.update({ where: { id: rid }, data: { name: g("name"), priceBase: parseMajor(g("price")), freeOverBase: g("free") ? parseMajor(g("free")) : null, minDays: Number(g("min")) || 1, maxDays: Number(g("max")) || 5, active: g("active") === "on" } });
  }
  if (String(fd.get("new_name") || "").trim()) {
    await db.shippingRate.create({ data: { zoneId: zone.id, name: String(fd.get("new_name")), priceBase: parseMajor(String(fd.get("new_price") || "0")), freeOverBase: fd.get("new_free") ? parseMajor(String(fd.get("new_free"))) : null, minDays: Number(fd.get("new_min")) || 2, maxDays: Number(fd.get("new_max")) || 5 } });
  }
  await audit(s.id, "shipping.save", "shipping_zone", zone.id);
  return done("Shipping saved.");
}
