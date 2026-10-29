import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { WebsiteTabs } from "@/components/admin/WebsiteTabs";
import { saveTheme } from "@/app/admin/actions/website";

const PRESETS = [
  { id: "dusk", name: "Dusk Atelier", note: "Default — mid-tone slate with coral, mint and mustard", sw: ["#2E3140", "#E8E2D6", "#FF7A59", "#5EE6C0"] },
  { id: "stone", name: "Stone Day", note: "Lighter paper-stone base", sw: ["#ECE7DE", "#2E3140", "#D65232", "#128C6E"] },
  { id: "ink", name: "Ink Night", note: "Darker, high-drama", sw: ["#12131A", "#2E3140", "#FF7A59", "#5EE6C0"] },
  { id: "terracotta", name: "Terracotta", note: "Warm clay tones", sw: ["#3D2C28", "#F0E4D4", "#F0965A", "#96D2AA"] },
  { id: "sage", name: "Sage Studio", note: "Calm green-grey", sw: ["#283430", "#E6E8DC", "#F0B45A", "#8CDCBE"] },
];

export default async function Appearance() {
  await requireStaff("appearance.manage");
  const s = await getSettings();
  return (
    <div>
      <PageHeader title="Appearance" sub="Switch the whole storefront's look. Applied server-side, so there's no flash of the wrong theme. Visitors can still toggle lighter/darker for themselves." />
      <WebsiteTabs active="appearance" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PRESETS.map((p) => (
          <form key={p.id} action={saveTheme} className={`card p-5 ${s.theme.preset === p.id ? "shadow-glow" : ""}`}>
            <input type="hidden" name="preset" value={p.id} />
            <div className="mb-4 flex h-20 overflow-hidden rounded-xl">{p.sw.map((c) => <div key={c} className="flex-1" style={{ background: c }} />)}</div>
            <p className="font-semibold">{p.name}</p>
            <p className="mb-4 text-sm text-ink3">{p.note}</p>
            <button className="btn btn-soft btn-sm" disabled={s.theme.preset === p.id}>{s.theme.preset === p.id ? "Active" : "Apply to site"}</button>
          </form>
        ))}
      </div>
    </div>
  );
}
