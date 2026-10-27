import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, GlassSection } from "@/components/site/page-shell";
import { SECURITY_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Delivery Policy | Intellirity" },
  description:
    "How Intellirity delivers digital AI security modules after payment: instant workspace activation, no physical shipping, receipts and what to do if access does not appear.",
  keywords: ["Intellirity delivery policy", "digital delivery", "AI security activation"],
  alternates: { canonical: `${SITE_URL}/delivery` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Delivery Policy · ${SITE_NAME}`,
    description: "Digital delivery and activation for Intellirity modules.",
    url: `${SITE_URL}/delivery`,
    type: "article",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity delivery policy" }],
  },
};

export default function DeliveryPage() {
  return (
    <PageShell
      eyebrow="Delivery"
      title="Digital delivery, confirmed."
      lead="Intellirity is a software service. Nothing is shipped physically; access is delivered to the workspace that completes checkout."
    >
      <div className="grid gap-4">
        <GlassSection eyebrow="01" title="What is delivered">
          <p>
            A paid module is a software entitlement for one workspace for 30
            days. It unlocks the corresponding console surfaces and detection
            engines. There is no parcel, no courier and no physical address
            required.
          </p>
        </GlassSection>
        <GlassSection eyebrow="02" title="When access appears">
          <p>
            PayU confirms the payment and returns the browser to the pricing
            page. The server verifies the signed response, activates the
            entitlement and stores it in Postgres. Access normally appears
            immediately; a new deployment or a different browser may need a
            refresh or a sign-in with the same workspace.
          </p>
        </GlassSection>
        <GlassSection eyebrow="03" title="If it does not appear">
          <p>
            Wait a minute, refresh the console, and confirm you are signed in
            with the same account or organization that started checkout. Then
            email <a href={`mailto:${SECURITY_EMAIL}`} className="text-ink underline decoration-steel/50 underline-offset-4">{SECURITY_EMAIL}</a>{" "}
            with the order id and workspace email. We can trace the PayU
            transaction and grant or refund it.
          </p>
        </GlassSection>
        <GlassSection eyebrow="04" title="Receipts and policies">
          <p>
            The payment provider issues the transaction receipt. Billing terms
            are in the{" "}
            <Link href="/refund-policy" className="text-ink underline decoration-steel/50 underline-offset-4">
              refund and cancellation policy
            </Link>{" "}
            and the{" "}
            <Link href="/terms" className="text-ink underline decoration-steel/50 underline-offset-4">
              terms of service
            </Link>
            .
          </p>
        </GlassSection>
      </div>
    </PageShell>
  );
}
