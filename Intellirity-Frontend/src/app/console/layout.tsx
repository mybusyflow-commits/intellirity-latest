import type { Metadata } from "next";
import { ConsoleShell } from "./shell";
import { SITE_URL } from "@/lib/site";

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

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
