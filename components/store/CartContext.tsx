"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { variantId?: string; customDesignId?: string; qty: number };
type Ctx = {
  lines: CartLine[];
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (l: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartCtx = createContext<Ctx | null>(null);
export const lineKey = (l: CartLine) => (l.variantId ? `v:${l.variantId}` : `d:${l.customDesignId}`);
const KEY = "cc_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((l: CartLine) => {
    setLines((prev) => {
      const k = lineKey(l);
      const i = prev.findIndex((x) => lineKey(x) === k);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: Math.min(999, next[i].qty + l.qty) };
        return next;
      }
      return [...prev, l];
    });
    setOpen(true);
  }, []);
  const setQty = useCallback((key: string, qty: number) => setLines((p) => p.map((l) => (lineKey(l) === key ? { ...l, qty: Math.max(1, Math.min(999, qty)) } : l))), []);
  const remove = useCallback((key: string) => setLines((p) => p.filter((l) => lineKey(l) !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((a, l) => a + l.qty, 0), open, setOpen, add, setQty, remove, clear, ready }),
    [lines, open, add, setQty, remove, clear, ready],
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
