"use client";
import { useMemo, useState } from "react";
import { Check, Download, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useCart } from "./CartContext";
import { sizeFieldLabel } from "@/lib/sizes";

export type BuyVariant = {
  id: string; name: string; price: string; compareAt: string | null; isDigital: boolean;
  available: number | null; stockLabel: string; widthMm: number | null; heightMm: number | null; material: string | null;
};

export function ProductBuy({ name, variants, units, whatsapp, sale }: { name: string; variants: BuyVariant[]; units: "cm" | "in"; whatsapp: string; sale: boolean }) {
  const physical = variants.filter((v) => !v.isDigital);
  const digital = variants.find((v) => v.isDigital);
  const [vid, setVid] = useState(physical[0]?.id ?? variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  const v = useMemo(() => variants.find((x) => x.id === vid)!, [vid, variants]);
  const label = (x: BuyVariant) => `${x.name} — ${x.price}`; // same size names as the cart and the order
  const out = v && v.available !== null && v.available <= 0;
  const q = Math.max(1, Math.min(v?.available ?? 999, qty || 1));

  const doAdd = (id = vid, n = q, open = true) => {
    add({ variantId: id, qty: n });
    if (!open) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
  const wa = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I'd like to order: ${name}${v ? ` (${v.name})` : ""}`)}` : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[22px] font-bold tabular text-goldink">{v?.price}</span>
        {v?.compareAt && <span className="text-xl font-semibold text-ink3 line-through tabular">{v.compareAt}</span>}
        {(v?.compareAt || sale) && <span className="rounded bg-accent px-2 py-1 text-[11px] font-bold uppercase text-onaccent">Sale</span>}
      </div>
      <p className="text-sm text-ink2"><u>Shipping</u> calculated at checkout.</p>

      {physical.length > 0 && (
        <div>
          <label htmlFor="size" className="mb-1.5 block text-sm font-semibold text-ink2">{sizeFieldLabel(physical.map((x) => x.name))}</label>
          <select id="size" className="select w-full max-w-sm" value={vid} onChange={(e) => setVid(e.target.value)}>
            {physical.map((x) => <option key={x.id} value={x.id}>{label(x)}</option>)}
          </select>
          {sizeFieldLabel(physical.map((x) => x.name)) === "Stencil size" && <p className="mt-1.5 text-xs text-ink2">Need a different size? <Link href="/custom-stencils" className="underline">Request a custom size quote</Link>.</p>}
        </div>
      )}
      <div>
        <label htmlFor="qty" className="mb-1.5 block text-sm">Quantity</label>
        <input id="qty" type="number" min={1} max={v?.available ?? 999} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input !w-24" />
      </div>
      <p className={`text-sm ${out ? "text-danger" : "text-mint"}`}>{v?.stockLabel}</p>

      <div className="space-y-2.5">
        <button className="h-12 w-full rounded-[2px] bg-stone text-sm font-semibold uppercase tracking-[.12em] text-mustard transition hover:brightness-125 disabled:opacity-50" disabled={out} onClick={() => doAdd()}>
          {added ? <span className="inline-flex items-center gap-2"><Check size={16} />Added to bag</span> : out ? "Sold out" : "Add to bag"}
        </button>
        <button
          className="h-12 w-full rounded-[2px] border border-stone bg-transparent text-sm font-semibold uppercase tracking-[.12em] text-ink transition hover:brightness-95 disabled:opacity-50"
          disabled={out}
          onClick={() => { doAdd(vid, q, false); window.location.href = "/checkout"; }}
        >
          Buy it now
        </button>
        {wa && (
          <a href={wa} target="_blank" rel="noopener" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-semibold text-ink2 transition hover:border-[#25D366] hover:text-[#128c4a]">
            <MessageCircle size={17} />Order on WhatsApp
          </a>
        )}
      </div>

      {digital && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-line p-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold"><Download size={16} className="text-mint" />Also as a digital cut file</p>
            <p className="text-xs text-ink3">Instant download · {digital.price}</p>
          </div>
          <button className="btn btn-soft btn-sm" onClick={() => doAdd(digital.id, 1)}>Add file</button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-bg/95 p-3 backdrop-blur lg:hidden">
        <span className="font-bold tabular">{v?.price}</span>
        <button className="btn btn-primary flex-1" disabled={out} onClick={() => doAdd()}>{out ? "Sold out" : "Add to bag"}</button>
      </div>
    </div>
  );
}
