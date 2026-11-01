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
  theme: { preset: "studio", accent: "", displayFont: "Playfair Display", bodyFont: "Poppins" },
  hero: {
    mode: "collage", // collage | 3d | video | image
    eyebrow: "Stencils · Gifts · Custom made",
    headline: "Make something *beautifully yours.*", // *text* = italic accent
    sub: "Original stencils, personalised gifts and custom designs — cut to order, made with care and shipped to your door.",
    primaryCta: { label: "Explore collections", href: "/shop" },
    secondaryCta: { label: "Make something custom", href: "/custom-stencils" },
    featuredSlug: "",
    videoUrl: "",
    imageUrl: "/hero/studio-collage.webp",
    trust: ["Made to order", "Ships worldwide", "Pay in your currency"],
  },
  splash: { enabled: true, style: "cube" as "cube" | "laser" | "layers" | "spray" },
  announcement: { enabled: true, text: "Free shipping over {threshold} · Code WELCOME10 for 10% off your first order" },
  tax: { ratePct: 0, inclusive: true, label: "Tax" },
  payments: {
    demoCard: true,
    bankTransfer: true,
    cod: true,
    codCountries: ["PK"],
    banks: [] as BankAccount[],
    bankInstructions: "Use your order number as the payment reference, then upload your receipt on your order page.",
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

export type BankAccount = {
  id: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branchCode: string;
  swift: string;
  currency: string; // "" = any currency
  active: boolean;
};

const usable = (b: BankAccount) => b.active && Boolean(b.accountTitle && (b.accountNumber || b.iban));

/**
 * Accounts to show a customer paying in `currency`: active, complete accounts tagged with that
 * currency or with no currency. Falls back to every usable account if none match.
 */
export function banksFor(banks: BankAccount[], currency?: string) {
  const ok = (banks ?? []).filter(usable);
  const matching = ok.filter((b) => !b.currency || b.currency === currency);
  return matching.length ? matching : ok;
}

/** Bank transfer is only offered once at least one complete, active account exists. */
export const bankReady = (banks: BankAccount[]) => (banks ?? []).some(usable);
export type SettingKey = keyof Settings;

export const getSettings = cache(async (): Promise<Settings> => {
  // DECISION: fall back to defaults if the database is unreachable (e.g. during a build) instead of failing the page
  const rows = await db.setting.findMany().catch((e) => {
    console.error("getSettings: using defaults —", (e as Error).message.split("\n")[0]);
    return [] as { key: string; value: unknown }[];
  });
  const out: Record<string, unknown> = structuredClone(DEFAULT_SETTINGS);
  for (const r of rows) {
    const def = (DEFAULT_SETTINGS as Record<string, unknown>)[r.key];
    out[r.key] = def && typeof def === "object" && !Array.isArray(def) ? { ...(def as object), ...(r.value as object) } : r.value;
  }
  const merged = out as Settings;
  if (!Array.isArray(merged.payments.banks)) merged.payments.banks = [];
  return merged;
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
