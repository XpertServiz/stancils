import { useId } from "react";

/**
 * Stencil and Gift Studio emblem: a glossy gold-ringed green medallion, a stencil-cut diamond (with the little "bridges"
 * a real stencil needs) and a gift bow on top. Drawn as SVG with gradients so it looks 3D at any size.
 */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F8E8AE" /><stop offset=".45" stopColor="#D4AF5A" /><stop offset="1" stopColor="#8F6E24" /></linearGradient>
        <radialGradient id={`d${id}`} cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#25786A" /><stop offset=".55" stopColor="#0E2F28" /><stop offset="1" stopColor="#06201A" /></radialGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <ellipse cx="60" cy="113" rx="34" ry="5" fill="#000" opacity=".22" />
      <circle cx="60" cy="58" r="55" fill={`url(#g${id})`} />
      <circle cx="60" cy="58" r="49" fill={`url(#d${id})`} />
      <circle cx="60" cy="58" r="45" fill="none" stroke={`url(#g${id})`} strokeWidth="1.2" opacity=".8" />
      <g fill="none" stroke={`url(#g${id})`} strokeWidth="3.4" strokeLinecap="round">
        <rect x="42" y="42" width="36" height="36" strokeDasharray="22 6" strokeDashoffset="3" transform="translate(0 6)" />
        <rect x="42" y="42" width="36" height="36" strokeDasharray="22 6" strokeDashoffset="3" transform="translate(0 6) rotate(45 60 60)" />
      </g>
      <circle cx="60" cy="66" r="5.5" fill={`url(#g${id})`} />
      <g fill={`url(#g${id})`}>
        <path d="M60 21c-5-9-17-9-17-2 0 5 9 6 17 2Z" /><path d="M60 21c5-9 17-9 17-2 0 5-9 6-17 2Z" />
        <path d="M58 21l-6 12 5-2 3 4 3-4 5 2-6-12Z" opacity=".95" /><circle cx="60" cy="21" r="3.6" />
      </g>
      <path d="M17 44A44 44 0 0 1 60 12c-18 4-33 15-38 36Z" fill={`url(#s${id})`} opacity=".55" />
    </svg>
  );
}

export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`font-display font-bold leading-none tracking-[.02em] ${className}`}>{name}</span>;
}
