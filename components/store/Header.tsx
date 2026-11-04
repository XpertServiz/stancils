import Link from "next/link";
import { User } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getMenu } from "@/lib/storefront";
import { BagButton, HeaderShell, MegaNav, MobileNav, MobileSearch, SearchBox } from "./Chrome";

/** Small paintbrush-and-stencil-dot mark that sits before the brand name. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <rect width="40" height="40" rx="10" fill="rgb(var(--accent))" />
      <circle cx="12" cy="12" r="2.4" fill="#fff" opacity=".9" />
      <circle cx="19" cy="12" r="2.4" fill="#fff" opacity=".9" />
      <circle cx="12" cy="19" r="2.4" fill="#fff" opacity=".9" />
      <path d="M31 8 20 24c-1.2 1.8-.2 4 1.9 4.1 1.2.1 2.2-.5 2.9-1.6L33 11.5c.6-1-.1-2.4-1.3-2.5-.3-.1-.5-.1-.7-.1Z" fill="#fff" />
      <path d="M17 26c-3 0-5 2-5 5 0 1-.4 1.6-1 2 3 1 8 .6 9.6-2.6 1-2.2-.8-4.4-3.6-4.4Z" fill="#fff" opacity=".9" />
    </svg>
  );
}

export function BrandName({ name }: { name: string }) {
  return <>{name}</>;
}

export async function Header() {
  const [s, menu] = await Promise.all([getSettings(), getMenu()]);
  return (
    <HeaderShell>
      <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-3 transition-[padding] group-data-[small=true]/h:py-2 sm:gap-5 md:px-6 md:py-4 md:group-data-[small=true]/h:py-2.5">
        <MobileNav menu={menu} name={s.business.name} />
        <Link href="/" aria-label={`${s.business.name} — home`} className="flex min-w-0 items-center gap-2.5">
          <LogoMark size={34} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[19px] font-bold leading-none sm:text-[24px]">{s.business.name}</span>
            {s.business.tagline && <small className="mt-1 hidden truncate text-[10px] tracking-[.14em] opacity-70 min-[420px]:block">{s.business.tagline.toUpperCase()}</small>}
          </span>
        </Link>
        <SearchBox className="mx-auto hidden max-w-2xl flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1">
          <MobileSearch />
          <Link href="/account" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10 sm:flex"><User size={18} />Log in</Link>
          <BagButton />
        </div>
      </div>
      <MegaNav menu={menu} />
    </HeaderShell>
  );
}
