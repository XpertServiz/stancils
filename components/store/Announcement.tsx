import { getSettings } from "@/lib/settings";
import { getActiveCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { convertMinor, formatMoney } from "@/lib/money";
import { getCountry } from "@/lib/currency";

export async function Announcement() {
  const s = await getSettings();
  if (!s.announcement.enabled || !s.announcement.text) return null;
  const { cur, base } = await getActiveCurrency();
  const country = await getCountry();
  const zones = await db.shippingZone.findMany({ include: { rates: true } });
  const zone = zones.find((z) => z.countries.includes(country)) ?? zones.find((z) => z.countries.includes("*"));
  const free = zone?.rates.find((r) => r.freeOverBase !== null)?.freeOverBase;
  const threshold = free ? formatMoney(convertMinor(free, base, cur), cur.code, cur.exponent) : "";
  const text = free ? s.announcement.text.replace("{threshold}", threshold) : s.announcement.text.replace(/[^·]*\{threshold\}[^·]*·?\s*/, "").trim();
  if (!text) return null;
  return <div className="px-4 py-2 text-center text-xs font-semibold tracking-wide text-white sm:text-sm" style={{ background: "linear-gradient(90deg, rgb(var(--accent)), rgb(150 110 230))" }}>{text}</div>;
}
