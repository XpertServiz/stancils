/**
 * Size options offered when a product is created: stencils (inches), T-shirts (XS–5XL, youth) and gifts (Small–Deluxe).
 * The price the owner types is for the FIRST option; the others are scaled by `mult`.
 */
export type SizeOpt = { label: string; tag: string; mult: number; mm?: number };
export type SizeSetKey = "stencil" | "tee" | "gift" | "single";

const sq = (inch: number, mult: number): SizeOpt => ({ label: `${inch} × ${inch} in`, tag: String(inch), mult, mm: Math.round(inch * 25.4) });

export const SIZE_SETS: Record<SizeSetKey, { label: string; field: string; options: SizeOpt[] }> = {
  stencil: { label: "Stencil sizes (4×4 to 16×16 in)", field: "Stencil size", options: [sq(4, 1), sq(6, 1.3), sq(8, 1.8), sq(12, 2.8), sq(16, 4)] },
  tee: {
    label: "T-shirt sizes (XS to 5XL + youth)", field: "T-shirt size",
    options: [
      { label: "XS", tag: "XS", mult: 1 }, { label: "S", tag: "S", mult: 1 }, { label: "M", tag: "M", mult: 1 }, { label: "L", tag: "L", mult: 1 }, { label: "XL", tag: "XL", mult: 1 },
      { label: "XXL", tag: "2XL", mult: 1.1 }, { label: "XXXL", tag: "3XL", mult: 1.2 }, { label: "4XL", tag: "4XL", mult: 1.3 }, { label: "5XL", tag: "5XL", mult: 1.4 },
      { label: "Youth S", tag: "YS", mult: 0.9 }, { label: "Youth M", tag: "YM", mult: 0.9 }, { label: "Youth L", tag: "YL", mult: 0.9 },
    ],
  },
  gift: {
    label: "Gift sizes (Small to Deluxe)", field: "Gift size",
    options: [{ label: "Small", tag: "S", mult: 1 }, { label: "Medium", tag: "M", mult: 1.4 }, { label: "Large", tag: "L", mult: 1.9 }, { label: "Deluxe", tag: "DX", mult: 2.6 }],
  },
  single: { label: "One size only", field: "Size", options: [{ label: "Standard", tag: "1", mult: 1 }] },
};

export const SET_KEYS = Object.keys(SIZE_SETS) as SizeSetKey[];

/** Guess the size set from a category name ("Birthday Gift Baskets" → gift, "Custom T-Shirts" → tee …). */
export function sizeSetFor(name: string): SizeSetKey {
  const n = name.toLowerCase();
  if (/t-?shirt|\btee|apparel|hoodie|sweatshirt/.test(n)) return "tee";
  if (/gift|basket|hamper|wedding|holiday|celebration/.test(n)) return "gift";
  if (/stencil|wall|floral|mandala|calligraphy|geometric|decor/.test(n)) return "stencil";
  if (/supplies|brush|paint|print|poster|art/.test(n)) return "single";
  return "stencil";
}

/** Label for the size dropdown on the shop, from the variant names (stencils → "Stencil size", everything else → "Size"). */
export function sizeFieldLabel(variantNames: string[]): string {
  // DECISION: tees and gifts just say "Size" (the category already says what it is); stencils keep "Stencil size" for the custom-size link.
  if (variantNames.some((n) => /×|x\d|inches/i.test(n))) return "Stencil size";
  return "Size";
}
