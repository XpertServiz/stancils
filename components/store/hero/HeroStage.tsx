"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DesignArtClient } from "../DesignArtClient";
import type { HeroMode } from "./Scene3D";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

const SWATCHES = [
  { name: "Coral", c: "#FF7A59" },
  { name: "Mint", c: "#5EE6C0" },
  { name: "Mustard", c: "#F5C451" },
  { name: "Ink", c: "#2E3140" },
  { name: "Clay", c: "#C8664A" },
];

/**
 * Picks the hero renderer.
 * DECISION: GPU tiering uses a light heuristic (WebGL2 + cores + Save-Data + reduced-motion)
 * instead of the detect-gpu package, to keep the hero bundle small.
 */
export function HeroStage({ svg, layers, labels }: { svg: string; layers: number; labels: { text: string; href: string }[] }) {
  const [tier, setTier] = useState<"poster" | "css" | "webgl">("poster");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<HeroMode>("auto");
  const [paint, setPaint] = useState(SWATCHES[0].c);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduce || conn?.saveData) return setTier("poster");
    const gl = document.createElement("canvas").getContext("webgl2");
    const cores = navigator.hardwareConcurrency || 4;
    // load 3D after first paint so LCP stays on the poster
    const id = requestIdleCallbackSafe(() => setTier(gl && cores >= 4 ? "webgl" : "css"));
    return () => cancelIdleSafe(id);
  }, []);

  return (
    <div className="relative">
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[28px] border border-line/70 bg-[#D9D2C5] shadow-2xl">
        {/* poster / CSS-3D fallback — also what renders first for LCP */}
        <div className={`absolute inset-0 transition-opacity duration-700 ${tier === "webgl" && ready ? "opacity-0" : "opacity-100"}`} style={{ perspective: 900 }}>
          <div className="absolute inset-[14%] text-[color:var(--paint)]" style={{ ["--paint" as string]: paint }}>
            <DesignArtClient svg={svg} uid="hero-paint" colors={[paint, "#5EE6C0", "#F5C451"]} className={tier === "css" ? "paint-in" : ""} />
          </div>
          <div
            className="absolute inset-[11%] rounded-xl border border-white/50 bg-white/30 shadow-xl backdrop-blur-[1px]"
            style={{
              transform: tier === "css" ? "rotateX(18deg) rotateY(-16deg) translateZ(60px)" : "rotateX(10deg) rotateY(-8deg) translateZ(30px)",
              animation: tier === "css" ? "sheet-float 6s ease-in-out infinite" : undefined,
              WebkitMaskImage: "linear-gradient(#000,#000)",
            }}
          />
        </div>
        {tier === "webgl" && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
            <Scene3D svg={svg} layers={layers} paint={paint} wall="#D9D2C5" mode={mode} onReady={() => setReady(true)} />
          </div>
        )}
        {/* floating labels */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-4">
          {labels.map((l) => (
            <a key={l.href} href={l.href} className="pointer-events-auto chip glass !text-ink hover:!border-accent">{l.text}</a>
          ))}
        </div>
      </div>
      {/* controls (button equivalents for every 3D interaction) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Paint colour">
          {SWATCHES.map((s) => (
            <button
              key={s.c}
              role="radio"
              aria-checked={paint === s.c}
              aria-label={s.name}
              onClick={() => setPaint(s.c)}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${paint === s.c ? "scale-110 border-ink" : "border-line"}`}
              style={{ background: s.c }}
            />
          ))}
        </div>
        {tier === "webgl" && (
          <div className="flex rounded-xl border border-line p-1 text-xs font-semibold" role="tablist" aria-label="Hero animation">
            {(["auto", "peel", "layers"] as HeroMode[]).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 capitalize ${mode === m ? "bg-accent text-onaccent" : "text-ink2"}`}>{m}</button>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes sheet-float{0%,100%{transform:rotateX(18deg) rotateY(-16deg) translateZ(60px)}50%{transform:rotateX(14deg) rotateY(-10deg) translateZ(80px) translateY(-8px)}}`}</style>
    </div>
  );
}

function requestIdleCallbackSafe(fn: () => void): number {
  const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
  return w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 1200 }) : window.setTimeout(fn, 300);
}
function cancelIdleSafe(id: number) {
  const w = window as Window & { cancelIdleCallback?: (id: number) => void };
  if (w.cancelIdleCallback) w.cancelIdleCallback(id);
  else clearTimeout(id);
}
