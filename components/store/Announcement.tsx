import { getSettings } from "@/lib/settings";
import { getLiveSales } from "@/lib/sales";
import { DismissibleBar } from "./Chrome";

export async function Announcement() {
  const s = await getSettings();
  const sales = await getLiveSales();
  const best = sales.reduce<(typeof sales)[number] | null>((b, x) => (!b || x.percent > b.percent ? x : b), null);
  if (best) {
    return (
      <DismissibleBar id={`sale-${best.id}`}>
        {best.name} — {Math.round(best.percent)}% off{best.scope === "all" ? " everything" : ` ${best.collection}`}, applied automatically at checkout
      </DismissibleBar>
    );
  }
  if (!s.announcement.enabled || !s.announcement.text) return null;
  return <DismissibleBar id={s.announcement.text.slice(0, 24)}>{s.announcement.text}</DismissibleBar>;
}
