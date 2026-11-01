"use client";
import { useCart } from "./CartContext";

export function ReorderDesign({ designId }: { designId: string }) {
  const { add } = useCart();
  return <button className="btn btn-soft btn-sm mt-3 w-full" onClick={() => add({ customDesignId: designId, qty: 1 })}>Reorder</button>;
}
