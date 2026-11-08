import { cache } from "react";
import { db } from "./db";
import { clearMemo, memo } from "./memo";
import type { CurrencyInfo } from "./money";

export const DEFAULT_SETTINGS = {
  business: {
    name: "Stencil and Gift Studio",
    tagline: "Stencils · Gifts · Custom tees · Art",
    email: "hello@creativecorner.shop",
    phone: "+92 300 0000000",
    whatsapp: "923000000000",
    address: "Online studio — ships worldwide",
    country: "US",
    timezone: "Asia/Karachi",
    instagram: "",
    pinterest: "",
    facebook: "",
    youtube: "",
  },
  theme: { preset: "naqsh", accent: "", header: "", highlight: "", displayFont: "Cormorant Garamond", bodyFont: "Jost" },
  hero: {
    mode: "collage", // collage | 3d | video | image
    eyebrow: "Stencils · Gifts · Custom tees · Cybersigilism art",
    headline: "Make something *beautifully yours.*", // *text* = italic accent
    sub: "Expressive stencils, joyful gifts, custom T-shirts and bold artwork. Designed with personality and made for the moments that matter.",
    primaryCta: { label: "Explore collections", href: "/#collections" },
    secondaryCta: { label: "Make something custom", href: "/custom-stencils" },
    featuredSlug: "",
    videoUrl: "",
    imageUrl: "/naqsh/stencils.jpg",
    trust: ["Made to order", "USA & Canada"],
  },
  splash: { enabled: true, style: "naqsh" as "naqsh" | "cube" | "laser" | "layers" | "spray" },
  announcement: { enabled: true, text: "Your ideas, made real" },
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
    title: "Stencil and Gift Studio — Stencils, Gifts, Custom Tees & Art",
    description: "Reusable stencils, thoughtful gift baskets, custom T-shirts and bold cybersigilism art. Your favorite ideas, made into real things.",
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
  const rows = await memo("settings", () => db.setting.findMany()).catch((e) => {
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
  clearMemo("settings");
}

export const getCurrencies = cache(async () => {
  const list = await memo("currencies", () => db.currency.findMany({ orderBy: [{ isBase: "desc" }, { sort: "asc" }, { code: "asc" }] }));
  const base = list.find((c) => c.isBase) ?? list[0];
  return { list, enabled: list.filter((c) => c.enabled), base };
});

export function toInfo(c: {
  code: string; symbol: string; exponent: number; rate: number; markupPct: number;
  rounding: string; pricingMode: string; isBase: boolean;
}): CurrencyInfo {
  return { code: c.code, symbol: c.symbol, exponent: c.exponent, rate: c.rate, markupPct: c.markupPct, rounding: c.rounding, pricingMode: c.pricingMode, isBase: c.isBase };
}
