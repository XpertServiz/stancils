import type { Metadata } from "next";
import { ReviewForm } from "@/components/store/ReviewForm";

export const metadata: Metadata = { title: "Write a review", robots: { index: false } };

export default async function NewReview({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">How did it go?</h1>
      <ReviewForm orderNumber={sp.order} />
    </div>
  );
}
