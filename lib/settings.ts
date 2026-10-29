import { cache } from "react";
import { db } from "./db";
import type { CurrencyInfo } from "./money";

export const DEFAULT_SETTINGS = {
  business: {
    name: "Creative Corner",
    tagline: "Stencils that are exactly right.",
    email: "hello@creativecorner.shop",
    phone: "+92 300 0000000",
    whatsapp: "923000000000",
    address: "Online studio — ships worldwide",
    country: "PK",
    timezone: "Asia/Karachi",
    instagram: "",
    pinterest: "",
    facebook: "",
    youtube: "",
  },
  theme: { preset: "dusk" },
  hero: {
    mode: "3d", // 3d | video | image
    eyebrow: "Laser-cut · Reusable · Made to order",
    headline: "Stencils that are exactly right.",
    sub: "Pick from hundreds of original designs or turn your own logo, lettering or sketch into a cut-ready stencil in two minutes — and see it on your wall, cake or coffee before you pay.",
    primaryCta: { label: "Shop stencils", href: "/shop" },
    secondaryCta: { label: "Make a custom stencil", href: "/custom-stencils" },
    featuredSlug: "",
    videoUrl: "",
    imageUrl: "",
    trust: ["Free design checks", "Ships worldwide", "Pay in your currency"],
  },
  splash: { enabled: true },
  announcement: { enabled: true, text: "Free shipping over {threshold} · Code WELCOME10 for 10% off your first order" },
  tax: { ratePct: 0, inclusive: true, label: "Tax" },
  payments: {
    demoCard: true,
    bankTransfer: true,
    cod: true,
    codCountries: ["PK"],
    bankDetails: "Bank: Example Bank\nAccount title: Creative Corner\nIBAN: PK00 EXMP 0000 0000 0000 0000",
  },
  orders: { expiryHours: 24, lowStockDefault: 5 },
  studio: { baseFeeBase: 50000, complexityPerMeterBase: 8000, setupFeeBase: 0, minMm: 30, maxMm: 1200 },
  seo: {
    title: "Creative Corner — Custom & Ready-made Stencils",
    description: "Laser-cut reusable stencils for walls, furniture, cakes, coffee and signs. Make a custom stencil from your logo in minutes. Ships worldwide.",
  },
  units: { defaultUnit: "cm", inchCountries: ["US", "LR", "MM"] },
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const out: Record<string, unknown> = structuredClone(DEFAULT_SETTINGS);
  for (const r of rows) {
    const def = (DEFAULT_SETTINGS as Record<string, unknown>)[r.key];
    out[r.key] = def && typeof def === "object" && !Array.isArray(def) ? { ...(def as object), ...(r.value as object) } : r.value;
  }
  return out as Settings;
});

export async function setSetting<K extends SettingKey>(key: K, value: Partial<Settings[K]>) {
  const current = (await db.setting.findUnique({ where: { key } }))?.value ?? {};
  const merged = { ...(DEFAULT_SETTINGS[key] as object), ...(current as object), ...(value as object) };
  await db.setting.upsert({ where: { key }, create: { key, value: merged }, update: { value: merged } });
}

export const getCurrencies = cache(async () => {
  const list = await db.currency.findMany({ orderBy: [{ isBase: "desc" }, { sort: "asc" }, { code: "asc" }] });
  const base = list.find((c) => c.isBase) ?? list[0];
  return { list, enabled: list.filter((c) => c.enabled), base };
});

export function toInfo(c: {
  code: string; symbol: string; exponent: number; rate: number; markupPct: number;
  rounding: string; pricingMode: string; isBase: boolean;
}): CurrencyInfo {
  return { code: c.code, symbol: c.symbol, exponent: c.exponent, rate: c.rate, markupPct: c.markupPct, rounding: c.rounding, pricingMode: c.pricingMode, isBase: c.isBase };
}
