"use client";
import { useRef } from "react";

/** Gentle 3D tilt toward the pointer (desktop only; still for touch and reduced motion). */
export function Tilt3D({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 10}deg)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <div className={className} style={{ perspective: 900 }} onPointerMove={move} onPointerLeave={leave}>
      <div ref={ref} style={{ transition: "transform .25s cubic-bezier(.2,.8,.2,1)", transformStyle: "preserve-3d" }}>{children}</div>
    </div>
  );
}
