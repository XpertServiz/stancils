"use client";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";

export function QuickAdd({ variantId, name }: { variantId: string; name: string }) {
  const { add } = useCart();
  return (
    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-onaccent transition hover:-translate-y-px hover:brightness-90" aria-label={`Add ${name} to cart`} onClick={() => add({ variantId, qty: 1 })}>
      <ShoppingBag size={16} />
    </button>
  );
}
