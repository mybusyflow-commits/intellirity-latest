import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI Security Platform Terms of Service",
  description:
    "The terms governing use of the Intellirity AI security platform, SDKs and screening proxy: per-module billing, acceptable use, data ownership and liability.",
  keywords: PAGE_KEYWORDS["/terms"],
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Terms of Service · ${SITE_NAME}`,
    description:
      "Per-module billing, acceptable use, data ownership and liability for the Intellirity platform.",
    url: `${SITE_URL}/terms`,
    type: "article",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity terms of service" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `AI Security Platform Terms · ${SITE_NAME}`,
    description: "Per-module billing, acceptable use, data ownership and liability.",
    images: ["/og-image.png"],
  },
};

export default function TermsPage() {
  return <LegalPage docKey="terms" />;
}
