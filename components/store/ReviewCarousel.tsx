"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Star } from "lucide-react";

export type ReviewItem = { id: string; name: string; rating: number; title: string; body: string; verified: boolean; date: string };

const Stars = ({ n }: { n: number }) => (
  <span className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={16} className={i <= n ? "fill-mustard text-mustard" : "text-line"} />)}
  </span>
);

function ReviewCard({ r }: { r: ReviewItem }) {
  const [more, setMore] = useState(false);
  return (
    <article className="flex h-full flex-col gap-2 rounded-[10px] border border-line bg-bg p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
      <Stars n={r.rating} />
      {r.title && <h3 className="font-bold">{r.title}</h3>}
      <p className={`text-sm leading-relaxed text-ink2 ${more ? "" : "line-clamp-5"}`}>{r.body}</p>
      {r.body.length > 180 && <button onClick={() => setMore(!more)} className="self-start text-xs font-semibold text-accent underline">{more ? "Show less" : "Read more"}</button>}
      <div className="mt-auto flex items-center justify-between pt-2 text-xs text-ink3">
        <span className="flex items-center gap-1 font-semibold text-ink">{r.name}{r.verified && <ShieldCheck size={14} className="text-mint" aria-label="Verified buyer" />}</span>
        <time>{r.date}</time>
      </div>
    </article>
  );
}

/** Reviews that slide on their own, pause when hovered, and swipe on a phone. */
export function ReviewCarousel({ reviews }: { reviews: ReviewItem[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setPages(Math.max(1, Math.round(el.scrollWidth / el.clientWidth)));
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, reviews.length]);

  const go = useCallback((dir: 1 | -1 | number, absolute = false) => {
    const el = track.current;
    if (!el) return;
    const w = el.clientWidth;
    const max = el.scrollWidth - w;
    let left = absolute ? dir * w : el.scrollLeft + dir * w;
    if (left > max + 4) left = 0;
    if (left < 0) left = max;
    el.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    if (paused || pages < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(1), 6000);
    return () => clearInterval(t);
  }, [paused, pages, go]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} role="region" aria-roledescription="carousel" aria-label="Customer reviews">
      <div className="relative">
        <div ref={track} onScroll={measure} className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2">
          {reviews.map((r) => (
            <div key={r.id} className="w-full shrink-0 snap-start md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"><ReviewCard r={r} /></div>
          ))}
        </div>
        {pages > 1 && (
          <>
            <button aria-label="Previous reviews" onClick={() => go(-1)} className="absolute -left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg shadow md:grid"><ChevronLeft size={20} /></button>
            <button aria-label="Next reviews" onClick={() => go(1)} className="absolute -right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg shadow md:grid"><ChevronRight size={20} /></button>
          </>
        )}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Choose reviews">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} role="tab" aria-selected={i === page} aria-label={`Reviews page ${i + 1}`} onClick={() => go(i, true)} className={`h-2.5 rounded-full transition-all ${i === page ? "w-6 bg-accent" : "w-2.5 bg-line"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
