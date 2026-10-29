import { NextResponse } from "next/server";
import { runDailyClose, runDepreciation } from "@/lib/services/closing";
import { expireUnpaidOrders } from "@/lib/services/orders";
import { refreshFxRates } from "@/lib/fx";
import { db } from "@/lib/db";

/** Vercel Cron (see vercel.json). Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {};
  out.expired = await expireUnpaidOrders().catch((e) => String(e));
  out.fx = await refreshFxRates().catch((e) => {
    void db.alert.create({ data: { type: "fx", severity: "warning", message: `FX rate refresh failed: ${String(e).slice(0, 120)}` } });
    return String(e);
  });
  out.close = await runDailyClose(null).then((d) => d.date).catch((e) => String(e));
  const now = new Date();
  if (now.getUTCDate() === 1) {
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    out.depreciation = String(await runDepreciation(prev.toISOString().slice(0, 7), null).catch((e) => String(e)));
  }
  return NextResponse.json(out);
}
