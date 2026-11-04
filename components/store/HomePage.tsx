import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getActiveCurrency } from "@/lib/currency";
import { cardInclude, listProducts, SHOWN, toCard, type Card } from "@/lib/catalog";
import { getHome, getMenu, parseHours, slugsFor, type HomeRow, type StoreHome } from "@/lib/storefront";
import { getLiveSales } from "@/lib/sales";
import { ProductGrid } from "./ProductCard";
import { ReviewCarousel, type ReviewItem } from "./ReviewCarousel";
import { NewsletterForm } from "./NewsletterForm";
import { WriteReview } from "./WriteReview";

/** A photo in /public that the owner may not have added yet: show a tidy placeholder instead of a broken image. */
const exists = (url: string) => {
  if (!url) return false;
  if (/^https?:\/\//.test(url)) return true;
  if (url.startsWith("/uploads/")) return true; // uploaded through the admin (stored on the CDN / disk at runtime)
  try { return fs.existsSync(path.join(process.cwd(), "public", url.replace(/^\//, ""))); } catch { return false; }
};

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6 text-center">
      <h2 className="font-display text-[28px] font-bold md:text-[36px]">{children}</h2>
      <span className="mx-auto mt-2 block h-[3px] w-12 rounded bg-accent" />
      {sub && <p className="mx-auto mt-3 max-w-2xl text-ink2">{sub}</p>}
    </div>
  );
}

function Hero({ h, off }: { h: StoreHome; off: string }) {
  const img = exists(h.heroImage) ? h.heroImage : "";
  if (h.heroLayout === "banner") {
    return (
      <section>
        <h1 className="sr-only">{h.headline}{h.sub ? ` — ${h.sub}` : ""}</h1>
        <Link href={h.cta.href} className="relative block bg-s1" aria-label={`${h.cta.label}: ${h.headline}`}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={`${h.headline}. ${h.sub}`} fetchPriority="high" className="aspect-[4/3] w-full object-cover object-center sm:aspect-[2000/1116]" />
          ) : (
            <div className="diag grid aspect-[4/3] w-full place-items-center text-sm font-semibold text-ink3 sm:aspect-[2000/1116]">Hero image coming soon</div>
          )}
          {off && <span className="absolute left-3 top-3 -rotate-6 rounded-lg bg-mustard px-3 py-1.5 text-sm font-extrabold text-[#1c1b1a] shadow-lg sm:left-6 sm:top-6 sm:px-4 sm:py-2 sm:text-lg">{off}</span>}
        </Link>
        <div className="border-b border-line bg-s1">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 md:px-6">
            {h.checklist.length > 0 && (
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
                {h.checklist.map((c) => <li key={c} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-onaccent"><Check size={12} strokeWidth={3} /></span>{c}</li>)}
              </ul>
            )}
            <Link href={h.cta.href} className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-7 font-semibold text-onaccent transition hover:-translate-y-px hover:brightness-90">{h.cta.label}<ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="overflow-hidden bg-s1">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-8 px-4 py-10 md:px-6 lg:grid-cols-2 lg:gap-12 lg:py-16 [&>*]:min-w-0">
        <div className="order-2 lg:order-1">
          {h.eyebrow && <span className="inline-block rounded-full bg-accent/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent">{h.eyebrow}</span>}
          <h1 className="mt-4 text-[34px] font-bold leading-[1.1] md:text-[52px]">{h.headline}</h1>
          {h.sub && <p className="mt-4 max-w-xl text-lg text-ink2">{h.sub}</p>}
          {h.checklist.length > 0 && (
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {h.checklist.map((c) => (
                <li key={c} className="flex items-center gap-2.5 font-medium"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-onaccent"><Check size={14} strokeWidth={3} /></span>{c}</li>
              ))}
            </ul>
          )}
          <Link href={h.cta.href} className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-8 font-semibold text-onaccent transition hover:-translate-y-px hover:brightness-90">{h.cta.label}<ArrowRight size={18} /></Link>
        </div>
        <div className="relative order-1 mx-auto w-full max-w-[460px] lg:order-2 lg:max-w-none">
          <span aria-hidden className="absolute -right-6 -top-6 h-[70%] w-[70%] rounded-full bg-accent opacity-15" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-s1 md:aspect-[5/6]">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={`${h.headline} — a smiling woman in a green outfit`} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-top" />
            ) : (
              <div className="diag absolute inset-0 grid place-items-center text-sm font-semibold text-ink3">Hero image coming soon</div>
            )}
          </div>
          {(off || h.badge) && <span className="absolute -left-2 top-4 -rotate-6 rounded-lg bg-mustard px-4 py-2 text-lg font-extrabold text-[#1c1b1a] shadow-lg">{off || h.badge}</span>}
        </div>
      </div>
    </section>
  );
}

/** “Our Collections”: picture tiles. Clicking one opens that collection's products. */
function Chips({ chips }: { chips: StoreHome["chips"] }) {
  if (!chips.length) return null;
  return (
    <section className="fade-up" aria-labelledby="collections-h">
      <div className="mx-auto max-w-[1100px] px-4 pb-4 pt-12 md:px-6 md:pt-16">
        <h2 id="collections-h" className="mb-8 text-center text-[13px] font-bold uppercase tracking-[.2em] text-ink2">Our Collections</h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {chips.map((c, i) => {
            const img = exists(c.image ?? "") ? c.image : "";
            return (
              <li key={c.label + i}>
                <Link href={c.href} className="group relative block aspect-square overflow-hidden bg-s1 [container-type:inline-size]" aria-label={`${c.label} — view the collection`}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={c.label} loading={i < 3 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]" />
                  ) : (
                    <span className="absolute inset-0 bg-gradient-to-br from-accent to-[rgb(var(--band-stone))]" />
                  )}
                  {(!c.baked || !img) && (
                    <span className="pointer-events-none absolute inset-x-2 top-[78%] -translate-y-1/2 text-center [font-size:5.8cqw] font-bold leading-tight text-white [text-shadow:0_2px_6px_rgba(0,0,0,.55)]">{c.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** One product section: the girl banner first (title and text are written on it), then the products. */
function Row({ row, cards }: { row: HomeRow; cards: Card[] }) {
  const banner = exists(row.banner) ? row.banner : "";
  return (
    <section className="fade-up">
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 md:py-12">
        {banner ? (
          <>
            {/* on a phone the writing on the picture is too small, so the title and text are shown as normal text there */}
            <div className="mb-3 sm:sr-only">
              <h2 className="text-center font-display text-[26px] font-bold">{row.title}</h2>
              {row.intro && <p className="mt-2 text-center text-ink2">{row.intro}</p>}
            </div>
            <Link href={`/c/${row.collection}`} className="mb-6 block" aria-label={`${row.title} — view the collection`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner} alt={`${row.title}. ${row.intro}`} loading="lazy" decoding="async" className="h-auto w-full mix-blend-multiply" />
            </Link>
          </>
        ) : (
          <SectionTitle sub={row.intro}>{row.title}</SectionTitle>
        )}
        <ProductGrid cards={cards} />
        <div className="mt-8 text-center">
          <Link href={`/c/${row.collection}`} className="inline-flex h-11 items-center rounded-lg border-2 border-accent px-6 font-semibold text-accent transition hover:-translate-y-px hover:bg-accent hover:text-onaccent">View all</Link>
        </div>
      </div>
    </section>
  );
}

export async function HomePage() {
  const [h, menu, s, { cur, base }, sales] = await Promise.all([getHome(), getMenu(), getSettings(), getActiveCurrency(), getLiveSales()]);
  const best = sales.reduce<number>((b, x) => Math.max(b, x.percent), 0);

  const [rowCards, latest, reviewRows, agg] = await Promise.all([
    Promise.all(h.rows.map((r) => listProducts({ collections: slugsFor(r.collection, menu), perPage: r.count }, cur, base).then((x) => x.cards))),
    db.product.findMany({ where: SHOWN, include: cardInclude, orderBy: { createdAt: "desc" }, take: 8 }),
    db.review.findMany({ where: { status: "published" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 12 }),
    db.review.aggregate({ where: { status: "published" }, _avg: { rating: true }, _count: true }),
  ]);
  const latestCards = latest.map((p) => toCard(p, cur, base));
  const reviews: ReviewItem[] = reviewRows.map((r) => ({
    id: r.id, name: r.name, rating: r.rating, title: r.title ?? "", body: r.body, verified: r.verified,
    date: r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  }));

  const hours = parseHours(h.hours);
  const today = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: s.business.timezone });
  const mapQ = encodeURIComponent(h.mapQuery || s.business.address);

  let shown = h.rows.map((r, i) => ({ r, cards: rowCards[i] })).filter((x) => x.cards.length > 0);
  if (shown.length === 0) {
    // none of the configured rows has products yet (new store, or collections not filled): show the busiest collections instead
    const busy = await db.collection.findMany({
      where: { products: { some: { product: SHOWN } } },
      orderBy: { products: { _count: "desc" } }, take: 4, select: { slug: true, name: true },
    });
    const fb = await Promise.all(busy.map((c) => listProducts({ collection: c.slug, perPage: 6 }, cur, base).then((x) => ({ r: { title: c.name, intro: "", collection: c.slug, banner: "", count: 6 }, cards: x.cards }))));
    shown = fb.filter((x) => x.cards.length > 0);
  }
  return (
    <>
      <Hero h={h} off={best ? `${Math.round(best)}% OFF` : ""} />
      <Chips chips={h.chips} />
            {shown.map(({ r, cards }) => <Row key={r.title} row={r} cards={cards} />)}
      {shown.length === 0 && latestCards.length === 0 && (
        <section className="mx-auto max-w-[1280px] px-4 py-24 text-center md:px-6"><p className="text-lg text-ink2">Our new designs are on their way. Check back soon.</p></section>
      )}

      <section id="reviews" className="fade-up bg-s1" aria-labelledby="reviews-h">
        <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-16">
          <div className="mb-8 text-center">
            <h2 id="reviews-h" className="text-[13px] font-bold uppercase tracking-[.2em] text-ink2 md:text-[15px]">Let customers speak for us</h2>
            {agg._count > 0 && (
              <p className="mt-3 flex flex-col items-center gap-1 text-sm text-ink2">
                <span className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={20} className={i <= Math.round(agg._avg.rating ?? 0) ? "fill-mustard text-mustard" : "text-line"} />)}</span>
                <span>from {agg._count} review{agg._count === 1 ? "" : "s"}</span>
              </p>
            )}
          </div>
          {reviews.length > 0 ? (
            <ReviewCarousel reviews={reviews} />
          ) : (
            <p className="mx-auto max-w-md text-center text-ink2">No reviews yet — be the first to tell others about your experience.</p>
          )}
          <div className="mt-8 text-center"><WriteReview label="Write a review" /></div>
        </div>
      </section>

      {latestCards.length > 0 && (
        <section className="fade-up">
          <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-16">
            <SectionTitle>{h.latestTitle}</SectionTitle>
            <ProductGrid cards={latestCards} />
            <div className="mt-8 text-center"><Link href="/shop?sort=new" className="inline-flex h-11 items-center rounded-lg border-2 border-accent px-6 font-semibold text-accent transition hover:-translate-y-px hover:bg-accent hover:text-onaccent">View all</Link></div>
          </div>
        </section>
      )}

      <section className="fade-up bg-s1">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <h2 className="font-display text-[28px] font-bold md:text-[36px]">Our store</h2>
            <span className="mt-2 block h-[3px] w-12 rounded bg-accent" />
            <p className="mt-4 text-ink2">{s.business.address}</p>
            <table className="mt-4 w-full max-w-sm text-sm">
              <tbody>
                {hours.map((x) => (
                  <tr key={x.day} className={x.day.slice(0, 3).toLowerCase() === today.toLowerCase() ? "bg-accent/10 font-bold" : ""}>
                    <td className="px-3 py-1.5">{x.day}</td><td className="px-3 py-1.5">{x.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a href={`https://www.google.com/maps/search/?api=1&query=${mapQ}`} target="_blank" rel="noopener" className="mt-5 inline-flex h-11 items-center rounded-lg bg-accent px-6 font-semibold text-onaccent transition hover:-translate-y-px hover:brightness-90">Get Direction</a>
          </div>
          <div className="min-h-[280px] overflow-hidden rounded-[10px] border border-line bg-bg">
            <iframe title="Map of our store" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-full min-h-[280px] w-full border-0" src={`https://www.google.com/maps?q=${mapQ}&output=embed`} />
          </div>
        </div>
      </section>

      <section className="bg-accent/15">
        <div className="mx-auto max-w-[1280px] px-4 py-12 text-center md:px-6">
          <h2 className="font-display text-[26px] font-bold md:text-[32px]">{h.newsletterTitle}</h2>
          <p className="mb-5 mt-2 text-ink2">Join our list and get 10% off your first order.</p>
          <NewsletterForm wide />
        </div>
      </section>
    </>
  );
}
