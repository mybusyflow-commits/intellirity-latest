import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI Security Model",
  description:
    "The Intellirity AI security model: fail-closed screening, tamper-evident audit evidence, tenant isolation, no traffic retention and coordinated disclosure — controls the running product enforces.",
  keywords: PAGE_KEYWORDS["/security"],
  alternates: { canonical: `${SITE_URL}/security` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `AI Security Model · ${SITE_NAME}`,
    description:
      "Fail-closed screening, tamper-evident audit evidence, tenant isolation and coordinated disclosure — the controls the running product actually enforces.",
    url: `${SITE_URL}/security`,
    type: "article",
  },
};

export default function SecurityPage() {
  return <LegalPage docKey="security" />;
}
