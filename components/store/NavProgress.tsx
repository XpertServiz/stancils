"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** A thin gold bar across the top of the page while the next page loads (starts on any internal link click). */
function Bar() {
  const path = usePathname();
  const search = useSearchParams().toString();
  const [w, setW] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search) || u.pathname.startsWith("/admin")) return;
      stop();
      setW(8);
      timer.current = setInterval(() => setW((x) => (x < 85 ? x + (90 - x) * 0.12 : x)), 160);
    };
    document.addEventListener("click", click);
    return () => { document.removeEventListener("click", click); stop(); };
  }, []);
  // the new page arrived: finish the bar, then hide it
  useEffect(() => {
    stop();
    setW((x) => (x > 0 ? 100 : 0));
    const t = setTimeout(() => setW(0), 350);
    return () => clearTimeout(t);
  }, [path, search]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-[3px]" style={{ opacity: w ? 1 : 0, transition: "opacity .3s" }}>
      <div className="h-full bg-mustard shadow-[0_0_10px_rgba(212,175,90,.8)]" style={{ width: `${w}%`, transition: "width .25s ease-out" }} />
    </div>
  );
}

export function NavProgress() {
  return <Suspense fallback={null}><Bar /></Suspense>;
}
