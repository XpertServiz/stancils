import { describe, expect, it } from "vitest";
import { cleanLandingSettings, cleanProduct, LANDING_DEFAULTS, matchCategory, splitCategory } from "../lib/landing";
import { DEFAULT_LANDING_PRODUCTS, SUBCATEGORIES } from "../lib/landing/defaults";
import { cleanHome, DEFAULT_MENU_TEXT, HOME_DEFAULTS, parseHours, parseMenu, slugify, slugsFor } from "../lib/storefront";
import { DEFAULT_THEME, THEMES, themeById } from "../lib/themes";
import { cleanSale, isLive, landingPercent, saleDiscount } from "../lib/sales";
import { parseCsv } from "../lib/services/importer";

describe("storefront menu and homepage", () => {
  it("the default theme exists, and every theme has a distinct id", () => {
    expect(THEMES.some((t) => t.id === DEFAULT_THEME)).toBe(true);
    expect(themeById("nonsense").id).toBe(DEFAULT_THEME);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });
  const menu = parseMenu(DEFAULT_MENU_TEXT);
  it("builds the dropdown menu from indented text", () => {
    expect(menu.map((m) => m.label)).toEqual(["All Collections", "All Stencils", "Calligraphy Stencils", "Wall & Canvas Stencils", "Carpet Design Stencils", "Art & Craft Stencils", "Acrylic Wall Decoration", "Art Supplies"]);
    const cal = menu.find((m) => m.label === "Calligraphy Stencils")!;
    expect(cal.children).toHaveLength(9);
    expect(cal.href).toBe("/c/all-calligraphy-stencils");
    expect(menu[0].href).toBe("/collections");
    expect(menu.find((m) => m.label === "Carpet Design Stencils")!.href).toBe("/c/carpet-design-stencils");
  });
  it("slugifies names the same way everywhere", () => {
    expect(slugify("Wall & Canvas Stencils")).toBe("wall-and-canvas-stencils");
    expect(slugify("4 Qul")).toBe("4-qul");
  });
  it("a parent collection also lists its sub-collections", () => {
    const s = slugsFor("all-calligraphy-stencils", menu);
    expect(s).toContain("tasbih");
    expect(s).toContain("ayat-ul-kursi");
    expect(slugsFor("tasbih", menu)).toEqual(["tasbih"]);
  });
  it("validates homepage settings", () => {
    expect(cleanHome({ headline: "Hi" }, HOME_DEFAULTS).headline).toBe("Hi");
    expect(() => cleanHome({ heroImage: "javascript:alert(1)" }, HOME_DEFAULTS)).toThrow();
    expect(() => cleanHome({ cta: { label: "x", href: "javascript:x" } }, HOME_DEFAULTS)).toThrow();
    expect(cleanHome({ headline: "<b>Hi</b>" }, HOME_DEFAULTS).headline).toBe("bHi/b");
    const rows = cleanHome({ rows: [{ title: "A", intro: "", collection: "Wall & Canvas", banner: "", count: 99 }, { title: "", intro: "", collection: "x", banner: "", count: 8 }] }, HOME_DEFAULTS).rows;
    expect(rows).toEqual([{ title: "A", intro: "", collection: "wall-and-canvas", banner: "", count: 12 }]);
  });
  it("the hero is a banner by default and can be switched", () => {
    expect(HOME_DEFAULTS.heroLayout).toBe("banner");
    expect(cleanHome({ heroLayout: "split" }, HOME_DEFAULTS).heroLayout).toBe("split");
    expect(cleanHome({ heroLayout: "x" as never }, HOME_DEFAULTS).heroLayout).toBe("banner");
  });
  it("collection picture tiles keep their picture and reject bad links", () => {
    const c = cleanHome({}, HOME_DEFAULTS).chips;
    expect(c).toHaveLength(6);
    expect(c.every((x) => x.href.startsWith("/c/") && x.image?.startsWith("/images/collections/"))).toBe(true);
    expect(() => cleanHome({ chips: [{ label: "x", href: "javascript:x" }] }, HOME_DEFAULTS)).toThrow();
    expect(() => cleanHome({ chips: [{ label: "x", href: "/shop", image: "javascript:x" }] }, HOME_DEFAULTS)).toThrow();
  });
  it("reads opening hours", () => {
    expect(parseHours("Mon | 10am – 9pm\nSun").at(-1)).toEqual({ day: "Sun", time: "Closed" });
  });
});

