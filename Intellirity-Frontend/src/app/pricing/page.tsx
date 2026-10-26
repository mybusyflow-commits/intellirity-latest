import type { Metadata } from "next";
import Link from "next/link";
import { Pricing } from "@/components/site/pricing";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI Security Pricing",
  description:
    "AI security pricing by module: nine detection modules from ₹79 to ₹399 per month, 20% off when you take all nine. No tiers, no seat counts — pay for the coverage you run.",
  keywords: PAGE_KEYWORDS["/pricing"],
  alternates: { canonical: `${SITE_URL}/pricing` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `AI Security Pricing · ${SITE_NAME}`,
    description:
      "Nine AI security modules from ₹79 to ₹399 per month, 20% off all nine. Toggle the coverage you need and pay exactly the sum.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-[1240px] px-6 pt-16 sm:pt-24">
        <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          <Link href="/" className="inline-flex min-h-6 items-center transition-colors hover:text-ink">
            {SITE_NAME}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-dim">Pricing</span>
        </nav>
        <h1 className="max-w-2xl font-display text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em]">
          AI security pricing, per module.
        </h1>
        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-dim">
          Intellirity is billed per AI security module, per month, in Indian
          rupees. There are no tiers and no seat counts: you switch on the
          detection engines you need and the total is the sum of their prices.
          AI guardrails, DLP, agent security and evidence each have their own
          price, and taking all nine is 20% off. Prices below are served live
          from the billing API.
        </p>
      </main>
      <Pricing />
      <div className="mx-auto max-w-[1240px] px-6 pb-24">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-steel">
          Frequently asked about billing
        </h2>
        <dl className="mt-5 space-y-6">
          <div>
            <dt className="text-[15px] font-medium">What happens after checkout?</dt>
            <dd className="mt-1.5 max-w-[70ch] text-[14.5px] leading-relaxed text-dim">
              An order is created against your workspace with status{" "}
              <code className="font-mono text-[13px]">pending-payment</code>. A
              payment provider confirms it, and the modules on that order
              become entitled to your workspace.
            </dd>
          </div>
          <div>
            <dt className="text-[15px] font-medium">Is there a free tier?</dt>
            <dd className="mt-1.5 max-w-[70ch] text-[14.5px] leading-relaxed text-dim">
              Yes. The free tier includes a working engine and no card, so you
              can run real scans before you pay. It is not a time-limited trial
              of a different product.
            </dd>
          </div>
          <div>
            <dt className="text-[15px] font-medium">Can I change modules later?</dt>
            <dd className="mt-1.5 max-w-[70ch] text-[14.5px] leading-relaxed text-dim">
              Yes. Entitlements are per module, so you can add or drop engines
              as your coverage changes. Annual plans are refunded pro rata when
              you cancel.
            </dd>
          </div>
        </dl>
      </div>
    </>
  );
}
