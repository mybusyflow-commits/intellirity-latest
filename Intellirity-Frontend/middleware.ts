import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/* Edge-layer guard: HTTPS enforcement (production only) + rate limiting
   on the engine proxy so abusive clients are throttled before they reach
   FastAPI. In-memory sliding window, per deployment instance.
   Clerk route protection activates only when CLERK_SECRET_KEY exists —
   keyless local dev passes through untouched. */

const WINDOW_MS = 60_000;
const PROXY_LIMIT = 120; // requests per IP per minute on /backend/*
const PAGE_LIMIT = 300; // requests per IP per minute on pages/APIs
const MAX_TRACKED_IPS = 20_000;

const hits = new Map<string, number[]>();
const IS_PROD = process.env.NODE_ENV === "production";
const HAS_CLERK = Boolean(process.env.CLERK_SECRET_KEY);
const isProtectedRoute = createRouteMatcher(["/console(.*)"]);

/* Where an unauthenticated visitor is sent. Without this, Clerk v7's
   auth.protect() rewrites to its Account Portal handler, which answers 404
   when the portal is not enabled for the origin (localhost, previews).
   An explicit in-app URL makes the redirect deterministic. */
const SIGN_IN_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
const SIGN_UP_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";

/* On Vercel the platform terminates TLS and sets x-forwarded-for itself.
   Taking the LAST hop is the safe choice behind a known proxy: a client
   can prepend its own value, but cannot remove the proxy's. Falling back
   to the socket address keeps local dev working. */
function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function rateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const arr = hits.get(ip) ?? [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  fresh.push(now);
  hits.set(ip, fresh);

  // Bound the map: drop the oldest buckets when it grows too large, and
  // expire quiet entries on every sweep so the map cannot be used as a
  // memory-exhaustion vector.
  if (hits.size > MAX_TRACKED_IPS) {
    const entries = [...hits.entries()].sort(
      (a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0)
    );
    for (const [key] of entries.slice(0, Math.floor(MAX_TRACKED_IPS / 2))) {
      hits.delete(key);
    }
  }
  if (hits.size > 1000) {
    for (const [key, value] of hits) {
      const last = value[value.length - 1] ?? 0;
      if (now - last >= WINDOW_MS) hits.delete(key);
    }
  }
  return fresh.length > limit;
}

/* Shared guards: returns a blocking response, or null to continue. */
function guard(req: NextRequest): NextResponse | null {
  const url = req.nextUrl;

  // HTTPS enforcement. On by default in production: a deployment that
  // forgets to set SECURE_REDIRECT must not silently serve over HTTP.
  // Never redirects localhost, where there is no TLS to speak of.
  const isLocal =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  const wantHttps =
    process.env.SECURE_REDIRECT === "true" || (IS_PROD && process.env.SECURE_REDIRECT !== "false");
  if (wantHttps && !isLocal && req.headers.get("x-forwarded-proto") === "http") {
    const https = url.clone();
    https.protocol = "https:";
    return NextResponse.redirect(https, 308);
  }

  const ip = clientIp(req);
  const isProxy = url.pathname.startsWith("/backend/");
  const limit = isProxy ? PROXY_LIMIT : PAGE_LIMIT;

  if (rateLimited(`${ip}:${isProxy ? "api" : "page"}`, limit)) {
    return new NextResponse("Rate limit exceeded. Try again in a minute.", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  return null;
}

async function baseMiddleware(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  // Fail closed in production: without Clerk keys the console would be
  // publicly readable. The backend already refuses to serve without auth
  // in production; the UI must refuse too rather than render an empty
  // shell to anonymous visitors.
  if (IS_PROD && req.nextUrl.pathname.startsWith("/console")) {
    return new NextResponse(
      "Authentication is not configured on this deployment (CLERK_SECRET_KEY is missing).",
      { status: 503, headers: { "Retry-After": "300" } }
    );
  }
  return NextResponse.next();
}

export default HAS_CLERK
  ? clerkMiddleware(
      async (auth, req) => {
        const blocked = guard(req);
        if (blocked) return blocked;
        // /console/* requires sign-in; landing, sign-in/up, and the engine
        // proxy stay public (the backend enforces API auth itself).
        if (isProtectedRoute(req)) await auth.protect();
        return NextResponse.next();
      },
      {
        signInUrl: SIGN_IN_URL,
        signUpUrl: SIGN_UP_URL,
        afterSignInUrl: "/console",
        afterSignUpUrl: "/console",
      }
    )
  : baseMiddleware;

export const config = {
  matcher: [
    "/backend/:path*",
    "/console/:path*",
    // Pages and app routes, but not Next's static output.
    "/((?!_next/static|_next/image|favicon.png|favicon-full.png|logo.png|logo-full.png|og-image.png|robots.txt|sitemap.xml).*)",
  ],
};
