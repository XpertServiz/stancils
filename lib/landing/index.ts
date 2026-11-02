import { db } from "../db";
import { memo, clearMemo } from "../memo";
import { DEFAULT_LANDING_PRODUCTS, DEPARTMENTS, SUBCATEGORIES } from "./defaults";
import { HOME_TEMPLATE } from "./template";

/**
 * Products shown on the landing page (the owner's approved design). Managed in
 * Admin → Website → Landing products; starts as the design file's own list.
 * DECISION: `price` is the design's display price in USD (the page converts to CAD itself);
 * it is presentation data only — real orders still go through the catalog, checkout and ledger.
 */
export type LandingProduct = {
  id: number;
  name: string;
  cat: (typeof DEPARTMENTS)[number];
  subcat: string;
  price: number;
  icon: string;
  bg: string;
  tag: string;
  image?: string;
};

const KEY = "landingProducts";

export async function getLandingProducts(): Promise<LandingProduct[]> {
  const row = await memo(KEY, () => db.setting.findUnique({ where: { key: KEY } })).catch(() => null);
  const list = row?.value;
  return Array.isArray(list) ? (list as LandingProduct[]) : (DEFAULT_LANDING_PRODUCTS as LandingProduct[]);
}

export async function saveLandingProducts(list: LandingProduct[]) {
  const value = JSON.parse(JSON.stringify(list));
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  clearMemo(KEY);
}

export async function resetLandingProducts() {
  await db.setting.deleteMany({ where: { key: KEY } });
  clearMemo(KEY);
}

/** Field rules — product text goes into the page's HTML, so markup characters are not allowed. */
export function cleanProduct(input: Record<string, unknown>, id: number): LandingProduct {
  const text = (k: string, max: number, required = false) => {
    const v = String(input[k] ?? "").trim().slice(0, max);
    if (/[<>`\\]|\$\{/.test(v)) throw new Error(`${k}: < > \` \\ and \${ are not allowed.`);
    if (required && !v) throw new Error(`${k} is required.`);
    return v;
  };
  const cat = String(input.cat) as LandingProduct["cat"];
  if (!DEPARTMENTS.includes(cat)) throw new Error("Choose a main collection.");
  const subcat = text("subcat", 80);
  if (subcat && !SUBCATEGORIES[cat].includes(subcat)) throw new Error("Choose a subcategory from the list.");
  const price = Number(input.price || 0);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) throw new Error("Price must be 0 or more (0 = “Price to be added”).");
  const bg = String(input.bg || "#f3e5ee").trim();
  if (!/^#[0-9a-fA-F]{3,8}$/.test(bg)) throw new Error("Background must be a colour like #f3e5ee.");
  const image = String(input.image ?? "").trim();
  if (image && !/^(https:\/\/|\/)[^"'\s<>()]+$/.test(image)) throw new Error("Photo must be an https:// or /uploads/ link.");
  return {
    id,
    name: text("name", 120, true),
    cat,
    subcat,
    price: Math.round(price * 100) / 100,
    icon: text("icon", 8) || "✦",
    bg,
    tag: text("tag", 30),
    ...(image ? { image } : {}),
  };
}

/** The landing page HTML with the current product list. */
export async function renderLandingPage() {
  const products = await getLandingProducts();
  // "<" escaped so product text can never close the <script> element
  const json = JSON.stringify(products).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, "");
  return HOME_TEMPLATE.replace("/*__PRODUCTS__*/", json);
}
