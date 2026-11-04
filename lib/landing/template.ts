import { HOME_CSS } from "./styles";
import { HOME_JS } from "./client";
import { SPLASH_SVG, WOMAN_SVG, sheet } from "./art";
import { DEPARTMENTS } from "./defaults";
import type { LandingSettings } from "./index";

export type CardProduct = {
  id: number; name: string; cat: string; subcat: string; icon: string; bg: string; tag: string; image?: string;
  slug?: string; variantId?: string;
  /** price in the visitor's currency, minor units (sale price when pct > 0) */
  minor: number; fullMinor: number; pct: number; text: string; fullText: string;
};
export type ReviewCard = { name: string; rating: number; title: string; body: string; verified: boolean; product: string };

export type HomeData = {
  site: string; brand: string; tagline: string; page: LandingSettings; title: string; image: string;
  cards: CardProduct[]; reviews: ReviewCard[]; rating: { avg: number; count: number };
  sale: { name: string; percent: number } | null; cur: { code: string; exponent: number }; currencies: string[];
  jsonLd: unknown[]; whatsapp: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** JSON that is safe inside a <script> element */
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/[\u2028\u2029]/g, "");

const TILES: Record<string, { icon: string; color: string; label: string }> = {
  Stencils: { icon: "❀", color: "#f9e9f4", label: "Stencils" },
  Gifts: { icon: "🎁", color: "#fff0e8", label: "Gifts" },
  "T-Shirts": { icon: "👕", color: "#edf3ff", label: "T-Shirts" },
  Cybersigilism: { icon: "✣", color: "#f1e9ff", label: "Cyber Art" },
};

function card(p: CardProduct, i: number) {
  const href = p.slug ? `/p/${esc(p.slug)}` : "";
  const alt = esc(`${p.name} — ${p.subcat || p.cat}`);
  const media = p.image
    ? `<img src="${esc(p.image)}" alt="${alt}" width="400" height="400" loading="${i < 4 ? "eager" : "lazy"}" decoding="async">`
    : `<span aria-hidden="true">${esc(p.icon)}</span>`;
  const name = href ? `<a href="${href}">${esc(p.name)}</a>` : esc(p.name);
  const photo = href ? `<a class="ph" href="${href}" style="background:${esc(p.bg)}" tabindex="-1" aria-label="${esc(p.name)}">` : `<div class="ph" style="background:${esc(p.bg)}">`;
  const buy = p.variantId && p.minor > 0;
  return `<article class="pc" data-cat="${esc(p.cat)}" data-sub="${esc(p.subcat)}" data-name="${esc((p.name + " " + p.subcat + " " + p.cat).toLowerCase())}">
${photo}${p.tag ? `<span class="tg">${esc(p.tag)}</span>` : ""}${p.pct ? `<span class="off">−${esc(Math.round(p.pct))}%</span>` : ""}${media}${href ? "</a>" : "</div>"}
<div class="pi"><h3 class="pn" style="margin:0">${name}</h3><div class="pb">
${buy ? `<span class="pr">${p.pct ? `<s>${esc(p.fullText)}</s>` : ""}${esc(p.text)}</span><button type="button" class="add" data-add="${esc(p.variantId)}" aria-label="Add ${esc(p.name)} to bag">Add</button>`
    : `<span class="pr"><span class="ask">Custom price</span></span><a class="add ghost" href="/custom-stencils">Get a quote</a>`}
</div></div></article>`;
}

