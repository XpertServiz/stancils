import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { hexToTriplet, themeById } from "@/lib/themes";

const size = { width: 1200, height: 630 };

/** Social share image for a product: its stencil artwork on a stone tile. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await db.product.findUnique({ where: { slug: (await params).slug } });
  const s = await getSettings();
  const t = themeById(s.theme.preset);
  const acc = `rgb(${(hexToTriplet(s.theme.accent) ?? t.vars.accent).split(" ").join(",")})`;
  const bg = `rgb(${t.vars.bg.split(" ").join(",")})`;
  const svg = (p?.designSvg ?? "").replace(/var\(--l\d,currentColor\)/g, acc);
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: bg, color: "#F5F2EC", padding: 60, alignItems: "center", gap: 50 }}>
        <div style={{ display: "flex", width: 480, height: 480, background: "#E8E2D6", borderRadius: 32, padding: 40 }}>
          {svg && <img src={src} width={400} height={400} alt="" />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 26, color: acc, letterSpacing: 4 }}>{s.business.name.toUpperCase()}</div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, marginTop: 16 }}>{p?.name ?? "Stencils"}</div>
          <div style={{ fontSize: 26, color: "#CBC8D6", marginTop: 20 }}>{p?.shortDesc ?? ""}</div>
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
