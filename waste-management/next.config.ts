import type { NextConfig } from "next";

const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/ml/:path*",
        destination: `${ML_API_URL}/api/ml/:path*`,
      },
      {
        source: "/api/bins/:path*",
        destination: `${ML_API_URL}/api/bins/:path*`,
      },
      {
        source: "/api/vehicles/:path*",
        destination: `${ML_API_URL}/api/vehicles/:path*`,
      },
      {
        source: "/api/alerts/:path*",
        destination: `${ML_API_URL}/api/alerts/:path*`,
      },
      {
        source: "/api/collections/:path*",
        destination: `${ML_API_URL}/api/collections/:path*`,
      },
    ];
  },
};

export default nextConfig;

