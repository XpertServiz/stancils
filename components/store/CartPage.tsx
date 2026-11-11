"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./CartContext";
import { useQuote } from "./useQuote";
import { Thumb } from "./Thumb";

export const NOTE_KEY = "cc_cart_note";

export function CartPage() {
  const { lines, ready, setQty, remove } = useCart();
  const { quote, loading } = useQuote(lines);
  const [note, setNote] = useState("");
  useEffect(() => { try { setNote(sessionStorage.getItem(NOTE_KEY) ?? ""); } catch {} }, []);
  useEffect(() => { try { sessionStorage.setItem(NOTE_KEY, note); } catch {} }, [note]);

  if (ready && lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-5 text-ink2">Your cart is empty.</p>
        <Link href="/shop" className="inline-flex h-12 items-center rounded-lg bg-accent px-8 font-semibold text-onaccent">Continue shopping</Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
      <div>
        {lines.length > 0 && !quote && <div className="space-y-3">{lines.map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>}
        <ul className="divide-y divide-line border-y border-line">
          {quote?.lines.map((l) => (
            <li key={l.key} className="flex gap-4 py-5">
              <Thumb image={l.image} svg={l.svg} uid={`cp${l.key}`} className="h-24 w-24" />
              <div className="min-w-0 flex-1">
                {l.slug ? <Link href={`/p/${l.slug}`} className="font-semibold hover:text-accent">{l.name}</Link> : <p className="font-semibold">{l.name}</p>}
                <p className="text-sm text-ink3">{l.variantName} · {l.unitPrice}</p>
                {l.error && <p className="text-sm text-danger">{l.error}</p>}
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center rounded-lg border border-line">
                    <button className="p-2" aria-label="Decrease" onClick={() => setQty(l.key, l.qty - 1)}><Minus size={14} /></button>
                    <span className="w-9 text-center text-sm tabular">{l.qty}</span>
                    <button className="p-2" aria-label="Increase" onClick={() => setQty(l.key, l.qty + 1)}><Plus size={14} /></button>
                  </div>
                  <button aria-label={`Remove ${l.name}`} className="text-ink3 hover:text-danger" onClick={() => remove(l.key)}><Trash2 size={17} /></button>
                </div>
              </div>
              <span className="font-semibold tabular">{l.total}</span>
            </li>
          ))}
        </ul>
        <label className="mt-6 block"><span className="mb-1.5 block text-sm font-semibold">Order note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="textarea" placeholder="Anything we should know? (optional)" /></label>
      </div>
      <aside className="h-fit rounded-[10px] bg-s1 p-6">
        <h2 className="text-lg font-bold">Order summary</h2>
        {quote && (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink2">Subtotal</dt><dd className="tabular font-semibold">{quote.subtotal}</dd></div>
            {quote.discount && <div className="flex justify-between text-mint"><dt>Discount ({quote.discountLabel})</dt><dd className="tabular">−{quote.discount}</dd></div>}
          </dl>
        )}
        <p className="mt-3 text-xs text-ink3">Taxes and shipping calculated at checkout.</p>
        <Link href="/checkout" className={`mt-5 flex h-12 items-center justify-center rounded-lg bg-accent font-semibold text-onaccent transition hover:brightness-90 ${loading ? "opacity-70" : ""}`}>Check out{quote ? ` · ${quote.subtotal}` : ""}</Link>
        <Link href="/shop" className="mt-3 block text-center text-sm text-ink2 underline">Continue shopping</Link>
      </aside>
    </div>
  );
}
