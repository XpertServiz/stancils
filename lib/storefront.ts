import { db } from "./db";
import { clearMemo, memo } from "./memo";
import { socialInfo, youtubeId, youtubeWatchUrl } from "./embeds";

/**
 * Storefront configuration the owner edits in the admin panel: the top menu and the homepage layout.
 * DECISION: stored as JSON in `Setting` (no migration). Collections themselves live in the catalogue,
 * so adding a product to a collection is all it takes for it to show up in the menu and on the homepage.
 */

export type MenuItem = { label: string; href: string; children: { label: string; href: string }[] };
export type HomeRow = { title: string; intro: string; collection: string; banner: string; count: number };
/** A picture tile in “Our Collections”. `baked` = the name is already written on the picture, so we do not print it again. */
export type Chip = { label: string; href: string; image?: string; baked?: boolean; eyebrow?: string; desc?: string; cta?: string };
/** A feature banner between the top banner and “Our Collections” (the Kiswa banner). `baked` = the picture already has an OPEN button drawn on it, so we put a real clickable button over it. */
export type Feature = { enabled: boolean; image: string; href: string; title: string; text: string; bullets: string[]; baked: boolean };
export type Benefit = { t: string; d: string };
export type VideoItem = { url: string; title: string };
export type SocialItem = { url: string; label: string };
export type VideoSection = { enabled: boolean; eyebrow: string; title: string; sub: string; items: VideoItem[] };
export type SocialSection = { enabled: boolean; eyebrow: string; title: string; sub: string; items: SocialItem[] };
export type StoreHome = {
  heroButton2: string;
  circle1: string;
  circle2: string;
  circle3: string;
  deptEyebrow: string;
  deptTitle: string;
  /** category slugs the owner unticked: they are left out of the category chips under "Find your new favorite" (new categories show by default) */
  shopCatsOff: string[];
  videos: VideoSection;
  social: SocialSection;
  shop: { eyebrow: string; title: string; intro: string };
  custom: { eyebrow: string; title: string; text: string; button: string };
  benefits: Benefit[];
  story: { eyebrow: string; title: string; text: string; link: string; image: string };
  newsletterSub: string;
  feature: Feature;
  eyebrow: string;
  headline: string;
  sub: string;
  checklist: string[];
  cta: { label: string; href: string };
  badge: string;
  heroImage: string;
  /** banner = one wide picture across the page; split = headline on the left, tall photo on the right */
  heroLayout: "banner" | "split";
  chips: Chip[];
  rows: HomeRow[];
  latestTitle: string;
  hours: string; // one "Mon | 10am – 9pm" per line
  mapQuery: string;
  newsletterTitle: string;
};

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

// ───────────────────────────── menu ─────────────────────────────

export const DEFAULT_MENU_TEXT = `Stencils
  Floral Stencils
  Mandala Stencils
  Calligraphy Stencils
  Geometric Stencils
  Wall & Decor Stencils
  Custom Stencils
Gifts
  Birthday Gift Baskets
  Corporate Gift Baskets
  Custom Gift Baskets
  Wedding & Celebration
  Holiday Gifts
Custom T-Shirts
Cybersigilism Art
  Cybersigilism Apparel
  Cybersigilism Prints
  Custom Cybersigilism`;

/** "Label" or "Label | /link". Lines indented under another line become its dropdown. */
export function parseMenu(text: string): MenuItem[] {
  const out: MenuItem[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const child = /^\s{2,}|^\t/.test(raw);
    const [labelPart, linkPart] = raw.split("|").map((x) => x.trim());
    const label = labelPart.replace(/[<>]/g, "").slice(0, 60);
    if (!label) continue;
    let href = linkPart || `/c/${slugify(label)}`;
    if (!/^(\/|https:\/\/)/.test(href)) href = `/c/${slugify(href)}`;
    if (child && out.length) out[out.length - 1].children.push({ label, href });
    else out.push({ label, href: linkPart || (child ? href : "") , children: [] });
  }
  // a top-level item with a dropdown but no link of its own: link it to its "All …" child or its own collection
  for (const m of out) {
    if (!m.href) m.href = m.children[0] && /^all\b/i.test(m.children[0].label) ? m.children[0].href : `/c/${slugify(m.label)}`;
  }
  return out;
}

export const menuToText = (m: MenuItem[]) =>
  m.map((i) => [`${i.label}${i.href && i.href !== `/c/${slugify(i.label)}` && !(i.children[0] && i.children[0].href === i.href) ? ` | ${i.href}` : ""}`, ...i.children.map((c) => `  ${c.label}${c.href !== `/c/${slugify(c.label)}` ? ` | ${c.href}` : ""}`)].join("\n")).join("\n");

