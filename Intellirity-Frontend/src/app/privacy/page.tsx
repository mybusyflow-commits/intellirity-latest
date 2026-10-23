import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Intellirity processes data: what the engine collects, what it never trains on, which subprocessors are involved, retention windows, and your rights.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Privacy Policy · ${SITE_NAME}`,
    description:
      "What Intellirity collects, what it never trains on, which subprocessors are involved, and how to exercise your rights.",
    url: `${SITE_URL}/privacy`,
    type: "article",
  },
};

export default function PrivacyPage() {
  return <LegalPage docKey="privacy" />;
}
