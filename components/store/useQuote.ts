"use client";
import { useEffect, useState } from "react";
import type { QuoteJson } from "@/lib/quote-json";
import type { CartLine } from "./CartContext";

export function useQuote(lines: CartLine[], extra: { discountCode?: string | null; shippingId?: string | null; country?: string; email?: string | null } = {}, enabled = true) {
  const [quote, setQuote] = useState<QuoteJson | null>(null);
  const [loading, setLoading] = useState(false);
  const sig = JSON.stringify([lines, extra]);
  useEffect(() => {
    if (!enabled) return;
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const ctl = new AbortController();
    setLoading(true);
    fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines, ...extra }), signal: ctl.signal })
      .then((r) => r.json())
      .then((q) => !q.error && setQuote(q))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, enabled]);
  return { quote, loading };
}
