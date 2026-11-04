import { db } from "./db";
import { clearMemo, memo } from "./memo";

/**
 * Storefront configuration the owner edits in the admin panel: the top menu and the homepage layout.
 * DECISION: stored as JSON in `Setting` (no migration). Collections themselves live in the catalogue,
 * so adding a product to a collection is all it takes for it to show up in the menu and on the homepage.
 */

export type MenuItem = { label: string; href: string; children: { label: string; href: string }[] };
export type HomeRow = { title: string; intro: string; collection: string; banner: string; count: number };
/** A picture tile in “Our Collections”. `baked` = the name is already written on the picture, so we do not print it again. */
export type Chip = { label: string; href: string; image?: string; baked?: boolean };
export type StoreHome = {
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

export const DEFAULT_MENU_TEXT = `All Collections | /collections
All Stencils | /shop
Calligraphy Stencils
  All Calligraphy Stencils
  Entire Surah
  Tasbih
  Quran Verses
  Sacred Names
  Ayat ul Kursi
  4 Qul
  Quranic Panels
  Kaaba-Inspired Calligraphy
Wall & Canvas Stencils
  Mandala Designs
  Floral & Motif Designs
  Animals & Birds
  Pattern & Texture
  Borders & Corners
  Stencil Packs
  Tribal & Ancient Art
Carpet Design Stencils
Art & Craft Stencils
  All Art & Craft Stencils
  Furniture Stencils
  Fabric Stencils
Acrylic Wall Decoration
Art Supplies`;

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
export const getMenu = async () => parseMenu(await getMenuText());

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
  eyebrow: "New • Limited offer",
  headline: "Paint Beautiful Walls — No Skills Required",
  sub: "Reusable stencils for walls, canvas, furniture and fabric.",
  checklist: ["100% accurate calligraphy", "All sizes available", "Exclusive designs", "50% discount"],
  cta: { label: "Shop now", href: "/shop" },
  badge: "50% OFF",
  heroImage: "/images/hero-banner.jpg",
  heroLayout: "banner",
  chips: [
    { label: "All Calligraphy Stencils", href: "/c/all-calligraphy-stencils", image: "/images/collections/all-calligraphy-stencils.jpg" },
    { label: "Mandala Stencils", href: "/c/mandala-designs", image: "/images/collections/mandala-stencils.jpg", baked: true },
    { label: "Floral & Motif Designs", href: "/c/floral-and-motif-designs", image: "/images/collections/floral-motif-designs.jpg", baked: true },
    { label: "Fabric Stencils", href: "/c/fabric-stencils", image: "/images/collections/fabric-stencils.jpg" },
    { label: "Furniture Stencils", href: "/c/furniture-stencils", image: "/images/collections/furniture-stencils.jpg", baked: true },
    { label: "Calligraphy Brushes", href: "/c/art-supplies", image: "/images/collections/calligraphy-brushes.jpg", baked: true },
  ],
  rows: [
    { title: "Persian Carpet Stencils", intro: "Elegant designs inspired by traditional rugs, ideal for canvas, walls and furniture.", collection: "carpet-design-stencils", banner: "", count: 8 },
    { title: "Islamic / Arabic Calligraphy Stencils", intro: "Apply graceful calligraphic art to canvas, walls, glass and ceramic.", collection: "all-calligraphy-stencils", banner: "", count: 8 },
    { title: "Wall Stencils for DIY Home Décor", intro: "Easy to use, economical, and a better alternative to wallpaper or decals.", collection: "wall-and-canvas-stencils", banner: "", count: 8 },
    { title: "Canvas Painting / Sketching Stencils", intro: "Reusable mylar stencils for canvas and wall art.", collection: "all-art-and-craft-stencils", banner: "", count: 8 },
    { title: "Furniture Stencils for Makeovers", intro: "Sized for small DIY projects — stencil your own custom furniture design.", collection: "furniture-stencils", banner: "", count: 8 },
  ],
  latestTitle: "Latest Designs",
  hours: "Mon | 10am – 9pm\nTue | 11am – 9pm\nWed | 11am – 5pm\nThu | 11am – 9pm\nFri | 10am – 9pm\nSat | 11am – 9pm\nSun | Closed",
  mapQuery: "",
  newsletterTitle: "Get new designs and offers first",
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

export function cleanHome(input: Partial<StoreHome>, prev: StoreHome): StoreHome {
  const rows = (input.rows ?? prev.rows).map((r) => ({
    title: cleanText(r.title, 80),
    intro: cleanText(r.intro, 200),
    collection: slugify(String(r.collection ?? "")),
    banner: cleanUrl(r.banner),
    count: Math.max(2, Math.min(12, Math.round(Number(r.count)) || 8)),
  })).filter((r) => r.title && r.collection);
  const chips = (input.chips ?? prev.chips)
    .map((c) => ({ label: cleanText(c.label, 40), href: cleanLink(c.href, "/shop"), image: cleanUrl(c.image), baked: Boolean(c.baked) && Boolean(c.image) }))
    .filter((c) => c.label)
    .slice(0, 12);
  return {
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
