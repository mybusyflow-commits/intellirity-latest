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
const hits = new Map<string, number[]>();

const HAS_CLERK = Boolean(process.env.CLERK_SECRET_KEY);
const isProtectedRoute = createRouteMatcher(["/console(.*)"]);

function rateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const arr = hits.get(ip) ?? [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  fresh.push(now);
  hits.set(ip, fresh);
  // Bound memory: drop buckets that went quiet.
  if (hits.size > 5000 && Math.random() < 0.01) {
    for (const [k, v] of hits) {
      if (v.length === 0 || now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
    }
  }
  return fresh.length > limit;
}

/* Shared guards: returns a blocking response, or null to continue. */
function guard(req: NextRequest): NextResponse | null {
  const url = req.nextUrl;

  // HTTPS enforcement: only when explicitly enabled (production behind a
  // proxy that sets x-forwarded-proto). Never redirects localhost.
  if (
    process.env.SECURE_REDIRECT === "true" &&
    req.headers.get("x-forwarded-proto") === "http"
  ) {
    const https = url.clone();
    https.protocol = "https:";
    return NextResponse.redirect(https, 308);
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
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
  return guard(req) ?? NextResponse.next();
}

export default HAS_CLERK
  ? clerkMiddleware(async (auth, req) => {
      const blocked = guard(req);
      if (blocked) return blocked;
      // /console/* requires sign-in; landing, sign-in/up, and the engine
      // proxy stay public (the backend enforces API auth itself).
      if (isProtectedRoute(req)) await auth.protect();
      return NextResponse.next();
    })
  : baseMiddleware;

export const config = {
  matcher: ["/backend/:path*", "/console/:path*", "/((?!_next/static|_next/image|favicon.png|logo.png|og-image.png).*)"],
};
