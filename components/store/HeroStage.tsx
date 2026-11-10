"use client";
import Link from "next/link";
import { useRef } from "react";

type Orb = { src: string; alt: string; label: string; href: string; pos: string; size: string; z: number; delay: string; spin: string };

/**
 * Hero picture stage: the arched stencil photo with three round pictures (gifts, T-shirts, cybersigilism) that float in 3D,
 * tilt toward the pointer on desktop, and link to their categories. Still (no motion) for touch-less reduced-motion visitors.
 */
export function HeroStage({ heroImage, gifts, tee, cyber }: { heroImage: string; gifts: string; tee: string; cyber: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 12}deg)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };

  const orbs: Orb[] = [
    { src: tee, alt: "Personalized custom T-shirt", label: "Custom Tees", href: "/c/custom-t-shirts", pos: "right-[-4%] top-[9%]", size: "h-[clamp(108px,13vw,156px)] w-[clamp(108px,13vw,156px)]", z: 90, delay: "-1.5s", spin: "hs-spin" },
    { src: gifts, alt: "Gift arrangement", label: "Gifts", href: "/c/gifts", pos: "left-[-7%] bottom-[7%]", size: "h-[clamp(120px,15vw,180px)] w-[clamp(120px,15vw,180px)]", z: 110, delay: "-3s", spin: "hs-spin-rev" },
    { src: cyber, alt: "Cybersigilism art", label: "Cyber Art", href: "/c/cybersigilism-art", pos: "left-[-5%] top-[12%]", size: "h-[clamp(96px,11vw,132px)] w-[clamp(96px,11vw,132px)]", z: 70, delay: "-4.5s", spin: "hs-spin" },
  ];

  return (
    <div className="relative flex flex-[1_1_360px] justify-center" style={{ perspective: 1100 }} onPointerMove={move} onPointerLeave={leave}>
      <div ref={ref} className="relative w-full max-w-[440px]" style={{ transition: "transform .3s cubic-bezier(.2,.8,.2,1)", transformStyle: "preserve-3d" }}>
        {/* soft glow behind the arch */}
        <div className="hs-glow pointer-events-none absolute inset-x-[8%] -bottom-6 h-16 rounded-full bg-mustard/25 blur-2xl" style={{ transform: "translateZ(-40px)" }} aria-hidden />
        <div className="hs-float relative aspect-[11/13.5] w-full rounded-t-[999px] border-2 border-mustard bg-[#1B5A4B] p-2.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,.55)]" style={{ transformStyle: "preserve-3d" }}>
          <div className="relative h-full w-full overflow-hidden rounded-t-[999px] border border-mustard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="Ornate decorative stencil design" fetchPriority="high" className="block h-full w-full object-cover" />
            <span className="hs-shine pointer-events-none absolute inset-0" aria-hidden />
          </div>
        </div>
        {orbs.map((o) => (
          <div key={o.label} className={`absolute ${o.pos}`} style={{ transform: `translateZ(${o.z}px)`, transformStyle: "preserve-3d" }}>
            <div className="hs-bob" style={{ animationDelay: o.delay }}>
              <Link href={o.href} aria-label={o.label} className={`group relative block ${o.size}`}>
                <span className={`${o.spin} pointer-events-none absolute -inset-[9px] rounded-full border border-dashed border-mustard/70`} aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.src} alt={o.alt} className="h-full w-full rounded-full border-[3px] border-mustard bg-stone object-cover shadow-[0_18px_30px_-8px_rgba(0,0,0,.6),0_0_0_4px_rgba(212,175,90,.18)] transition duration-300 group-hover:scale-105" />
                <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.35),transparent_45%)]" aria-hidden />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-mustard bg-stone px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[.12em] text-mustard">{o.label}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
