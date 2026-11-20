/**
 * Turns pasted YouTube / Facebook / Instagram / TikTok links into safe embed addresses for the homepage.
 * DECISION: only links on known hosts become iframes (always https, always a fixed provider address we build ourselves),
 * everything else is shown as a plain "Follow us" card — a pasted link can never inject its own markup or script.
 */

export type Network = "facebook" | "instagram" | "tiktok" | "youtube" | "pinterest" | "x" | "linkedin" | "other";

const parse = (raw: string): URL | null => {
  try {
    const u = new URL(String(raw).trim());
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
};
const host = (u: URL) => u.hostname.toLowerCase().replace(/^(www|m|web|mobile|vm|vt)\./, "");
const ID = /^[\w-]{11}$/;

/** The 11-character video id from any YouTube link (watch, youtu.be, shorts, embed, live), or null. */
export function youtubeId(raw: string): string | null {
  const u = parse(raw);
  if (!u) return null;
  const h = host(u);
  const parts = u.pathname.split("/").filter(Boolean);
  let id: string | undefined;
  if (h === "youtu.be") id = parts[0];
  else if (h === "youtube.com" || h === "youtube-nocookie.com" || h === "music.youtube.com") {
    id = u.searchParams.get("v") ?? (["shorts", "embed", "live", "v"].includes(parts[0]) ? parts[1] : undefined);
  }
  return id && ID.test(id) ? id : null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export type SocialInfo = {
  network: Network;
  name: string;
  /** "@handle" or the page name when we can read it from the link */
  handle: string;
  /** provider embed address (we build it), or null → show a card with a button only */
  embed: string | null;
  embedHeight: number;
};

const NAMES: Record<Network, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", pinterest: "Pinterest", x: "X", linkedin: "LinkedIn", other: "Website" };

export function socialInfo(raw: string): SocialInfo | null {
  const u = parse(raw);
  if (!u) return null;
  const h = host(u);
  const parts = u.pathname.split("/").filter(Boolean);
  const href = encodeURIComponent(u.toString());
  const first = parts[0] ? decodeURIComponent(parts[0]).replace(/^@/, "") : "";
  const out = (network: Network, handle: string, embed: string | null, embedHeight = 0): SocialInfo => ({ network, name: NAMES[network], handle, embed, embedHeight });

  if (h === "instagram.com" || h === "instagr.am") {
    const kind = parts[0] === "reels" ? "reel" : parts[0];
    if (["p", "reel", "tv"].includes(kind) && /^[\w-]{5,}$/.test(parts[1] ?? "")) return out("instagram", "", `https://www.instagram.com/${kind}/${parts[1]}/embed`, 600);
    return out("instagram", first ? `@${first}` : "", null);
  }
  if (h === "tiktok.com") {
    const vid = parts.indexOf("video");
    if (vid >= 0 && /^\d{8,}$/.test(parts[vid + 1] ?? "")) return out("tiktok", parts[0]?.startsWith("@") ? parts[0] : "", `https://www.tiktok.com/embed/v2/${parts[vid + 1]}`, 600);
    return out("tiktok", first ? `@${first}` : "", null);
  }
  if (h === "facebook.com" || h === "fb.com" || h === "fb.watch") {
    const p = u.pathname.toLowerCase();
    if (h === "fb.watch" || /\/(videos|watch|reel)\b/.test(p)) return out("facebook", "", `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&width=500`, 420);
    if (/\/(posts|permalink|photo|photos|story\.php)\b/.test(p) || u.searchParams.has("story_fbid")) return out("facebook", "", `https://www.facebook.com/plugins/post.php?href=${href}&width=500&show_text=true`, 520);
    return out("facebook", first, `https://www.facebook.com/plugins/page.php?href=${href}&tabs=timeline&width=500&height=560&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`, 560);
  }
  if (h === "youtube.com" || h === "youtu.be") {
    const id = youtubeId(raw);
    if (id) return out("youtube", "", `https://www.youtube-nocookie.com/embed/${id}`, 300);
    return out("youtube", first ? (parts[0].startsWith("@") ? parts[0] : first) : "", null);
  }
  if (h === "pinterest.com" || /^pinterest\.[a-z.]+$/.test(h) || h === "pin.it") return out("pinterest", first, null);
  if (h === "x.com" || h === "twitter.com") return out("x", first ? `@${first}` : "", null);
  if (h === "linkedin.com") return out("linkedin", first === "company" || first === "in" ? decodeURIComponent(parts[1] ?? "") : first, null);
  return out("other", h, null);
}
