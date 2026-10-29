"use client";
import { Plus } from "lucide-react";
import { useCart } from "./CartContext";

export function QuickAdd({ variantId, name }: { variantId: string; name: string }) {
  const { add } = useCart();
  return (
    <button className="btn btn-soft btn-sm !px-2.5" aria-label={`Add ${name} to cart`} onClick={() => add({ variantId, qty: 1 })}>
      <Plus size={16} />
    </button>
  );
}
