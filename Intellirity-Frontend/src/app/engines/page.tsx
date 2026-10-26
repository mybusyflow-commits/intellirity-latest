import type { Metadata } from "next";
import Link from "next/link";
import engines from "@/lib/engines.generated.json";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI Security Detection Engines",
  description:
    "Sixteen AI security detection engines covering prompt injection, LLM jailbreaks, AI data loss prevention, agent abuse, MCP security, model supply chain attacks, AI red teaming and runaway spend.",
  keywords: PAGE_KEYWORDS["/engines"],
  alternates: { canonical: `${SITE_URL}/engines` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `AI Security Detection Engines · ${SITE_NAME}`,
    description:
      "Sixteen detection engines for prompt injection, jailbreaks, AI data loss prevention, agent abuse, MCP poisoning and model supply-chain attacks.",
    url: `${SITE_URL}/engines`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity AI security engines" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `AI Security Detection Engines · ${SITE_NAME}`,
    description:
      "Sixteen engines covering prompt injection, jailbreaks, AI DLP, agent abuse and model supply-chain attacks.",
    images: ["/og-image.png"],
  },
};

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  professional: "Professional",
  premium: "Premium",
  enterprise: "Enterprise",
};

export default function EnginesPage() {
  const items = engines as Array<{
    id: string;
    name: string;
    description: string;
    tier: string;
  }>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Intellirity detection engines",
    description:
      "The detection engines available in the Intellirity AI security platform.",
    numberOfItems: items.length,
    itemListElement: items.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.name,
      description: e.description,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
        <Link href="/" className="inline-flex min-h-6 items-center transition-colors hover:text-ink">
          {SITE_NAME}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-dim">Detection engines</span>
      </nav>

      <h1 className="text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
        Sixteen AI security engines. One verdict per call.
      </h1>
      <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-dim">
        Intellirity runs {items.length} AI security detection engines against
        every prompt, code payload and agent action. They cover prompt
        injection detection, LLM jailbreak detection, AI data loss prevention,
        agent security, MCP security, model supply chain security, AI red
        teaming and runaway spend — each a deterministic analyser for a
        distinct attack class, not a wrapper around a general model.
      </p>
      <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-faint">
        New to the vocabulary? The{" "}
        <Link href="/glossary" className="text-ink underline decoration-steel/60 underline-offset-2">
          AI security glossary
        </Link>{" "}
        defines prompt injection, jailbreaks, LLM firewalls, AI DLP and the
        rest.
      </p>

      <ul className="mt-12 space-y-px overflow-hidden rounded-lg border border-line bg-line">
        {items.map((e) => (
          <li key={e.id} className="bg-bg px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-[16px] font-medium tracking-[-0.01em]">{e.name}</h2>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                {TIER_LABEL[e.tier] ?? e.tier}
              </span>
              <code className="ml-auto font-mono text-[11px] text-faint">{e.id}</code>
            </div>
            <p className="mt-2 max-w-[72ch] text-[14.5px] leading-relaxed text-dim">
              {e.description}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Link
          href="/console/scanner"
          className="inline-flex h-11 items-center rounded bg-ink px-5 text-[13.5px] font-medium text-bg transition-colors hover:bg-white"
        >
          Run a live scan
        </Link>
        <Link
          href="/pricing"
          className="inline-flex h-11 items-center rounded border border-line-strong px-5 text-[13.5px] font-medium transition-colors hover:border-ink/40"
        >
          See pricing
        </Link>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
