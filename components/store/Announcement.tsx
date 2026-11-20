import { getSettings } from "@/lib/settings";
import { getLiveSales } from "@/lib/sales";
import { getActiveCurrency } from "@/lib/currency";
import { AnnouncementBar } from "./Chrome";

export async function Announcement() {
  const [s, sales, { cur }] = await Promise.all([getSettings(), getLiveSales(), getActiveCurrency()]);
  const best = sales.reduce<(typeof sales)[number] | null>((b, x) => (!b || x.percent > b.percent ? x : b), null);
  const first = best ? `${best.name} — ${Math.round(best.percent)}% off${best.scope === "all" ? " everything" : ` ${best.collection}`}` : s.announcement.enabled && s.announcement.text ? s.announcement.text : "Your ideas, made real";
  return <AnnouncementBar items={[first, `${s.business.name} · ${s.business.tagline}`, `Prices in ${cur.code}`]} />;
}
