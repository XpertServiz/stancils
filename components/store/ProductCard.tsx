import Link from "next/link";
import { Star } from "lucide-react";
import type { Card } from "@/lib/catalog";
import { DesignArt } from "../DesignArt";
import { thumb } from "@/lib/img";
import { QuickAdd } from "./QuickAdd";

export function CardImage({ p, priority }: { p: Card; priority?: boolean }) {
  if (p.image) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb(p.image)!} alt={p.name} loading={priority ? "eager" : "lazy"} decoding="async" className={`absolute inset-0 h-full w-full object-cover transition duration-[400ms] ${p.image2 ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`} />
        {p.image2 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb(p.image2)!} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-[400ms] group-hover:opacity-100" />
        )}
      </>
    );
  }
  if (p.svg) {
    return <DesignArt svg={p.svg} colors={p.colors} uid={`pc${p.id}`} title={p.name} className="absolute inset-0 h-full w-full p-6 text-accent transition-transform duration-[400ms] group-hover:scale-[1.04]" />;
  }
  return <span className="absolute inset-0 grid place-items-center bg-s1 p-4 text-center text-sm font-semibold text-ink3">{p.name}</span>;
}

export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[10px] border border-line bg-bg shadow-[0_1px_2px_rgba(0,0,0,.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,.10)]">
      <Link href={`/p/${p.slug}`} className="relative block aspect-square overflow-hidden bg-s1" aria-label={p.name}>
        <CardImage p={p} priority={priority} />
        {p.soldOut && <span className="absolute inset-0 bg-white/50" />}
        {p.off > 0 && !p.soldOut && <span className="absolute right-2 top-2 -rotate-6 rounded-md bg-accent px-2 py-1 text-[10px] font-extrabold uppercase leading-tight tracking-wide text-onaccent shadow">Big<br />Sale</span>}
        {p.soldOut && <span className="absolute left-2 top-2 rounded bg-[#1c1b1a] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Sold out</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link href={`/p/${p.slug}`} className="line-clamp-2 text-[14px] font-semibold leading-snug hover:text-accent">{p.name}</Link>
        <div className="flex items-center gap-1 text-xs text-ink3">
          {p.ratingCount > 0 ? <><Star size={12} className="fill-mustard text-mustard" /><span>{p.rating.toFixed(1)} · {p.ratingCount} review{p.ratingCount === 1 ? "" : "s"}</span></> : "No reviews"}
        </div>
        {p.off > 0 && <span className="w-fit rounded bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-onaccent">{p.off}% discount</span>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="tabular leading-tight">
            <span className="mr-1.5 text-[15px] font-bold">{p.from ? "from " : ""}{p.price}</span>
            {p.compareAt && <span className="text-xs text-ink3 line-through">{p.compareAt}</span>}
          </div>
          {p.defaultVariantId && !p.soldOut && <QuickAdd variantId={p.defaultVariantId} name={p.name} />}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ cards, cols = 4 }: { cards: Card[]; cols?: 3 | 4 }) {
  if (!cards.length) return <p className="py-16 text-center text-ink2">Nothing here yet — try another search or filter.</p>;
  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 ${cols === 4 ? "xl:grid-cols-4" : ""}`}>
      {cards.map((c, i) => <ProductCard key={c.id} p={c} priority={i < 4} />)}
    </div>
  );
}
