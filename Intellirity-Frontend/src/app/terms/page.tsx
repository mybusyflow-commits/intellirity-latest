import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing use of the Intellirity platform, SDKs and screening proxy: per-module billing, acceptable use, data ownership and liability.",
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Terms of Service · ${SITE_NAME}`,
    description:
      "Per-module billing, acceptable use, data ownership and liability for the Intellirity platform.",
    url: `${SITE_URL}/terms`,
    type: "article",
  },
};

export default function TermsPage() {
  return <LegalPage docKey="terms" />;
}
