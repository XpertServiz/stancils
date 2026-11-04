import { describe, expect, it } from "vitest";
import { cleanLandingSettings, cleanProduct, LANDING_DEFAULTS, matchCategory, splitCategory } from "../lib/landing";
import { DEFAULT_LANDING_PRODUCTS, SUBCATEGORIES } from "../lib/landing/defaults";
import { buildHome, type HomeData } from "../lib/landing/template";
import { cleanSale, isLive, landingPercent, saleDiscount } from "../lib/sales";
import { parseCsv } from "../lib/services/importer";

const base: HomeData = {
  site: "https://example.com", brand: "Studio", tagline: "Stencils", page: LANDING_DEFAULTS, title: "T | Studio", image: "https://example.com/x.jpg",
  cards: [{ id: 1, name: "Rose <b>Stencil</b>", cat: "Stencils", subcat: "Floral & Botanical", icon: "❀", bg: "#fff", tag: "New", slug: "rose", variantId: "v1", minor: 1000, fullMinor: 1200, pct: 10, text: "$10.00", fullText: "$12.00" }],
  reviews: [{ name: "Ann", rating: 5, title: "Great", body: "Loved it </script>", verified: true, product: "" }],
  rating: { avg: 5, count: 1 }, sale: { name: "Eid Sale", percent: 10 }, cur: { code: "USD", exponent: 2 }, currencies: ["USD", "PKR"], jsonLd: [{ "@type": "Organization", name: "x</script>" }], whatsapp: "",
};

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
    expect(() => cleanProduct({ ...b, name: "ok", subcat: "Floral & Botanical" }, 1)).toThrow();
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

describe("homepage HTML", () => {
  const html = buildHome(base);
  it("has the SEO essentials", () => {
    expect(html).toContain('<link rel="canonical" href="https://example.com/">');
    expect(html).toContain('name="description"');
    expect(html).toContain('name="keywords"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain("application/ld+json");
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
  });
  it("renders products and reviews in the HTML, escaped, with a crawlable product link", () => {
    expect(html).toContain('href="/p/rose"');
    expect(html).not.toContain("<b>Stencil</b>");
    expect(html).toContain("Rose &lt;b&gt;Stencil&lt;/b&gt;");
    expect(html).toContain("Verified buyer");
  });
  it("cannot be broken out of a script element", () => {
    expect(html.match(/<script/g)!.length).toBe(html.match(/<\/script>/g)!.length);
    expect(html).not.toContain("x</script>");
    expect(html).not.toContain("Loved it </script>");
  });
  it("checks out through the real cart", () => {
    expect(html).toContain("cc_cart_v1");
    expect(html).toContain('href="/checkout"');
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
