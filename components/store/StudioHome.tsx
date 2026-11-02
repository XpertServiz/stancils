import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getActiveCurrency } from "@/lib/currency";
import { cardInclude, toCard } from "@/lib/catalog";
import { DEPARTMENTS } from "@/lib/departments";
import { DesignArt } from "../DesignArt";
import { HeroCollage } from "./hero/HeroCollage";
import { ShopStudio, type ShopItem } from "./ShopStudio";

/**
 * Homepage in the owner's approved "Stencil & Gift Studio" layout:
 * hero → values → main collections → category sections per department → shop → custom → about.
 */
export async function StudioHome() {
  const [s, { cur, base }] = await Promise.all([getSettings(), getActiveCurrency()]);
  const h = s.hero;
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    include: cardInclude,
    orderBy: [{ featured: "desc" }, { salesCount: "desc" }, { createdAt: "desc" }],
    take: 12,
  });
  const cards = products.map((p) => toCard(p, cur, base));
  const parts = h.headline.split(/\*([^*]+)\*/); // "*words*" = italic pink accent

  const items: ShopItem[] = [
    ...cards.map((c) => ({
      key: c.id,
      dept: "Stencils",
      name: c.name,
      sub: c.stockLabel,
      tag: c.badges[0]?.label ?? (c.stockLabel.startsWith("Made") ? "Made to order" : "Stencil"),
      price: `${c.from ? "From " : ""}${c.price}`,
      href: `/p/${c.slug}`,
      cta: "Customize +",
      art: (
        <div className="h-full w-full text-[#e95387]">
          <DesignArt svg={c.svg} colors={c.colors} uid={`sh${c.id}`} title={c.name} className="h-full w-full" />
        </div>
      ),
    })),
    ...DEPARTMENTS.filter((d) => d.id !== "stencils").flatMap((d) =>
      d.categories.map((c) => ({
        key: `${d.id}-${c.name}`,
        dept: d.short,
        name: c.name.replace(/s$/, "").replace(/Baskets$/, "Basket"),
        sub: c.name,
        tag: "Made to order",
        price: "Price on request",
        href: c.href,
        cta: "Request +",
        art: <span aria-hidden className="text-[84px] leading-none">{c.icon}</span>,
      })),
    ),
  ];

  return (
    <div className="sgs">
      {/* HERO */}
      <section className="sgs-hero" aria-label={`Welcome to ${s.business.name}`}>
        <div className="sgs-wrap grid min-h-[550px] items-stretch gap-[7%] lg:grid-cols-[1fr_.94fr]">
          <div className="flex flex-col items-start justify-center py-14 lg:py-[70px]">
            <p className="mb-7 text-[11px] font-extrabold tracking-[.24em] text-[#d94d82]">{h.eyebrow.toUpperCase()}</p>
            <h1 className="sgs-h1">
              {parts.map((t, i) => (i % 2 ? <em key={i}>{t}</em> : <span key={i}>{t}</span>))}
            </h1>
            <p className="max-w-[480px] text-[15px] leading-[1.9] text-[#6b6179]">{h.sub}</p>
            <div className="mt-9 flex flex-wrap items-center gap-7">
              <Link className="sgs-primary" href={h.primaryCta.href}>{h.primaryCta.label} <span className="pl-3">↗</span></Link>
              <Link className="sgs-textlink" href={h.secondaryCta.href}>{h.secondaryCta.label} <span className="ml-2.5">→</span></Link>
            </div>
            <p className="mt-8 text-[11px] tracking-[.09em] text-[#8b7b99] lg:mt-12">{h.trust.join("  ·  ")}</p>
          </div>
          <div className="flex items-center justify-center pb-9 lg:py-6 lg:pl-6">
            {h.imageUrl ? <HeroCollage src={h.imageUrl} alt="Four product collections: Stencils, Gifts, T-Shirt Printing and Cybersigilism Art and Design" badges={[]} /> : null}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <div className="sgs-wrap sgs-values">
        {["Original designs", "Personalization", "Made with care", "US & Canada shipping"].map((t, i) => (
          <span key={t}>{String(i + 1).padStart(2, "0")}&nbsp;&nbsp; {t}</span>
        ))}
      </div>

      {/* MAIN COLLECTIONS */}
      <section id="collections" className="bg-white py-[65px] pt-[68px]">
        <div className="sgs-wrap">
          <div className="sgs-top">
            <div><div className="sgs-eyebrow">Explore what we make</div><h2 className="sgs-h2">Shop by main collection</h2></div>
            <p className="sgs-sub">Choose a department and then browse the matching subcategories and products.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 min-[561px]:grid-cols-2 lg:grid-cols-4">
            {DEPARTMENTS.map((d, i) => (
              <a key={d.id} href={`#${d.anchor}`} className="sgs-cat" style={{ background: ["#f9e9f4", "#fff0e8", "#edf3ff", "#f1e9ff"][i] }}>
                <div className="text-center text-[62px] leading-none">{d.symbol}</div>
                <strong>{d.id === "cyber" ? "Cybersigilism" : d.name} ↗</strong>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* DEPARTMENT SECTIONS */}
      {DEPARTMENTS.map((d) => (
        <section key={d.id} id={d.anchor} className="sgs-dept" style={{ background: d.bg }}>
          <div className="sgs-wrap">
            <div className="mb-7 gap-6 md:flex md:items-end md:justify-between">
              <div>
                <div className="sgs-eyebrow">{d.eyebrow}</div>
                <h2 className="sgs-h2">{d.title}</h2>
                <p className="sgs-sub max-w-2xl">{d.sub}</p>
              </div>
              <div className="sgs-note mt-4 md:mt-0">{d.note}</div>
            </div>
            <div className="grid grid-cols-1 gap-4 min-[561px]:grid-cols-2 lg:grid-cols-3">
              {d.categories.map((c) => (
                <Link key={c.name} href={c.href} className="sgs-stcat">
                  <strong>{c.name}</strong>
                  <small>{d.cardText}</small>
                  <span>{d.cardCta}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* SHOP THE STUDIO */}
      <section id="shop" className="bg-white pb-[65px] pt-10">
        <div className="sgs-wrap">
          <ShopStudio items={items} departments={["All", ...DEPARTMENTS.map((d) => d.short)]} />
        </div>
      </section>

      {/* CUSTOM */}
      <section id="custom" className="sgs-feature">
        <div className="sgs-wrap grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="sgs-eyebrow !text-[#ffb1d0]">Your idea, our craft</div>
            <h2 className="sgs-h2 !text-white md:!text-[46px]">Have something special in mind?</h2>
            <p className="leading-[1.8] text-[#e9dce9]">Upload your artwork, tell us what you envision, and build a personalized order. Custom pricing and design approval are confirmed before production.</p>
            <Link href="/custom-stencils" className="mt-5 inline-block rounded-full bg-[#ed6292] px-5 py-3 font-bold text-white hover:brightness-95">Start a Custom Request →</Link>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-3">
            {[["✎", "1. Tell us", "Describe your vision and personalization."], ["⇧", "2. Upload", "Share artwork or a reference photo."], ["♡", "3. Create", "We review details before making it."]].map(([i, t, p]) => (
              <div key={t} className="rounded-[15px] bg-white/10 p-5">
                <span className="text-[26px]">{i}</span>
                <strong className="mt-2.5 block">{t}</strong>
                <p className="mt-2 text-xs text-[#e9dce9]">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-white py-[65px]">
        <div className="sgs-wrap max-w-[700px] text-center">
          <div className="sgs-eyebrow">Hello from our studio</div>
          <h2 className="sgs-h2">Little details. Big meaning.</h2>
          <p className="sgs-sub">{s.business.name} brings creative stencil designs, customizable presents, personalized apparel, and expressive artwork together. Whether it’s a single thoughtful gift or a larger custom project, we help turn ideas into something tangible.</p>
        </div>
      </section>

      <style>{`
        .sgs{color:#2c2640;font-family:var(--font-body)}
        .sgs-wrap{max-width:1280px;margin:0 auto;padding-left:22px;padding-right:22px}
        .sgs-hero{background:radial-gradient(circle at 76% 35%,#f2e4ff 0%,transparent 25%),radial-gradient(circle at 3% 55%,#fff0f6 0%,transparent 28%),linear-gradient(125deg,#fff 6%,#fff7fa 45%,#edf4ff 100%)}
        .sgs-h1{font:normal clamp(45px,5vw,79px)/1.04 var(--font-display);letter-spacing:-.065em;max-width:620px;margin:0 0 25px;color:#29223c}
        .sgs-h1 em{display:block;color:#e95387;font-weight:normal;font-style:italic}
        .sgs-primary{background:linear-gradient(110deg,#ed4f85,#eb6c70);color:#fff;padding:17px 24px;border-radius:100px;font-size:13px;font-weight:650;box-shadow:0 10px 23px #ed6b9433;transition:filter .2s}
        .sgs-primary:hover{filter:brightness(.96)}
        .sgs-textlink{font-size:13px;color:#6852a1;border-bottom:1px solid #d2b9e9;padding:12px 0}
        .sgs-values{display:grid;grid-template-columns:repeat(4,1fr);padding-top:26px;padding-bottom:26px;border-bottom:1px solid #ece8f7}
        .sgs-values span{text-align:center;font-size:12px;color:#806d94;letter-spacing:.02em}
        .sgs-values span+span{border-left:1px solid #ece7f4}
        .sgs-top{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:28px}
        .sgs-eyebrow{font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:#db4e89;font-weight:600}
        .sgs-h2{font:normal 42px/1.1 var(--font-display);letter-spacing:-.04em;margin:9px 0;color:#342943}
        .sgs-sub{font-size:14px;color:#6b6680;line-height:1.7}
        .sgs-cat{border-radius:20px;padding:20px;min-height:185px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid #efe8f4;box-shadow:0 8px 18px #9b83ac0d;transition:transform .2s,box-shadow .2s}
        .sgs-cat strong{font:normal 23px var(--font-display);color:#39284b}
        .sgs-cat:hover,.sgs-stcat:hover{transform:translateY(-3px);box-shadow:0 14px 28px #00000010}
        .sgs-dept{padding:65px 0;border-top:1px solid #eae8f5;border-bottom:1px solid #eae8f5}
        .sgs-note{display:inline-flex;gap:8px;align-items:center;font-size:12px;color:#665e6c;background:#fff6fb;border:1px solid #efdce8;border-radius:999px;padding:10px 14px;white-space:nowrap}
        .sgs-stcat{background:#fff;border:1px solid #ebe6f5;border-radius:15px;padding:22px;min-height:126px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;transition:transform .2s,box-shadow .2s;box-shadow:0 2px 0 #f2ebee}
        .sgs-stcat strong{font-size:18px;line-height:1.35;color:#51407a}
        .sgs-stcat small{color:#7b7680;font-size:12px;line-height:1.5}
        .sgs-stcat span{font-size:12px;font-weight:800;color:#d84a83;letter-spacing:.08em;text-transform:uppercase}
        .sgs-feature{padding:65px 0;background:linear-gradient(125deg,#433454,#6a5289);color:#fff}
        @media(max-width:750px){.sgs-values{grid-template-columns:repeat(2,1fr);gap:20px}.sgs-values span+span{border:0}}
        @media(max-width:480px){.sgs-top{display:block}.sgs-h2{font-size:31px}.sgs-note{white-space:normal}}
      `}</style>
    </div>
  );
}
