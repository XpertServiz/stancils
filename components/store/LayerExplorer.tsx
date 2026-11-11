"use client";
import { useState } from "react";
import { DesignArtClient } from "./DesignArtClient";

const PALETTE = ["#FF7A59", "#5EE6C0", "#F5C451", "#2E3140", "#C8664A", "#7C8CF8", "#F5F2EC"];

export function LayerExplorer({ svg, layers }: { svg: string; layers: number }) {
  const [colors, setColors] = useState(["#FF7A59", "#5EE6C0", "#F5C451"].slice(0, layers));
  const [exploded, setExploded] = useState(true);
  const only = (i: number) => colors.map((c, j) => (j === i ? c : "transparent"));
  return (
    <div>
      <div className="relative aspect-square overflow-visible" style={{ perspective: 1400 }}>
        <div className="absolute inset-0 transition-transform duration-700 ease-brand" style={{ transformStyle: "preserve-3d", transform: exploded ? "rotateX(55deg) rotateZ(-35deg) scale(.68) translateY(-6%)" : "scale(.9)" }}>
          {colors.map((_, i) => (
            <div key={i} className="absolute inset-[8%] rounded-2xl transition-transform duration-700 ease-brand" style={{ transform: exploded ? `translateZ(${i * 70}px)` : "none", background: exploded ? "rgb(var(--surface-2) / .35)" : "transparent", border: exploded ? "1px solid rgb(var(--line))" : "none" }}>
              <DesignArtClient svg={svg} uid={`le${i}`} colors={only(i)} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink3">Layer {i + 1}</span>
            <div className="flex gap-1">
              {PALETTE.map((p) => (
                <button key={p} aria-label={`Layer ${i + 1} ${p}`} onClick={() => setColors((cs) => cs.map((x, j) => (j === i ? p : x)))} className={`h-5 w-5 rounded-full border ${c === p ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : "border-line"}`} style={{ background: p }} />
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-soft btn-sm" onClick={() => setExploded((e) => !e)}>{exploded ? "Stack layers" : "Explode layers"}</button>
      </div>
    </div>
  );
}
