"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ReviewForm } from "./ReviewForm";

/** "Write a review" button that opens the review form in a pop-up, so the customer never leaves the page. */
export function WriteReview({ label = "Write a review", className = "" }: { label?: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className || "inline-flex h-12 items-center rounded-lg bg-accent px-8 font-semibold text-onaccent transition hover:-translate-y-px hover:brightness-90"}>{label}</button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        className="m-auto w-[min(32rem,calc(100%-1.5rem))] rounded-2xl border border-line bg-bg p-0 text-ink shadow-2xl backdrop:bg-black/50"
        aria-label="Write a review"
      >
        <div className="relative max-h-[88vh] overflow-y-auto p-4 sm:p-5">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full hover:bg-s1"><X size={18} /></button>
          {open && <ReviewForm />}
          <p className="mt-3 text-center text-xs text-ink3">Your review is shown on our website after we approve it.</p>
        </div>
      </dialog>
    </>
  );
}
