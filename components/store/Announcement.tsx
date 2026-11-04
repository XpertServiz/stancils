import { getSettings } from "@/lib/settings";
import { getActiveCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { convertMinor, formatMoney } from "@/lib/money";
import { getCountry } from "@/lib/currency";
import { getLiveSales } from "@/lib/sales";

export async function Announcement() {
  const s = await getSettings();
  const sales = await getLiveSales();
  const best = sales.reduce<(typeof sales)[number] | null>((b, x) => (!b || x.percent > b.percent ? x : b), null);
  if (best) {
    return (
      <div className="px-[18px] py-3 text-center text-[12px] font-semibold tracking-[.03em] text-white" style={{ background: "linear-gradient(100deg,#d63a74,#ee6a73 50%,#6a63d9)" }}>
        🔥 {best.name} — {Math.round(best.percent)}% off{best.scope === "all" ? " everything" : ` ${best.collection}`}, applied automatically at checkout
      </div>
    );
  }
  if (!s.announcement.enabled || !s.announcement.text) return null;
  const { cur, base } = await getActiveCurrency();
  const country = await getCountry();
  const zones = await db.shippingZone.findMany({ include: { rates: true } });
  const zone = zones.find((z) => z.countries.includes(country)) ?? zones.find((z) => z.countries.includes("*"));
  const free = zone?.rates.find((r) => r.freeOverBase !== null)?.freeOverBase;
  const threshold = free ? formatMoney(convertMinor(free, base, cur), cur.code, cur.exponent) : "";
  const text = free ? s.announcement.text.replace("{threshold}", threshold) : s.announcement.text.replace(/[^·]*\{threshold\}[^·]*·?\s*/, "").trim();
  if (!text) return null;
  const parts = text.split("•");
  return (
    <div className="px-[18px] py-3 text-center text-[11px] tracking-[.055em] text-white" style={{ background: "linear-gradient(100deg,#e85082,#ed6d7c 50%,#7c82d9)" }}>
      {parts.map((t, i) => (
        <span key={i}>{i > 0 && <span className="px-2 text-[#ffefb9]">•</span>}{t.trim()}</span>
      ))}
    </div>
  );
}
