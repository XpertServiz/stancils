"use client";
import { useEffect, useRef, useState } from "react";

/** "Laser Cut Reveal": a laser traces the mark, sparks fly, the piece drops and paint sprays through. ≤1.6s, once per session. */
export function Splash({ name }: { name: string }) {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("cc_splash")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (/bot|crawl|spider|lighthouse/i.test(navigator.userAgent)) return;
      sessionStorage.setItem("cc_splash", "1");
    } catch {
      return;
    }
    setShow(true);
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1050);
    const t3 = setTimeout(() => setPhase(3), 1450);
    const t4 = setTimeout(() => setShow(false), 1750);
    const skip = () => setShow(false);
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); window.removeEventListener("keydown", skip); window.removeEventListener("pointerdown", skip); };
  }, []);

  // spark particles following the laser head
  useEffect(() => {
    if (!show || !canvas.current) return;
    const c = canvas.current;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const cx = innerWidth / 2, cy = innerHeight / 2, R = 64;
    const parts: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (t < 1) {
        const a = -Math.PI / 2 + t * Math.PI * 2;
        const hx = cx + Math.cos(a) * R, hy = cy + Math.sin(a) * R;
        for (let i = 0; i < 4; i++) parts.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.8) * 4, life: 1 });
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#FF7A59";
        ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.035;
        if (p.life > 0) { ctx.fillStyle = `rgba(255,${150 + Math.random() * 80},90,${p.life})`; ctx.fillRect(p.x, p.y, 2, 2); }
      }
      if (now - start < 1200) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show) return null;
  return (
    <div className={`fixed inset-0 z-[100] grid place-items-center bg-bg transition-opacity duration-300 ${phase === 3 ? "opacity-0" : "opacity-100"}`} aria-hidden>
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative flex flex-col items-center gap-5" style={{ perspective: 800 }}>
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotateX(18deg) rotateY(-14deg)" }}>
          <defs>
            <radialGradient id="spray" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(var(--accent))" />
              <stop offset="100%" stopColor="rgb(var(--accent-3))" />
            </radialGradient>
          </defs>
          <rect x="8" y="8" width="144" height="144" rx="22" fill="rgb(var(--surface-2))" stroke="rgb(var(--line))" />
          {/* laser cut path */}
          <circle cx="80" cy="80" r="64" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="402" strokeDashoffset={phase >= 1 ? 0 : 402} style={{ transition: "stroke-dashoffset .7s linear", transform: "translate(0,0)" }} opacity={phase >= 2 ? 0 : 0.9} />
          {/* spray fill through the opening */}
          <g style={{ transition: "opacity .35s, transform .35s", opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "scale(1)" : "scale(.8)", transformOrigin: "80px 80px" }}>
            <path fill="url(#spray)" fillRule="evenodd" d="M80 30a50 50 0 1 0 0 100 50 50 0 0 0 0-100Zm0 20a30 30 0 0 1 26 15l-16 9a11 11 0 1 0 0 12l16 9A30 30 0 1 1 80 50Z" />
            <rect x="77" y="24" width="6" height="112" fill="rgb(var(--surface-2))" />
          </g>
          {/* cut-out piece dropping away */}
          <circle cx="80" cy="80" r="50" fill="rgb(var(--surface-1))" style={{ transition: "transform .45s cubic-bezier(.5,0,.8,.6), opacity .45s", transform: phase >= 1 ? "translate(14px, 220px) rotate(38deg)" : "none", opacity: phase >= 1 ? 0 : 1, transformOrigin: "80px 80px" }} />
        </svg>
        <p className="font-display text-xl font-bold tracking-tight" style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity .3s" }}>{name}</p>
      </div>
    </div>
  );
}
