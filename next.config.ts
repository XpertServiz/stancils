import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["potrace", "@prisma/client", "bcryptjs"],
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async rewrites() {
    const key = process.env.INDEXNOW_KEY;
    return key ? [{ source: `/${key}.txt`, destination: "/api/indexnow-key" }] : [];
  },
  async headers() {
    const pictures = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/catalog/:path*", headers: pictures },
      { source: "/images/:path*", headers: pictures },
      { source: "/uploads/:path*", headers: pictures },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
