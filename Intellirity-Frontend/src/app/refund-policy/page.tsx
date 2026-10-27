import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, GlassSection } from "@/components/site/page-shell";
import { COMPANY_LEGAL_NAME, SECURITY_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Refund & Cancellation Policy | Intellirity" },
  description:
    "Intellirity refund, cancellation and delivery policy for per-module AI security subscriptions: 30-day access, manual renewal, duplicate-charge refunds and how to request one.",
  keywords: [
    "Intellirity refund policy",
    "AI security subscription refund",
    "cancellation policy",
    "digital service delivery",
  ],
  alternates: { canonical: `${SITE_URL}/refund-policy` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Refund & Cancellation Policy · ${SITE_NAME}`,
    description:
      "How billing, cancellation, delivery and refunds work for Intellirity modules.",
    url: `${SITE_URL}/refund-policy`,
    type: "article",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity refund policy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Refund & Cancellation Policy · ${SITE_NAME}`,
    description: "Billing, cancellation, delivery and refunds for Intellirity modules.",
    images: ["/og-image.png"],
  },
};

export default function RefundPolicyPage() {
  return (
    <PageShell
      eyebrow="Billing"
      title="Refund, cancellation and delivery."
      lead="A plain-language policy for a digital security service: what you buy, when access starts, how to stop renewing, and when a refund is due."
    >
      <div className="grid gap-4">
        <GlassSection eyebrow="01" title="What you are buying">
          <p>
            {COMPANY_LEGAL_NAME} sells access to AI security modules for a
            workspace. Each payment covers one module for 30 days. The price is
            shown in Indian rupees on the pricing page before checkout. There is
            no automatic charge and no stored card.
          </p>
        </GlassSection>

        <GlassSection eyebrow="02" title="Delivery">
          <p>
            This is a digital service. There is no physical shipping. After PayU
            confirms the payment, the modules are activated against the
            workspace that started the checkout, normally within seconds. Access
            is visible in the console. If a confirmed payment has not activated
            access within 30 minutes, email us with the order id.
          </p>
        </GlassSection>

        <GlassSection eyebrow="03" title="Cancellation and renewal">
          <p>
            You cancel by not renewing. Access continues until the end of the
            30-day period you paid for. Nothing renews automatically, so there is
            no cancellation deadline and no cancellation fee. If you renew early,
            the new period is added to the existing expiry rather than replacing
            it.
          </p>
        </GlassSection>

        <GlassSection eyebrow="04" title="When a refund is due">
          <ul className="space-y-2.5">
            <li>— A duplicate or accidental charge for the same module and period.</li>
            <li>— A payment that succeeded but the module was never activated, and we cannot activate it.</li>
            <li>— An unauthorised transaction reported promptly by the account holder.</li>
            <li>— A module that was materially unavailable for the paid period, in proportion to the outage.</li>
          </ul>
          <p className="mt-4">
            Refunds are not automatic for a change of mind after access has been
            used, or for a period that has already elapsed. Nothing in this
            policy limits rights that Indian consumer law gives you.
          </p>
        </GlassSection>

        <GlassSection eyebrow="05" title="How to request a refund">
          <p>
            Email <a href={`mailto:${SECURITY_EMAIL}`} className="text-ink underline decoration-steel/50 underline-offset-4">{SECURITY_EMAIL}</a>{" "}
            with the order id, the workspace email and the reason. We acknowledge
            within two working days and decide within seven. Approved refunds go
            back to the original payment method through PayU; your bank or UPI
            provider controls the final posting time, typically 5–10 working days.
          </p>
          <p className="mt-3">
            If you believe a charge was fraudulent, contact your bank as well;
            we will cooperate with the dispute. Do not send card numbers or UPI
            PINs by email.
          </p>
        </GlassSection>

        <GlassSection eyebrow="06" title="Contact">
          <p>
            Billing: <a href={`mailto:${SECURITY_EMAIL}`} className="text-ink underline decoration-steel/50 underline-offset-4">{SECURITY_EMAIL}</a>
            {" · "}
            <Link href="/contact" className="text-ink underline decoration-steel/50 underline-offset-4">
              all contact channels
            </Link>
            {" · "}
            <Link href="/terms" className="text-ink underline decoration-steel/50 underline-offset-4">
              terms of service
            </Link>
          </p>
        </GlassSection>
      </div>
    </PageShell>
  );
}
