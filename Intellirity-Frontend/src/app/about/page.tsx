import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SITE_NAME, SITE_URL, SECURITY_EMAIL } from "@/lib/site";

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
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "About",
            item: `${SITE_URL}/about`,
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-[820px] px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint"
      >
        <Link href="/" className="inline-flex min-h-6 items-center transition-colors hover:text-ink">
          {SITE_NAME}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-dim">About</span>
      </nav>

      <article>
        <h1 className="text-[clamp(2.1rem,5vw,3.1rem)] font-medium leading-[1.08] tracking-[-0.025em]">
          AI security is a discipline, not a feature.
        </h1>
        <p className="mt-6 max-w-[66ch] text-[17px] leading-relaxed text-dim">
          Intellirity is an AI security company building the security
          operations layer for AI systems. We sit in front of models, agents
          and data pipelines, judge every call for injection, jailbreak and
          exfiltration, and attach tamper-evident evidence to every verdict.
        </p>

        <section className="mt-12">
          <h2 className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-steel">
            What we do
          </h2>
          <p className="mt-3 text-[15px] leading-[1.75] text-dim">
            Intellirity is the security operations layer for AI systems. We
            sit in front of your models, agents and data pipelines and judge
            every call for injection, jailbreak and exfiltration in real
            time, with evidence attached to every verdict.
          </p>
          <p className="mt-3 text-[15px] leading-[1.75] text-dim">
            Intellirity was founded by Shreyansh Krishna after watching the
            first wave of prompt-injection incidents and concluding that AI
            needs its own security stack, not a repurposed web application
            firewall.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-steel">
            How we operate
          </h2>
          <p className="mt-3 text-[15px] leading-[1.75] text-dim">
            Layered detection patterns maintained against current attack
            technique, policy bundles pinned per model, and an immutable
            evidence vault on every plan. We publish what the product
            enforces and we do not claim certifications we cannot show; the{" "}
            <Link
              href="/security"
              className="text-ink underline decoration-steel/60 underline-offset-2"
            >
              security model
            </Link>{" "}
            is the honest version of that claim.
          </p>
        </section>

        <section id="founder" className="mt-14 scroll-mt-24 border-t border-line pt-12">
          <h2 className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-steel">
            Meet the founder
          </h2>
          <h3 className="mt-4 text-[28px] font-medium tracking-[-0.02em]">
            Shreyansh Krishna
          </h3>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            Founder of Intellirity · Developer · AI &amp; Cybersecurity
            Enthusiast · Entrepreneur
          </p>

          <div className="mt-6 space-y-4 text-[15px] leading-[1.8] text-dim">
            {FOUNDER_PARAGRAPHS.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            <p className="font-medium text-ink">
              My focus is simple: keep learning, keep building, and turn
              ambitious ideas into meaningful solutions.
            </p>
            <p>
              I&apos;m not here just to follow the future of technology. I
              want to play a part in building it.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-steel">
            Work with us
          </h2>
          <p className="mt-3 text-[15px] leading-[1.75] text-dim">
            Read the{" "}
            <Link href="/engines" className="text-ink underline decoration-steel/60 underline-offset-2">
              sixteen detection engines
            </Link>
            , check{" "}
            <Link href="/pricing" className="text-ink underline decoration-steel/60 underline-offset-2">
              per-module pricing
            </Link>
            , or report a vulnerability to{" "}
            <a
              href={`mailto:${SECURITY_EMAIL}`}
              className="text-ink underline decoration-steel/60 underline-offset-2"
            >
              {SECURITY_EMAIL}
            </a>
            .
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
          <Link
            href="/console"
            className="inline-flex h-10 items-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
          >
            Open the console
          </Link>
          <Link
            href="/security"
            className="inline-flex h-10 items-center rounded border border-line-strong px-5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
          >
            Read the security model
          </Link>
        </div>
      </article>
    </main>
  );
}
