"use client";
import { useState } from "react";
import { DesignArtClient } from "./DesignArtClient";

const SCENES = {
  wall: { label: "Wall", bg: "radial-gradient(circle at 30% 20%, #efe9df, #d9d0c2)", shape: "rounded-2xl", scale: 0.8 },
  wood: { label: "Wood", bg: "repeating-linear-gradient(90deg,#8a5a3b 0 22px,#93613f 22px 30px,#7f5234 30px 52px)", shape: "rounded-2xl", scale: 0.75 },
  cake: { label: "Cake", bg: "radial-gradient(circle, #fff7ef 0 60%, #f1e2d2 61% 64%, #d9d0c2 65%)", shape: "rounded-full", scale: 0.55 },
  latte: { label: "Latte", bg: "radial-gradient(circle, #e9cfa6 0 40%, #c99a66 52%, #6b4428 60%, #3b2618 63%, #d9d0c2 64%)", shape: "rounded-full", scale: 0.45 },
  fabric: { label: "Fabric", bg: "repeating-linear-gradient(45deg,#ebe6dc 0 2px,#e2dccf 2px 4px)", shape: "rounded-2xl", scale: 0.7 },
} as const;

const PAINTS = ["#2E3140", "#FF7A59", "#5EE6C0", "#F5C451", "#C8664A", "#ffffff", "#5b3a29"];

export function SurfacePreview({ svg, layers, initialColors }: { svg: string; layers: number; initialColors: string[] }) {
  const [scene, setScene] = useState<keyof typeof SCENES | "photo">("wall");
  const [colors, setColors] = useState(initialColors.length ? initialColors : ["#2E3140"]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [scale, setScale] = useState(0.6);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const s = scene === "photo" ? null : SCENES[scene];
  const latte = scene === "latte";

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">See it on your surface</p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(SCENES) as (keyof typeof SCENES)[]).map((k) => (
            <button key={k} onClick={() => setScene(k)} className={`chip ${scene === k ? "!border-accent text-accent" : ""}`}>{SCENES[k].label}</button>
          ))}
          <label className={`chip cursor-pointer ${scene === "photo" ? "!border-accent text-accent" : ""}`}>
            Your photo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPhoto(URL.createObjectURL(f));
              setScene("photo");
            }} />
          </label>
        </div>
      </div>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-xl"
        style={{ background: scene === "photo" && photo ? `center/cover url(${photo})` : s?.bg }}
        onPointerDown={(e) => {
          if (scene !== "photo") return;
          const r = e.currentTarget.getBoundingClientRect();
          const move = (ev: PointerEvent) => setPos({ x: ((ev.clientX - r.left) / r.width) * 100, y: ((ev.clientY - r.top) / r.height) * 100 });
          move(e.nativeEvent);
          const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
      >
        <div
          className={`absolute ${s?.shape ?? ""}`}
          style={{
            width: `${(scene === "photo" ? scale : s!.scale) * 100}%`,
            aspectRatio: "1",
            left: `${scene === "photo" ? pos.x : 50}%`,
            top: `${scene === "photo" ? pos.y : 50}%`,
            transform: "translate(-50%,-50%)",
            mixBlendMode: latte ? "multiply" : "normal",
            filter: latte ? "blur(.4px)" : "none",
            opacity: latte ? 0.85 : 0.95,
          }}
        >
          <DesignArtClient svg={svg} uid="surface" colors={latte ? ["#4a2c1a", "#4a2c1a", "#4a2c1a"] : colors} />
        </div>
        {scene === "photo" && !photo && <p className="absolute inset-0 grid place-items-center text-sm text-stone-ink">Upload a photo of your wall</p>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {Array.from({ length: layers }, (_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {layers > 1 && <span className="text-xs text-ink3">L{i + 1}</span>}
            {PAINTS.map((p) => (
              <button key={p} aria-label={`Paint ${p}`} onClick={() => setColors((c) => { const n = [...c]; n[i] = p; return n; })} className={`h-5 w-5 rounded-full border ${colors[i] === p ? "ring-2 ring-accent ring-offset-2 ring-offset-s1" : "border-line"}`} style={{ background: p }} />
            ))}
          </div>
        ))}
        {scene === "photo" && (
          <label className="flex items-center gap-2 text-xs text-ink3">Size
            <input type="range" min={0.15} max={1} step={0.01} value={scale} onChange={(e) => setScale(+e.target.value)} />
          </label>
        )}
      </div>
      {scene === "photo" && <p className="mt-2 text-xs text-ink3">Drag on the photo to position the stencil.</p>}
    </div>
  );
}
