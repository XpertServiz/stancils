"use client";
import { useState } from "react";
import { Calculator } from "lucide-react";

export function RepeatCalculator({ repeatWmm, repeatHmm, units }: { repeatWmm: number; repeatHmm: number; units: "cm" | "in" }) {
  const [u, setU] = useState(units);
  const [w, setW] = useState(units === "in" ? 120 : 300);
  const [h, setH] = useState(units === "in" ? 96 : 250);
  const toMm = (v: number) => (u === "in" ? v * 25.4 : v * 10);
  const across = Math.ceil(toMm(w) / repeatWmm);
  const down = Math.ceil(toMm(h) / repeatHmm);
  const placements = across * down;
  const areaM2 = (toMm(w) * toMm(h)) / 1e6;
  const paintL = Math.max(0.1, (areaM2 * 0.4 * 2) / 10);
  const minutes = placements * 4;
  return (
    <div className="card p-5">
      <p className="mb-3 flex items-center gap-2 font-semibold"><Calculator size={18} className="text-accent" />Repeat & paint calculator</p>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <label><span className="label">Wall width</span><input type="number" min={1} value={w} onChange={(e) => setW(+e.target.value || 0)} className="input" /></label>
        <label><span className="label">Wall height</span><input type="number" min={1} value={h} onChange={(e) => setH(+e.target.value || 0)} className="input" /></label>
        <button className="btn btn-soft" onClick={() => { setU(u === "cm" ? "in" : "cm"); setW(Math.round(u === "cm" ? w / 2.54 : w * 2.54)); setH(Math.round(u === "cm" ? h / 2.54 : h * 2.54)); }}>{u}</button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-ink3">Repeats</dt><dd className="text-lg font-bold tabular">{across} × {down}</dd></div>
        <div><dt className="text-xs text-ink3">Placements</dt><dd className="text-lg font-bold tabular">{placements}</dd></div>
        <div><dt className="text-xs text-ink3">Paint (2 coats)</dt><dd className="text-lg font-bold tabular">≈ {paintL.toFixed(1)} L</dd></div>
        <div><dt className="text-xs text-ink3">Time</dt><dd className="text-lg font-bold tabular">≈ {Math.floor(minutes / 60)}h {minutes % 60}m</dd></div>
      </dl>
      {placements > 20 && <p className="mt-3 text-xs text-mustard">Tip: buy two stencils and work from both ends to finish twice as fast.</p>}
    </div>
  );
}
