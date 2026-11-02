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
    return [
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
