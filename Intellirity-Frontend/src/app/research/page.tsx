import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, GlassSection } from "@/components/site/page-shell";
import { BLOG_POSTS } from "@/lib/blog";
import { SECURITY_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Research | Intellirity" },
  description:
    "Intellirity's adversarial AI security research: prompt injection, agent abuse, MCP risk and the detections that follow. Responsible disclosure and published field notes.",
  keywords: [
    "AI security research",
    "prompt injection research",
    "AI agent abuse",
    "LLM red teaming",
    "responsible disclosure AI",
  ],
  alternates: { canonical: `${SITE_URL}/research` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Research · ${SITE_NAME}`,
    description: "Adversarial research on prompt injection, agents and AI attack technique.",
    url: `${SITE_URL}/research`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity research" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Research · ${SITE_NAME}`,
    description: "Adversarial research on prompt injection, agents and AI attack technique.",
    images: ["/og-image.png"],
  },
};

const TRACKS = [
  {
    title: "Prompt injection",
    body: "Direct and indirect payloads, encoding tricks, multi-turn escalation and the difference between a payload the model reads and an instruction it follows.",
  },
  {
    title: "Agent abuse",
    body: "Goal hijacking, tool confusion, confused-deputy calls through MCP servers, and the action policies that stop a compromised plan from becoming a transaction.",
  },
  {
    title: "Evidence",
    body: "What a decision record must contain to survive an incident review: input hash, controls, verdict, policy version, actor and action.",
  },
];

export default function ResearchPage() {
  const reading = BLOG_POSTS.filter((p) =>
    ["Prompt Injection Attacks: How They Work and How to Prevent Them", "How Hackers Exploit AI Agents and How to Protect Them", "LLM Security: Common Vulnerabilities and Best Practices"].includes(p.title)
  );

  return (
    <PageShell
      eyebrow="Adversarial lab"
      title="Research that changes the rule set."
      lead="We study attacks against language models, agents and the tools they call, then turn the findings into detections and policy. Research notes are published only after the mitigation exists."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {TRACKS.map((t) => (
          <GlassSection key={t.title} title={t.title}>
            <p>{t.body}</p>
          </GlassSection>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <GlassSection eyebrow="Disclosure" title="Report a bypass">
          <p>
            If you find a novel injection, a jailbreak chain or an agent
            escalation path in this product, report it to{" "}
            <a href={`mailto:${SECURITY_EMAIL}`} className="text-ink underline decoration-steel/50 underline-offset-4">
              {SECURITY_EMAIL}
            </a>
            . Include the affected surface, a minimal reproduction and whether
            customer data is involved.
          </p>
          <p className="mt-3">
            We acknowledge good-faith reports, will not pursue legal action for
            research conducted within scope, and add validated findings to the
            detection policy.
          </p>
          <Link href="/security" className="mt-4 inline-flex text-[13px] text-steel underline decoration-steel/40 underline-offset-4 hover:text-ink">
            Read the security model
          </Link>
        </GlassSection>

        <GlassSection eyebrow="Field notes" title="Read the research">
          <ul className="space-y-3">
            {reading.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  <span className="text-[14px] leading-snug text-ink/90 transition-colors group-hover:text-white">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
                    {p.readingMinutes} min read
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/blog" className="mt-5 inline-flex font-mono text-[10px] uppercase tracking-[0.14em] text-steel hover:text-ink">
            All articles →
          </Link>
        </GlassSection>
      </div>
    </PageShell>
  );
}
