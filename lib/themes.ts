// Storefront themes and fonts. Values are "r g b" triplets so Tailwind can apply opacity.
// The owner picks a theme, optional custom main colour and fonts in Admin → Settings → Theme & fonts.

type Vars = {
  bg: string; s1: string; s2: string; band: string; bandInk: string; line: string;
  ink: string; ink2: string; ink3: string; accent: string; accent2: string; accent3: string; danger: string; onAccent: string;
};

export type Theme = { id: string; name: string; note: string; mode: "dark" | "light"; vars: Vars };

const dark = (v: Omit<Vars, "danger" | "onAccent"> & Partial<Pick<Vars, "danger" | "onAccent">>): Vars => ({ danger: "255 107 107", onAccent: "20 22 28", ...v });
const light = (v: Omit<Vars, "danger" | "onAccent"> & Partial<Pick<Vars, "danger" | "onAccent">>): Vars => ({ danger: "196 48 48", onAccent: "255 255 255", ...v });

export const THEMES: Theme[] = [
  { id: "studio", name: "Gift Studio", note: "Simple & elegant — white, blush pink and lavender", mode: "light", vars: light({ bg: "255 252 253", s1: "255 255 255", s2: "255 246 250", band: "246 241 255", bandInk: "41 34 60", line: "238 224 233", ink: "41 34 60", ink2: "84 76 106", ink3: "112 104 132", accent: "222 64 122", accent2: "13 128 118", accent3: "168 104 0" }) },
  { id: "ocean", name: "Ocean Teal", note: "Deep navy with fresh teal", mode: "dark", vars: dark({ bg: "27 39 53", s1: "35 50 67", s2: "45 62 82", band: "226 235 240", bandInk: "22 32 44", line: "62 82 104", ink: "240 246 250", ink2: "196 210 222", ink3: "150 170 188", accent: "45 212 191", accent2: "125 211 252", accent3: "250 204 21" }) },
  { id: "midnight", name: "Midnight Blue", note: "Classic dark blue, calm and premium", mode: "dark", vars: dark({ bg: "21 27 45", s1: "29 36 58", s2: "39 48 76", band: "229 233 243", bandInk: "21 27 45", line: "56 67 102", ink: "238 242 255", ink2: "196 204 230", ink3: "150 160 194", accent: "96 165 250", accent2: "52 211 153", accent3: "251 191 36" }) },
  { id: "forest", name: "Forest Gold", note: "Rich green with warm gold", mode: "dark", vars: dark({ bg: "29 43 37", s1: "37 54 47", s2: "47 67 58", band: "236 233 220", bandInk: "28 38 33", line: "68 92 80", ink: "241 245 238", ink2: "203 214 200", ink3: "160 178 160", accent: "234 179 8", accent2: "110 231 183", accent3: "253 224 71" }) },
  { id: "emerald", name: "Emerald", note: "Jewel green, modern and clean", mode: "dark", vars: dark({ bg: "18 38 35", s1: "24 50 46", s2: "32 64 59", band: "226 240 236", bandInk: "16 36 33", line: "50 88 81", ink: "236 250 245", ink2: "190 222 212", ink3: "140 184 172", accent: "52 211 153", accent2: "103 232 249", accent3: "250 204 21" }) },
  { id: "plum", name: "Lavender Plum", note: "Soft violet on deep plum", mode: "dark", vars: dark({ bg: "42 34 60", s1: "52 43 74", s2: "64 54 90", band: "238 233 246", bandInk: "36 28 52", line: "86 74 116", ink: "245 241 252", ink2: "212 202 232", ink3: "170 158 198", accent: "167 139 250", accent2: "94 234 212", accent3: "251 191 36" }) },
  { id: "graphite", name: "Graphite", note: "Monochrome, minimal, gallery-like", mode: "dark", vars: dark({ bg: "36 37 41", s1: "45 46 51", s2: "56 58 64", band: "234 234 232", bandInk: "30 31 34", line: "76 78 86", ink: "244 244 245", ink2: "205 206 210", ink3: "160 161 168", accent: "229 231 235", accent2: "134 239 172", accent3: "253 224 71" }) },
  { id: "dusk", name: "Dusk Coral", note: "Original slate with coral", mode: "dark", vars: dark({ bg: "46 49 64", s1: "56 60 77", s2: "67 72 96", band: "232 226 214", bandInk: "34 36 46", line: "82 88 115", ink: "245 242 236", ink2: "203 200 214", ink3: "163 161 181", accent: "255 122 89", accent2: "94 230 192", accent3: "245 196 81", onAccent: "27 29 36" }) },
  { id: "sage", name: "Sage Studio", note: "Calm green-grey with honey", mode: "dark", vars: dark({ bg: "40 52 48", s1: "50 64 59", s2: "62 78 72", band: "230 232 220", bandInk: "30 40 36", line: "84 104 96", ink: "240 244 236", ink2: "200 212 204", ink3: "162 180 170", accent: "240 180 90", accent2: "140 220 190", accent3: "250 214 120", danger: "255 120 110", onAccent: "30 32 28" }) },
  { id: "terracotta", name: "Terracotta", note: "Warm clay tones", mode: "dark", vars: dark({ bg: "61 44 40", s1: "74 54 49", s2: "89 66 59", band: "240 228 212", bandInk: "50 34 30", line: "112 86 78", ink: "250 240 230", ink2: "222 204 192", ink3: "190 170 158", accent: "240 150 90", accent2: "150 210 170", accent3: "242 200 110", danger: "255 120 110", onAccent: "40 24 20" }) },
  { id: "ink", name: "Ink Night", note: "Darkest, high contrast", mode: "dark", vars: dark({ bg: "18 19 26", s1: "27 29 38", s2: "37 40 53", band: "46 49 64", bandInk: "245 242 236", line: "52 56 74", ink: "240 238 233", ink2: "190 188 204", ink3: "150 148 168", accent: "129 140 248", accent2: "94 230 192", accent3: "245 196 81" }) },
  { id: "sky", name: "Sky Light", note: "Bright and airy with blue", mode: "light", vars: light({ bg: "238 243 248", s1: "248 251 253", s2: "255 255 255", band: "27 39 53", bandInk: "240 246 250", line: "203 213 225", ink: "15 23 42", ink2: "51 65 85", ink3: "90 104 124", accent: "37 99 235", accent2: "13 148 136", accent3: "180 120 0" }) },
  { id: "mint", name: "Mint Light", note: "Fresh and friendly teal", mode: "light", vars: light({ bg: "236 245 241", s1: "246 251 249", s2: "255 255 255", band: "18 38 35", bandInk: "236 250 245", line: "196 222 212", ink: "17 34 30", ink2: "52 76 70", ink3: "84 110 102", accent: "13 148 136", accent2: "37 99 235", accent3: "161 98 7" }) },
  { id: "stone", name: "Stone Day", note: "Warm paper tones", mode: "light", vars: light({ bg: "236 231 222", s1: "246 242 235", s2: "255 252 247", band: "46 49 64", bandInk: "245 242 236", line: "206 198 184", ink: "34 36 46", ink2: "70 72 88", ink3: "98 99 116", accent: "71 85 105", accent2: "18 140 110", accent3: "176 124 10" }) },
  { id: "blush", name: "Blush Rose", note: "Elegant rose on soft pink", mode: "light", vars: light({ bg: "250 240 242", s1: "253 247 248", s2: "255 255 255", band: "60 28 40", bandInk: "253 242 246", line: "236 210 218", ink: "48 20 32", ink2: "92 56 70", ink3: "124 90 104", accent: "190 24 93", accent2: "15 118 110", accent3: "161 98 7" }) },
];

