import type { NextConfig } from "next";
import path from "node:path";

// Where the Next server proxies /backend/* to. Local dev points at the
// uvicorn process; in Docker Compose it is the "backend" service; on a
// hosted deploy set BACKEND_INTERNAL_URL to the public API origin.
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000/api/v1";

// On Vercel the API is the serverless function in this same project, and
// vercel.json rewrites /backend/* to it. A next.config rewrite would
// loop back on itself, so it is skipped there.
const isVercel = Boolean(process.env.VERCEL);
const isProd = process.env.NODE_ENV === "production";

// The Clerk instance origin.
//
// A Clerk publishable key is `pk_<env>_<base64(frontend-api-host$)>`. A
// custom Clerk domain (clerk.example.com) is NOT a subdomain of clerk.com,
// so a policy that only allows *.clerk.com blocks the SDK and the sign-in
// UI never loads -- and a failed ClerkProvider also stops hydration.
// Derive the exact origin from the key that the build is using.
function clerkOrigin(): string {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  try {
    const parts = pk.split("_");
    if (parts.length < 3 || parts[0] !== "pk") return "";
    const host = Buffer.from(parts.slice(2).join("_"), "base64")
      .toString("utf8")
      .replace(/\$$/, "")
      .trim();
    return host ? `https://${host}` : "";
  } catch {
    return "";
  }
}

const CLERK_ORIGIN = clerkOrigin();
const CLERK_ORIGINS = [
  "https://clerk.com",
  "https://*.clerk.com",
  ...(CLERK_ORIGIN ? [CLERK_ORIGIN] : []),
];

// Content-Security-Policy.
//
// The page loads scripts from three external origins: the Clerk SDK
// (clerk.com), Cloudflare Turnstile (challenges.cloudflare.com) and
// Google Analytics (googletagmanager.com). Turnstile and GA are only
// present when their keys are configured, and the policy allows them
// unconditionally so the header does not change shape per deployment.
// 'unsafe-inline' is required for Next's inline bootstrap scripts and the
// JSON-LD blocks; 'unsafe-eval' is required in development by the React
// refresh runtime, never in production.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isProd ? [] : ["'unsafe-eval'"]),
  ...CLERK_ORIGINS,
  "https://challenges.cloudflare.com",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
].join(" ");

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // Tailwind and the vendored component styles are injected at runtime.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self'${isProd ? "" : " ws: wss:"} https://challenges.cloudflare.com https://www.google-analytics.com ${CLERK_ORIGINS.join(" ")}`,
  `frame-src 'self' https://challenges.cloudflare.com ${CLERK_ORIGINS.join(" ")}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  // PayU is a redirect flow: the checkout form must be allowed to POST to
  // the payment gateway. test.payu.in is the sandbox, secure.payu.in live.
  "form-action 'self' https://secure.payu.in https://test.payu.in",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Emit a self-contained server for the Docker image. Vercel ignores this
  // and uses its own build output, so it costs nothing on the hosted path.
  output: "standalone",
  // The repository root carries a pnpm-workspace file, so without this Next
  // treats the monorepo root as the app root and nests the standalone
  // output under `Intellirity-Frontend/`. Pinning it keeps `server.js` at
  // the image root and stops the tracer from walking sibling directories.
  outputFileTracingRoot: path.resolve(process.cwd()),
  async rewrites() {
    if (isVercel) return [];
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_INTERNAL_URL}/:path*`,
      },
    ];
  },
  async redirects() {
    // Host canonicalisation is owned by the platform, not by Next.
    //
    // This app used to redirect www -> apex here. Vercel has its own
    // apex <-> www redirect for the project's primary domain, and when the
    // two disagree (Vercel primary = www, app redirect = apex) the result is
    // an infinite 308 loop and the site does not load at all. A second
    // redirect layer can only ever disagree, so it is removed: set
    // intellirity.com as the primary domain in Vercel and Vercel redirects
    // www to it, matching SITE_URL and every canonical tag.
    return [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
      // Engine responses are tenant-scoped and often carry an Authorization
      // header. A shared cache must never store them, so they are private
      // and un-storeable; the client keeps its own 5s refresh instead.
      {
        source: "/backend/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Vary", value: "Authorization, Cookie" },
        ],
      },
      // Static brand assets: immutable for a year (filenames are versioned by content change).
      {
        source: "/:all*(png|ico|woff2|svg)",
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
