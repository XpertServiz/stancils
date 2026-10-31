"use client";
import { useEffect, useRef, useState } from "react";

export type SplashStyle = "cube" | "laser" | "layers" | "spray";

const MARK = "M32 10a22 22 0 1 0 0 44 22 22 0 0 0 0-44Zm0 9a13 13 0 0 1 11.3 6.6l-7 4A5 5 0 1 0 36.3 38l7 4A13 13 0 1 1 32 19Z";
const DURATION = 1800;

/**
 * 3D intro shown once per browser session (≤1.8s, skippable with any tap or key).
 * Pure CSS 3D + a tiny canvas for particles — no three.js, so it never delays the page.
 * Skipped for reduced motion, bots/crawlers and repeat visits in the same session.
 */
export function Splash({ name, style = "cube" }: { name: string; style?: SplashStyle }) {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("cc_splash")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (/bot|crawl|spider|lighthouse|slurp/i.test(navigator.userAgent)) return;
      sessionStorage.setItem("cc_splash", "1");
    } catch {
      return;
    }
    setShow(true);
    const t1 = setTimeout(() => setLeaving(true), DURATION - 350);
    const t2 = setTimeout(() => setShow(false), DURATION);
    const skip = () => { setLeaving(true); setTimeout(() => setShow(false), 250); };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("keydown", skip); window.removeEventListener("pointerdown", skip); };
  }, []);

  // particles: laser sparks or paint mist, coloured from the active theme
  useEffect(() => {
    if (!show || !canvas.current || style === "cube") return;
    const c = canvas.current;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(",");
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const parts: { x: number; y: number; vx: number; vy: number; life: number; r: number }[] = [];
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const el = now - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (style === "laser" && el < 750) {
        const a = -Math.PI / 2 + (el / 750) * Math.PI * 2;
        const hx = cx + Math.cos(a) * 70, hy = cy + Math.sin(a) * 70 - 20;
        for (let i = 0; i < 4; i++) parts.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.9) * 4, life: 1, r: 1.6 });
        ctx.fillStyle = "#fff";
        ctx.shadowColor = `rgb(${accent})`;
        ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      if ((style === "spray" || style === "layers") && el > 300 && el < 1000) {
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 1 + Math.random() * 3.5;
          parts.push({ x: cx, y: cy - 20, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, r: 1 + Math.random() * 2.5 });
        }
      }
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += style === "laser" ? 0.2 : 0.02; p.life -= style === "laser" ? 0.035 : 0.018;
        if (p.life > 0) {
          ctx.fillStyle = style === "laser" ? `rgba(255,${170 + Math.random() * 70},110,${p.life})` : `rgba(${accent},${p.life * 0.55})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (el < DURATION) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, style]);

  if (!show) return null;
  const mark = (fill = "rgb(var(--accent))") => (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path fill={fill} fillRule="evenodd" d={MARK} />
      <rect x="30.5" y="8" width="3" height="48" fill="rgb(var(--surface-2))" />
    </svg>
  );

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-bg"
      style={{ transition: "opacity .35s ease, transform .35s ease", opacity: leaving ? 0 : 1, transform: leaving ? "scale(1.04)" : "none" }}
    >
      <style>{CSS}</style>
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 360px at 50% 45%, rgb(var(--accent) / .18), transparent 70%)" }} />
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative flex flex-col items-center gap-6" style={{ perspective: 900 }}>
        {style === "cube" && (
          <div className="sp-cube-wrap">
            <div className="sp-cube">
              {["front", "back", "right", "left", "top", "bottom"].map((f) => (
                <div key={f} className={`sp-face sp-${f}`}>{f === "front" || f === "back" ? <div className="h-16 w-16">{mark()}</div> : <div className="sp-grid" />}</div>
              ))}
            </div>
          </div>
        )}
        {style === "laser" && (
          <div className="sp-sheet">
            <div className="sp-sheet-depth" />
            <div className="sp-sheet-face">
              <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden>
                <circle cx="80" cy="80" r="64" fill="none" stroke="#fff" strokeWidth="2" className="sp-cutline" />
                <g className="sp-fill" style={{ transformOrigin: "80px 80px" }}>
                  <path transform="translate(16 16) scale(2)" fill="rgb(var(--accent))" fillRule="evenodd" d={MARK} />
                </g>
                <circle cx="80" cy="80" r="56" fill="rgb(var(--surface-1))" className="sp-plug" style={{ transformOrigin: "80px 80px" }} />
              </svg>
            </div>
          </div>
        )}
        {style === "layers" && (
          <div className="sp-layers">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`sp-layer sp-layer-${i}`}>
                <div className="h-24 w-24">{mark(i === 0 ? "rgb(var(--accent))" : i === 1 ? "rgb(var(--accent-2))" : "rgb(var(--accent-3))")}</div>
              </div>
            ))}
          </div>
        )}
        {style === "spray" && <div className="sp-spray h-28 w-28">{mark()}</div>}
        <p className={`sp-name font-display text-2xl font-bold tracking-tight ${style === "spray" ? "sp-name-3d" : ""}`}>{name}</p>
      </div>
    </div>
  );
}

const CSS = `
.sp-name{opacity:0;animation:sp-name .6s .75s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes sp-name{from{opacity:0;transform:translateY(12px) rotateX(40deg)}to{opacity:1;transform:none}}
.sp-name-3d{text-shadow:0 1px 0 rgb(var(--accent)/.9),0 2px 0 rgb(var(--accent)/.7),0 3px 0 rgb(var(--accent)/.5),0 4px 0 rgb(var(--accent)/.35),0 10px 24px rgb(0 0 0/.4)}

/* cube: a stencil cube spins in, then explodes outward */
.sp-cube-wrap{width:120px;height:120px;transform-style:preserve-3d;animation:sp-cube-in 1.45s cubic-bezier(.2,.8,.2,1) forwards}
.sp-cube{position:relative;width:120px;height:120px;transform-style:preserve-3d;animation:sp-cube-spin 1.45s cubic-bezier(.65,0,.35,1) forwards}
.sp-face{position:absolute;inset:0;display:grid;place-items:center;border-radius:18px;background:rgb(var(--surface-2)/.92);border:1px solid rgb(var(--accent)/.55);box-shadow:inset 0 0 30px rgb(var(--accent)/.18);backface-visibility:hidden}
.sp-grid{width:70%;height:70%;border-radius:10px;background:repeating-linear-gradient(45deg,rgb(var(--accent)/.35) 0 6px,transparent 6px 14px)}
.sp-front{transform:translateZ(60px);animation:sp-burst-f 1.45s forwards}
.sp-back{transform:rotateY(180deg) translateZ(60px);animation:sp-burst-b 1.45s forwards}
.sp-right{transform:rotateY(90deg) translateZ(60px);animation:sp-burst-r 1.45s forwards}
.sp-left{transform:rotateY(-90deg) translateZ(60px);animation:sp-burst-l 1.45s forwards}
.sp-top{transform:rotateX(90deg) translateZ(60px);animation:sp-burst-t 1.45s forwards}
.sp-bottom{transform:rotateX(-90deg) translateZ(60px);animation:sp-burst-d 1.45s forwards}
@keyframes sp-cube-in{0%{transform:translateZ(-600px) scale(.4);opacity:0}35%{opacity:1}100%{transform:none}}
@keyframes sp-cube-spin{0%{transform:rotateX(-30deg) rotateY(-200deg)}70%{transform:rotateX(-14deg) rotateY(20deg)}100%{transform:rotateX(0) rotateY(0)}}
@keyframes sp-burst-f{0%,80%{transform:translateZ(60px)}100%{transform:translateZ(160px) scale(1.15)}}
@keyframes sp-burst-b{0%,80%{transform:rotateY(180deg) translateZ(60px);opacity:1}100%{transform:rotateY(180deg) translateZ(200px);opacity:0}}
@keyframes sp-burst-r{0%,80%{transform:rotateY(90deg) translateZ(60px);opacity:1}100%{transform:rotateY(90deg) translateZ(220px);opacity:0}}
@keyframes sp-burst-l{0%,80%{transform:rotateY(-90deg) translateZ(60px);opacity:1}100%{transform:rotateY(-90deg) translateZ(220px);opacity:0}}
@keyframes sp-burst-t{0%,80%{transform:rotateX(90deg) translateZ(60px);opacity:1}100%{transform:rotateX(90deg) translateZ(220px);opacity:0}}
@keyframes sp-burst-d{0%,80%{transform:rotateX(-90deg) translateZ(60px);opacity:1}100%{transform:rotateX(-90deg) translateZ(220px);opacity:0}}

/* laser: a thick 3D sheet tilts in; the laser cuts, the plug drops, paint fills */
.sp-sheet{position:relative;width:170px;height:170px;transform-style:preserve-3d;animation:sp-tilt 1.6s cubic-bezier(.2,.8,.2,1) forwards}
.sp-sheet-face,.sp-sheet-depth{position:absolute;inset:0;border-radius:24px}
.sp-sheet-face{background:rgb(var(--surface-2));border:1px solid rgb(var(--line));transform:translateZ(6px)}
.sp-sheet-depth{background:rgb(var(--line));transform:translateZ(-6px);filter:brightness(.7)}
@keyframes sp-tilt{0%{transform:rotateX(55deg) rotateZ(-25deg) translateZ(-200px);opacity:0}30%{opacity:1}100%{transform:rotateX(14deg) rotateY(-16deg)}}
.sp-cutline{stroke-dasharray:403;stroke-dashoffset:403;animation:sp-cut .75s linear forwards,sp-fadeout .2s .95s forwards}
@keyframes sp-cut{to{stroke-dashoffset:0}}
@keyframes sp-fadeout{to{opacity:0}}
.sp-plug{animation:sp-drop .5s .78s cubic-bezier(.5,0,.8,.6) forwards}
@keyframes sp-drop{to{transform:translate(20px,260px) rotate(40deg);opacity:0}}
.sp-fill{opacity:0;animation:sp-pop .4s 1s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes sp-pop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}

/* layers: three stencil layers fan out in 3D, then stack into the finished mark */
.sp-layers{position:relative;width:140px;height:140px;transform-style:preserve-3d;animation:sp-orbit 1.6s cubic-bezier(.2,.8,.2,1) forwards}
.sp-layer{position:absolute;inset:0;display:grid;place-items:center;border-radius:20px;background:rgb(var(--surface-2)/.55);border:1px solid rgb(var(--line));backdrop-filter:blur(2px)}
.sp-layer-0{animation:sp-l0 1.6s cubic-bezier(.2,.8,.2,1) forwards}
.sp-layer-1{animation:sp-l1 1.6s cubic-bezier(.2,.8,.2,1) forwards}
.sp-layer-2{animation:sp-l2 1.6s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes sp-orbit{0%{transform:rotateX(62deg) rotateZ(-40deg) scale(.7)}60%{transform:rotateX(55deg) rotateZ(-20deg)}100%{transform:none}}
@keyframes sp-l0{0%{transform:translateZ(-160px);opacity:0}30%{opacity:1}60%{transform:translateZ(0)}100%{transform:none}}
@keyframes sp-l1{0%{transform:translateZ(0);opacity:0}30%{opacity:1}60%{transform:translateZ(70px)}100%{transform:none;opacity:0}}
@keyframes sp-l2{0%{transform:translateZ(160px);opacity:0}30%{opacity:1}60%{transform:translateZ(140px)}100%{transform:none;opacity:0}}

/* spray: the mark flies out of depth with an extruded edge while paint mist bursts */
.sp-spray{transform-style:preserve-3d;filter:drop-shadow(0 1px 0 rgb(var(--accent)/.8)) drop-shadow(0 2px 0 rgb(var(--accent)/.6)) drop-shadow(0 3px 0 rgb(var(--accent)/.4)) drop-shadow(0 14px 20px rgb(0 0 0/.45));animation:sp-fly 1.2s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes sp-fly{0%{transform:translateZ(-700px) rotateY(-540deg) rotateX(30deg);opacity:0}40%{opacity:1}100%{transform:none}}
`;
