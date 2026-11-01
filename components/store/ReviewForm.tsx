"use client";
import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/app/actions/store";

export function ReviewForm({ productId, orderNumber }: { productId?: string; orderNumber?: string }) {
  const [state, action, pending] = useActionState(submitReview, null as null | { ok: boolean; msg: string });
  const [rating, setRating] = useState(5);
  if (state?.ok) return <div className="card p-6 text-mint">{state.msg}</div>;
  return (
    <form action={action} className="card space-y-3 p-5">
      <p className="font-semibold">Write a review</p>
      <input type="hidden" name="productId" value={productId ?? ""} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}>
            <Star size={24} className={n <= rating ? "fill-mustard text-mustard" : "text-line"} />
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Your name" className="input" aria-label="Name" />
        <input name="email" type="email" required placeholder="Email (not shown)" className="input" aria-label="Email" />
      </div>
      <input name="title" placeholder="Headline (optional)" className="input" aria-label="Headline" />
      <textarea name="body" required minLength={10} rows={4} placeholder="How did your project turn out?" className="textarea" aria-label="Review" />
      <input name="orderNumber" defaultValue={orderNumber} placeholder="Order number (for a Verified badge)" className="input" aria-label="Order number" />
      {state && !state.ok && <p className="text-sm text-danger">{state.msg}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Submit review"}</button>
    </form>
  );
}
