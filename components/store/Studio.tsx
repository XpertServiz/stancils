"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Upload, Type, Wand2, AlertTriangle, Check, Ruler, ShieldCheck, Loader2 } from "lucide-react";
import { useCart } from "./CartContext";
import { autoBridge, cutRatio, edgeLengthPx, imageToMask, maskToPng, renderMask, thinFeatureRatio, type Mask } from "@/lib/studio-image";
import { createDesign, priceStudio } from "@/app/actions/studio";
import { STENCIL_FONTS_HREF } from "@/lib/themes";

export type StudioMaterial = { id: string; name: string; kind: string; foodSafe: boolean; minBridgeMm: number; thicknessUm: number | null };

const FONTS = [
  { id: "Big Shoulders Stencil Display", label: "Big Shoulders Stencil" },
  { id: "Saira Stencil One", label: "Saira Stencil" },
  { id: "Allerta Stencil", label: "Allerta Stencil" },
  { id: "Arial Black", label: "Bold Sans (auto-bridged)" },
];
const SURFACES = [
  { id: "wall", label: "Wall", bg: "radial-gradient(circle at 30% 20%, #efe9df, #d9d0c2)", paint: "#2E3140" },
  { id: "latte", label: "Latte", bg: "radial-gradient(circle, #e9cfa6 0 46%, #c99a66 58%, #6b4428 66%, #2c1c12 70%)", paint: "#4a2c1a" },
  { id: "cake", label: "Cake", bg: "radial-gradient(circle, #fff7ef 0 62%, #f1e2d2 66%)", paint: "#C8664A" },
  { id: "wood", label: "Wood", bg: "repeating-linear-gradient(90deg,#8a5a3b 0 22px,#93613f 22px 30px,#7f5234 30px 52px)", paint: "#F5F2EC" },
  { id: "tee", label: "T-shirt", bg: "#1f2430", paint: "#F5C451" },
];

type Props = { materials: StudioMaterial[]; defaultMaterialKind?: string; units: "cm" | "in"; currency: string; initialText?: string };

