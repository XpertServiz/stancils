import Link from "next/link";
import { Star } from "lucide-react";
import type { Card } from "@/lib/catalog";
import { DesignArt } from "../DesignArt";
import { QuickAdd } from "./QuickAdd";

export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  return (
    <article className="group tilt card relative flex flex-col overflow-hidden" data-priority={priority || undefined}>
      <Link href={`/p/${p.slug}`} className="relative block aspect-square art-tile p-6 text-accent" aria-label={p.name}>
        <DesignArt svg={p.svg} colors={p.colors} uid={`pc${p.id}`} title={p.name} className="h-full w-full transition-transform duration-500 ease-brand group-hover:scale-[1.04]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {p.badges.slice(0, 3).map((b) => <span key={b.label} className={`badge badge-${b.tone}`}>{b.label}</span>)}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link href={`/p/${p.slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-accent">{p.name}</Link>
        {p.ratingCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-ink3"><Star size={12} className="fill-mustard text-mustard" />{p.rating.toFixed(1)} ({p.ratingCount})</div>
        )}
        <p className="text-xs text-ink3">{p.stockLabel}</p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="tabular">
            {p.from && <span className="mr-1 text-xs text-ink3">From</span>}
            <span className="font-bold">{p.price}</span>
            {p.compareAt && <span className="ml-2 text-xs text-ink3 line-through">{p.compareAt}</span>}
          </div>
          {p.defaultVariantId && p.stockLabel !== "Out of stock" && <QuickAdd variantId={p.defaultVariantId} name={p.name} />}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ cards }: { cards: Card[] }) {
  if (!cards.length) return <p className="py-16 text-center text-ink2">No stencils match — try another search or filter.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {cards.map((c, i) => <ProductCard key={c.id} p={c} priority={i < 4} />)}
    </div>
  );
}
