import { NextRequest, NextResponse } from "next/server";
import { buildCsp } from "@/lib/csp";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Sets a per-request nonce-based Content-Security-Policy. The static security
 * headers (nosniff, Referrer-Policy, Permissions-Policy, HSTS, X-Frame-Options)
 * live in next.config.ts so they also cover static assets this proxy skips.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const loopback = LOOPBACK_HOSTS.has(request.nextUrl.hostname);
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development", { loopback });

  // Next.js extracts the nonce from the request's CSP header during rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Documents only: skip JSON API routes, build assets, the image optimizer, public media and
      // metadata files, none of which execute script.
      source: "/((?!api/|_next/static|_next/image|videos/|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
