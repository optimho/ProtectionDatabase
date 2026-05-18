import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: { dynamic: 0 },
    serverActions: {
      bodySizeLimit: "100mb",
    },
    proxyClientMaxBodySize: 100 * 1024 * 1024, // 100MB
  },
  allowedDevOrigins: ["192.168.10.64"],
};

export default nextConfig;