export async function getMenuText(): Promise<string> {
  const row = await memo("sf:menu", () => db.setting.findUnique({ where: { key: "storeMenu" } })).catch(() => null);
  const t = (row?.value as { text?: string } | null)?.text;
  return typeof t === "string" && t.trim() ? t : DEFAULT_MENU_TEXT;
}
/**
 * The menu the storefront shows: the owner's menu text, but (1) dropdown entries whose category has no active product are hidden and
 * (2) any category that has products yet is not in the menu is added to the right department automatically — so uploading a product
 * into a new category is all it takes for it to appear in the header, the sidebar and the footer.
 * DECISION: the department is read from the products' size dropdown (stencil inches → Stencils, XS–5XL → T-shirts, Small–Deluxe → Gifts,
 * anything else → Art), which is more reliable than guessing from the category name.
 */
async function withLiveCategories(menu: MenuItem[]): Promise<MenuItem[]> {
  if (!menu.length) return menu;
  const live = await memo("sf:menu-live", () =>
    db.collection.findMany({
      where: { products: { some: { product: { status: "ACTIVE" } } } },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, products: { where: { product: { status: "ACTIVE" } }, take: 1, select: { product: { select: { variants: { orderBy: { sort: "asc" }, take: 1, select: { name: true } } } } } } },
    }),
  ).catch(() => null);
  if (!live) return menu;
  const liveSlugs = new Set(live.map((c) => c.slug));
  const slugOf = (href: string) => /^\/c\/([a-z0-9-]+)$/.exec(href)?.[1];
  const known = new Set<string>();
  const out = menu.map((m) => {
    known.add(slugify(m.label));
    const rs = slugOf(m.href);
    if (rs) known.add(rs);
    for (const c of m.children) { const s = slugOf(c.href); if (s) known.add(s); }
    return { ...m, children: m.children.filter((c) => { const s = slugOf(c.href); return !s || liveSlugs.has(s); }) };
  });
  const deptFor = (variant: string, name: string): MenuItem | undefined => {
    const find = (re: RegExp) => out.find((m) => re.test(m.label));
    if (/×|\bin\b|inch/i.test(variant)) return find(/stencil/i);
    if (/^(youth |x{1,3}l|[2-5]xl|xs|s|m|l|xl)$/i.test(variant.trim())) return find(/shirt|tee|apparel/i);
    if (/^(small|medium|large|deluxe)$/i.test(variant.trim())) return find(/gift/i);
    // one-size items: cybersigilism categories go to Art, everything else (art stencils, tattoos, supplies) stays with Stencils
    return /cyber|sigil/i.test(name) ? find(/cyber|art|print/i) : find(/stencil/i);
  };
  for (const c of live) {
    if (known.has(c.slug)) continue;
    const dept = deptFor(c.products[0]?.product.variants[0]?.name ?? "", c.name) ?? out[0];
    dept?.children.push({ label: c.name, href: `/c/${c.slug}` });
  }
  return out;
}

export const getMenu = async () => withLiveCategories(parseMenu(await getMenuText()));

export async function saveMenuText(text: string) {
  const value = { text: text.slice(0, 4000) };
  await db.setting.upsert({ where: { key: "storeMenu" }, create: { key: "storeMenu", value }, update: { value } });
  clearMemo("sf:menu");
}

/** Collection slugs a menu/collection link should include, so "Calligraphy Stencils" also lists the products of its sub-collections. */
export function slugsFor(slug: string, menu: MenuItem[]): string[] {
  for (const m of menu) {
    const first = m.children[0];
    const alias = first && /^all\b/i.test(first.label) ? slugify(first.label) : null;
    if (slugify(m.label) === slug || alias === slug) return [...new Set([slugify(m.label), ...(alias ? [alias] : []), ...m.children.map((c) => slugify(c.label))])];
  }
  return [slug];
}

/** Make sure every menu entry that points at a collection has one, so its page exists (and shows once products are added). */
export async function ensureMenuCollections(menu: MenuItem[]) {
  const wanted = new Map<string, string>();
  for (const m of menu) {
    for (const x of [m, ...m.children]) {
      const mm = /^\/c\/([a-z0-9-]+)$/.exec(x.href);
      if (mm) wanted.set(mm[1], x.label);
    }
  }
  if (!wanted.size) return 0;
  const have = new Set((await db.collection.findMany({ where: { slug: { in: [...wanted.keys()] } }, select: { slug: true } })).map((c) => c.slug));
  const max = (await db.collection.aggregate({ _max: { sort: true } }))._max.sort ?? 0;
  let n = 0;
  for (const [slug, name] of wanted) {
    if (have.has(slug)) continue;
    await db.collection.create({ data: { slug, name, type: "STYLE", sort: max + ++n, seoTitle: `${name} Stencils`, seoDesc: `Shop ${name} — reusable stencils and decor from our studio.` } });
  }
  return n;
}

