import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getActiveCurrency } from "@/lib/currency";
import { getMenu } from "@/lib/storefront";
import { CurrencySelect } from "./Chrome";
import { LogoMark } from "./BrandLogo";

const head = "text-[13px] font-bold uppercase tracking-[.08em] text-[#E8EFEA]";
const link = "text-[15px] text-[#A9BDB5] hover:text-mustard";

export async function Footer() {
  const [s, { cur, enabled }, menu] = await Promise.all([getSettings(), getActiveCurrency(), getMenu()]);
  const b = s.business;
  return (
    <footer className="bg-stone text-[#A9BDB5]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 pb-7 pt-14 sm:px-10">
        <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2.5"><LogoMark size={44} /><span className="font-display text-[26px] font-bold leading-none text-[#F3F5F1]">{b.name}</span></span>
            <span className="max-w-[260px] text-[15px] leading-normal">Curious minds. Personal gifts. Bold designs. Everyday creativity.</span>
            {b.email && <a href={`mailto:${b.email}`} className={link}>{b.email}</a>}
            {b.whatsapp && <a href={`https://wa.me/${b.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className={link}>WhatsApp us</a>}
          </div>
          <div className="flex flex-col gap-2.5">
            <b className={head}>Shop</b>
            {menu.map((m) => <Link key={m.label} href={m.href} className={link}>{m.label}</Link>)}
          </div>
          <div className="flex flex-col gap-2.5">
            <b className={head}>Explore</b>
            <Link href="/collections" className={link}>All Collections</Link>
            <Link href="/custom-stencils" className={link}>Custom Orders</Link>
            <Link href="/about" className={link}>Our Story</Link>
            <Link href="/track" className={link}>Track an order</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <b className={head}>Important</b>
            <Link href="/legal/shipping" className={link}>Shipping Information</Link>
            <Link href="/legal/returns" className={link}>Returns &amp; Exchanges</Link>
            <Link href="/legal/privacy" className={link}>Privacy &amp; Contact</Link>
            <Link href="/faq" className={link}>FAQ</Link>
            <Link href="/contact" className={link}>Contact Us</Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[#2A4A41] pt-5 text-[13px]">
          <span>© {new Date().getFullYear()} {b.name}. All rights reserved.</span>
          <CurrencySelect currencies={enabled.map((c) => c.code)} current={cur.code} />
          <span>Designed to be different ✦</span>
          {/* a normal <a>, not <Link>: it loads the admin panel fresh, with its own splash screen */}
          <a href="/admin/login" className="opacity-70 hover:text-mustard hover:opacity-100">Admin login</a>
        </div>
      </div>
    </footer>
  );
}
