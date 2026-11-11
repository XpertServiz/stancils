import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel, Tabs, Empty } from "@/components/admin/ui";
import { countryName, flag, RANGES } from "@/lib/visitors";

type Row = { k: string | null; visitors: number; views: number };

const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

function Bars({ rows, total, label, empty = "No data yet" }: { rows: { name: string; n: number; sub?: string }[]; total: number; label: string; empty?: string }) {
  return (
    <Panel title={label}>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-ink3">{empty}</p> : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.name} className="text-sm">
              <div className="flex items-baseline justify-between gap-3"><span className="min-w-0 truncate">{r.name}</span><span className="tabular shrink-0 font-semibold">{r.n}<span className="ml-1.5 text-xs font-normal text-ink3">{pct(r.n, total)}%{r.sub ? ` · ${r.sub}` : ""}</span></span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-s2"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, pct(r.n, total))}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default async function Visitors({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireStaff("dashboard.view");
  const rangeKey = (await searchParams).range ?? "7d";
  const range = RANGES[rangeKey] ?? RANGES["7d"];
  const since = new Date(Date.now() - range.days * 86_400_000);
  const live = new Date(Date.now() - 5 * 60_000);
  const W = Prisma.sql`"createdAt" >= ${since}`;

  const group = (col: string) =>
    db.$queryRaw<Row[]>(Prisma.sql`SELECT ${Prisma.raw(`"${col}"`)} AS k, COUNT(DISTINCT "visitorId")::int AS visitors, COUNT(*)::int AS views FROM "Visit" WHERE ${W} GROUP BY 1 ORDER BY visitors DESC, views DESC LIMIT 12`);

  const [tot, daily, countries, cities, pages, sources, devices, browsers, oses, langs, recent, liveNow, hours, firstVisit] = await Promise.all([
    db.$queryRaw<{ views: number; visitors: number; sessions: number; fresh: number; home: number; bounced: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitors, COUNT(DISTINCT "sessionId")::int AS sessions,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "isNew")::int AS fresh,
             COUNT(*) FILTER (WHERE "path" = '/')::int AS home,
             (SELECT COUNT(*)::int FROM (SELECT "sessionId" FROM "Visit" WHERE ${W} GROUP BY "sessionId" HAVING COUNT(*) = 1) b) AS bounced
      FROM "Visit" WHERE ${W}`),
    db.$queryRaw<{ d: Date; views: number; visitors: number }[]>(Prisma.sql`
      SELECT date_trunc('day', "createdAt") AS d, COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitors FROM "Visit" WHERE ${W} GROUP BY 1 ORDER BY 1`),
    group("country"), group("city"), group("path"), group("source"), group("device"), group("browser"), group("os"), group("lang"),
    db.visit.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 40 }),
    db.visit.findMany({ where: { createdAt: { gte: live } }, distinct: ["visitorId"], select: { visitorId: true } }),
    db.$queryRaw<{ h: number; n: number }[]>(Prisma.sql`SELECT EXTRACT(HOUR FROM "createdAt")::int AS h, COUNT(*)::int AS n FROM "Visit" WHERE ${W} GROUP BY 1 ORDER BY 1`),
    db.visit.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  const t = tot[0] ?? { views: 0, visitors: 0, sessions: 0, fresh: 0, home: 0, bounced: 0 };

  // fill the chart with every day in the range, even quiet ones
  const days: { label: string; views: number; visitors: number }[] = [];
  const byDay = new Map(daily.map((r) => [new Date(r.d).toISOString().slice(0, 10), r]));
  const n = Math.min(range.days, 90);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const r = byDay.get(key);
    days.push({ label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), views: r?.views ?? 0, visitors: r?.visitors ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.views));
  const peak = hours.reduce((a, h) => (h.n > a.n ? h : a), { h: 0, n: 0 });
  const named = (rows: Row[], fn: (k: string | null) => string) => rows.map((r) => ({ name: fn(r.k), n: r.visitors, sub: `${r.views} views` }));
  const cap = (s: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "Unknown");

  const kpi = (label: string, value: string | number, hint?: string) => (
    <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink3">{label}</p><p className="tabular mt-1 text-3xl font-bold">{value}</p>{hint && <p className="mt-0.5 text-xs text-ink3">{hint}</p>}</div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Visitors" sub="Who is visiting your website: how many people, from which countries, on which device and where they found you. No IP addresses are stored." />
      <Tabs active={rangeKey in RANGES ? rangeKey : "7d"} tabs={Object.entries(RANGES).map(([k, v]) => ({ key: k, label: v.label, href: `/admin/visitors?range=${k}` }))} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpi("Visitors", t.visitors, `${t.fresh} new · ${Math.max(0, t.visitors - t.fresh)} returning`)}
        {kpi("Page views", t.views, t.sessions ? `${(t.views / t.sessions).toFixed(1)} pages per visit` : undefined)}
        {kpi("Visits (sessions)", t.sessions, t.sessions ? `${pct(t.bounced, t.sessions)}% left after one page` : undefined)}
        {kpi("Landing page views", t.home, "views of the homepage")}
      </div>
      <p className="-mt-3 flex flex-wrap items-center gap-3 text-sm text-ink2">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-mint" /><b>{liveNow.length}</b> on the website right now (last 5 minutes)</span>
        {peak.n > 0 && <span>Busiest hour: <b>{peak.h}:00–{peak.h + 1}:00 UTC</b></span>}
        {firstVisit && <span className="text-ink3">Counting since {firstVisit.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
      </p>

      <Panel title={`Visitors and page views per day — ${range.label.toLowerCase()}`}>
        {t.views === 0 ? <Empty>No visits recorded in this period yet. They appear here within a few seconds of someone opening your website.</Empty> : (
          <div>
            <div className="flex h-44 items-end gap-[3px]" role="img" aria-label="Daily page views">
              {days.map((d, i) => (
                <div key={i} className="group relative flex h-full flex-1 items-end" title={`${d.label}: ${d.views} views, ${d.visitors} visitors`}>
                  <div className="w-full rounded-t bg-accent/25" style={{ height: `${(d.views / max) * 100}%` }}>
                    <div className="w-full rounded-t bg-accent" style={{ height: d.views ? `${(d.visitors / d.views) * 100}%` : 0 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-ink3"><span>{days[0]?.label}</span><span>{days[days.length - 1]?.label}</span></div>
            <p className="mt-2 flex gap-4 text-xs text-ink3"><span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent" />Visitors</span><span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent/25" />Page views</span></p>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bars label="Countries" total={t.visitors} rows={named(countries, (k) => `${flag(k)}  ${countryName(k)}`)} empty="Countries show up once the site is live on your domain" />
        <Bars label="Cities" total={t.visitors} rows={named(cities, (k) => k ?? "Unknown")} />
        <Bars label="Pages people open" total={t.visitors} rows={named(pages, (k) => (k === "/" ? "/  (homepage)" : k ?? "—"))} />
        <Bars label="Where they came from" total={t.visitors} rows={named(sources, (k) => k ?? "Direct")} />
        <Bars label="Device" total={t.visitors} rows={named(devices, cap)} />
        <Bars label="Browser" total={t.visitors} rows={named(browsers, (k) => k ?? "Other")} />
        <Bars label="Operating system" total={t.visitors} rows={named(oses, (k) => k ?? "Other")} />
        <Bars label="Language" total={t.visitors} rows={named(langs, (k) => k ?? "Unknown")} />
      </div>

      <Panel title="Latest visits">
        {recent.length === 0 ? <Empty>Nothing yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>When</th><th>Where from</th><th>Opened</th><th>Came from</th><th>Device</th><th></th></tr></thead>
              <tbody>
                {recent.map((v) => (
                  <tr key={v.id}>
                    <td className="whitespace-nowrap text-xs text-ink2">{v.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="whitespace-nowrap">{flag(v.country)} {v.city ? `${v.city}, ` : ""}{countryName(v.country)}</td>
                    <td className="max-w-[260px] truncate font-mono text-xs">{v.path}</td>
                    <td className="text-xs">{v.source ?? "Direct"}</td>
                    <td className="whitespace-nowrap text-xs text-ink2">{cap(v.device)} · {v.browser} · {v.os}</td>
                    <td>{v.isNew && <span className="badge badge-mint">new</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
