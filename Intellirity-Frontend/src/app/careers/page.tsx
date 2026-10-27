import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, GlassSection } from "@/components/site/page-shell";
import { SECURITY_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Careers | Intellirity" },
  description:
    "Work on AI security at Intellirity. Small team, slow hiring, research and engineering roles for people who break AI systems and then fix them.",
  keywords: [
    "Intellirity careers",
    "AI security jobs",
    "LLM security engineer",
    "AI security researcher",
  ],
  alternates: { canonical: `${SITE_URL}/careers` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Careers · ${SITE_NAME}`,
    description: "Small team, slow hiring. AI security research and engineering.",
    url: `${SITE_URL}/careers`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Careers at Intellirity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Careers · ${SITE_NAME}`,
    description: "Small team, slow hiring. AI security research and engineering.",
    images: ["/og-image.png"],
  },
};

export default function CareersPage() {
  return (
    <PageShell
      eyebrow="Careers"
      title="Small team. Hard problems. No theatre."
      lead="We are building the security layer for systems that are probabilistic by design. That requires people who can read an attack, write the detector, and explain the trade-off without hiding behind a badge."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <GlassSection eyebrow="Open track" title="AI security research">
          <p>
            Break prompt-injection defences, agent policies and MCP integrations.
            Turn a successful attack into a deterministic detector, a regression
            test and a policy change.
          </p>
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
            Research · India / remote
          </p>
        </GlassSection>
        <GlassSection eyebrow="Open track" title="Full-stack security engineering">
          <p>
            Build the console, the gateway and the evidence path. TypeScript,
            Next.js, Python, Postgres and a bias for measurable controls over
            dashboards that look busy.
          </p>
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
            Engineering · India / remote
          </p>
        </GlassSection>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,0.8fr]">
        <GlassSection eyebrow="How we hire" title="Show the work">
          <p>
            There is no LeetCode round. Send something you broke and how you
            fixed it, a detector you wrote, a threat model, or a write-up of a
            real AI failure. We read the work, then talk.
          </p>
          <p className="mt-3">
            Write to{" "}
            <a href={`mailto:${SECURITY_EMAIL}`} className="text-ink underline decoration-steel/50 underline-offset-4">
              {SECURITY_EMAIL}
            </a>{" "}
            with the subject line “Careers — &lt;track&gt;”.
          </p>
        </GlassSection>
        <GlassSection eyebrow="What we offer" title="The honest version">
          <p>
            Early ownership, direct access to customers and the research cycle,
            and a product whose claims have to survive contact with a real
            attack. We hire slowly because the team is small and the work is
            interdependent.
          </p>
          <Link href="/about" className="mt-4 inline-flex text-[13px] text-steel underline decoration-steel/40 underline-offset-4 hover:text-ink">
            Meet the founder
          </Link>
        </GlassSection>
      </div>
    </PageShell>
  );
}
