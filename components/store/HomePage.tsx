import Link from "next/link";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getActiveCurrency } from "@/lib/currency";
import { listProducts } from "@/lib/catalog";
import { getHome } from "@/lib/storefront";
import { ProductGrid } from "./ProductCard";
import { ReviewCarousel, type ReviewItem } from "./ReviewCarousel";
import { NewsletterForm } from "./NewsletterForm";
import { WriteReview } from "./WriteReview";
import { Tilt3D } from "./Tilt3D";
import { HOME_FAQ } from "@/lib/seo-copy";

const eyebrow = "text-sm uppercase tracking-[.14em] text-goldink";
const h2 = "font-display text-[38px] font-semibold leading-none sm:text-[52px]";
const arch = "overflow-hidden rounded-t-[999px] rounded-b-md";

export async function HomePage() {
  const [h, s, { cur, base }] = await Promise.all([getHome(), getSettings(), getActiveCurrency()]);
  const [{ cards }, reviewRows, agg] = await Promise.all([
    listProducts({ sort: "", perPage: 8 }, cur, base),
    db.review.findMany({ where: { status: "published" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 12 }),
    db.review.aggregate({ where: { status: "published" }, _avg: { rating: true }, _count: true }),
  ]);
  const reviews: ReviewItem[] = reviewRows.map((r) => ({
    id: r.id, name: r.name, rating: r.rating, title: r.title ?? "", body: r.body, verified: r.verified,
    date: r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  }));
  const wrap = "mx-auto max-w-[1200px] px-5 sm:px-10";
  return (
    <>
      {/* hero */}
      <section className="bg-stone text-[#E8EFEA]">
        <div className={`${wrap} flex flex-wrap items-center gap-12 pb-[72px] pt-14`}>
          <div className="flex flex-[1_1_420px] flex-col gap-6">
            <span className="text-sm uppercase tracking-[.14em] text-mustard">{h.eyebrow}</span>
            <h1 className="font-display text-[48px] font-semibold leading-[.95] [text-wrap:balance] sm:text-[84px]">{h.headline}</h1>
            <p className="max-w-[500px] text-[19px] leading-[1.55] text-[#C9D8D1]">{h.sub}</p>
            <div className="flex flex-wrap gap-3.5">
              <Link href={h.cta.href} className="rounded-[2px] bg-mustard px-7 py-[15px] font-semibold text-[#0E2F28] transition hover:brightness-110">{h.cta.label}</Link>
              <Link href="/custom-stencils" className="rounded-[2px] border border-mustard px-7 py-3.5 text-base text-mustard transition hover:bg-mustard/10">{h.heroButton2}</Link>
            </div>
          </div>
          <Tilt3D className="relative flex flex-[1_1_360px] justify-center">
            <div className="aspect-[11/13.5] w-full max-w-[440px] rounded-t-[999px] border-2 border-mustard bg-[#1B5A4B] p-2.5">
              <div className="h-full w-full overflow-hidden rounded-t-[999px] border border-mustard">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.heroImage} alt="Ornate decorative stencil design" fetchPriority="high" className="block h-full w-full object-cover" />
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.circle1} alt="Gift arrangement" className="absolute bottom-9 left-[-10px] h-[130px] w-[130px] rounded-full border-[3px] border-mustard bg-stone object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.circle2} alt="Personalized custom T-shirt" className="absolute right-[-6px] top-[70px] h-[112px] w-[112px] rounded-full border-[3px] border-mustard bg-stone object-cover" />
          </Tilt3D>
        </div>
      </section>

      <section className="bg-mint">
        <div className={`${wrap} flex flex-wrap justify-between gap-x-8 gap-y-3 py-[18px] text-[15px] uppercase tracking-[.08em] text-[#E8EFEA]`}>
          {h.checklist.map((c) => <span key={c}>✦ {c}</span>)}
        </div>
      </section>

      {/* four departments */}
      <section id="collections" className="pb-6 pt-[84px]">
        <div className={`${wrap} flex flex-col gap-10`}>
          <div className="flex flex-col items-center gap-2 text-center"><span className={eyebrow}>{h.deptEyebrow}</span><h2 className={h2}>{h.deptTitle}</h2></div>
          <div className="grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {h.chips.map((c) => (
              <Link key={c.label} href={c.href} className="group flex flex-col gap-4 text-ink">
                <div className={`${arch} aspect-[3/4] w-full border border-line bg-s1`}>
                  {c.image && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt={c.label} loading="lazy" className="block h-full w-full object-cover transition duration-500 group-hover:scale-105" />)}
                </div>
                <div className="flex flex-col gap-1.5 text-center">
                  {c.eyebrow && <span className="text-xs uppercase tracking-[.14em] text-goldink">{c.eyebrow}</span>}
                  <span className="font-display text-[32px] font-bold leading-none">{c.label}</span>
                  {c.desc && <span className="text-base text-ink2">{c.desc}</span>}
                  <span className="text-[15px] font-semibold text-accent">{c.cta || "Explore"} ↗</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* shop */}
      <section id="shop" className="pb-6 pt-[72px]">
        <div className={`${wrap} flex flex-col gap-7`}>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
            <div className="flex flex-col gap-2"><span className={eyebrow}>{h.shop.eyebrow}</span><h2 className={h2}>{h.shop.title}</h2></div>
            <p className="max-w-[380px] text-base leading-normal text-ink2">{h.shop.intro} Prices shown in {cur.code}.</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 border-y border-t-ink border-b-line py-3.5" style={{ borderTopColor: "rgb(var(--ink))" }}>
            <div className="flex flex-wrap gap-2">
              <Link href="/shop" className="rounded-full border border-ink bg-stone px-[18px] py-2.5 text-[15px] font-medium text-mustard">Shop all</Link>
              {h.chips.map((c) => <Link key={c.label} href={c.href} className="rounded-full border border-accent px-[18px] py-2.5 text-[15px] font-medium text-accent hover:bg-s1">{c.label}</Link>)}
            </div>
            <Link href="/shop?sort=price_asc" className="text-sm text-ink2 underline">Sort by price</Link>
          </div>
          <ProductGrid cards={cards} />
          <div className="flex justify-center pt-2"><Link href="/shop" className="rounded-[2px] border border-ink px-[30px] py-3.5 text-base font-semibold hover:bg-ink hover:text-bg">Show more products ↓</Link></div>
        </div>
      </section>

      {/* custom */}
      <section id="custom" className="pt-[72px]">
        <div className={wrap}>
          <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-8 rounded-md border-2 border-mustard bg-stone p-8 text-[#E8EFEA] sm:p-14">
            <div className="flex flex-[1_1_380px] flex-col gap-[18px]">
              <span className="text-sm uppercase tracking-[.14em] text-mustard">{h.custom.eyebrow}</span>
              <h2 className="font-display text-[40px] font-semibold leading-none sm:text-[56px]">{h.custom.title}</h2>
              <p className="max-w-[520px] text-lg leading-[1.55] text-[#C9D8D1]">{h.custom.text}</p>
            </div>
            <Link href="/custom-stencils" className="rounded-[2px] bg-mustard px-8 py-[17px] text-[17px] font-semibold text-[#0E2F28] transition hover:brightness-110">{h.custom.button}</Link>
          </div>
        </div>
      </section>

      {/* benefits */}
      <section className="py-[72px]">
        <div className={`${wrap} grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]`}>
          {h.benefits.map((b) => (
            <div key={b.t} className="flex flex-col gap-1.5 border-t border-ink pt-4"><b className="font-display text-2xl">{b.t}</b><span className="text-base leading-normal text-ink2">{b.d}</span></div>
          ))}
        </div>
      </section>

      {/* reviews */}
      <section id="reviews" className="bg-s1" aria-labelledby="reviews-h">
        <div className={`${wrap} py-16`}>
          <div className="mb-8 text-center">
            <span className={eyebrow}>Real reviews from real customers</span>
            <h2 id="reviews-h" className={`${h2} mt-2`}>What customers say about us</h2>
            {agg._count > 0 && (
              <p className="mt-3 flex flex-col items-center gap-1 text-sm text-ink2">
                <span className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={20} className={i <= Math.round(agg._avg.rating ?? 0) ? "fill-mustard text-mustard" : "text-line"} />)}</span>
                <span>from {agg._count} review{agg._count === 1 ? "" : "s"}</span>
              </p>
            )}
          </div>
          {reviews.length > 0 ? <ReviewCarousel reviews={reviews} /> : <p className="mx-auto max-w-md text-center text-ink2">No reviews yet — be the first to tell others about your experience.</p>}
          <div className="mt-8 text-center">
            <WriteReview label="Write a review" />
            <p className="mt-3 text-xs text-ink3">Bought from us? Your review appears here once we approve it.</p>
          </div>
        </div>
      </section>

      {/* story */}
      <section id="story" className="bg-s1 py-[84px]" style={{ background: "#E3EAE5" }}>
        <div className={`${wrap} flex flex-wrap items-center gap-x-[72px] gap-y-10`}>
          <div className="flex flex-[1_1_420px] flex-col gap-5">
            <span className={eyebrow}>{h.story.eyebrow}</span>
            <h2 className="font-display text-[40px] font-semibold leading-none sm:text-[56px]">{h.story.title}</h2>
            <p className="max-w-[540px] text-lg leading-[1.6] text-ink2">{h.story.text}</p>
            <Link href="/#collections" className="font-semibold text-accent">{h.story.link}</Link>
          </div>
          <div className={`${arch} aspect-[3/4] max-w-[380px] flex-[1_1_320px] border-2 border-accent`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.story.image} alt="Detailed black ink alternative art sketch" loading="lazy" className="block h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* FAQ (also sent to Google as FAQPage data) */}
      <section id="faq" className="py-[72px]" aria-labelledby="faq-h">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: HOME_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }).replace(/</g, "\\u003c") }} />
        <div className={`${wrap} max-w-[860px]`}>
          <div className="mb-8 flex flex-col items-center gap-2 text-center"><span className={eyebrow}>Good to know</span><h2 id="faq-h" className={h2}>Questions, answered</h2></div>
          <div className="divide-y divide-line border-y border-line">
            {HOME_FAQ.map((f) => (
              <details key={f.q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-semibold">{f.q}<span className="text-goldink transition group-open:rotate-45">+</span></summary><p className="mt-2 leading-relaxed text-ink2">{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* newsletter */}
      <section className="bg-mint text-[#F3F5F1]">
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-x-12 gap-y-6 py-14`}>
          <div className="flex flex-[1_1_320px] flex-col gap-2"><h2 className="font-display text-[34px] font-semibold sm:text-[40px]">{h.newsletterTitle}</h2><span className="text-[17px] text-[#D3E0D9]">{h.newsletterSub}</span></div>
          <div className="flex-[1_1_360px]"><NewsletterForm wide /></div>
        </div>
      </section>
      <span className="sr-only">{s.business.name}</span>
    </>
  );
}
