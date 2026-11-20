"use client";
import { useRouter } from "next/navigation";

export function SortSelect({ value, options, hrefs }: { value: string; options: [string, string][]; hrefs: Record<string, string> }) {
  const router = useRouter();
  return (
    <select aria-label="Sort products" value={value} onChange={(e) => router.push(hrefs[e.target.value])} className="select !w-auto !py-2 text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
