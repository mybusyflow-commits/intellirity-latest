import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/site/logo";
import { SITE_URL } from "@/lib/site";

/* Rendered on demand only: without Clerk keys this route needs no static HTML. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Intellirity console.",
  alternates: { canonical: `${SITE_URL}/sign-in` },
  // A sign-in page is a utility page, not a result to rank.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  openGraph: {
    title: "Sign in · Intellirity",
    description: "Sign in to the Intellirity console.",
    url: `${SITE_URL}/sign-in`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignInPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 py-16 text-ink">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="sr-only">Sign in to Intellirity</h1>
        {CLERK_KEY ? (
          <SignIn />
        ) : (
          <div className="panel rounded-lg p-8 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-dim">
              sign-in not configured
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-faint">
              Add Clerk keys to enable authentication, or continue to the live console.
            </p>
            <Link
              href="/console"
              className="mt-5 inline-flex h-10 items-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
            >
              Open console
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
