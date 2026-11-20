"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ProductGallery({ images, name, fallback }: { images: { url: string; alt: string }[]; name: string; fallback?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState("50% 50%");
  if (!images.length) return <div className="relative aspect-square overflow-hidden rounded-[10px] border border-line bg-s1">{fallback}</div>;
  const n = images.length;
  return (
    <div>
      <div
        className={`relative aspect-square overflow-hidden rounded-[10px] border border-line bg-s1 ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onClick={() => setZoom(!zoom)}
        onMouseMove={(e) => {
          if (!zoom) return;
          const r = e.currentTarget.getBoundingClientRect();
          setPos(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i].url} alt={images[i].alt || name} fetchPriority="high" className="h-full w-full object-cover transition-transform duration-200" style={zoom ? { transform: "scale(2)", transformOrigin: pos } : undefined} />
        {n > 1 && (
          <>
            <button aria-label="Previous image" onClick={(e) => { e.stopPropagation(); setI((i + n - 1) % n); }} className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/60"><ChevronLeft size={20} /></button>
            <button aria-label="Next image" onClick={(e) => { e.stopPropagation(); setI((i + 1) % n); }} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/60"><ChevronRight size={20} /></button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {images.map((im, k) => (
            <button key={im.url} onClick={() => { setI(k); setZoom(false); }} aria-label={`Show image ${k + 1}`} aria-current={k === i} className={`h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 ${k === i ? "border-accent" : "border-transparent hover:border-line"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
