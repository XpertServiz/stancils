import "server-only";
import { cookies, headers } from "next/headers";
import { getCurrencies, getSettings, toInfo } from "./settings";

const COUNTRY_CCY: Record<string, string> = {
  PK: "PKR", US: "USD", GB: "GBP", IE: "EUR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", PT: "EUR", FI: "EUR", GR: "EUR", AE: "AED", SA: "SAR", CA: "CAD", AU: "AUD", IN: "INR",
};

export async function getCountry(): Promise<string> {
  const c = (await cookies()).get("cc_country")?.value;
  if (c) return c;
  const h = await headers();
  return (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || (await getSettings()).business.country || "US").toUpperCase();
}

/** Active storefront currency: visitor choice → geo default → base. */
export async function getActiveCurrency() {
  const { enabled, base } = await getCurrencies();
  const chosen = (await cookies()).get("cc_currency")?.value;
  let cur = enabled.find((c) => c.code === chosen);
  if (!cur) {
    const geo = COUNTRY_CCY[await getCountry()];
    cur = enabled.find((c) => c.code === geo) ?? base;
  }
  return { cur: toInfo(cur), base: toInfo(base), enabled: enabled.map(toInfo) };
}

export async function getUnits(): Promise<"cm" | "in"> {
  const u = (await cookies()).get("cc_units")?.value;
  if (u === "cm" || u === "in") return u;
  const s = await getSettings();
  return s.units.inchCountries.includes(await getCountry()) ? "in" : "cm";
}
