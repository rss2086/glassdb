import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.TAURI_BUILD ? "export" : undefined,
  images: { unoptimized: true },
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      perf_hooks: false,
    };
    return config;
  },
};

export default nextConfig;