describe("landing products", () => {
  it("defaults are the starter products, each in a known subcategory", () => {
    expect(DEFAULT_LANDING_PRODUCTS).toHaveLength(34);
    for (const p of DEFAULT_LANDING_PRODUCTS) expect(SUBCATEGORIES[p.cat as keyof typeof SUBCATEGORIES]).toContain(p.subcat);
  });
  it("accepts a normal product", () => {
    const p = cleanProduct({ name: "Peony Vine Stencil", cat: "Stencils", subcat: "Floral & Botanical", price: "15", icon: "❁", bg: "#e5f0e7", tag: "New" }, 99);
    expect(p).toMatchObject({ id: 99, price: 15, cat: "Stencils" });
  });
  it("rejects markup and script breakouts", () => {
    const b = { cat: "Gifts", subcat: "", price: 0, bg: "#ffffff" };
    expect(() => cleanProduct({ ...b, name: "<img src=x onerror=alert(1)>" }, 1)).toThrow();
    expect(() => cleanProduct({ ...b, name: "a ${alert(1)}" }, 1)).toThrow();
    expect(() => cleanProduct({ ...b, name: "ok", bg: "red;background:url(x)" }, 1)).toThrow();
    expect(() => cleanProduct({ ...b, name: "ok", image: "javascript:alert(1)" }, 1)).toThrow();
  });
  it("splits the one-dropdown category and matches spreadsheet text", () => {
    expect(splitCategory("Stencils|Floral & Botanical")).toEqual({ cat: "Stencils", subcat: "Floral & Botanical" });
    expect(splitCategory("Gifts")).toEqual({ cat: "Gifts", subcat: "" });
    expect(matchCategory("t-shirts")).toEqual({ cat: "T-Shirts", subcat: "" });
    expect(matchCategory("floral & botanical")).toEqual({ cat: "Stencils", subcat: "Floral & Botanical" });
    expect(matchCategory("nonsense")).toBeNull();
  });
  it("validates the page settings", () => {
    expect(cleanLandingSettings({ headline: "Hi" }, LANDING_DEFAULTS).headline).toBe("Hi");
    expect(() => cleanLandingSettings({ headline: "<script>" }, LANDING_DEFAULTS)).toThrow();
    expect(() => cleanLandingSettings({ heroImage: "javascript:x" }, LANDING_DEFAULTS)).toThrow();
  });
});

describe("website sale", () => {
  const sale = cleanSale({ name: "Eid Sale", percent: "10", scope: "all", active: "on" }, 1);
  it("validates", () => {
    expect(() => cleanSale({ name: "", percent: 10 }, 1)).toThrow();
    expect(() => cleanSale({ name: "x", percent: 95 }, 1)).toThrow();
    expect(() => cleanSale({ name: "x", percent: 10, scope: "collection", collection: "" }, 1)).toThrow();
    expect(() => cleanSale({ name: "x", percent: 10, startsAt: "2026-02-01", endsAt: "2026-01-01" }, 1)).toThrow();
  });
  it("respects the on/off switch and dates", () => {
    expect(isLive(sale)).toBe(true);
    expect(isLive({ ...sale, active: false })).toBe(false);
    expect(isLive({ ...sale, endsAt: "2000-01-01T00:00:00.000Z" })).toBe(false);
    expect(isLive({ ...sale, startsAt: "2999-01-01T00:00:00.000Z" })).toBe(false);
  });
  it("discounts only covered lines and never stacks two sales on a line", () => {
    const gifts = cleanSale({ name: "Gifts", percent: 20, scope: "collection", collection: "gifts", active: "on" }, 2);
    const r = saleDiscount([{ total: 10000n, collections: ["Stencils"] }, { total: 10000n, collections: ["Gifts"] }], [sale, gifts]);
    expect(r.discount).toBe(1000n + 2000n); // 10% on stencils, the better 20% on gifts — not 30%
    expect(landingPercent([gifts], { cat: "Gifts", subcat: "" })).toBe(20);
    expect(landingPercent([gifts], { cat: "Stencils", subcat: "" })).toBe(0);
  });
});

describe("simple import file", () => {
  it("reads the 6-column template and fills in the rest", () => {
    const { rows, format } = parseCsv("name,category,price,stock,photo_link,description\nRose Wall Stencil,Stencils,15.00,,https://x.co/a.jpg,Pretty\nGift Basket,Gifts,$45,10,,Nice\n");
    expect(format).toBe("simple");
    expect(rows[0]).toMatchObject({ name: "Rose Wall Stencil", slug: "rose-wall-stencil", sku: "P-ROSE-WALL-STENCIL", type: "MADE_TO_ORDER", price: "15.00", collections: "Stencils" });
    expect(rows[1]).toMatchObject({ type: "STOCK_PHYSICAL", opening_stock: "10", price: "45" });
  });
  it("still reads the advanced file", () => {
    expect(parseCsv("name,slug,type,sku,price\nA,a,STOCK_PHYSICAL,A-1,5\n").format).toBe("template");
  });
});

describe("starter catalogue data", () => {
  it("every product points at a real collection, and slugs and names are unique", async () => {
    const { COLLECTIONS, PRODUCTS, SIZES } = await import("../prisma/catalog-data");
    const slugs = new Set(COLLECTIONS.map((c) => c.slug));
    expect(slugs.size).toBe(COLLECTIONS.length);
    for (const p of PRODUCTS) expect(slugs.has(p.collection)).toBe(true);
    expect(new Set(PRODUCTS.map((p) => slugify(p.name))).size).toBe(PRODUCTS.length);
    expect(SIZES.map((s) => s.mult)).toEqual([...SIZES.map((s) => s.mult)].sort((a, b) => a - b));
  });
  it("every collection the default menu links to exists in the catalogue data", async () => {
    const { COLLECTIONS } = await import("../prisma/catalog-data");
    const have = new Set(COLLECTIONS.map((c) => c.slug));
    for (const m of parseMenu(DEFAULT_MENU_TEXT).flatMap((x) => [x, ...x.children])) {
      const mm = /^\/c\/([a-z0-9-]+)$/.exec(m.href);
      if (mm) expect(have.has(mm[1]), m.href).toBe(true);
    }
  });
});
