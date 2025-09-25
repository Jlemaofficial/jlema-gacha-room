import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false, // ⛔ matikan lightningcss
  },
};

export default nextConfig;