export const DEFAULT_THEME = "studio";

/** Most popular Google Fonts worldwide, with the weights each one actually ships (Google rejects missing weights). */
export const FONTS: Record<string, { weights: string; kind: "sans" | "serif" | "display" }> = {
  Poppins: { weights: "400;500;600;700", kind: "sans" },
  Roboto: { weights: "400;500;700", kind: "sans" },
  "Open Sans": { weights: "400;500;600;700", kind: "sans" },
  Montserrat: { weights: "400;500;600;700", kind: "sans" },
  Lato: { weights: "400;700", kind: "sans" },
  Inter: { weights: "400;500;600;700", kind: "sans" },
  Raleway: { weights: "400;500;600;700", kind: "sans" },
  Nunito: { weights: "400;500;600;700", kind: "sans" },
  "Noto Sans": { weights: "400;500;600;700", kind: "sans" },
  Rubik: { weights: "400;500;600;700", kind: "sans" },
  Ubuntu: { weights: "400;500;700", kind: "sans" },
  "Work Sans": { weights: "400;500;600;700", kind: "sans" },
  "PT Sans": { weights: "400;700", kind: "sans" },
  "Source Sans 3": { weights: "400;500;600;700", kind: "sans" },
  "DM Sans": { weights: "400;500;600;700", kind: "sans" },
  Manrope: { weights: "400;500;600;700", kind: "sans" },
  Mulish: { weights: "400;500;600;700", kind: "sans" },
  Quicksand: { weights: "400;500;600;700", kind: "sans" },
  Barlow: { weights: "400;500;600;700", kind: "sans" },
  "Josefin Sans": { weights: "400;500;600;700", kind: "sans" },
  Kanit: { weights: "400;500;600;700", kind: "sans" },
  Outfit: { weights: "400;500;600;700", kind: "sans" },
  "Plus Jakarta Sans": { weights: "400;500;600;700", kind: "sans" },
  Figtree: { weights: "400;500;600;700", kind: "sans" },
  Urbanist: { weights: "400;500;600;700", kind: "sans" },
  Lexend: { weights: "400;500;600;700", kind: "sans" },
  Sora: { weights: "400;500;600;700", kind: "sans" },
  "Space Grotesk": { weights: "400;500;600;700", kind: "sans" },
  "Bricolage Grotesque": { weights: "400;500;600;700", kind: "sans" },
  Oswald: { weights: "400;500;600;700", kind: "display" },
  "Bebas Neue": { weights: "400", kind: "display" },
  "Playfair Display": { weights: "400;500;600;700", kind: "serif" },
  Merriweather: { weights: "400;700", kind: "serif" },
  Lora: { weights: "400;500;600;700", kind: "serif" },
  "Libre Baskerville": { weights: "400;700", kind: "serif" },
  "DM Serif Display": { weights: "400", kind: "serif" },
  Fraunces: { weights: "400;500;600;700", kind: "serif" },
};
export const FONT_NAMES = Object.keys(FONTS);
export const DEFAULT_FONT = "Poppins";

