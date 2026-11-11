"use client";
import { useState } from "react";

/**
 * YouTube video that costs nothing until clicked: a poster picture with a play button, then the real player (privacy-friendly
 * youtube-nocookie address, autoplay on click). Keeps the homepage fast and the visitor's data private until they press play.
 */
export function VideoFacade({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border-2 border-mustard bg-black">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setOn(true)} aria-label={`Play video: ${title}`} className="group absolute inset-0 block h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" aria-hidden />
          <span className="absolute left-1/2 top-1/2 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-mustard bg-stone/90 text-mustard shadow-[0_10px_30px_rgba(0,0,0,.5)] transition duration-300 group-hover:scale-110 group-hover:bg-mustard group-hover:text-[#0E2F28]" aria-hidden>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}