// ───────────────────────────── homepage ─────────────────────────────

export const HOME_DEFAULTS: StoreHome = {
  heroButton2: "Make it yours",
  circle1: "/naqsh/gifts.jpg",
  circle2: "/naqsh/tees.jpg",
  circle3: "/naqsh/cyber.jpg",
  deptEyebrow: "Your next obsession starts here",
  deptTitle: "Four ways to create joy",
  shopCatsOff: [],
  videos: { enabled: true, eyebrow: "Watch & get inspired", title: "See it in action", sub: "How our stencils, gifts and tees come to life.", items: [] },
  social: { enabled: true, eyebrow: "Follow along", title: "Find us on social", sub: "New designs, behind the scenes and customer projects.", items: [] },
  shop: { eyebrow: "The good stuff", title: "Find your new favorite", intro: "Browse the full collection." },
  custom: { eyebrow: "Made for your one-of-a-kind ideas", title: "Have an idea? Let's make it real.", text: "Personalized tees, custom stencils, thoughtful gift baskets, or art that nobody else has. Tell us what you are imagining.", button: "Start a custom request ↗" },
  benefits: [
    { t: "Made just for you", d: "Every stencil, gift and tee is prepared to order." },
    { t: "Reusable & durable", d: "Stencils cut from tough material, ready for project after project." },
    { t: "Sizes for everyone", d: "Stencil sizes, T-shirt sizes from XS to 5XL, and gift sizes from Small to Deluxe." },
    { t: "Real people, real help", d: "Questions about a custom order? Message us any time." },
  ],
  story: { eyebrow: "Hi, we're Stencil and Gift Studio", title: "More than a store. A little imagination station.", text: "We believe everyday things can be meaningful, expressive and unexpected. From intricate stencil patterns to gifts that feel personal, from one-of-a-kind tees to bold alternative art, this is where those ideas meet.", link: "Discover our collections ↗", image: "/naqsh/cyber.jpg" },
  newsletterSub: "Product launches and seasonal ideas, sent when they are ready.",
  feature: {
    enabled: false,
    image: "",
    href: "/p/kaaba-kiswa-inspired-pattern-stencil",
    title: "Hand-Paint the Kaaba Door with Kiswa Stencil",
    text: "Create your own Ghilaf-e-Kaaba masterpiece. No calligraphy skills required — just devotion and creativity.",
    bullets: ["100% Accurate Calligraphy", "All sizes Available", "Exclusive Design", "50% Discount"],
    baked: true,
  },
  eyebrow: "Stencils · Gifts · Custom tees · Cybersigilism art",
  headline: "Little things. Big imagination.",
  sub: "Reusable stencils, thoughtful gift baskets, wearable art and bold alternative prints. Your favorite ideas, made into real things.",
  checklist: ["Stencils", "Gift baskets", "Custom T-shirts", "Cybersigilism art"],
  cta: { label: "Explore collections", href: "/#collections" },
  badge: "",
  heroImage: "/naqsh/stencils.jpg",
  heroLayout: "banner",
  chips: [
    { eyebrow: "01 / Get creative", label: "Stencils", desc: "Patterns that bring your world to life.", cta: "Explore stencils", href: "/c/stencils", image: "/naqsh/stencils.jpg" },
    { eyebrow: "02 / Give thoughtfully", label: "Gifts", desc: "For every person and every occasion.", cta: "Find a gift", href: "/c/gifts", image: "/naqsh/gifts.jpg" },
    { eyebrow: "03 / Wear it proud", label: "Custom Tees", desc: "Wear your story. Your design, your rules.", cta: "Design a tee", href: "/c/custom-t-shirts", image: "/naqsh/tees.jpg" },
    { eyebrow: "04 / Break the ordinary", label: "Cybersigilism", desc: "Edgy, expressive, and all your own.", cta: "Discover the art", href: "/c/cybersigilism-art", image: "/naqsh/cyber.jpg" },
  ],
 rows: [
    { title: "Persian Carpet Stencils", intro: "Elegant designs inspired by traditional rugs, ideal for canvas, walls and furniture.", collection: "carpet-design-stencils", banner: "/images/rows/persian-carpet.jpg", count: 8 },
    { title: "Islamic / Arabic Calligraphy Stencils", intro: "Apply graceful calligraphic art to canvas, walls, glass and ceramic.", collection: "all-calligraphy-stencils", banner: "/images/rows/islamic-calligraphy.jpg", count: 8 },
    { title: "Wall Stencils for DIY Home Décor", intro: "Easy to use, economical, and a better alternative to wallpaper or decals.", collection: "wall-and-canvas-stencils", banner: "/images/rows/wall-stencils.jpg", count: 8 },
    { title: "Canvas Painting / Sketching Stencils", intro: "Reusable mylar stencils for canvas and wall art.", collection: "all-art-and-craft-stencils", banner: "/images/rows/canvas-painting.jpg", count: 8 },
    { title: "Furniture Stencils for Makeovers", intro: "Sized for small DIY projects — stencil your own custom furniture design.", collection: "furniture-stencils", banner: "/images/rows/furniture-stencils.jpg", count: 8 },
  ],
  latestTitle: "Latest Designs",
  hours: "Mon | 10am – 9pm\nTue | 11am – 9pm\nWed | 11am – 5pm\nThu | 11am – 9pm\nFri | 10am – 9pm\nSat | 11am – 9pm\nSun | Closed",
  mapQuery: "",
  newsletterTitle: "A little creative inspiration?",
};