export function Studio({ materials, defaultMaterialKind, units: initialUnits, currency, initialText }: Props) {
  const { add } = useCart();
  const [source, setSource] = useState<"upload" | "text">(initialText ? "text" : "upload");
  const [img, setImg] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [text, setText] = useState(initialText ?? "");
  const [font, setFont] = useState(FONTS[0].id);
  const [threshold, setThreshold] = useState(140);
  const [invert, setInvert] = useState(false);
  const [blur, setBlur] = useState(0);
  const [bridgesOn, setBridgesOn] = useState(true);
  const [materialId, setMaterialId] = useState(() => (materials.find((m) => m.kind === defaultMaterialKind) ?? materials.find((m) => m.kind === "MYLAR" && (m.thicknessUm ?? 0) >= 250) ?? materials[0])?.id);
  const material = materials.find((m) => m.id === materialId)!;
  const [bridgeMm, setBridgeMm] = useState(material?.minBridgeMm ?? 1.8);
  const [units, setUnits] = useState(initialUnits);
  const [widthMm, setWidthMm] = useState(200);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<"stencil" | "painted" | "original">("stencil");
  const [surface, setSurface] = useState(SURFACES[0]);
  const [result, setResult] = useState<{ final: Mask; original: Mask; islands: number; bridges: number; thin: number; edgeMm: number; preview: string; painted: string } | null>(null);
  const [price, setPrice] = useState<{ unit: string; total: string; discountPct: number } | null>(null);
  const [rights, setRights] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [added, setAdded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (material) setBridgeMm((b) => Math.max(b, material.minBridgeMm));
  }, [material]);

  // pick up a file dropped on the homepage
  useEffect(() => {
    try {
      const d = sessionStorage.getItem("cc_studio_upload");
      if (d) {
        sessionStorage.removeItem("cc_studio_upload");
        loadUrl(d);
      }
    } catch {}
  }, []);

  const loadUrl = (url: string) => {
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setSource("upload");
    };
    im.src = url;
  };

  const onFile = (f: File) => {
    if (!f.type.startsWith("image/")) return setError("Please choose an image file (PNG, JPG or SVG).");
    if (f.size > 15_000_000) return setError("That image is over 15 MB — please use a smaller file.");
    setError(null);
    const r = new FileReader();
    r.onload = () => loadUrl(String(r.result));
    r.readAsDataURL(f);
  };

  // render text to a canvas
  useEffect(() => {
    if (source !== "text") return;
    let alive = true;
    (async () => {
      const t = text.trim() || "Your Text";
      try { await document.fonts.load(`700 120px "${font}"`); } catch {}
      if (!alive) return;
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d")!;
      ctx.font = `800 160px "${font}", "Arial Black", sans-serif`;
      const lines = t.split(/\n|\\n/).slice(0, 3);
      const widths = lines.map((l) => ctx.measureText(l).width);
      c.width = Math.ceil(Math.max(...widths) + 40);
      c.height = 190 * lines.length + 20;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#000";
      ctx.font = `800 160px "${font}", "Arial Black", sans-serif`;
      ctx.textBaseline = "top";
      lines.forEach((l, i) => ctx.fillText(l, 20 + (c.width - 40 - widths[i]) / 2, 20 + i * 190));
      setImg(c);
      setThreshold(128);
      setInvert(false);
    })();
    return () => { alive = false; };
  }, [source, text, font]);

  // process
  useEffect(() => {
    if (!img || !material) return;
    const id = setTimeout(() => {
      const sw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
      const sh = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
      const margin = 8;
      const original = imageToMask(img, sw, sh, { maxPx: 560, threshold, invert, blur, marginPx: margin });
      const mmPerPx = widthMm / (original.w - margin * 2);
      const bridgePx = Math.max(2, Math.round(bridgeMm / mmPerPx));
      const bridged = bridgesOn ? autoBridge(original, bridgePx) : { mask: original, islands: 0, bridges: [] };
      const r = Math.max(0, Math.min(6, Math.round((material.minBridgeMm * 0.8) / 2 / mmPerPx)));
      const thin = thinFeatureRatio(bridged.mask, r);
      const preview = renderMask(bridged.mask, { sheet: [233, 238, 242, 255], cut: [46, 49, 64, 255], original, bridge: [94, 230, 192, 255] }).toDataURL();
      const painted = renderMask(bridged.mask, { sheet: [0, 0, 0, 0], cut: [255, 255, 255, 255] }).toDataURL();
      setResult({ final: bridged.mask, original, islands: bridged.islands, bridges: bridged.bridges.length, thin, edgeMm: edgeLengthPx(bridged.mask) * mmPerPx, preview, painted });
    }, 120);
    return () => clearTimeout(id);
  }, [img, threshold, invert, blur, bridgesOn, bridgeMm, widthMm, material]);

  const heightMm = result ? Math.round((widthMm * (result.final.h - 16)) / Math.max(1, result.final.w - 16)) : widthMm;

  // live price
  useEffect(() => {
    if (!result || !materialId) return;
    const id = setTimeout(() => {
      priceStudio({ widthMm, heightMm, materialId, qty, cutLengthMm: result.edgeMm }).then(setPrice).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [result, widthMm, heightMm, materialId, qty]);

  const fmtLen = useCallback((mm: number) => (units === "in" ? `${(mm / 25.4).toFixed(1)}″` : `${(mm / 10).toFixed(1)} cm`), [units]);
  const sizeInput = units === "in" ? +(widthMm / 25.4).toFixed(1) : +(widthMm / 10).toFixed(1);
  const empty = !img;
  const coverage = useMemo(() => (result ? cutRatio(result.final) : 0), [result]);

  const addToCart = () => {
    if (!result) return;
    if (!rights) return setError("Please confirm you own or have permission to use this artwork.");
    setError(null);
    startBusy(async () => {
      const r = await createDesign({
        png: maskToPng(result.final),
        widthMm,
        heightMm,
        materialId,
        qty,
        cutLengthMm: result.edgeMm,
        islands: result.islands,
        bridges: result.bridges,
        thinRatio: result.thin,
        rightsConfirmed: true,
        name: name || undefined,
        sourceText: source === "text" ? text.slice(0, 80) : undefined,
        email: email || undefined,
      });
      if (!r.ok) return setError(r.error);
      add({ customDesignId: r.id, qty });
      setAdded(true);
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
      {/* stencil fonts are only needed here, so they are not part of the site-wide font load */}
      <link rel="stylesheet" href={STENCIL_FONTS_HREF} precedence="default" />
      {/* preview */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border border-line p-1 text-sm font-semibold" role="tablist">
            {(["stencil", "painted", "original"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 capitalize ${view === v ? "bg-accent text-onaccent" : "text-ink2"}`}>{v}</button>
            ))}
          </div>
          {view === "painted" && (
            <div className="flex flex-wrap gap-1">{SURFACES.map((s) => <button key={s.id} onClick={() => setSurface(s)} className={`chip ${surface.id === s.id ? "!border-accent text-accent" : ""}`}>{s.label}</button>)}</div>
          )}
        </div>
        <div
          className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[24px] border border-line"
          style={{ background: view === "painted" ? surface.bg : "repeating-conic-gradient(rgb(var(--surface-2)) 0 25%, rgb(var(--surface-1)) 0 50%) 0 0/24px 24px" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        >
          {empty && (
            <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-onaccent"><Upload /></span>
              <span className="text-lg font-semibold">Drop a logo, photo or sketch</span>
              <span className="text-sm text-ink3">or type text on the right</span>
            </button>
          )}
          {result && view === "stencil" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.preview} alt="Stencil preview: grey is the sheet, dark areas are cut, mint shows added bridges" className="max-h-[90%] max-w-[90%] rounded-lg shadow-2xl" style={{ imageRendering: "auto" }} />
          )}
          {result && view === "painted" && (
            <div
              className={`aspect-square max-h-[78%] w-[70%] ${surface.id === "latte" || surface.id === "cake" ? "max-w-[56%]" : ""}`}
              style={{
                WebkitMaskImage: `url(${result.painted})`, maskImage: `url(${result.painted})`, WebkitMaskSize: "contain", maskSize: "contain",
                WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center",
                background: surface.paint, opacity: surface.id === "latte" ? 0.85 : 1,
              }}
            />
          )}
          {img && view === "original" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img instanceof HTMLImageElement ? img.src : img.toDataURL()} alt="Original" className="max-h-[90%] max-w-[90%] rounded-lg bg-white" />
          )}
        </div>
        {result && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip"><Ruler size={14} />{fmtLen(widthMm)} × {fmtLen(heightMm)}</span>
            <span className={`chip ${result.islands ? "!border-mint text-mint" : ""}`}><Wand2 size={14} />{result.islands} island{result.islands === 1 ? "" : "s"} found · {result.bridges} bridge{result.bridges === 1 ? "" : "s"} added</span>
            {result.thin > 0.04 ? (
              <span className="chip !border-mustard text-mustard"><AlertTriangle size={14} />Some details are finer than {material.minBridgeMm} mm — go bigger or we&apos;ll check it for you</span>
            ) : (
              <span className="chip !border-mint text-mint"><Check size={14} />Detail OK for {material.name.split(" (")[0]}</span>
            )}
            {coverage > 0.65 && <span className="chip !border-mustard text-mustard">Very open design — may be floppy; try a thicker material</span>}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="space-y-5">
        <div className="card p-5">
          <p className="mb-3 font-semibold">1 · Your artwork</p>
          <div className="mb-3 inline-flex rounded-xl border border-line p-1 text-sm font-semibold">
            <button onClick={() => setSource("upload")} className={`rounded-lg px-3 py-1.5 ${source === "upload" ? "bg-s2" : "text-ink2"}`}><Upload size={14} className="mr-1 inline" />Upload</button>
            <button onClick={() => setSource("text")} className={`rounded-lg px-3 py-1.5 ${source === "text" ? "bg-s2" : "text-ink2"}`}><Type size={14} className="mr-1 inline" />Text</button>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {source === "upload" ? (
            <button className="btn btn-soft w-full" onClick={() => fileRef.current?.click()}><Upload size={16} />{img ? "Replace image" : "Choose an image"}</button>
          ) : (
            <div className="space-y-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={60} rows={2} placeholder="Type your words (new line for a second line)" className="textarea" aria-label="Stencil text" />
              <select value={font} onChange={(e) => setFont(e.target.value)} className="select" aria-label="Font">{FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
            </div>
          )}
        </div>

        {img && (
          <div className="card space-y-3 p-5">
            <p className="font-semibold">2 · Adjust the cut</p>
            <label className="block text-sm"><span className="flex justify-between text-ink2">Threshold <span className="tabular">{threshold}</span></span><input type="range" min={20} max={240} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="w-full accent-[rgb(var(--accent))]" /></label>
            <label className="block text-sm"><span className="flex justify-between text-ink2">Smooth edges <span className="tabular">{blur}</span></span><input type="range" min={0} max={4} step={0.5} value={blur} onChange={(e) => setBlur(+e.target.value)} className="w-full" /></label>
            <label className="block text-sm"><span className="flex justify-between text-ink2">Bridge width <span className="tabular">{bridgeMm.toFixed(1)} mm</span></span><input type="range" min={material?.minBridgeMm ?? 1} max={6} step={0.1} value={bridgeMm} onChange={(e) => setBridgeMm(+e.target.value)} className="w-full" /></label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />Invert (cut the background)</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={bridgesOn} onChange={(e) => setBridgesOn(e.target.checked)} />Auto-bridges</label>
            </div>
          </div>
        )}

        <div className="card space-y-3 p-5">
          <p className="font-semibold">3 · Size & material</p>
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <label><span className="label">Width ({units})</span>
              <input type="number" className="input" min={3} max={units === "in" ? 47 : 120} step={units === "in" ? 0.5 : 1} value={sizeInput} onChange={(e) => {
                const v = +e.target.value || 0;
                setWidthMm(Math.max(30, Math.min(1200, Math.round(units === "in" ? v * 25.4 : v * 10))));
              }} />
            </label>
            <button className="btn btn-soft" onClick={() => setUnits(units === "cm" ? "in" : "cm")}>{units === "cm" ? "in" : "cm"}</button>
          </div>
          <p className="text-xs text-ink3">Height follows your artwork: {fmtLen(heightMm)}. Sheet includes a 1 cm border.</p>
          <label><span className="label">Material</span>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="select">
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name}{m.foodSafe ? " · food-safe" : ""}</option>)}
            </select>
          </label>
          <label><span className="label">Quantity</span><input type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(500, +e.target.value || 1)))} className="input" /></label>
          <p className="text-xs text-ink3">Bulk savings: 5+ = 10% · 10+ = 15% · 25+ = 25%</p>
        </div>

        <div className="card space-y-3 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink2">Price {price?.discountPct ? `(−${price.discountPct}% bulk)` : ""}</span>
            <span className="text-3xl font-bold tabular">{price ? price.total : "—"}</span>
          </div>
          {price && qty > 1 && <p className="text-right text-xs text-ink3">{price.unit} each · {currency}</p>}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this design (optional)" className="input" maxLength={80} aria-label="Design name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email for your proof (optional)" className="input" aria-label="Email" />
          <label className="flex items-start gap-2 text-sm text-ink2">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1" />
            <span>I own this artwork or have permission to use it. <ShieldCheck size={14} className="inline text-mint" /></span>
          </label>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          {added ? (
            <p className="rounded-xl bg-mint/15 p-3 text-sm text-mint"><Check size={16} className="mr-1 inline" />Added to your cart. We&apos;ll check the cut file before production and email you if anything needs changing.</p>
          ) : (
            <button className="btn btn-primary w-full !py-3.5 text-base" disabled={!result || busy} onClick={addToCart}>
              {busy ? <><Loader2 size={18} className="animate-spin" />Tracing your stencil…</> : "Add custom stencil to cart"}
            </button>
          )}
          <p className="text-xs text-ink3">No setup fee. Cut in 2–3 business days. You&apos;ll see a proof if a human check is needed.</p>
        </div>
      </div>
    </div>
  );
}
