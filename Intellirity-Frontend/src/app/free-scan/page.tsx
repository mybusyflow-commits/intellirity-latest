import type { Metadata } from "next";
import { FreeVibeScanner } from "@/components/console/free-vibe-scanner";
import { PageShell } from "@/components/site/page-shell";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "Scan a public website or paste code with Intellirity's free Vibe-Code Security scanner. Find security issues and get clear fixes in seconds.";

export const metadata: Metadata = {
  title: { absolute: "Free Website & Code Security Scanner | Intellirity" },
  description: DESCRIPTION,
  keywords: [
    "free website security scanner",
    "free code security scanner",
    "vibe code security",
    "SQL injection scanner",
    "XSS scanner",
    "hardcoded secrets scanner",
  ],
  alternates: { canonical: `${SITE_URL}/free-scan` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Free Website & Code Security Scanner | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/free-scan`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity free security scanner" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Free Website & Code Security Scanner | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function FreeScanPage() {
  return (
    <PageShell
      eyebrow="Free security tool"
      title="Find the issue before it ships."
      lead="No account, card or setup. Check a public website or paste code and get a real security report with practical fixes."
    >
      <FreeVibeScanner />
      <p className="mt-4 max-w-[720px] text-[12.5px] leading-relaxed text-faint">
        Only scan websites you own or have permission to test. This tool makes
        one bounded request to a public URL and does not attempt exploitation,
        brute force or authenticated testing.
      </p>
    </PageShell>
  );
}
