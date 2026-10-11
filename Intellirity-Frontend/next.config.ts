import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://127.0.0.1:8000/api/v1/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Live engine GETs refresh every few seconds; a 5s shared-cache TTL
      // absorbs duplicate fan-out without serving visibly stale data.
      // Browsers never cache POSTs, so mutations are unaffected.
      {
        source: "/backend/system/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=5, stale-while-revalidate=5" }],
      },
      {
        source: "/backend/threats",
        headers: [{ key: "Cache-Control", value: "public, max-age=5, stale-while-revalidate=5" }],
      },
      {
        source: "/backend/realtime/feed",
        headers: [{ key: "Cache-Control", value: "public, max-age=5, stale-while-revalidate=5" }],
      },
      // Static brand assets: immutable for a year (filenames are versioned by content change).
      {
        source: "/:all*(png|ico|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  turbopack: {
    // Vendored ThreeUI sources import docs as raw text (`./x.html?raw`).
    rules: {
      "*.html": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
