import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, GlassSection } from "@/components/site/page-shell";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import {
  COMPANY_ADDRESS,
  COMPANY_GSTIN,
  COMPANY_LEGAL_NAME,
  COMPANY_PHONE,
  LEGAL_EMAIL,
  PRIVACY_EMAIL,
  SECURITY_EMAIL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Contact Intellirity" },
  description:
    "Contact Intellirity for sales, billing, security reports and privacy requests. Business details, support channels and response expectations.",
  keywords: PAGE_KEYWORDS["/contact"] ?? [
    "contact Intellirity",
    "AI security support",
    "AI security company contact",
  ],
  alternates: { canonical: `${SITE_URL}/contact` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Contact Intellirity · ${SITE_NAME}`,
    description:
      "Sales, billing, security and privacy contact channels, plus registered business details.",
    url: `${SITE_URL}/contact`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Contact Intellirity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact Intellirity · ${SITE_NAME}`,
    description: "Sales, billing, security and privacy contact channels.",
    images: ["/og-image.png"],
  },
};

const CHANNELS = [
  {
    label: "Sales and billing",
    email: SECURITY_EMAIL,
    body: "Questions about modules, invoices, GST details or a payment that needs attention.",
  },
  {
    label: "Security reports",
    email: SECURITY_EMAIL,
    body: "Vulnerability reports, novel bypasses and coordinated disclosure. Include the affected URL and a reproduction.",
  },
  {
    label: "Privacy",
    email: PRIVACY_EMAIL,
    body: "Data-subject requests, retention questions and subprocessor details.",
  },
  {
    label: "Legal",
    email: LEGAL_EMAIL,
    body: "Contracts, terms, DPAs and notices.",
  },
];

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${SITE_URL}/contact#page`,
    url: `${SITE_URL}/contact`,
    name: "Contact Intellirity",
    about: { "@id": `${SITE_URL}#org` },
  };

  return (
    <PageShell
      eyebrow="Contact"
      title="Talk to the people who build it."
      lead="Sales, billing, security and privacy all reach a small team. There is no ticket queue between you and the engineer who owns the answer."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((c) => (
          <GlassSection key={c.label} eyebrow="Channel" title={c.label}>
            <p>{c.body}</p>
            <a
              href={`mailto:${c.email}`}
              className="mt-4 inline-flex min-h-6 items-center font-mono text-[12px] text-steel underline decoration-steel/40 underline-offset-4 transition-colors hover:text-ink"
            >
              {c.email}
            </a>
          </GlassSection>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr,0.9fr]">
        <GlassSection eyebrow="Business details" title="Who you are paying">
          <dl className="space-y-3 font-mono text-[12px] leading-relaxed">
            <div className="flex flex-wrap justify-between gap-2 border-b border-white/[0.06] pb-2">
              <dt className="text-faint">Legal name</dt>
              <dd className="text-ink">{COMPANY_LEGAL_NAME}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-white/[0.06] pb-2">
              <dt className="text-faint">Registered address</dt>
              <dd className="max-w-[36ch] text-right text-ink">
                {COMPANY_ADDRESS || "Available on request"}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-white/[0.06] pb-2">
              <dt className="text-faint">Support phone</dt>
              <dd className="text-ink">{COMPANY_PHONE || "Available on request"}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-faint">GSTIN</dt>
              <dd className="text-ink">{COMPANY_GSTIN || "Not provided"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[13px] leading-relaxed text-faint">
            Payments are processed by PayU India. Intellirity never stores your
            card number or UPI credentials.
          </p>
        </GlassSection>

        <GlassSection eyebrow="What happens next" title="Response expectations">
          <p>
            Security reports are triaged first. Billing and sales messages are
            read by the founder. Include the workspace email or order id so we
            can find the account without asking twice.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/#contact"
              className="inline-flex h-10 items-center rounded bg-ink px-4 text-[13px] font-medium text-bg transition-colors hover:bg-white"
            >
              Use the contact form
            </Link>
            <Link
              href="/refund-policy"
              className="inline-flex h-10 items-center rounded border border-line-strong px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              Refund policy
            </Link>
          </div>
        </GlassSection>
      </div>
    </PageShell>
  );
}
