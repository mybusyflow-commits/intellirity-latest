import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security Model",
  description:
    "How Intellirity is built to protect you: fail-closed screening, signed and hash-chained evidence, tenant isolation, no traffic retention, and coordinated disclosure.",
  alternates: { canonical: `${SITE_URL}/security` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Security Model · ${SITE_NAME}`,
    description:
      "Fail-closed screening, signed evidence, tenant isolation and coordinated disclosure — the controls the running product actually enforces.",
    url: `${SITE_URL}/security`,
    type: "article",
  },
};

export default function SecurityPage() {
  return <LegalPage docKey="security" />;
}
