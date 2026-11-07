import type { Metadata } from "next";
import Link from "next/link";
import { PlanCta } from "@/components/site/plan-cta";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Plans & Coverage",
  description:
    "Talk to the Intellirity team to scope the right AI security coverage for your environment. Book a call or configure a plan with us directly.",
  keywords: PAGE_KEYWORDS["/pricing"],
  alternates: { canonical: `${SITE_URL}/pricing` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Plans & Coverage | ${SITE_NAME}`,
    description:
      "Every AI environment is different. Talk to the Intellirity team to scope the right coverage for your systems.",
    url: `${SITE_URL}/pricing`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Talk to Intellirity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Plans & Coverage | ${SITE_NAME}`,
    description:
      "Talk to the Intellirity team to scope the right AI security coverage for your environment.",
    images: ["/og-image.png"],
  },
};

export default function PlansPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${SITE_URL}/pricing#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Plans", item: `${SITE_URL}/pricing` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <main className="mx-auto w-full max-w-[1240px] px-6 pt-16 sm:pt-24">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint"
        >
          <Link href="/" className="inline-flex min-h-6 items-center transition-colors hover:text-ink">
            {SITE_NAME}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-dim">Plans</span>
        </nav>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-steel">
          Commercial
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em]">
          Coverage is scoped with your team, not picked from a price list.
        </h1>
        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-dim">
          Tell us what AI you run, what data it touches and who needs to approve
          it. We will map the right controls, deployment model and commercial
          terms with you.
        </p>
      </main>

      <PlanCta step="01" />

      <div className="mx-auto max-w-[1240px] px-6 pb-24">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-steel">
          What happens next
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "A short discovery call",
              body: "We understand the AI systems, the data they touch and the first risk you need to control.",
            },
            {
              title: "A written scope",
              body: "You receive the proposed coverage, deployment model, commercial terms and next step in writing.",
            },
            {
              title: "Activation when ready",
              body: "Nothing is charged until the scope is agreed. Access is activated against that agreed plan.",
            },
          ].map((step, index) => (
            <li key={step.title} className="panel rounded-lg p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                0{index + 1}
              </span>
              <h3 className="mt-2 text-[15px] font-medium">{step.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
          <Link href="/refund-policy" className="transition-colors hover:text-ink">
            Refund &amp; cancellation
          </Link>
          <Link href="/delivery" className="transition-colors hover:text-ink">
            Delivery
          </Link>
          <Link href="/contact" className="transition-colors hover:text-ink">
            Contact
          </Link>
          <Link href="/terms" className="transition-colors hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
        </div>
      </div>
    </>
  );
}