function stars(n: number) {
  const r = Math.round(n);
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function reviewCard(r: ReviewCard) {
  const body = r.body.length > 220 ? r.body.slice(0, 217).trimEnd() + "…" : r.body;
  return `<article class="rc"><div class="stars" aria-label="${r.rating} out of 5 stars">${stars(r.rating)}</div>
${r.title ? `<b>${esc(r.title)}</b>` : ""}<p>${esc(body)}</p>
<footer><span>${esc(r.name)}</span>${r.verified ? `<span class="ver">✓ Verified buyer</span>` : ""}${r.product ? `<span>· ${esc(r.product)}</span>` : ""}</footer></article>`;
}

export function buildHome(d: HomeData): string {
  const { page, cards } = d;
  const counts = new Map<string, number>();
  cards.forEach((c) => counts.set(c.cat, (counts.get(c.cat) ?? 0) + 1));
  const tabs = ["All", ...DEPARTMENTS.filter((x) => counts.has(x))];
  const clientProducts = cards.filter((c) => c.variantId).map((c) => ({ v: c.variantId, name: c.name, m: c.minor, img: c.image ?? "", icon: c.icon, bg: c.bg, pct: c.pct }));
  const woman = page.heroImage ? `<img src="${esc(page.heroImage)}" alt="Model holding a ${esc(d.brand)} stencil" width="470" height="590" fetchpriority="high">` : WOMAN_SVG;
  const bar = d.sale ? `🔥 ${esc(d.sale.name)} — ${esc(Math.round(d.sale.percent))}% off, applied automatically at checkout` : `Stencils, gifts &amp; custom prints — shipped to your door`;
  const desc = esc(page.seoDesc);
  const reviewsHtml = d.reviews.length
    ? `<div class="rvGrid">${d.reviews.map(reviewCard).join("")}</div>`
    : `<div class="empty"><p style="margin:0 0 14px">No reviews yet — be the first to share your experience.</p></div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.title)}</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="${esc(page.keywords)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#d63a74">
<link rel="canonical" href="${esc(d.site)}/">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(d.brand)}">
<meta property="og:title" content="${esc(d.title)}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${esc(d.site)}/">
<meta property="og:image" content="${esc(d.image)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(d.title)}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(d.image)}">
${page.heroImage ? `<link rel="preload" as="image" href="${esc(page.heroImage)}">` : ""}
${d.jsonLd.map((j) => `<script type="application/ld+json">${safeJson(j)}</script>`).join("\n")}
<style>${HOME_CSS}</style>
</head>
<body>
<noscript><style>#splash{display:none}.rise{opacity:1;transform:none}</style></noscript>
<div id="splash" role="presentation" aria-hidden="true">
  <div class="spStage">
    <div class="spSheet">${SPLASH_SVG}<i class="spDot"></i></div>
    <div class="spOrb"><span style="--a:0deg">🎁</span><span style="--a:90deg">❀</span><span style="--a:180deg">👕</span><span style="--a:270deg">✣</span></div>
    <div class="spBrand">${esc(d.brand)}</div>
  </div>
  <div class="spBar"></div>
</div>

<div class="bar">${bar}</div>
<header class="hd">
  <div class="wrap hdIn">
    <a class="logo" href="/" aria-label="${esc(d.brand)} home">${esc(d.brand)}</a>
    <form class="srch" role="search" action="/shop">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <label class="sr" for="q1">Search products</label><input id="q1" class="qs" type="search" placeholder="Search stencils, gifts…" autocomplete="off">
    </form>
    <div class="hdAct">
      ${d.currencies.length > 1 ? `<label class="sr" for="cur">Currency</label><select id="cur">${d.currencies.map((c) => `<option${c === d.cur.code ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>` : ""}
      <button type="button" class="btnBag" data-bag aria-label="Open bag">🛍 <span class="w">Bag</span> <b data-count>0</b></button>
    </div>
  </div>
  <nav class="nv" aria-label="Main"><div class="wrap nvIn">
    ${tabs.slice(1).map((t) => `<a href="#shop" data-tab="${esc(t)}" data-go="1">${esc(TILES[t]?.label ?? t)}</a>`).join("")}
    <a href="#reviews">Reviews</a><a href="/custom-stencils">Custom order</a>
  </div></nav>
</header>

<main id="home">
<section class="hero" aria-label="Welcome" style="padding:0">
  <div class="wrap heroIn">
    <div class="heroCopy">
      <span class="kick">${esc(d.tagline || "Stencils · Gifts · Prints")}</span>
      <h1>${esc(page.headline)}</h1>
      <p class="lead">${esc(page.sub)}</p>
      <div class="cta"><a class="btn btnP" href="#shop">Shop now →</a><a class="btn btnS" href="/custom-stencils">Custom order</a></div>
      <div class="trust"><span>Secure checkout</span><span>Fast shipping</span><span>Custom orders</span></div>
    </div>
    <div class="scene" id="scene">
      <div class="stage" id="stage">
        <div class="arch"></div>
        <div class="woman">${woman}</div>
        <div class="fl f1">${sheet("flower", "sf1", "#ffd9e8")}</div>
        <div class="fl f2">${sheet("leaf", "sf2", "#d9f3e6")}</div>
        <div class="fl f3">${sheet("geo", "sf3", "#dcd9ff")}</div>
        <div class="chip3d">${d.sale ? `<b>−${esc(Math.round(d.sale.percent))}% OFF</b><small>${esc(d.sale.name)}</small>` : d.rating.count ? `<b>${esc(d.rating.avg.toFixed(1))} ★</b><small>${esc(d.rating.count)} reviews</small>` : `<b>New</b><small>Fresh designs weekly</small>`}</div>
      </div>
    </div>
  </div>
</section>

<section aria-labelledby="cats-h" style="padding-bottom:20px">
  <div class="wrap rise">
    <div class="hdg"><h2 id="cats-h">Shop by category</h2></div>
    <div class="cats">
      ${DEPARTMENTS.map((t) => `<button type="button" class="cat" style="--c:${TILES[t].color}" data-tab="${esc(t)}" data-go="1"><i aria-hidden="true">${TILES[t].icon}</i><span><b>${esc(TILES[t].label)}</b><small>${counts.get(t) ?? 0} items</small></span></button>`).join("")}
    </div>
  </div>
</section>

<section id="shop" aria-labelledby="shop-h">
  <div class="wrap">
    <div class="hdg rise"><h2 id="shop-h">Shop</h2><a href="/shop">See full catalogue →</a></div>
    <div class="tabs" role="group" aria-label="Category">${tabs.map((t) => `<button type="button" class="tab" data-tab="${esc(t)}" aria-pressed="${t === "All"}">${esc(t === "All" ? "All" : TILES[t]?.label ?? t)}</button>`).join("")}</div>
    <div class="chips" id="chips"></div>
    <label class="sr" for="q2">Search</label><input id="q2" class="qs mq" type="search" placeholder="Search products…" autocomplete="off">
    <div class="grid">${cards.map(card).join("\n")}<p class="none" id="none" hidden>Nothing here yet — try another category.</p></div>
  </div>
</section>

<section class="band" id="custom" style="padding:44px 0"><div class="wrap bandIn rise">
  <div><h2>Have your own idea?</h2><p>Send your artwork. We cut it for you.</p></div>
  <a class="btn btnP" href="/custom-stencils">Start a custom order →</a>
</div></section>

<section class="rv" id="reviews" aria-labelledby="rv-h">
  <div class="wrap">
    <div class="rvTop rise">
      <div><h2 id="rv-h">Happy customers</h2></div>
      ${d.rating.count ? `<div class="score"><b>${esc(d.rating.avg.toFixed(1))}</b><div><div class="stars" aria-hidden="true">${stars(d.rating.avg)}</div><small>${esc(d.rating.count)} review${d.rating.count === 1 ? "" : "s"}</small></div></div>` : ""}
      <a class="btn btnS" href="/reviews/new">Write a review</a>
    </div>
    ${reviewsHtml}
  </div>
</section>
</main>

<footer class="ft"><div class="wrap ftIn">
  <div><strong class="serif" style="font-size:20px">${esc(d.brand)}</strong><small>${esc(d.tagline)}</small></div>
  <nav aria-label="Footer"><a href="/shop">All products</a><a href="/custom-stencils">Custom order</a><a href="/track">Track order</a><a href="/tutorials">Tutorials</a><a href="/faq">FAQ</a><a href="/about">About</a><a href="/contact">Contact</a><a href="/legal/shipping">Shipping</a><a href="/legal/returns">Returns</a><a href="/legal/privacy">Privacy</a><a href="/legal/terms">Terms</a></nav>
</div></footer>

${d.whatsapp ? `<a class="wa" href="https://wa.me/${esc(d.whatsapp)}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">💬</a>` : ""}
<div class="bagBar" id="bagBar"><span>🛍 <span id="barTxt">0 items</span></span><a href="/checkout">Checkout →</a></div>
<div class="shade" id="shade" data-close></div>
<aside class="drawer" id="drawer" aria-label="Shopping bag">
  <div class="dh"><span>Your bag</span><button type="button" data-close aria-label="Close bag">×</button></div>
  <div class="db" id="bagBody"></div>
  <div class="df"><div class="sum"><span>Subtotal</span><span id="bagTotal"></span></div><a class="btn btnP" id="bagGo" href="/checkout">Checkout →</a><small>Shipping &amp; tax shown at checkout</small></div>
</aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>window.__H=${safeJson({ cur: d.cur.code, exp: d.cur.exponent, products: clientProducts })};</script>
<script>${HOME_JS}</script>
</body>
</html>`;
}
