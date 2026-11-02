import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { BrandName } from "./Header";

const LINKS: [string, string][] = [
  ["Shop all", "/shop"], ["Custom order", "/custom-stencils"], ["Track order", "/track"], ["Account", "/account"], ["FAQ", "/faq"],
  ["Shipping & Returns", "/legal/shipping"], ["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["Contact", "/contact"],
];

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="bg-[#faf0f7] py-[38px] text-xs text-[#796b77]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-[22px] px-4 sm:px-[22px]">
        <div>
          <strong className="font-display text-base font-normal text-[#302747]"><BrandName name={s.business.name} /></strong>
          <p className="mt-1.5">Creative goods · {s.business.address}</p>
          <p className="mt-3">
            <a className="hover:text-accent" href={`mailto:${s.business.email}`}>{s.business.email}</a>
            {s.business.phone && <> · <a className="hover:text-accent" href={`https://wa.me/${s.business.whatsapp}`}>{s.business.phone}</a></>}
          </p>
        </div>
        <div className="max-w-xl sm:text-right">
          <nav aria-label="Footer" className="leading-7">
            {LINKS.map(([l, h], i) => (
              <span key={h}>{i > 0 && " · "}<Link className="hover:text-accent" href={h}>{l}</Link></span>
            ))}
          </nav>
          <p className="mt-2 text-[11px]">© {new Date().getFullYear()} {s.business.name}</p>
        </div>
      </div>
    </footer>
  );
}
