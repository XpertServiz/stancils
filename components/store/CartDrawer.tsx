"use client";
import Link from "next/link";
import { useEffect } from "react";
import { X, Minus, Plus, Trash2, Truck } from "lucide-react";
import { useCart } from "./CartContext";
import { useQuote } from "./useQuote";
import { DesignArtClient } from "./DesignArtClient";

export function CartDrawer() {
  const { lines, open, setOpen, setQty, remove } = useCart();
  const { quote, loading } = useQuote(lines, {}, open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-bg shadow-2xl transition-transform duration-300 ease-brand ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">Your cart</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close cart"><X size={16} /></button>
        </header>

        {quote?.needsShipping && quote.freeShippingThreshold && (
          <div className="border-b border-line px-5 py-3 text-sm">
            <div className="mb-2 flex items-center gap-2 text-ink2">
              <Truck size={16} className="text-mint" />
              {quote.freeShippingRemaining ? <>Add <b className="text-ink">{quote.freeShippingRemaining}</b> for free shipping</> : <>You&apos;ve unlocked <b className="text-mint">free shipping</b></>}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-s2"><div className="h-full rounded-full bg-mint transition-all" style={{ width: `${quote.freeShippingProgress * 100}%` }} /></div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 && (
            <div className="py-16 text-center text-ink2">
              <p className="mb-4">Your cart is empty.</p>
              <Link href="/shop" className="btn btn-primary" onClick={() => setOpen(false)}>Browse stencils</Link>
            </div>
          )}
          {lines.length > 0 && !quote && <div className="space-y-3">{lines.map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>}
          <ul className="space-y-4">
            {quote?.lines.map((l) => (
              <li key={l.key} className="flex gap-3">
                <div className="art-tile h-20 w-20 shrink-0 rounded-xl p-2 text-accent"><DesignArtClient svg={l.svg} uid={`cart${l.key}`} /></div>
                <div className="min-w-0 flex-1">
                  {l.slug ? <Link href={`/p/${l.slug}`} onClick={() => setOpen(false)} className="line-clamp-1 font-semibold hover:text-accent">{l.name}</Link> : <p className="font-semibold">{l.name}</p>}
                  <p className="line-clamp-1 text-xs text-ink3">{l.variantName}</p>
                  {l.error && <p className="text-xs text-danger">{l.error}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-line">
                      <button className="p-1.5" aria-label="Decrease" onClick={() => setQty(l.key, l.qty - 1)}><Minus size={14} /></button>
                      <span className="w-8 text-center text-sm tabular">{l.qty}</span>
                      <button className="p-1.5" aria-label="Increase" onClick={() => setQty(l.key, l.qty + 1)}><Plus size={14} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular">{l.total}</span>
                      <button aria-label="Remove" className="text-ink3 hover:text-danger" onClick={() => remove(l.key)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {quote && lines.length > 0 && (
          <footer className="space-y-3 border-t border-line px-5 py-4">
            <div className="flex justify-between text-sm"><span className="text-ink2">Subtotal</span><span className="font-semibold tabular">{quote.subtotal}</span></div>
            <p className="text-xs text-ink3">Shipping, discounts and taxes are calculated at checkout. Prices in {quote.currency}.</p>
            <Link href="/checkout" onClick={() => setOpen(false)} className={`btn btn-primary w-full ${loading ? "opacity-70" : ""}`}>Checkout · {quote.subtotal}</Link>
            <button className="btn btn-ghost w-full" onClick={() => setOpen(false)}>Keep shopping</button>
          </footer>
        )}
      </aside>
    </div>
  );
}
