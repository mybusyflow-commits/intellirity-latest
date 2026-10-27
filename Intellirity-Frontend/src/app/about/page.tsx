import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, GlassSection } from "@/components/site/page-shell";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SECURITY_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "About Intellirity" },
  description:
    "Intellirity is an AI security company building the security operations layer for prompts, models and agents. Meet founder Shreyansh Krishna and how we build.",
  keywords: PAGE_KEYWORDS["/about"],
  alternates: { canonical: `${SITE_URL}/about` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `About Intellirity · ${SITE_NAME}`,
    description:
      "The AI security company behind Intellirity: what we build, how we operate, and the founder behind it.",
    url: `${SITE_URL}/about`,
    type: "profile",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "About Intellirity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `About Intellirity · ${SITE_NAME}`,
    description:
      "The AI security company behind Intellirity: what we build, how we operate, and the founder behind it.",
    images: ["/og-image.png"],
  },
};

const FOUNDER_PARAGRAPHS = [
  "I'm Shreyansh Krishna, a young entrepreneur, developer, and technology enthusiast passionate about building solutions that solve real-world problems.",
  "My journey started with a simple curiosity: understanding how technology works and how I could use it to create something meaningful. What began as exploring programming languages and development tools gradually evolved into a deeper interest in artificial intelligence, cybersecurity, automation, and software engineering.",
  "Over time, I've gained hands-on experience exploring programming, AI-powered applications, development frameworks, automation workflows, and modern technologies. My interests extend beyond writing code to understanding how products are designed, built, secured, and transformed into scalable businesses.",
  "That curiosity eventually led me to found Intellirity, an AI security initiative focused on making intelligent systems safer, more reliable, and resilient. Through Intellirity, I'm working toward addressing security challenges involving AI agents, large language models, automated workflows, and integrated APIs.",
  "Beyond Intellirity, I'm actively exploring entrepreneurship, building technology-driven projects, and creating content around startups, artificial intelligence, cybersecurity, and emerging technologies. I also believe in connecting with like-minded builders, exchanging ideas, and creating opportunities to grow together.",
];

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/about#page`,
        url: `${SITE_URL}/about`,
        name: "About Intellirity",
        description:
          "The AI security company behind Intellirity: what we build, how we operate, and the founder behind it.",
        isPartOf: { "@id": `${SITE_URL}#website` },
        about: { "@id": `${SITE_URL}#org` },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/about#founder`,
        name: "Shreyansh Krishna",
        jobTitle: "Founder",
        worksFor: { "@id": `${SITE_URL}#org` },
        url: `${SITE_URL}/about#founder`,
        description:
          "Founder of Intellirity. Developer and entrepreneur working on AI security for prompts, models and agents.",
        knowsAbout: [
          "AI security",
          "Cybersecurity",
          "Artificial intelligence",
          "Software engineering",
          "Automation",
          "Entrepreneurship",
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/about#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "About", item: `${SITE_URL}/about` },
        ],
      },
    ],
  };

  return (
    <PageShell
      eyebrow="Company"
      title="AI security is a discipline, not a feature."
      lead="Intellirity is an AI security company building the security operations layer for prompts, models and agents. We judge every call, enforce policy, and attach tamper-evident evidence to every verdict."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassSection eyebrow="01" title="What we do">
          <p>
            We sit in front of your models, agents and data pipelines and judge
            every call for injection, jailbreak and exfiltration in real time.
            The product is the enforcement and the evidence, not a dashboard
            that scores risk without changing what the system is allowed to do.
          </p>
          <p className="mt-3">
            Intellirity was founded by Shreyansh Krishna after watching the first
            wave of prompt-injection incidents and concluding that AI needs its
            own security stack, not a repurposed web application firewall.
          </p>
        </GlassSection>

        <GlassSection eyebrow="02" title="How we operate">
          <p>
            Layered detection patterns maintained against current attack
            technique, policy bundles pinned per model, and an immutable
            evidence vault on every plan.
          </p>
          <p className="mt-3">
            We publish what the product enforces and we do not claim
            certifications we cannot show. The{" "}
            <Link href="/security" className="text-ink underline decoration-steel/50 underline-offset-4">
              security model
            </Link>{" "}
            is the honest version of that claim.
          </p>
        </GlassSection>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <GlassSection eyebrow="Founder" title="Shreyansh Krishna">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            Founder of Intellirity · Developer · AI &amp; Cybersecurity Enthusiast · Entrepreneur
          </p>
          <div className="mt-5 space-y-3">
            {FOUNDER_PARAGRAPHS.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            <p className="font-medium text-ink">
              My focus is simple: keep learning, keep building, and turn
              ambitious ideas into meaningful solutions.
            </p>
            <p>
              I&apos;m not here just to follow the future of technology. I want
              to play a part in building it.
            </p>
          </div>
        </GlassSection>

        <div className="grid gap-4">
          <GlassSection eyebrow="Next" title="See the work">
            <p>
              Read the{" "}
              <Link href="/engines" className="text-ink underline decoration-steel/50 underline-offset-4">
                sixteen detection engines
              </Link>
              , the{" "}
              <Link href="/blog" className="text-ink underline decoration-steel/50 underline-offset-4">
                research field notes
              </Link>
              , or the{" "}
              <Link href="/pricing" className="text-ink underline decoration-steel/50 underline-offset-4">
                per-module pricing
              </Link>
              .
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/console" className="inline-flex h-10 items-center rounded bg-ink px-4 text-[13px] font-medium text-bg transition-colors hover:bg-white">
                Open the console
              </Link>
              <Link href="/security" className="inline-flex h-10 items-center rounded border border-line-strong px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink/40">
                Security model
              </Link>
            </div>
          </GlassSection>
          <GlassSection eyebrow="Contact" title="Report a problem">
            <p>
              Security reports and general questions go to{" "}
              <a href={`mailto:${SECURITY_EMAIL}`} className="text-ink underline decoration-steel/50 underline-offset-4">
                {SECURITY_EMAIL}
              </a>
              . Business details and other channels are on the{" "}
              <Link href="/contact" className="text-ink underline decoration-steel/50 underline-offset-4">
                contact page
              </Link>
              .
            </p>
          </GlassSection>
        </div>
      </div>
    </PageShell>
  );
}
