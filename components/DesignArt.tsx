import { uniqueSvg } from "@/lib/designs";
import { themed } from "@/lib/theme-colors";

/** Renders stored stencil SVG inline; layer colours via CSS variables. */
export function DesignArt({
  svg,
  colors,
  uid,
  className = "",
  title,
}: {
  svg?: string | null;
  colors?: string[];
  uid: string;
  className?: string;
  title?: string;
}) {
  if (!svg) return <div className={`art ${className}`} aria-hidden />;
  const style: Record<string, string> = {};
  (colors ?? []).forEach((c, i) => (style[`--l${i + 1}`] = themed(c)));
  return (
    <div
      role="img"
      aria-label={title}
      className={`art ${className}`}
      style={style as React.CSSProperties}
      dangerouslySetInnerHTML={{ __html: uniqueSvg(svg, uid.replace(/[^a-zA-Z0-9]/g, "")) }}
    />
  );
}
