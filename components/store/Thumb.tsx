"use client";
import { DesignArtClient } from "./DesignArtClient";
import { thumb } from "@/lib/img";

/** Small product picture for the cart and checkout: the photo if there is one, otherwise the stencil drawing. */
export function Thumb({ image, svg, uid, className = "h-14 w-14" }: { image?: string | null; svg?: string | null; uid: string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg border border-line bg-s1 ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb(image)!} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full p-1.5 text-accent"><DesignArtClient svg={svg} uid={uid} /></div>
      )}
    </div>
  );
}
