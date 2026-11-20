"use client";
import Link from "next/link";
import { useState } from "react";
import type { Card } from "@/lib/catalog";
import { DesignArt } from "../DesignArt";
import { thumb } from "@/lib/img";
import { useCart } from "./CartContext";

/** Pattern artwork (SVG) sits on a tinted square with room around it; photos fill the square. */
const isArt = (u: string) => /\.svg(\?|$)/.test(u);
const artBg = (u: string) => (u.includes("cyber") ? "#0E2F28" : u.includes("gift") ? "#EFE6CF" : u.includes("tee") ? "#DDE8E1" : "#E3EAE5");

export function CardImage({ p, priority }: { p: Card; priority?: boolean }) {
  if (p.image && isArt(p.image)) {
    return (
      <span className="absolute inset-0 grid place-items-center p-[16%]" style={{ background: artBg(p.image) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.name} loading={priority ? "eager" : "lazy"} className="h-auto w-full transition-transform duration-[250ms] group-hover:scale-[1.04]" />
      </span>
    );
  }
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
  if (p.svg) return <DesignArt svg={p.svg} colors={p.colors} uid={`pc${p.id}`} title={p.name} className="absolute inset-0 h-full w-full p-6 text-accent transition-transform duration-[400ms] group-hover:scale-[1.04]" />;
  return <span className="absolute inset-0 grid place-items-center bg-s1 p-4 text-center text-sm font-semibold text-ink3">{p.name}</span>;
}

/** Product card: picture, category, name, price, a size dropdown (stencil / T-shirt / gift sizes) and Add to bag. */
export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  const { add } = useCart();
  const [vid, setVid] = useState(p.sizes[0]?.id ?? p.defaultVariantId ?? "");
  const cur = p.sizes.find((s) => s.id === vid);
  const tag = p.soldOut ? "SOLD OUT" : p.off > 0 ? `${p.off}% OFF` : p.tag;
  return (
    <article className="flex flex-col gap-3">
      <Link href={`/p/${p.slug}`} aria-label={`View ${p.name}`} className="group relative block aspect-square overflow-hidden rounded-md border border-line bg-s1">
        <CardImage p={p} priority={priority} />
        {tag && <span className="absolute left-3 top-3 rounded-[3px] bg-stone px-[9px] py-1 text-[11px] font-semibold tracking-[.08em] text-mustard">{tag}</span>}
      </Link>
      <div className="flex flex-col gap-1">
        {p.sub && <span className="text-xs uppercase tracking-[.1em] text-goldink">{p.sub}</span>}
        <Link href={`/p/${p.slug}`} className="font-display text-[23px] font-bold leading-[1.15] text-ink hover:text-accent">{p.name}</Link>
        <span className="flex items-baseline gap-2.5 text-base tabular">
          <b className="text-goldink">{cur ? cur.price : `${p.from ? "from " : ""}${p.price}`}</b>
          {p.compareAt && <s className="text-ink2">{p.compareAt}</s>}
        </span>
      </div>
      {p.sizes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`sz-${p.id}`} className="text-[13px] font-semibold text-ink2">{p.sizeLabel}</label>
          <select id={`sz-${p.id}`} value={vid} onChange={(e) => setVid(e.target.value)} className="w-full rounded-[2px] border border-ink bg-white px-2.5 py-2.5 text-sm text-ink">
            {p.sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      {vid && !p.soldOut && (
        <button type="button" onClick={() => add({ variantId: vid, qty: 1 })} className="self-start rounded-[2px] bg-stone px-5 py-[11px] text-sm font-semibold text-mustard transition hover:brightness-125">Add to bag</button>
      )}
    </article>
  );
}

export function ProductGrid({ cards, cols = 4 }: { cards: Card[]; cols?: 3 | 4 }) {
  if (!cards.length) return <p className="py-16 text-center text-lg text-ink2">No matches yet. Try another search or collection.</p>;
  return (
    <div className={`grid grid-cols-1 gap-x-6 gap-y-9 min-[480px]:grid-cols-2 md:grid-cols-3 ${cols === 4 ? "xl:grid-cols-4" : ""}`}>
      {cards.map((c, i) => <ProductCard key={c.id} p={c} priority={i < 4} />)}
    </div>
  );
}
