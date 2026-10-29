"use client";
import { uniqueSvg } from "@/lib/designs";

export function DesignArtClient({ svg, uid, colors, className = "" }: { svg: string | null | undefined; uid: string; colors?: string[]; className?: string }) {
  if (!svg) return <div className={`art ${className}`} />;
  const style: Record<string, string> = {};
  (colors ?? []).forEach((c, i) => (style[`--l${i + 1}`] = c));
  return <div className={`art h-full w-full ${className}`} style={style as React.CSSProperties} dangerouslySetInnerHTML={{ __html: uniqueSvg(svg, uid.replace(/[^a-zA-Z0-9]/g, "")) }} />;
}
