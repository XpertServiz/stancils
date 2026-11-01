import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Minus, ShieldCheck, Sparkles, Ruler, Layers, Truck, Star, Coffee, Building2 } from "lucide-react";
import type { PageSection } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getActiveCurrency } from "@/lib/currency";
import { cardInclude, toCard } from "@/lib/catalog";
import { DesignArt } from "../DesignArt";
import { ProductGrid } from "./ProductCard";
import { Section, SectionHead } from "./Section";
import { HeroStage } from "./hero/HeroStage";
import { HeroCollage } from "./hero/HeroCollage";
import { Tabs } from "./Tabs";
import { StudioDrop } from "./StudioDrop";
import { LayerExplorer } from "./LayerExplorer";
import { SurfaceFinder } from "./SurfaceFinder";

const STONE = new Set(["problem_solution", "styles", "testimonials", "why_us", "faq"]);

export async function HomeSections({ sections }: { sections: PageSection[] }) {
  // render every section's queries in parallel (sequential awaits cost one DB round-trip each)
  const nodes = await Promise.all(sections.map((s) => renderSection(s)));
  return <>{sections.map((s, i) => (nodes[i] ? <div key={s.id} data-section={s.type}>{nodes[i]}</div> : null))}</>;
}

async function renderSection(s: PageSection) {
  const data = (s.data ?? {}) as Record<string, unknown>;
  const stone = STONE.has(s.type);
  switch (s.type) {
    case "hero":
      return <Hero />;
    case "problem_solution": {
      const items = (data.items as { problem: string; solution: string }[]) ?? [];
      const icons = [ShieldCheck, Ruler, Sparkles, Layers];
      return (
        <Section stone={stone}>
          <SectionHead eyebrow="Why it works" title={s.title} sub={s.subtitle} />
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((it, i) => {
              const Icon = icons[i % icons.length];
              return (
                <div key={i} className="card flex gap-4 p-6">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><Icon size={22} /></div>
                  <div>
                    <p className="text-sm text-ink3 line-through decoration-danger/60">{it.problem}</p>
                    <p className="mt-1 text-lg font-semibold">{it.solution}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      );
    }
    case "surfaces": {
      const cols = await db.collection.findMany({
        where: { type: "SURFACE" },
        orderBy: { sort: "asc" },
        include: { products: { take: 1, where: { product: { status: "ACTIVE", designSvg: { not: null } } }, include: { product: { select: { designSvg: true, id: true } } } }, _count: { select: { products: true } } },
      });
      return (
        <Section>
          <SectionHead eyebrow="Shop by surface" title={s.title} sub={s.subtitle} action={<Link href="/shop" className="btn btn-ghost">All stencils <ArrowRight size={16} /></Link>} />
          <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {cols.map((c, i) => (
              <Link key={c.id} href={`/c/${c.slug}`} className={`tilt card group relative overflow-hidden p-5 ${i === 0 ? "md:col-span-2 md:row-span-2" : ""} ${i === 3 ? "md:col-span-2" : ""}`}>
                <div className={`absolute -bottom-6 -right-6 ${i === 0 ? "h-64 w-64" : "h-36 w-36"} text-accent/70 transition-transform duration-700 ease-brand group-hover:rotate-12 group-hover:scale-110`}>
                  <DesignArt svg={c.products[0]?.product.designSvg} uid={`sf${c.id}`} />
                </div>
                <p className="relative text-xs font-semibold text-ink3">{c._count.products} designs</p>
                <h3 className={`relative font-bold ${i === 0 ? "text-3xl" : "text-xl"}`}>{c.name}</h3>
                {i === 0 && <p className="relative mt-2 max-w-xs text-sm text-ink2">{c.description}</p>}
                <ArrowRight size={18} className="absolute right-4 top-4 text-ink3 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </Section>
      );
    }
    case "product_tabs": {
      const { cur, base } = await getActiveCurrency();
      const q = (orderBy: object, where: object = {}) => db.product.findMany({ where: { status: "ACTIVE", ...where }, include: cardInclude, orderBy, take: 8 });
      const [best, fresh, featured] = await Promise.all([q({ salesCount: "desc" }), q({ createdAt: "desc" }), q({ updatedAt: "desc" }, { featured: true })]);
      return (
        <Section>
          <SectionHead eyebrow="Shop" title={s.title} sub={s.subtitle} />
          <Tabs
            tabs={[
              { id: "best", label: "Best sellers", content: <ProductGrid cards={best.map((p) => toCard(p, cur, base))} /> },
              { id: "new", label: "New arrivals", content: <ProductGrid cards={fresh.map((p) => toCard(p, cur, base))} /> },
              { id: "featured", label: "Staff picks", content: <ProductGrid cards={featured.map((p) => toCard(p, cur, base))} /> },
            ]}
          />
        </Section>
      );
    }
    case "studio_teaser":
      return (
        <Section className="relative overflow-hidden">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow mb-3">Custom Stencil Studio</p>
              <h2 className="text-3xl font-bold md:text-5xl">{s.title}</h2>
              <p className="mt-4 text-lg text-ink2">{s.subtitle}</p>
              <ul className="mt-6 space-y-2 text-ink2">
                {["Auto-trace any logo, photo or sketch", "Bridges added automatically — nothing falls out", "Fine-detail check for your chosen material", "Instant price in your currency · no setup fee"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check size={18} className="text-mint" />{t}</li>
                ))}
              </ul>
            </div>
            <StudioDrop />
          </div>
        </Section>
      );
    case "styles": {
      const cols = await db.collection.findMany({ where: { type: "STYLE" }, orderBy: { sort: "asc" }, include: { products: { take: 1, include: { product: { select: { designSvg: true } } } } } });
      return (
        <Section stone={stone}>
          <SectionHead eyebrow="Shop by style" title={s.title} sub={s.subtitle} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {cols.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="group flex flex-col items-center gap-3 rounded-2xl p-3 text-center transition-colors hover:bg-black/5">
                <div className="h-24 w-24 rounded-full bg-[rgb(var(--stone-ink)/0.07)] p-4 text-[rgb(var(--stone-ink))] transition-transform duration-500 group-hover:rotate-[20deg]">
                  <DesignArt svg={c.products[0]?.product.designSvg} uid={`st${c.id}`} />
                </div>
                <span className="text-sm font-semibold">{c.name}</span>
              </Link>
            ))}
          </div>
        </Section>
      );
    }
    case "layer_explorer": {
      const p = await db.product.findFirst({ where: { status: "ACTIVE", layers: { gte: 3 } }, orderBy: { createdAt: "asc" } });
      if (!p?.designSvg) return null;
      return (
        <Section>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <LayerExplorer svg={p.designSvg} layers={p.layers} />
            <div>
              <p className="eyebrow mb-3">Layer Explorer</p>
              <h2 className="text-3xl font-bold md:text-4xl">{s.title}</h2>
              <p className="mt-4 text-lg text-ink2">{s.subtitle}</p>
              <Link href={`/p/${p.slug}`} className="btn btn-primary mt-6">Explore {p.name} <ArrowRight size={16} /></Link>
              <Link href="/shop?layers=2" className="btn btn-ghost ml-2 mt-6">All layered stencils</Link>
            </div>
          </div>
        </Section>
      );
    }
    case "project_stories": {
      const stories = await db.projectStory.findMany({ where: { visible: true }, orderBy: { sort: "asc" }, take: 3 });
      if (!stories.length) return null;
      return (
        <Section>
          <SectionHead eyebrow="Projects" title={s.title} sub={s.subtitle} />
          <div className="grid gap-5 md:grid-cols-3">
            {stories.map((st) => (
              <article key={st.id} className="card overflow-hidden">
                <div className="relative aspect-[4/3] bg-[#D9D2C5] p-8 text-[#C8664A]">
                  <DesignArt svg={st.afterSvg} uid={`ps${st.id}`} />
                  <span className="badge absolute left-3 top-3 bg-black/60 text-white">{st.surface.replace("-", " ")}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold">{st.title}</h3>
                  <p className="mt-2 text-sm text-ink2">{st.summary}</p>
                  {st.hours && <p className="mt-3 text-xs text-ink3">≈ {st.hours} h project</p>}
                  {st.productSlugs[0] && <Link href={`/p/${st.productSlugs[0]}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">Shop this look <ArrowRight size={14} /></Link>}
                </div>
              </article>
            ))}
          </div>
        </Section>
      );
    }
    case "testimonials": {
      const reviews = await db.review.findMany({ where: { status: "published" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 6, include: { product: { select: { name: true, slug: true } } } });
      return (
        <Section stone={stone}>
          <SectionHead eyebrow="Reviews" title={s.title} sub={reviews.length ? null : "We're new — be one of the first to review your stencils."} action={<Link href="/reviews/new" className="btn btn-primary">Write a review</Link>} />
          {reviews.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="card p-6">
                  <div className="mb-3 flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} className={i < r.rating ? "fill-mustard text-mustard" : "text-line"} />)}</div>
                  {r.title && <p className="font-semibold">{r.title}</p>}
                  <blockquote className="mt-1 text-sm text-ink2">“{r.body}”</blockquote>
                  <figcaption className="mt-4 text-xs text-ink3">— {r.name}{r.verified && <span className="badge badge-mint ml-2">Verified purchase</span>}{r.product && <> · <Link className="underline" href={`/p/${r.product.slug}`}>{r.product.name}</Link></>}</figcaption>
                  {r.reply && <p className="mt-3 rounded-lg bg-s2 p-3 text-xs text-ink2"><b>Reply:</b> {r.reply}</p>}
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {[["Verified reviews only", "Every review is tied to a real order before it gets a verified badge."], ["Photos welcome", "Show your finished wall, cake or latte — it helps other makers."], ["We reply to every review", "Something not right? We'll fix it or remake it."]].map(([t, d]) => (
                <div key={t} className="card p-6"><p className="font-semibold">{t}</p><p className="mt-2 text-sm text-ink2">{d}</p></div>
              ))}
            </div>
          )}
        </Section>
      );
    }
    case "kits": {
      const { cur, base } = await getActiveCurrency();
      const kits = await db.product.findMany({ where: { status: "ACTIVE", collections: { some: { collection: { slug: "kits" } } } }, include: cardInclude, take: 4 });
      if (!kits.length) return null;
      return (
        <Section>
          <SectionHead eyebrow="Bundles" title={s.title} sub={s.subtitle} action={<Link href="/c/kits" className="btn btn-ghost">All kits <ArrowRight size={16} /></Link>} />
          <ProductGrid cards={kits.map((p) => toCard(p, cur, base))} />
        </Section>
      );
    }
    case "passport":
      return (
        <Section>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow mb-3">Transparency</p>
              <h2 className="text-3xl font-bold md:text-4xl">{s.title}</h2>
              <p className="mt-4 text-lg text-ink2">{s.subtitle}</p>
            </div>
            <div className="mx-auto w-full max-w-md" style={{ perspective: 1000 }}>
              <div className="holo card p-6 shadow-glow" style={{ transform: "rotateY(-12deg) rotateX(6deg)" }}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-ink3">Cut-Quality Passport</span>
                  <ShieldCheck className="text-mint" />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-sm">
                  {[["Material", "Mylar 10 mil"], ["Thickness", "254 µm"], ["Min bridge", "1.8 mm"], ["Finest detail", "1.4 mm"], ["Reuse", "50–200 uses"], ["Food-safe", "No (see PET line)"], ["Cleaning", "Warm soapy water"], ["Cut", "CO₂ laser, sealed edges"]].map(([k, v]) => (
                    <div key={k}><dt className="text-[11px] uppercase text-ink3">{k}</dt><dd className="font-semibold">{v}</dd></div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </Section>
      );
    case "why_us": {
      const rows = (data.rows as [string, boolean | string, boolean | string, boolean | string][]) ?? [];
      const cell = (v: boolean | string) => (v === true ? <Check className="mx-auto text-[#128C6E]" size={20} /> : v === false ? <Minus className="mx-auto opacity-40" size={18} /> : <span className="text-xs">{v}</span>);
      const s2 = await getSettings();
      return (
        <Section stone={stone}>
          <SectionHead eyebrow="Compare" title={s.title} sub="How we stack up against a typical stencil shop and marketplace sellers." />
          <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--stone-ink)/0.12)]">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left"><th className="p-4" /><th className="p-4 text-center font-bold">{s2.business.name}</th><th className="p-4 text-center font-semibold opacity-70">Typical stencil shop</th><th className="p-4 text-center font-semibold opacity-70">Marketplace sellers</th></tr></thead>
              <tbody>{rows.map(([label, a, b, c]) => <tr key={label} className="border-t border-[rgb(var(--stone-ink)/0.1)]"><td className="p-4 font-medium">{label}</td><td className="bg-[rgb(var(--accent)/0.08)] p-4 text-center">{cell(a)}</td><td className="p-4 text-center">{cell(b)}</td><td className="p-4 text-center">{cell(c)}</td></tr>)}</tbody>
            </table>
          </div>
        </Section>
      );
    }
    case "business":
      return (
        <Section>
          <div className="card grid gap-8 overflow-hidden p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
            <div>
              <p className="eyebrow mb-3"><Building2 size={14} className="mr-1 inline" />For business</p>
              <h2 className="text-3xl font-bold">{s.title}</h2>
              <p className="mt-3 max-w-2xl text-ink2">{s.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/business" className="btn btn-primary"><Coffee size={16} />Open a business account</Link>
              <Link href="/custom-stencils/coffee" className="btn btn-ghost">Coffee logo stencils</Link>
            </div>
          </div>
        </Section>
      );
    case "blog": {
      const posts = await db.blogPost.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" }, take: 3 });
      return (
        <Section>
          <SectionHead eyebrow="Learn" title={s.title} sub={s.subtitle} action={<Link href="/tutorials" className="btn btn-ghost">All guides <ArrowRight size={16} /></Link>} />
          <div className="grid gap-5 md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/tutorials/${p.slug}`} className="tilt card group overflow-hidden">
                <div className="aspect-[16/9] art-tile p-6 text-mint/80"><DesignArt svg={p.coverSvg} uid={`bp${p.id}`} className="h-full w-full" /></div>
                <div className="p-5">
                  <span className="badge badge-muted capitalize">{p.kind}</span>
                  <h3 className="mt-2 font-bold group-hover:text-accent">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink2">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      );
    }
    case "faq": {
      const faqs = await db.faq.findMany({ where: { visible: true, page: "home" }, orderBy: { sort: "asc" } });
      const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) };
      return (
        <Section stone={stone}>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <SectionHead eyebrow="FAQ" title={s.title} sub="Can't find an answer? Message us on WhatsApp." />
            <div className="divide-y divide-[rgb(var(--stone-ink)/0.12)]">
              {faqs.map((f) => (
                <details key={f.id} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{f.question}<span className="text-xl transition-transform group-open:rotate-45">+</span></summary>
                  <p className="muted mt-3 text-sm leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>
      );
    }
    case "final_cta": {
      const settings = await getSettings();
      return (
        <Section>
          <div className="relative overflow-hidden rounded-[28px] bg-accent p-10 text-onaccent md:p-16">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-bold md:text-5xl">{s.title}</h2>
              <p className="mt-4 text-lg opacity-80">{s.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/shop" className="btn bg-[#1B1D24] text-white">Shop stencils</Link>
                <Link href="/custom-stencils" className="btn border border-black/20">Make a custom stencil</Link>
                <a href={`https://wa.me/${settings.business.whatsapp}`} className="btn border border-black/20" target="_blank" rel="noopener">WhatsApp us</a>
              </div>
            </div>
            <Truck className="absolute -bottom-10 -right-6 h-64 w-64 opacity-10" />
          </div>
        </Section>
      );
    }
    case "text": {
      return (
        <Section stone={Boolean(data.stone)}>
          <SectionHead title={s.title} sub={s.subtitle} />
          {typeof data.body === "string" && <div className="prose-cc max-w-3xl whitespace-pre-line">{data.body}</div>}
        </Section>
      );
    }
    default:
      return null;
  }
}

async function Hero() {
  const s = await getSettings();
  const h = s.hero;
  const needsArt = !((h.mode === "collage" || h.mode === "image") && h.imageUrl) && !(h.mode === "video" && h.videoUrl);
  const [featured, wall, coffee, shipped] = await Promise.all([
    needsArt
      ? (async () =>
          (h.featuredSlug && (await db.product.findUnique({ where: { slug: h.featuredSlug } }))) ||
          (await db.product.findFirst({ where: { status: "ACTIVE", layers: { gte: 3 }, designSvg: { not: null } }, orderBy: { createdAt: "asc" } })) ||
          (await db.product.findFirst({ where: { status: "ACTIVE", designSvg: { not: null } } })))()
      : null,
    db.productCollection.count({ where: { collection: { slug: "wall" } } }),
    db.productCollection.count({ where: { collection: { slug: "coffee" } } }),
    db.order.count({ where: { status: { in: ["SHIPPED", "DELIVERED", "FULFILLED"] } } }),
  ]);
  const counts = [wall, coffee];
  const trust = [...h.trust];
  if (shipped >= 50) trust.unshift(`${shipped.toLocaleString()} orders shipped`);
  const parts = h.headline.split(/\*([^*]+)\*/); // "*word*" renders as the italic accent
  const badges = [
    { text: `Wall · ${counts[0]} patterns`, href: "/c/wall" },
    { text: `Coffee · ${counts[1]} designs`, href: "/c/coffee" },
    { text: "Custom · upload yours", href: "/custom-stencils" },
  ];
  const media =
    (h.mode === "collage" || h.mode === "image") && h.imageUrl ? (
      <HeroCollage src={h.imageUrl} alt={`${s.business.name} — stencils, gifts and custom designs`} badges={badges} />
    ) : h.mode === "video" && h.videoUrl ? (
      <video src={h.videoUrl} autoPlay muted loop playsInline className="aspect-square w-full rounded-[28px] object-cover" />
    ) : featured?.designSvg ? (
      <HeroStage svg={featured.designSvg} layers={featured.layers} labels={badges} />
    ) : null;
  return (
    <>
    <section className="relative overflow-hidden" style={{ background: "radial-gradient(circle at 76% 35%, rgb(160 120 240 / .16) 0%, transparent 28%), radial-gradient(circle at 3% 55%, rgb(var(--accent) / .07) 0%, transparent 30%), linear-gradient(125deg, rgb(var(--bg)) 6%, rgb(var(--surface-2)) 45%, rgb(var(--bg)) 100%)" }}>
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:pb-20 lg:pt-16">
        <div className="min-w-0">
          <p className="mb-5 text-[11px] font-extrabold uppercase tracking-[0.24em] text-accent">{h.eyebrow}</p>
          <h1 className="font-display text-[44px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-6xl xl:text-[76px]">
            {parts.map((t, i) => (i % 2 ? <em key={i} className="block font-medium italic text-accent">{t}</em> : <span key={i}>{t}</span>))}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink2 sm:text-lg">{h.sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href={h.primaryCta.href} className="btn btn-primary !rounded-full !px-7 !py-3.5 text-base shadow-[0_14px_30px_-12px_rgb(var(--accent)/.7)]">{h.primaryCta.label}<ArrowUpRight size={18} /></Link>
            <Link href={h.secondaryCta.href} className="group inline-flex items-center gap-1.5 font-semibold text-ink hover:text-accent">{h.secondaryCta.label}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
          </div>
          <p className="mt-7 text-sm text-ink3">{trust.join(" · ")}</p>
        </div>
        <div className="min-w-0">{media}</div>
      </div>
    </section>
    <section aria-label="Why shop with us" className="border-y border-line/70 bg-s1">
      <ol className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-5 px-4 py-6 sm:px-6 lg:grid-cols-4">
        {["Original designs", "Personalisation", "Made with care", "Ships worldwide"].map((t, i) => (
          <li key={t} className="flex items-center gap-3">
            <span className="font-display text-lg italic text-accent">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-sm font-semibold">{t}</span>
          </li>
        ))}
      </ol>
    </section>
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6"><SurfaceFinder /></div>
    </>
  );
}
