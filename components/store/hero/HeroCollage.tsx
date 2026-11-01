"use client";
import { useEffect, useRef } from "react";

/**
 * Hero cover image with a light 3D effect: the card tilts toward the pointer, floating
 * badges sit on separate depth layers (parallax) and a soft sheen follows the cursor.
 * Touch devices get a slow ambient float instead; reduced-motion gets a still image.
 * DECISION: plain CSS transforms (no three.js) so the hero image stays the LCP element and costs ~1 KB.
 */
export function HeroCollage({ src, alt, badges }: { src: string; alt: string; badges: { text: string; href: string }[] }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      el.classList.add("hc-ambient");
      return;
    }
    let raf = 0;
    const set = (x: number, y: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
        el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    };
    const leave = () => set(0, 0);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={wrap} className="hc relative mx-auto w-full max-w-[600px]" style={{ perspective: "1100px" }}>
      {/* soft glow blobs behind the card */}
      <div aria-hidden className="pointer-events-none absolute -inset-6 -z-0 rounded-[40px] opacity-80 blur-2xl" style={{ background: "radial-gradient(closest-side at 30% 30%, rgb(var(--accent) / .22), transparent), radial-gradient(closest-side at 75% 70%, rgb(150 120 240 / .22), transparent)" }} />
      <div className="hc-card relative">
        <div className="relative overflow-hidden rounded-[28px] shadow-[0_30px_80px_-30px_rgb(41_34_60/0.45)] ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} srcSet={src === "/hero/studio-collage.webp" ? "/hero/studio-collage-720.webp 720w, /hero/studio-collage.webp 1254w" : undefined} sizes="(min-width: 1024px) 600px, 92vw" alt={alt} width={1254} height={1254} fetchPriority="high" decoding="async" className="block aspect-square w-full object-cover" />
          <div aria-hidden className="hc-sheen pointer-events-none absolute inset-0" />
        </div>
        {badges[0] && (
          <a href={badges[0].href} className="hc-badge absolute -left-3 top-[12%] sm:-left-6" style={{ ["--z" as string]: "70px" }}>{badges[0].text}</a>
        )}
        {badges[1] && (
          <a href={badges[1].href} className="hc-badge absolute -right-2 top-[46%] sm:-right-6" style={{ ["--z" as string]: "95px" }}>{badges[1].text}</a>
        )}
        {badges[2] && (
          <a href={badges[2].href} className="hc-badge absolute bottom-[8%] left-[10%]" style={{ ["--z" as string]: "60px" }}>{badges[2].text}</a>
        )}
      </div>
      <style>{`
        .hc{--rx:0deg;--ry:0deg;--mx:50%;--my:50%}
        .hc-card{transform-style:preserve-3d;transform:rotateX(var(--rx)) rotateY(var(--ry));transition:transform .5s cubic-bezier(.2,.8,.2,1)}
        .hc-sheen{background:radial-gradient(420px circle at var(--mx) var(--my),rgb(255 255 255/.28),transparent 45%);mix-blend-mode:soft-light}
        .hc-badge{transform:translateZ(var(--z));display:inline-flex;align-items:center;gap:.4rem;border-radius:999px;padding:.55rem .95rem;font-size:.8rem;font-weight:600;
          color:rgb(41 34 60);background:rgb(255 255 255/.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          box-shadow:0 12px 30px -12px rgb(41 34 60/.35);border:1px solid rgb(255 255 255/.8);white-space:nowrap;transition:box-shadow .3s}
        .hc-badge:hover{box-shadow:0 14px 34px -10px rgb(var(--accent)/.55)}
        .hc-badge::before{content:"";width:.5rem;height:.5rem;border-radius:999px;background:rgb(var(--accent))}
        .hc-ambient .hc-card{animation:hc-float 9s ease-in-out infinite}
        @keyframes hc-float{0%,100%{transform:rotateX(4deg) rotateY(-6deg)}50%{transform:rotateX(-3deg) rotateY(5deg) translateY(-6px)}}
        @media (max-width:420px){.hc-badge{font-size:.72rem;padding:.45rem .75rem}}
      `}</style>
    </div>
  );
}
