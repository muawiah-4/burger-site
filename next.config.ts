import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// The Content-Security-Policy is set per request (with a nonce) in src/proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    // Geolocation stays available to our own origin for the location finder.
    value: "camera=(), microphone=(), payment=(), geolocation=(self), usb=(), browsing-topics=()",
  },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
        // Only Unsplash photo URLs (see src/lib/data/images.ts); nothing else on the host.
        pathname: "/photo-**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