const cleanText = (v: unknown, max: number) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const cleanUrl = (v: unknown) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (!/^(https:\/\/|\/)[^"'\s<>()]*$/.test(s)) throw new Error("Photos must be an uploaded file or an https:// link.");
  return s;
};
const cleanLink = (v: unknown, fallback: string) => {
  const s = String(v ?? "").trim() || fallback;
  if (!/^(\/|https:\/\/)[^"'\s<>]*$/.test(s)) throw new Error(`"${s}" is not a valid link. Use something like /shop.`);
  return s;
};

const cleanVideos = (input: Partial<VideoSection> | undefined, prev: VideoSection | undefined): VideoSection => {
  const v = { ...HOME_DEFAULTS.videos, ...(prev ?? {}), ...(input ?? {}) };
  const items: VideoItem[] = [];
  for (const i of v.items ?? []) {
    const id = youtubeId(String(i?.url ?? ""));
    if (id) items.push({ url: youtubeWatchUrl(id), title: cleanText(i.title, 80) });
  }
  return { enabled: v.enabled !== false, eyebrow: cleanText(v.eyebrow, 60), title: cleanText(v.title, 80), sub: cleanText(v.sub, 160), items: items.slice(0, 6) };
};
const cleanSocial = (input: Partial<SocialSection> | undefined, prev: SocialSection | undefined): SocialSection => {
  const v = { ...HOME_DEFAULTS.social, ...(prev ?? {}), ...(input ?? {}) };
  const items: SocialItem[] = [];
  for (const i of v.items ?? []) {
    const url = String(i?.url ?? "").trim();
    if (socialInfo(url) && /^https:\/\/[^"'\s<>]*$/.test(url)) items.push({ url, label: cleanText(i.label, 60) });
  }
  return { enabled: v.enabled !== false, eyebrow: cleanText(v.eyebrow, 60), title: cleanText(v.title, 80), sub: cleanText(v.sub, 160), items: items.slice(0, 6) };
};

export function cleanHome(input: Partial<StoreHome>, prev: StoreHome): StoreHome {
  const rows = (input.rows ?? prev.rows).map((r) => ({
    title: cleanText(r.title, 80),
    intro: cleanText(r.intro, 200),
    collection: slugify(String(r.collection ?? "")),
    banner: cleanUrl(r.banner),
    count: Math.max(2, Math.min(12, Math.round(Number(r.count)) || 8)),
  })).filter((r) => r.title && r.collection);
  const chips = (input.chips ?? prev.chips)
    .map((c) => ({ label: cleanText(c.label, 40), href: cleanLink(c.href, "/shop"), image: cleanUrl(c.image), baked: false, eyebrow: cleanText(c.eyebrow, 40), desc: cleanText(c.desc, 90), cta: cleanText(c.cta, 30) }))
    .filter((c) => c.label)
    .slice(0, 12);
  const f = { ...prev.feature, ...(input.feature ?? {}) };
  const feature: Feature = {
    enabled: Boolean(f.enabled),
    image: cleanUrl(f.image),
    href: cleanLink(f.href, "/shop"),
    title: cleanText(f.title, 90),
    text: cleanText(f.text, 300),
    bullets: (f.bullets ?? []).map((x) => cleanText(x, 60)).filter(Boolean).slice(0, 6),
    baked: Boolean(f.baked) && Boolean(f.image),
  };
  const sec = <T extends object>(k: "shop" | "custom" | "story", d: T): T => ({ ...d, ...((prev as unknown as Record<string, object>)[k] ?? {}), ...(((input as Record<string, object>)[k]) ?? {}) }) as T;
  const shop = sec("shop", HOME_DEFAULTS.shop), custom = sec("custom", HOME_DEFAULTS.custom), story = sec("story", HOME_DEFAULTS.story);
  const str = (o: Record<string, string>, max = 300) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === "image" ? cleanUrl(v) : cleanText(v, max)])) as never;
  return {
    heroButton2: cleanText(input.heroButton2 ?? prev.heroButton2 ?? HOME_DEFAULTS.heroButton2, 30),
    circle1: cleanUrl(input.circle1 ?? prev.circle1 ?? HOME_DEFAULTS.circle1),
    circle2: cleanUrl(input.circle2 ?? prev.circle2 ?? HOME_DEFAULTS.circle2),
    circle3: cleanUrl(input.circle3 ?? prev.circle3 ?? HOME_DEFAULTS.circle3),
    deptEyebrow: cleanText(input.deptEyebrow ?? prev.deptEyebrow ?? HOME_DEFAULTS.deptEyebrow, 60),
    deptTitle: cleanText(input.deptTitle ?? prev.deptTitle ?? HOME_DEFAULTS.deptTitle, 80),
    shopCatsOff: [...new Set((input.shopCatsOff ?? prev.shopCatsOff ?? []).map((x) => slugify(String(x))).filter(Boolean))].slice(0, 300),
    videos: cleanVideos(input.videos, prev.videos),
    social: cleanSocial(input.social, prev.social),
    shop: str(shop, 200), custom: str(custom, 400), story: str(story, 500),
    benefits: (input.benefits ?? prev.benefits ?? HOME_DEFAULTS.benefits).map((b) => ({ t: cleanText(b.t, 50), d: cleanText(b.d, 160) })).filter((b) => b.t).slice(0, 6),
    newsletterSub: cleanText(input.newsletterSub ?? prev.newsletterSub ?? HOME_DEFAULTS.newsletterSub, 140),
    feature,
    eyebrow: cleanText(input.eyebrow ?? prev.eyebrow, 40),
    headline: cleanText(input.headline ?? prev.headline, 80) || HOME_DEFAULTS.headline,
    sub: cleanText(input.sub ?? prev.sub, 140),
    checklist: (input.checklist ?? prev.checklist).map((x) => cleanText(x, 50)).filter(Boolean).slice(0, 6),
    cta: { label: cleanText(input.cta?.label ?? prev.cta.label, 24) || "Shop now", href: cleanLink(input.cta?.href ?? prev.cta.href, "/shop") },
    badge: cleanText(input.badge ?? prev.badge, 16),
    heroImage: input.heroImage === undefined ? prev.heroImage : cleanUrl(input.heroImage),
    heroLayout: (input.heroLayout ?? prev.heroLayout) === "split" ? "split" : "banner",
    chips,
    rows,
    latestTitle: cleanText(input.latestTitle ?? prev.latestTitle, 60) || "Latest Designs",
    hours: String(input.hours ?? prev.hours).replace(/[<>]/g, "").slice(0, 400),
    mapQuery: cleanText(input.mapQuery ?? prev.mapQuery, 160),
    newsletterTitle: cleanText(input.newsletterTitle ?? prev.newsletterTitle, 80),
  };
}

export async function getHome(): Promise<StoreHome> {
  const row = await memo("sf:home", () => db.setting.findUnique({ where: { key: "storeHome" } })).catch(() => null);
  const v = (row?.value ?? {}) as Partial<StoreHome>;
  try {
    return cleanHome(v, HOME_DEFAULTS);
  } catch {
    return HOME_DEFAULTS;
  }
}

export async function saveHome(h: StoreHome) {
  const value = JSON.parse(JSON.stringify(h));
  await db.setting.upsert({ where: { key: "storeHome" }, create: { key: "storeHome", value }, update: { value } });
  clearMemo("sf:home");
}

export const parseHours = (t: string) =>
  t.split(/\r?\n/).map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map(([day, time]) => ({ day, time: time || "Closed" }));
