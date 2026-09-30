import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project; otherwise Turbopack picks up a stray
  // lockfile in a parent directory and warns that it was ignored.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
