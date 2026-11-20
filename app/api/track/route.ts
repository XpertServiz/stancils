import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BOT_RE, parseUA, sourceOf } from "@/lib/visitors";

export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_-]{8,40}$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, "").slice(0, max) : "");

/** A page view from the browser (sent with sendBeacon after the page has loaded). Always answers 204 quickly. */
export async function POST(req: Request) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua) || req.headers.get("sec-purpose")?.includes("prefetch")) return new NextResponse(null, { status: 204 });
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return new NextResponse(null, { status: 204 });
    const visitorId = clean(b.v, 40);
    const sessionId = clean(b.s, 40);
    let path = clean(b.p, 200);
    if (!ID.test(visitorId) || !ID.test(sessionId) || !path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return new NextResponse(null, { status: 204 });
    path = path.split("?")[0];
    const ownHost = new URL(req.url).host;
    let refHost: string | null = null;
    try { refHost = clean(b.r, 300) ? new URL(clean(b.r, 300)).host : null; } catch {}
    const h = req.headers;
    let city: string | null = h.get("x-vercel-ip-city");
    try { if (city) city = decodeURIComponent(city); } catch {}
    const country = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").toUpperCase();
    const { device, browser, os } = parseUA(ua);
    await db.visit.create({
      data: {
        visitorId, sessionId, path,
        country: /^[A-Z]{2}$/.test(country) ? country : null,
        region: h.get("x-vercel-ip-country-region")?.slice(0, 20) ?? null,
        city: city?.slice(0, 60) ?? null,
        referrer: refHost && refHost !== ownHost ? refHost.slice(0, 80) : null,
        source: sourceOf(refHost, clean(b.u, 40) || null, ownHost),
        device, browser, os,
        lang: (h.get("accept-language") ?? "").split(",")[0].slice(0, 12) || null,
        isNew: b.n === true,
      },
    });
  } catch {
    // statistics must never break the website
  }
  return new NextResponse(null, { status: 204 });
}
