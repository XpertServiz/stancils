import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["potrace", "@prisma/client", "bcryptjs"],
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};

export default nextConfig;
