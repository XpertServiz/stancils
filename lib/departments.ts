// Homepage departments and their categories (from the owner's approved "Stencil & Gift Studio" design).
// Stencil categories open the shop with a matching search; departments that are not in the catalog yet
// (gifts, T-shirts, cybersigilism) open a prefilled request form, so every card leads somewhere real.
// DECISION: kept as a typed constant (not CMS rows) to ship the approved layout quickly; edit here.

export type Department = {
  id: "stencils" | "gifts" | "shirts" | "cyber";
  name: string;
  short: string;
  symbol: string;
  anchor: string;
  eyebrow: string;
  title: string;
  sub: string;
  note: string;
  cardText: string;
  cardCta: string;
  bg: string;
  categories: { name: string; href: string; icon: string }[];
};

const shop = (q: string) => `/shop?q=${encodeURIComponent(q)}`;
const ask = (subject: string) => `/contact?subject=${encodeURIComponent(subject)}`;

export const DEPARTMENTS: Department[] = [
  {
    id: "stencils",
    name: "Stencils",
    short: "Stencils",
    symbol: "❀",
    anchor: "stencil-categories",
    eyebrow: "Stencil collections",
    title: "Stencils by main category",
    sub: "Pick a category to see matching stencil designs — every design is cut to order in your size and material.",
    note: "15 stencil categories · Made to order",
    cardText: "Explore available design examples; more designs are added regularly.",
    cardCta: "View designs →",
    bg: "#fafaff",
    categories: [
      ["Wall & Feature Walls", "wall", "❀"],
      ["Construction & Finishes", "allover", "▦"],
      ["Office & Branding", "logo", "⌘"],
      ["Café & Restaurant", "coffee", "☕"],
      ["Mandala & Geometric", "mandala", "✺"],
      ["Floral & Botanical", "floral", "❁"],
      ["Lettering & Quotes", "lettering", "✎"],
      ["Furniture & Borders", "furniture", "▤"],
      ["Floor & Tile", "tile", "◫"],
      ["Fabric & Textiles", "fabric", "▧"],
      ["Kids & Nursery", "kids", "☁"],
      ["Kitchen & Backsplash", "moroccan", "⌂"],
      ["Seasonal & Events", "seasonal", "✦"],
      ["Outdoor & Patio", "nature", "☼"],
      ["Crafts & Gifts", "craft", "✂"],
    ].map(([name, q, icon]) => ({ name, href: shop(q), icon })),
  },
  {
    id: "gifts",
    name: "Gifts",
    short: "Gifts",
    symbol: "🎁",
    anchor: "gift-categories",
    eyebrow: "Gifts for every occasion",
    title: "Explore gift baskets & gifts",
    sub: "Choose an occasion and tell us who it’s for — we’ll put together a personalised gift basket.",
    note: "7 occasion-based gift categories",
    cardText: "Personalised and made to order for the occasion.",
    cardCta: "Explore gifts →",
    bg: "#fff8fa",
    categories: [
      ["Thanksgiving Gift Baskets", "🍁"],
      ["Birthday Gift Baskets", "🎂"],
      ["Wedding & Engagement Gift Baskets", "💍"],
      ["Christmas & Holiday Gift Baskets", "🎄"],
      ["New Year's Gift Baskets", "✨"],
      ["Valentine's Day Gift Baskets", "💕"],
      ["Mother's Day & Father's Day Gifts", "🎀"],
    ].map(([name, icon]) => ({ name, href: ask(name), icon })),
  },
  {
    id: "shirts",
    name: "T-Shirt Printing",
    short: "T-Shirts",
    symbol: "👕",
    anchor: "shirt-categories",
    eyebrow: "Print your ideas",
    title: "T-Shirt Printing",
    sub: "Eight custom printing collections. Choose a category and send us your design or personalisation.",
    note: "8 printing collections",
    cardText: "Send your design and choose printing options.",
    cardCta: "View designs →",
    bg: "#f2f7fb",
    categories: [
      "Custom Photo & Logo T-Shirts",
      "Birthday & Celebration T-Shirts",
      "Family & Matching T-Shirts",
      "Business & Corporate T-Shirts",
      "Sports & Team T-Shirts",
      "Holiday & Seasonal T-Shirts",
      "Graphic & Artistic T-Shirts",
      "Bulk T-Shirt Printing",
    ].map((name) => ({ name, href: ask(name), icon: "👕" })),
  },
  {
    id: "cyber",
    name: "Cybersigilism Art & Design",
    short: "Cybersigilism",
    symbol: "✣",
    anchor: "cyber-categories",
    eyebrow: "Futuristic artwork & fashion",
    title: "Cybersigilism Art & Design",
    sub: "Bold, futuristic linework for apparel, wall art and one-off commissions.",
    note: "4 cybersigilism collections",
    cardText: "Original designs and product variations, made to order.",
    cardCta: "View designs →",
    bg: "#f4f1fa",
    categories: [
      ["Cybersigilism T-Shirt Designs", "👕"],
      ["Cybersigilism Hoodies & Sweatshirts", "✣"],
      ["Cybersigilism Wall Art & Posters", "▧"],
      ["Custom Cybersigilism Artwork", "✦"],
    ].map(([name, icon]) => ({ name, href: ask(name), icon })),
  },
];
