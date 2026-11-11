import type { Metadata } from "next";
import { CartPage } from "@/components/store/CartPage";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function Cart() {
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10 md:px-6">
      <h1 className="mb-8 text-center font-display text-[32px] font-bold md:text-[40px]">Your cart</h1>
      <CartPage />
    </div>
  );
}
