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
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Intellirity Console",
    description: "Every AI security control, live in one console.",
    url: `${SITE_URL}/console`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
