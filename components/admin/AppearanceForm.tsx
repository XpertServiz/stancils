"use client";
import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { saveAppearance } from "@/app/admin/actions/website";
import type { Theme } from "@/lib/themes";

type Props = {
  themes: Theme[];
  fonts: { name: string; kind: string; weights: string }[];
  current: { preset: string; accent: string; displayFont: string; bodyFont: string; splash: boolean; splashStyle: string };
};

const SPLASH = [
  { id: "cube", label: "3D stencil cube", note: "A cube with your logo spins in and bursts apart" },
  { id: "laser", label: "3D laser cut", note: "A thick sheet tilts in, a laser cuts your logo, sparks fly" },
  { id: "layers", label: "3D layer stack", note: "Three colour layers fan out in depth, then snap together" },
  { id: "spray", label: "3D paint spray", note: "Your logo flies out of the screen with a paint mist" },
];

const rgb = (t: string) => `rgb(${t.split(" ").join(",")})`;

/** Loads a Google Font on demand so the admin can preview it. */
function useFont(name: string, weights: string) {
  useEffect(() => {
    const id = `gf-${name.replace(/\W/g, "")}`;
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id;
    l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:wght@${weights}&display=swap`;
    document.head.appendChild(l);
  }, [name, weights]);
}

export function AppearanceForm({ themes, fonts, current }: Props) {
  const [state, action, pending] = useActionState(saveAppearance, null as { ok: boolean; msg: string } | null);
  const [preset, setPreset] = useState(current.preset);
  const [useAccent, setUseAccent] = useState(Boolean(current.accent));
  const [accent, setAccent] = useState(current.accent || "#2563EB");
  const [display, setDisplay] = useState(current.displayFont);
  const [body, setBody] = useState(current.bodyFont);
  const f = (n: string) => fonts.find((x) => x.name === n) ?? fonts[0];
  useFont(display, f(display).weights);
  useFont(body, f(body).weights);
  const theme = themes.find((t) => t.id === preset) ?? themes[0];
  const v = theme.vars;
  const accentCss = useAccent ? accent : rgb(v.accent);

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-1 font-semibold">Theme</h2>
          <p className="mb-4 text-sm text-ink3">Applies to the whole storefront instantly. Visitors can still switch to the matching lighter/darker version.</p>
          <input type="hidden" name="preset" value={preset} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setPreset(t.id)}
                aria-pressed={preset === t.id}
                className={`relative overflow-hidden rounded-xl border p-3 text-left transition ${preset === t.id ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-ink3"}`}
              >
                <div className="mb-2 flex h-14 overflow-hidden rounded-lg">
                  {[t.vars.bg, t.vars.s2, t.vars.band, t.vars.accent, t.vars.accent2].map((c, i) => <div key={i} className="flex-1" style={{ background: rgb(c) }} />)}
                </div>
                <p className="text-sm font-semibold">{t.name} <span className="badge badge-muted ml-1">{t.mode}</span></p>
                <p className="text-xs text-ink3">{t.note}</p>
                {preset === t.id && <Check size={16} className="absolute right-2 top-2 text-accent" />}
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Main colour (buttons, links, highlights)</h2>
          <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" name="useAccent" checked={useAccent} onChange={(e) => setUseAccent(e.target.checked)} />Use my own colour instead of the theme&apos;s</label>
          <div className={`flex flex-wrap items-center gap-3 ${useAccent ? "" : "pointer-events-none opacity-40"}`}>
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value.toUpperCase())} className="h-11 w-16 cursor-pointer rounded-lg border border-line bg-transparent" aria-label="Pick colour" />
            <input name="accent" value={accent} onChange={(e) => setAccent(e.target.value)} className="input !w-32 font-mono" aria-label="Hex colour" />
            {["#2563EB", "#0D9488", "#16A34A", "#7C3AED", "#DB2777", "#DC2626", "#CA8A04", "#0F172A"].map((c) => (
              <button type="button" key={c} onClick={() => setAccent(c)} className="h-7 w-7 rounded-full border border-line" style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Fonts</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="label">Headings</span>
              <select name="displayFont" value={display} onChange={(e) => setDisplay(e.target.value)} className="select">
                {fonts.map((x) => <option key={x.name} value={x.name}>{x.name} · {x.kind}</option>)}
              </select>
            </label>
            <label><span className="label">Body text</span>
              <select name="bodyFont" value={body} onChange={(e) => setBody(e.target.value)} className="select">
                {fonts.filter((x) => x.kind !== "display").map((x) => <option key={x.name} value={x.name}>{x.name} · {x.kind}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">3D splash screen</h2>
          <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" name="splash" defaultChecked={current.splash} />Show a 1.8-second 3D intro on a visitor&apos;s first page view (skipped for bots and people who prefer reduced motion)</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {SPLASH.map((s) => (
              <label key={s.id} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-accent">
                <input type="radio" name="splashStyle" value={s.id} defaultChecked={current.splashStyle === s.id} className="mt-1" />
                <span><span className="block text-sm font-semibold">{s.label}</span><span className="text-xs text-ink3">{s.note}</span></span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink3">To see it again after saving, open the store in a new private/incognito window.</p>
        </section>

        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={pending}>{pending ? "Applying…" : "Apply to live site"}</button>
          {state && <p className={`text-sm ${state.ok ? "text-mint" : "text-danger"}`}>{state.msg}</p>}
        </div>
      </div>

      {/* live preview */}
      <aside className="xl:sticky xl:top-20 xl:self-start">
        <p className="label">Preview</p>
        <div className="overflow-hidden rounded-2xl border border-line" style={{ background: rgb(v.bg), color: rgb(v.ink), fontFamily: `"${body}", system-ui` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${rgb(v.line)}` }}>
            <span style={{ fontFamily: `"${display}"`, fontWeight: 700 }}>Your Store</span>
            <span className="text-xs" style={{ color: rgb(v.ink2) }}>Shop · Custom · Kits</span>
          </div>
          <div className="space-y-3 p-5">
            <p className="text-xs uppercase tracking-widest" style={{ color: rgb(v.accent3) }}>Laser-cut · Reusable</p>
            <h3 className="text-3xl leading-tight" style={{ fontFamily: `"${display}"`, fontWeight: 700 }}>Stencils that are exactly right.</h3>
            <p className="text-sm" style={{ color: rgb(v.ink2) }}>Pick from hundreds of original designs or turn your own logo into a stencil.</p>
            <div className="flex gap-2">
              <span className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: accentCss, color: useAccent ? "#fff" : rgb(v.onAccent) }}>Shop stencils</span>
              <span className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ border: `1px solid ${rgb(v.line)}` }}>Make custom</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: rgb(v.s1), border: `1px solid ${rgb(v.line)}` }}>
                  <div className="mb-2 h-10 rounded-lg" style={{ background: rgb(v.s2) }} />
                  <p className="text-xs font-semibold">Mandala</p>
                  <p className="text-xs" style={{ color: accentCss }}>Rs 1,800</p>
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-4 text-sm" style={{ background: rgb(v.band), color: rgb(v.bandInk) }}>Light “stone” section band</div>
        </div>
      </aside>
    </form>
  );
}
