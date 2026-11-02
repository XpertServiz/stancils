import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getActiveCurrency, getUnits } from "@/lib/currency";
import { CartButton, CurrencyUnits, MobileMenu } from "./HeaderControls";

export const NAV = [
  { href: "/#stencil-categories", label: "Stencils" },
  { href: "/#gift-categories", label: "Gifts" },
  { href: "/#shirt-categories", label: "T-Shirt Printing" },
  { href: "/#cyber-categories", label: "Cybersigilism Art" },
  { href: "/shop", label: "Shop All" },
];

const MOBILE_EXTRA = [
  { href: "/custom-stencils", label: "Create a custom order" },
  { href: "/track", label: "Track an order" },
  { href: "/contact", label: "Contact" },
];

/** Brand name with the "&" in the accent colour, as in the approved design. */
export function BrandName({ name }: { name: string }) {
  const i = name.indexOf("&");
  if (i < 0) return <>{name}</>;
  return <>{name.slice(0, i)}<span className="text-accent">&amp;</span>{name.slice(i + 1)}</>;
}

export async function Header() {
  const [s, { cur, enabled }, units] = await Promise.all([getSettings(), getActiveCurrency(), getUnits()]);
  return (
    <header className="sticky top-0 z-50 border-b border-[#e9e9f7] bg-white/95 shadow-[0_3px_20px_#8977ad0b] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-[1280px] items-center justify-between gap-3 px-4 sm:min-h-[92px] sm:px-[22px]">
        <div className="flex min-w-0 items-center gap-2">
          <MobileMenu links={[...NAV, ...MOBILE_EXTRA]} />
          <Link href="/" className="min-w-0" aria-label={`${s.business.name} home`}>
            <span className="block truncate font-display text-[18px] leading-none tracking-[-.06em] min-[400px]:text-[21px] text-[#302747] sm:text-[clamp(23px,2.2vw,31px)]">
              <BrandName name={s.business.name} />
            </span>
            {s.business.tagline && <small className="mt-1.5 hidden truncate text-[8px] font-semibold tracking-[.3em] text-accent min-[400px]:block sm:text-[9px]">{s.business.tagline.toUpperCase()}</small>}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-[19px]">
          <Link href="/custom-stencils" className="hidden text-xs font-semibold text-[#6256b7] hover:text-accent md:inline">Create a custom order <span className="text-base">↗</span></Link>
          <CurrencyUnits currencies={enabled.map((c) => ({ code: c.code, symbol: c.symbol }))} current={cur.code} units={units} />
          <CartButton pill />
        </div>
      </div>
      <nav className="mx-auto hidden min-h-[49px] max-w-[1280px] items-center justify-center gap-[clamp(16px,3.4vw,53px)] border-t border-[#f0eaf6] px-[22px] lg:flex" aria-label="Main navigation">
        {NAV.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap text-xs font-semibold text-[#504b6b] hover:text-[#df417c]">{l.label}</Link>
        ))}
      </nav>
    </header>
  );
}