export const themeById = (id?: string) => THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME)!;

/** The visitor light/dark toggle switches to this companion theme. */
export const companionOf = (t: Theme) => (t.mode === "dark" ? (t.id === "ocean" || t.id === "midnight" ? "sky" : t.id === "emerald" || t.id === "forest" || t.id === "sage" ? "mint" : t.id === "plum" ? "blush" : "stone") : t.id === "sky" ? "midnight" : t.id === "mint" ? "emerald" : t.id === "blush" || t.id === "studio" ? "plum" : "dusk");

export function hexToTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Black or white text, whichever reads better on the colour. */
export function onColor(triplet: string) {
  const [r, g, b] = triplet.split(" ").map((x) => Number(x) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.36 ? "20 22 28" : "255 255 255";
}

function block(sel: string, v: Vars, mode: "dark" | "light") {
  return `${sel}{--bg:${v.bg};--surface-1:${v.s1};--surface-2:${v.s2};--band-stone:${v.band};--stone-ink:${v.bandInk};--line:${v.line};--ink:${v.ink};--ink-2:${v.ink2};--ink-3:${v.ink3};--accent:${v.accent};--accent-2:${v.accent2};--accent-3:${v.accent3};--danger:${v.danger};--on-accent:${v.onAccent};color-scheme:${mode}}`;
}

/** CSS for every theme, plus the owner's custom main colour and fonts. */
export function themeCss(opts: { accent?: string; displayFont?: string; bodyFont?: string }) {
  const css = THEMES.map((t) => block(`[data-theme="${t.id}"]`, t.vars, t.mode));
  const acc = opts.accent ? hexToTriplet(opts.accent) : null;
  if (acc) css.push(`[data-theme]{--accent:${acc};--on-accent:${onColor(acc)}}`);
  css.push(`:root{--font-display:"${FONTS[opts.displayFont ?? ""] ? opts.displayFont : DEFAULT_FONT}",system-ui,sans-serif;--font-body:"${FONTS[opts.bodyFont ?? ""] ? opts.bodyFont : DEFAULT_FONT}",system-ui,sans-serif}`);
  return css.join("\n");
}

export function googleFontsHref(displayFont: string, bodyFont: string) {
  const fam = (f: string) => {
    const name = FONTS[f] ? f : DEFAULT_FONT;
    const w = FONTS[name].weights;
    // serif headings use an italic accent word, so load the italic cut too
    if (FONTS[name].kind === "serif") return `family=${name.replace(/ /g, "+")}:ital,wght@${w.split(";").map((x) => `0,${x}`).join(";")};${w.split(";").map((x) => `1,${x}`).join(";")}`;
    return `family=${name.replace(/ /g, "+")}:wght@${w}`;
  };
  const fonts = new Set([fam(displayFont), fam(bodyFont), "family=IBM+Plex+Mono:wght@400;500", "family=Allerta+Stencil", "family=Big+Shoulders+Stencil+Display:wght@700;800", "family=Saira+Stencil+One"]);
  return `https://fonts.googleapis.com/css2?${[...fonts].join("&")}&display=swap`;
}
