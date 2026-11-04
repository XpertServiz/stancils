import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartProvider } from "@/components/store/CartContext";
import { LogoMark } from "@/components/store/Header";
import { getSettings } from "@/lib/settings";

/** Checkout is a focused page, like most online stores: just the logo, no menu, nothing to wander off to. */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <CartProvider>
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${s.business.name} — home`}>
            <LogoMark size={32} />
            <span className="font-display text-xl font-bold">{s.business.name}</span>
          </Link>
          <Link href="/cart" className="flex items-center gap-1.5 text-sm font-semibold text-accent" aria-label="Back to cart"><ShoppingBag size={18} />Cart</Link>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-line py-5 text-center text-xs text-ink3">
        <Link href="/legal/refunds" className="mx-2 hover:text-ink">Refund policy</Link>
        <Link href="/legal/shipping" className="mx-2 hover:text-ink">Shipping</Link>
        <Link href="/legal/privacy" className="mx-2 hover:text-ink">Privacy policy</Link>
        <Link href="/legal/terms" className="mx-2 hover:text-ink">Terms of service</Link>
      </footer>
    </CartProvider>
  );
}
