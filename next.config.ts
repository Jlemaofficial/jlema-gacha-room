import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,   // ✅ Abaikan linting di Vercel
  },
  typescript: {
    ignoreBuildErrors: true,    // ✅ Abaikan type error di Vercel
  },
};

export default nextConfig;
