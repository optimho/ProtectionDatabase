import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: { dynamic: 0 },
  },
  allowedDevOrigins: ["192.168.10.64"],
};

export default nextConfig;
