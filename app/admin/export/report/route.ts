import { getStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { parseRange } from "@/lib/dates";
import { buildReport } from "@/lib/reports";
import { csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  const s = await getStaff();
  if (!s?.perms.has("reports.financial.view")) return new Response("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const r = parseRange(sp, (await getSettings()).business.timezone, 30);
  const tables = await buildReport(sp.tab ?? "pl", r.from, r.to, { account: sp.account ? Number(sp.account) : undefined });
  const rows: (string | number)[][] = [];
  for (const t of tables) {
    rows.push([t.title, `${r.fromKey} → ${r.toKey}`], t.head, ...t.rows);
    if (t.foot) rows.push(t.foot);
    rows.push([]);
  }
  return csvResponse(`${sp.tab ?? "report"}-${r.toKey}.csv`, rows);
}
