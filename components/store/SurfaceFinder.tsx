"use client";
import { useRouter } from "next/navigation";
import { setSurface } from "@/app/actions/prefs";

const SURFACES = [
  ["wall", "Wall"], ["furniture", "Furniture"], ["floor-tile", "Floor"], ["cake-cookie", "Cake"], ["coffee", "Coffee"], ["fabric", "Fabric"], ["sign-logo", "Sign"], ["craft-journal", "Craft"],
] as const;

export function SurfaceFinder() {
  const router = useRouter();
  return (
    <div className="glass rounded-2xl p-3">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-ink3">What are you stencilling?</p>
      <div className="flex flex-wrap gap-2">
        {SURFACES.map(([slug, label]) => (
          <button key={slug} className="chip hover:border-accent hover:text-accent" onClick={async () => { await setSurface(slug); router.push(`/c/${slug}`); }}>{label}</button>
        ))}
      </div>
    </div>
  );
}

export function SurfaceBar({ surface, name }: { surface: string; name: string }) {
  const router = useRouter();
  return (
    <div className="border-b border-line/60 bg-s1/70 text-xs">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 sm:px-6">
        <span className="text-ink3">Shopping for:</span>
        <a href={`/c/${surface}`} className="font-semibold text-ink hover:text-accent">{name}</a>
        <button aria-label="Clear surface" className="ml-1 text-ink3 hover:text-danger" onClick={async () => { await setSurface(null); router.refresh(); }}>✕</button>
      </div>
    </div>
  );
}
