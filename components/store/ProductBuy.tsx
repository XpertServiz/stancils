"use client";
import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Download, Check, Heart } from "lucide-react";
import { useCart } from "./CartContext";
import { toggleWishlist } from "@/app/actions/store";

export type BuyVariant = {
  id: string; name: string; price: string; compareAt: string | null; isDigital: boolean;
  available: number | null; stockLabel: string; widthMm: number | null; heightMm: number | null; material: string | null;
};

export function ProductBuy({ productId, variants, units }: { productId: string; variants: BuyVariant[]; units: "cm" | "in" }) {
  const physical = variants.filter((v) => !v.isDigital);
  const digital = variants.find((v) => v.isDigital);
  const [vid, setVid] = useState(physical[0]?.id ?? variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const { add } = useCart();
  const v = useMemo(() => variants.find((x) => x.id === vid)!, [vid, variants]);
  const dim = (mm: number | null) => (mm ? (units === "in" ? `${(mm / 25.4).toFixed(1)}″` : `${(mm / 10).toFixed(0)} cm`) : "");
  const out = v && v.available !== null && v.available <= 0;

  const doAdd = (id = vid, q = qty) => {
    add({ variantId: id, qty: q });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular">{v?.price}</span>
        {v?.compareAt && <span className="text-lg text-ink3 line-through tabular">{v.compareAt}</span>}
      </div>
      {physical.length > 0 && (
        <fieldset>
          <legend className="label">Size</legend>
          <div className="grid grid-cols-2 gap-2">
            {physical.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setVid(x.id)}
                aria-pressed={vid === x.id}
                className={`rounded-xl border p-3 text-left transition-colors ${vid === x.id ? "border-accent bg-accent/10" : "border-line hover:border-ink3"}`}
              >
                <span className="block text-sm font-semibold">{x.name}</span>
                <span className="block text-xs text-ink3">{x.widthMm ? `${dim(x.widthMm)} × ${dim(x.heightMm)}` : x.material ?? ""} · {x.price}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <p className={`text-sm ${out ? "text-danger" : "text-mint"}`}>{v?.stockLabel}</p>
      <div className="flex gap-2">
        <div className="flex items-center rounded-xl border border-line">
          <button className="p-3" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={16} /></button>
          <span className="w-10 text-center font-semibold tabular" aria-live="polite">{qty}</span>
          <button className="p-3" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(v?.available ?? 999, q + 1))}><Plus size={16} /></button>
        </div>
        <button className="btn btn-primary flex-1 !py-3 text-base" disabled={out} onClick={() => doAdd()}>
          {added ? <><Check size={18} />Added</> : <><ShoppingBag size={18} />{out ? "Out of stock" : "Add to cart"}</>}
        </button>
        <button
          className="btn btn-ghost !px-3"
          aria-label="Save to wishlist"
          onClick={async () => {
            const r = await toggleWishlist(productId);
            if ("needLogin" in r && r.needLogin) window.location.href = "/account/login";
            else setSaved(Boolean(r.saved));
          }}
        >
          <Heart size={18} className={saved ? "fill-accent text-accent" : ""} />
        </button>
      </div>
      {digital && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line p-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold"><Download size={16} className="text-mint" />Also as a digital cut file</p>
            <p className="text-xs text-ink3">SVG for Cricut, Silhouette & laser · instant download · {digital.price}</p>
          </div>
          <button className="btn btn-soft btn-sm" onClick={() => doAdd(digital.id, 1)}>Add file</button>
        </div>
      )}
      {/* sticky mobile add-to-cart */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-bg/95 p-3 backdrop-blur lg:hidden">
        <span className="font-bold tabular">{v?.price}</span>
        <button className="btn btn-primary flex-1" disabled={out} onClick={() => doAdd()}>{out ? "Out of stock" : "Add to cart"}</button>
      </div>
    </div>
  );
}
