import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/ml/:path*",
        destination: "http://127.0.0.1:8000/api/ml/:path*",
      },
      {
        source: "/api/bins/:path*",
        destination: "http://127.0.0.1:8000/api/bins/:path*",
      },
      {
        source: "/api/vehicles/:path*",
        destination: "http://127.0.0.1:8000/api/vehicles/:path*",
      },
      {
        source: "/api/alerts/:path*",
        destination: "http://127.0.0.1:8000/api/alerts/:path*",
      },
      {
        source: "/api/collections/:path*",
        destination: "http://127.0.0.1:8000/api/collections/:path*",
      },
    ];
  },
};

export default nextConfig;
