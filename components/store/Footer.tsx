import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getHome, parseHours } from "@/lib/storefront";
import { getActiveCurrency } from "@/lib/currency";
import { CurrencySelect, FooterColumn } from "./Chrome";
import { NewsletterForm } from "./NewsletterForm";

const QUICK: [string, string][] = [["Search", "/shop"], ["Contact Us", "/contact"], ["Terms of Service", "/legal/terms"], ["Refund Policy", "/legal/refunds"]];
const HELP: [string, string][] = [["How to Order", "/faq"], ["Returns & Exchanges", "/legal/returns"], ["Shipping Details", "/legal/shipping"], ["Privacy Policy", "/legal/privacy"], ["FAQ", "/faq"], ["Track an order", "/track"]];

export async function Footer() {
  const [s, home, { cur, enabled }] = await Promise.all([getSettings(), getHome(), getActiveCurrency()]);
  const hours = parseHours(home.hours);
  const b = s.business;
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(home.mapQuery || b.address)}`;
  return (
    <footer className="bg-stone text-stone-ink">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-x-10 px-4 py-10 md:grid-cols-4 md:px-6 md:py-14 [&>*]:min-w-0">
        <FooterColumn title="Our store">
          <p className="opacity-80">{b.address}</p>
          <table className="mt-3 text-[13px] opacity-90">
            <tbody>{hours.map((h) => <tr key={h.day}><td className="pr-4 font-semibold">{h.day}</td><td>{h.time}</td></tr>)}</tbody>
          </table>
          <a href={map} target="_blank" rel="noopener" className="mt-4 inline-block rounded-lg bg-mustard px-4 py-2 text-sm font-bold text-[#1c1b1a] hover:brightness-95">Get Directions</a>
        </FooterColumn>
        <FooterColumn title="Quick links">
          <ul className="space-y-2 opacity-90">
            {QUICK.map(([l, h]) => <li key={l}><Link href={h} className="hover:text-mustard">{l}</Link></li>)}
            {b.whatsapp && <li><a href={`https://wa.me/${b.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="hover:text-mustard">WhatsApp</a></li>}
            {b.facebook && <li><a href={b.facebook} target="_blank" rel="noopener" className="hover:text-mustard">Facebook</a></li>}
            {b.instagram && <li><a href={b.instagram} target="_blank" rel="noopener" className="hover:text-mustard">Instagram</a></li>}
          </ul>
        </FooterColumn>
        <FooterColumn title="Help">
          <ul className="space-y-2 opacity-90">{HELP.map(([l, h]) => <li key={l}><Link href={h} className="hover:text-mustard">{l}</Link></li>)}</ul>
        </FooterColumn>
        <FooterColumn title="Contact">
          <p className="opacity-80">{b.address}</p>
          {b.phone && <p className="mt-2"><a href={`tel:${b.phone.replace(/\s/g, "")}`} className="hover:text-mustard">{b.phone}</a></p>}
          <p className="mt-1"><a href={`mailto:${b.email}`} className="hover:text-mustard">{b.email}</a></p>
          <div className="mt-4 text-ink"><NewsletterForm dark /></div>
        </FooterColumn>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs md:px-6">
          <p className="opacity-80">© {new Date().getFullYear()} {b.name}</p>
          <div className="flex items-center gap-3 text-ink">
            <select className="rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-ink" defaultValue="en" aria-label="Language">
              <option value="en">English</option>
              <option value="es" disabled>Español (soon)</option>
            </select>
            <CurrencySelect currencies={enabled.map((c) => c.code)} current={cur.code} />
          </div>
          <div className="flex gap-3">
            {b.facebook && <a href={b.facebook} aria-label="Facebook" target="_blank" rel="noopener" className="hover:text-mustard"><Facebook size={18} /></a>}
            {b.instagram && <a href={b.instagram} aria-label="Instagram" target="_blank" rel="noopener" className="hover:text-mustard"><Instagram size={18} /></a>}
          </div>
        </div>
      </div>
    </footer>
  );
}
