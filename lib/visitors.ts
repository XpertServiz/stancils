/** Helpers for the visitor statistics (Admin → Visitors). No IP addresses are stored — only the country/city the host reports. */

export const BOT_RE = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|axios|monitor|uptime|pingdom/i;

export function parseUA(ua: string) {
  const mobile = /Mobi|Android.*Mobile|iPhone|iPod/i.test(ua);
  const tablet = !mobile && /iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
  const device = mobile ? "mobile" : tablet ? "tablet" : "desktop";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod|iOS/.test(ua) ? "iOS" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Other";
  return { device, browser, os };
}

/** Where a visit came from, in plain words: a campaign name, a known site, or "Direct". */
export function sourceOf(referrerHost: string | null, utm: string | null, ownHost: string) {
  if (utm) return utm.toLowerCase().slice(0, 40);
  if (!referrerHost || referrerHost === ownHost) return "Direct";
  const h = referrerHost.replace(/^www\./, "");
  if (/google\./.test(h)) return "Google";
  if (/bing\.com/.test(h)) return "Bing";
  if (/facebook\.com|fb\.com|l\.facebook/.test(h)) return "Facebook";
  if (/instagram\.com/.test(h)) return "Instagram";
  if (/pinterest\./.test(h)) return "Pinterest";
  if (/whatsapp|wa\.me/.test(h)) return "WhatsApp";
  if (/youtube\.com|youtu\.be/.test(h)) return "YouTube";
  if (/t\.co$|twitter\.com|x\.com/.test(h)) return "X / Twitter";
  return h.slice(0, 60);
}

let names: Intl.DisplayNames | null = null;
export function countryName(code: string | null | undefined) {
  if (!code) return "Unknown";
  try {
    names ??= new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** 🇵🇰 from "PK" */
export function flag(code: string | null | undefined) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const RANGES: Record<string, { label: string; days: number }> = {
  "24h": { label: "Last 24 hours", days: 1 },
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
};
