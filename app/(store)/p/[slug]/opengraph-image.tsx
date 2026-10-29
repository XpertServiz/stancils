import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const p = await db.product.findUnique({ where: { slug: (await params).slug } });
  const svg = (p?.designSvg ?? "").replace(/var\(--l\d,currentColor\)/g, "#FF7A59");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#2E3140", color: "#F5F2EC", padding: 60, alignItems: "center", gap: 50 }}>
        <div style={{ display: "flex", width: 480, height: 480, background: "#E8E2D6", borderRadius: 32, padding: 40 }}>
          {svg && <img src={src} width={400} height={400} alt="" />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 26, color: "#F5C451", letterSpacing: 4 }}>CREATIVE CORNER</div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, marginTop: 16 }}>{p?.name ?? "Stencils"}</div>
          <div style={{ fontSize: 26, color: "#CBC8D6", marginTop: 20 }}>{p?.shortDesc ?? ""}</div>
        </div>
      </div>
    ),
    size,
  );
}
