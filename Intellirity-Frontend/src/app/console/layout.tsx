import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConsoleShell } from "./shell";
import { ConsoleGate } from "@/components/console/console-gate";
import { SITE_URL } from "@/lib/site";

/* Vercel Services cannot run Next.js Edge middleware, so the console's
   authentication gate lives here instead:
     - this layout redirects when the request clearly has no Clerk session
       cookie (cheap, server-side, no Edge runtime);
     - ConsoleGate confirms the session with Clerk on the client before any
       console UI renders;
     - the API still rejects every unauthenticated call with 401.
   Clerk's server helpers (currentUser/auth) are not used because they
   require clerkMiddleware. */
export const dynamic = "force-dynamic";

const CLERK_ENABLED = Boolean(process.env.CLERK_SECRET_KEY);

export const metadata: Metadata = {
  title: {
    default: "Console",
    template: "%s · Intellirity Console",
  },
  description:
    "The live Intellirity console: run adversarial scans, review verdicts, trace data flow, audit agents, and verify tamper-evident evidence — all against the real engine.",
  alternates: {
    canonical: `${SITE_URL}/console`,
  },
  // The console is behind authentication and its content is rendered from
  // live engine data. There is nothing here for a search engine to index,
  // and indexing fifteen near-identical login-walled pages would be
  // actively harmful. It is also disallowed in robots.txt and excluded
  // from the sitemap.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    title: "Intellirity Console",
    description: "Every AI security control, live in one console.",
    url: `${SITE_URL}/console`,
    type: "website",
    siteName: "Intellirity",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity Console" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Intellirity Console",
    description: "Every AI security control, live in one console.",
    images: ["/og-image.png"],
  },
};

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) {
    // Fail closed in production: never render a console shell without an
    // auth path. Development stays open for local work.
    if (process.env.NODE_ENV === "production") {
      return (
        <main className="grid min-h-screen place-items-center bg-bg px-6 text-ink">
          <div className="max-w-md text-center">
            <h1 className="text-[22px] font-medium">Authentication is not configured</h1>
            <p className="mt-3 text-[13.5px] leading-relaxed text-faint">
              CLERK_SECRET_KEY is missing on this deployment, so the console
              refuses to render.
            </p>
          </div>
        </main>
      );
    }
    return <ConsoleShell>{children}</ConsoleShell>;
  }

  // Cheap server-side check for a clearly anonymous request (no cookies at
  // all). A request that carries any cookie is decided by Clerk on the
  // client, so a renamed or partitioned session cookie is not mistaken for
  // a signed-out user. ConsoleGate does the authoritative isSignedIn check;
  // the API remains the authorization boundary.
  const store = await cookies();
  if (store.getAll().length === 0) {
    redirect("/sign-in?redirect_url=%2Fconsole");
  }

  return (
    <ConsoleGate>
      <ConsoleShell>{children}</ConsoleShell>
    </ConsoleGate>
  );
}
