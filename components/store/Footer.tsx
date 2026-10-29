import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { Logo } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";

export async function Footer() {
  const s = await getSettings();
  const cols = [
    { title: "Shop", links: [["All stencils", "/shop"], ["Wall", "/c/wall"], ["Furniture", "/c/furniture"], ["Coffee & latte", "/c/coffee"], ["Cake & cookie", "/c/cake-cookie"], ["Lettering & signs", "/c/sign-logo"], ["Tools & kits", "/c/tools"]] },
    { title: "Make", links: [["Custom Stencil Studio", "/custom-stencils"], ["Logo stencils", "/custom-stencils/logo"], ["Coffee logo stencils", "/custom-stencils/coffee"], ["Digital cut files", "/shop?digital=1"], ["For business", "/business"]] },
    { title: "Help", links: [["Track an order", "/track"], ["Tutorials", "/tutorials"], ["FAQ", "/faq"], ["Contact", "/contact"], ["Shipping", "/legal/shipping"], ["Returns", "/legal/returns"]] },
  ];
  return (
    <footer className="border-t border-line bg-s1/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="mb-3 flex items-center gap-2"><Logo /><span className="font-display text-lg font-bold">{s.business.name}</span></div>
          <p className="mb-5 max-w-xs text-sm text-ink2">{s.business.tagline} Laser-cut, reusable stencils — shipped worldwide or delivered instantly as cut files.</p>
          <NewsletterForm />
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink3">{c.title}</h3>
            <ul className="space-y-2 text-sm">
              {c.links.map(([l, h]) => <li key={h}><Link className="text-ink2 hover:text-accent" href={h}>{l}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-ink3 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {s.business.name}. {s.business.address}</p>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
            <Link href="/legal/returns" className="hover:text-ink">Returns</Link>
            <Link href="/sitemap.xml" className="hover:text-ink">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
