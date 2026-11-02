import { describe, expect, it } from "vitest";
import { cleanProduct } from "../lib/landing";
import { DEFAULT_LANDING_PRODUCTS, SUBCATEGORIES } from "../lib/landing/defaults";
import { HOME_TEMPLATE } from "../lib/landing/template";

describe("landing products", () => {
  it("template has exactly one product slot", () => {
    expect(HOME_TEMPLATE.split("/*__PRODUCTS__*/").length).toBe(2);
  });
  it("defaults are the design file's 34 products, each in a known subcategory", () => {
    expect(DEFAULT_LANDING_PRODUCTS).toHaveLength(34);
    for (const p of DEFAULT_LANDING_PRODUCTS) expect(SUBCATEGORIES[p.cat as keyof typeof SUBCATEGORIES]).toContain(p.subcat);
  });
  it("accepts a normal product", () => {
    const p = cleanProduct({ name: "Peony Vine Stencil", cat: "Stencils", subcat: "Floral & Botanical", price: "15", icon: "❁", bg: "#e5f0e7", tag: "New" }, 99);
    expect(p).toMatchObject({ id: 99, price: 15, cat: "Stencils" });
  });
  it("rejects markup and script breakouts", () => {
    const base = { cat: "Gifts", subcat: "", price: 0, bg: "#ffffff" };
    expect(() => cleanProduct({ ...base, name: "<img src=x onerror=alert(1)>" }, 1)).toThrow();
    expect(() => cleanProduct({ ...base, name: "a ${alert(1)}" }, 1)).toThrow();
    expect(() => cleanProduct({ ...base, name: "ok", bg: "red;background:url(x)" }, 1)).toThrow();
    expect(() => cleanProduct({ ...base, name: "ok", image: "javascript:alert(1)" }, 1)).toThrow();
    expect(() => cleanProduct({ ...base, name: "ok", subcat: "Floral & Botanical" }, 1)).toThrow();
  });
});
