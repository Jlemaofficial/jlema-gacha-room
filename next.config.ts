import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ lewati error lint saat build
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ opsional: skip type error juga
  },
};

export default nextConfig;