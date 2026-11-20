"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type SplashStyle = "naqsh" | "cube" | "laser" | "layers" | "spray";

const MARK = "M32 10a22 22 0 1 0 0 44 22 22 0 0 0 0-44Zm0 9a13 13 0 0 1 11.3 6.6l-7 4A5 5 0 1 0 36.3 38l7 4A13 13 0 1 1 32 19Z";
const durationOf = (s: SplashStyle) => (s === "naqsh" ? 4100 : 1300);
import { LogoMark } from "./BrandLogo";

/**
 * 3D intro shown on arrival — once per browser session for the shop and once for the admin panel (≤1.5s, skippable with any tap or key).
 * It is part of the server-rendered page, so it covers the screen before anything else paints (the head script in app/layout.tsx
 * hides it at once for repeat visits, reduced motion and crawlers; a CSS fail-safe removes it after 7s even if scripts never run).
 * Pure CSS 3D + a tiny canvas for particles — no three.js, so it never delays the page.
 * Skipped for reduced motion, bots/crawlers and repeat visits in the same session.
 */
export function Splash({ name, style = "naqsh" }: { name: string; style?: SplashStyle }) {
  const admin = usePathname().startsWith("/admin");
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const key = admin ? "cc_splash_a" : "cc_splash_s";
      if (sessionStorage.getItem(key) || window.matchMedia("(prefers-reduced-motion: reduce)").matches || /bot|crawl|spider|lighthouse|slurp/i.test(navigator.userAgent)) {
        setShow(false);
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      setShow(false);
      return;
    }
    const D = durationOf(style);
    const t1 = setTimeout(() => setLeaving(true), D - 350);
    const t2 = setTimeout(() => setShow(false), D);
    const skip = () => { setLeaving(true); setTimeout(() => setShow(false), 250); };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("keydown", skip); window.removeEventListener("pointerdown", skip); };
  }, []);

  // particles: laser sparks or paint mist, coloured from the active theme
  useEffect(() => {
    if (!show || !canvas.current || style === "cube" || style === "naqsh") return;
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
      if (el < durationOf(style)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, style]);

  if (!show) return null;
  if (style === "naqsh") {
    return (
      <div
        aria-hidden
        className="cc-splash fixed inset-0 z-[1000] grid place-items-center overflow-hidden"
        style={{ background: "#0E2F28", transition: "opacity .35s ease, transform .35s ease", opacity: leaving ? 0 : 1, transform: leaving ? "scale(1.04)" : "none" }}
      >
        <style>{NQ_CSS}</style>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(520px 340px at 50% 46%, rgba(212,175,90,.22), transparent 70%)" }} />
        <div className="relative flex flex-col items-center" style={{ perspective: 900 }}>
          <div className="nq-stage">
            {/* the empty round where the logo will go */}
            <svg className="nq-target" viewBox="0 0 180 180" width="180" height="180"><circle cx="90" cy="90" r="84" fill="none" stroke="#D4AF5A" strokeWidth="2" strokeDasharray="7 9" /><circle cx="90" cy="90" r="70" fill="rgba(212,175,90,.06)" /></svg>
            <span className="nq-burst" />
            <div className="nq-logo"><LogoMark size={176} /></div>
            {/* the little stencil sheet that walks in, looks around for the round, then jumps in */}
            <div className="nq-walker">
              <svg viewBox="0 0 90 120" width="90" height="120">
                <ellipse cx="45" cy="116" rx="26" ry="4" fill="#000" opacity=".25" />
                <g className="nq-bob">
                  <g className="nq-leg nq-leg-a"><rect x="30" y="76" width="9" height="34" rx="4.5" fill="#D4AF5A" /><rect x="26" y="106" width="16" height="7" rx="3.5" fill="#8F6E24" /></g>
                  <g className="nq-leg nq-leg-b"><rect x="51" y="76" width="9" height="34" rx="4.5" fill="#D4AF5A" /><rect x="48" y="106" width="16" height="7" rx="3.5" fill="#8F6E24" /></g>
                  <g className="nq-look">
                    <rect x="14" y="14" width="62" height="70" rx="9" fill="#E8EFEA" stroke="#D4AF5A" strokeWidth="2.5" />
                    <g fill="#0E2F28"><path d="M45 28l9 9-9 9-9-9Z" /><rect x="22" y="58" width="9" height="9" rx="1.5" /><rect x="59" y="58" width="9" height="9" rx="1.5" /><circle cx="45" cy="66" r="3.5" /></g>
                    <g className="nq-eyes"><circle cx="35" cy="22" r="4.2" fill="#fff" stroke="#0E2F28" strokeWidth="1.3" /><circle cx="55" cy="22" r="4.2" fill="#fff" stroke="#0E2F28" strokeWidth="1.3" /><circle cx="35" cy="22" r="1.8" fill="#0E2F28" /><circle cx="55" cy="22" r="1.8" fill="#0E2F28" /></g>
                    <g fill="#D4AF5A"><path d="M45 14c-4-8-13-8-13-2 0 4 7 5 13 2Z" /><path d="M45 14c4-8 13-8 13-2 0 4-7 5-13 2Z" /><circle cx="45" cy="14" r="3" /></g>
                  </g>
                  <g className="nq-arm"><rect x="68" y="44" width="22" height="6" rx="3" fill="#D4AF5A" /><circle cx="90" cy="40" r="9" fill="rgba(255,255,255,.25)" stroke="#F8E8AE" strokeWidth="2.5" /><path d="M96 46l6 7" stroke="#F8E8AE" strokeWidth="3" strokeLinecap="round" /></g>
                </g>
              </svg>
            </div>
          </div>
          <p className="nq-name mt-5 font-display text-[28px] font-bold tracking-[.03em] text-[#F3F5F1] sm:text-[34px]">{name}</p>
          <p className="nq-sub mt-1 text-[11px] uppercase tracking-[.28em] text-[#D4AF5A]">Stencils · Gifts · Custom tees · Art</p>
        </div>
      </div>
    );
  }
  const mark = (fill = "rgb(var(--accent))") => (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path fill={fill} fillRule="evenodd" d={MARK} />
      <rect x="30.5" y="8" width="3" height="48" fill="rgb(var(--surface-2))" />
    </svg>
  );

  return (
    <div
      aria-hidden
      className="cc-splash fixed inset-0 z-[1000] grid place-items-center overflow-hidden bg-bg"
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

const NQ_CSS = `
.nq-stage{position:relative;width:min(92vw,360px);height:240px;transform-style:preserve-3d}
.nq-target,.nq-logo{position:absolute;left:50%;top:50%;margin:-90px 0 0 -90px;width:180px;height:180px}
.nq-target{animation:nq-spin 6s linear infinite,nq-hide .01s 2.6s forwards}
.nq-logo{display:grid;place-items:center;opacity:0;transform:scale(.1) rotateY(540deg);filter:drop-shadow(0 18px 24px rgba(0,0,0,.45));animation:nq-pop .85s 2.6s cubic-bezier(.2,.9,.25,1.25) forwards}
.nq-burst{position:absolute;left:50%;top:50%;margin:-90px 0 0 -90px;width:180px;height:180px;border-radius:50%;border:3px solid #F8E8AE;opacity:0;animation:nq-burst .8s 2.6s ease-out forwards}
.nq-walker{position:absolute;left:50%;top:50%;margin:-60px 0 0 -45px;animation:nq-walk 3s linear forwards;transform:translate(calc(-50vw - 140px),70px)}
.nq-bob{animation:nq-bob .275s ease-in-out 4}
.nq-leg{transform-box:fill-box;transform-origin:50% 0}
.nq-leg-a{animation:nq-step .275s ease-in-out 4 alternate}
.nq-leg-b{animation:nq-step .275s ease-in-out 4 alternate-reverse}
.nq-look{transform-box:fill-box;transform-origin:50% 100%;animation:nq-look 1.5s 1.15s ease-in-out both}
.nq-eyes{animation:nq-eyes 1.5s 1.15s ease-in-out both}
.nq-arm{transform-box:fill-box;transform-origin:0% 50%;animation:nq-scan 1.5s 1.1s ease-in-out both}
.nq-name,.nq-sub{opacity:0;animation:nq-rise .6s 3s cubic-bezier(.2,.8,.2,1) forwards}
.nq-sub{animation-delay:3.15s}
@keyframes nq-walk{0%{transform:translate(calc(-50vw - 140px),70px)}37%{transform:translate(-175px,70px)}67%{transform:translate(-175px,70px)}76%{transform:translate(-120px,-50px) rotate(-10deg)}84%{transform:translate(-45px,-30px) scale(.7) rotate(12deg)}89%{transform:translate(0,0) scale(.15) rotate(0);opacity:1}90%,100%{transform:translate(0,0) scale(0);opacity:0}}
@keyframes nq-step{from{transform:rotate(-28deg)}to{transform:rotate(28deg)}}
@keyframes nq-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes nq-look{0%,100%{transform:rotate(0)}25%{transform:rotate(-7deg)}60%{transform:rotate(7deg)}}
@keyframes nq-eyes{0%,100%{transform:translateX(0)}25%{transform:translateX(-2.5px)}60%{transform:translateX(2.5px)}85%{transform:translateX(3px) translateY(2px)}}
@keyframes nq-scan{0%,100%{transform:rotate(0)}30%{transform:rotate(-24deg)}65%{transform:rotate(18deg)}}
@keyframes nq-spin{to{transform:rotate(360deg)}}
@keyframes nq-hide{to{opacity:0}}
@keyframes nq-pop{0%{opacity:0;transform:scale(.1) rotateY(540deg)}60%{opacity:1}100%{opacity:1;transform:scale(1) rotateY(0)}}
@keyframes nq-burst{0%{opacity:.9;transform:scale(.8)}100%{opacity:0;transform:scale(1.7)}}
@keyframes nq-rise{from{opacity:0;transform:translateY(12px) rotateX(40deg)}to{opacity:1;transform:none}}
`;
