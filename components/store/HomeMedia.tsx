import { Facebook, Instagram, Youtube } from "lucide-react";
import { socialInfo, youtubeId, type Network } from "@/lib/embeds";
import type { SocialSection, VideoSection as VideoData } from "@/lib/storefront";
import { VideoFacade } from "./VideoFacade";

const eyebrow = "text-sm uppercase tracking-[.14em]";
const h2 = "font-display text-[38px] font-semibold leading-none sm:text-[52px]";
const wrap = "mx-auto max-w-[1200px] px-5 sm:px-10";

/** "Watch & get inspired": the YouTube links pasted in Admin → Website → Homepage, as click-to-play videos. */
export function VideoSection({ data }: { data: VideoData }) {
  const items = data.items.map((v) => ({ ...v, id: youtubeId(v.url) })).filter((v): v is { url: string; title: string; id: string } => Boolean(v.id));
  if (!data.enabled || !items.length) return null;
  const [lead, ...rest] = items;
  return (
    <section id="videos" className="bg-stone py-[84px] text-[#E8EFEA]" aria-labelledby="videos-h">
      <div className={`${wrap} flex flex-col gap-10`}>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className={`${eyebrow} text-mustard`}>{data.eyebrow}</span>
          <h2 id="videos-h" className={h2}>{data.title}</h2>
          {data.sub && <p className="max-w-xl text-lg text-[#C9D8D1]">{data.sub}</p>}
        </div>
        <div className={rest.length ? "grid gap-6 lg:grid-cols-[1.6fr_1fr]" : "mx-auto w-full max-w-[860px]"}>
          <div className="flex flex-col gap-3">
            <VideoFacade id={lead.id} title={lead.title || "Video"} />
            {lead.title && <p className="font-display text-2xl font-semibold">{lead.title}</p>}
          </div>
          {rest.length > 0 && (
            <div className="grid content-start gap-5 sm:grid-cols-2 lg:grid-cols-1">
              {rest.map((v) => (
                <div key={v.id} className="flex flex-col gap-2">
                  <VideoFacade id={v.id} title={v.title || "Video"} />
                  {v.title && <p className="font-display text-lg font-semibold leading-tight">{v.title}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function NetIcon({ network, size = 22 }: { network: Network; size?: number }) {
  if (network === "facebook") return <Facebook size={size} />;
  if (network === "instagram") return <Instagram size={size} />;
  if (network === "youtube") return <Youtube size={size} />;
  const t = network === "tiktok" ? "♪" : network === "pinterest" ? "P" : network === "x" ? "𝕏" : network === "linkedin" ? "in" : "↗";
  return <span className="font-bold leading-none" style={{ fontSize: size * 0.85 }} aria-hidden>{t}</span>;
}

/** "Find us on social": Facebook / Instagram / TikTok / YouTube links pasted in the admin, as branded cards (posts and pages are embedded live). */
export function SocialSectionView({ data }: { data: SocialSection }) {
  const items = data.items.map((s) => ({ ...s, info: socialInfo(s.url) })).filter((s): s is typeof s & { info: NonNullable<typeof s.info> } => Boolean(s.info));
  if (!data.enabled || !items.length) return null;
  return (
    <section id="social" className="py-[84px]" aria-labelledby="social-h">
      <div className={`${wrap} flex flex-col gap-10`}>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className={`${eyebrow} text-goldink`}>{data.eyebrow}</span>
          <h2 id="social-h" className={h2}>{data.title}</h2>
          {data.sub && <p className="max-w-xl text-lg text-ink2">{data.sub}</p>}
        </div>
        <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          {items.map((s) => (
            <article key={s.url} className="flex flex-col overflow-hidden rounded-md border border-line bg-bg shadow-[0_1px_2px_rgba(0,0,0,.06)]">
              <header className="flex items-center gap-3 bg-stone px-4 py-3.5 text-[#E8EFEA]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-mustard text-mustard"><NetIcon network={s.info.network} /></span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <b className="font-display text-xl">{s.label || s.info.name}</b>
                  <small className="truncate text-xs text-[#C9D8D1]">{s.info.handle ? `${s.info.name} · ${s.info.handle}` : s.info.name}</small>
                </span>
              </header>
              {s.info.embed ? (
                <iframe
                  src={s.info.embed}
                  title={`${s.label || s.info.name} on ${s.info.name}`}
                  loading="lazy"
                  scrolling="no"
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="w-full border-0 bg-s1"
                  style={{ height: s.info.embedHeight }}
                />
              ) : (
                <div className="grid place-items-center gap-2 bg-s1 px-6 py-10 text-center text-ink2">
                  <span className="text-goldink"><NetIcon network={s.info.network} size={40} /></span>
                  <p className="text-sm">Follow {s.label || s.info.handle || s.info.name} for new designs and updates.</p>
                </div>
              )}
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="border-t border-line px-4 py-3 text-center text-[15px] font-semibold text-accent hover:bg-s1">
                {s.info.embed ? `Open on ${s.info.name}` : `Follow on ${s.info.name}`} ↗
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
