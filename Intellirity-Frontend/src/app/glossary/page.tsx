import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI Security Glossary",
  description:
    "Definitions for prompt injection, LLM jailbreaks, LLM firewalls, AI guardrails, AI data loss prevention, MCP security, AI red teaming, denial of wallet, proof of intent and more.",
  keywords: PAGE_KEYWORDS["/glossary"],
  alternates: { canonical: `${SITE_URL}/glossary` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `AI Security Glossary · ${SITE_NAME}`,
    description:
      "Plain definitions for the terms that matter in AI security: prompt injection, jailbreaks, firewalls, guardrails, DLP, agent security, MCP, model supply chain and evidence.",
    url: `${SITE_URL}/glossary`,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: `AI Security Glossary · ${SITE_NAME}`,
    description:
      "Plain definitions for prompt injection, LLM firewalls, AI guardrails, DLP, agent security and the rest of the AI security vocabulary.",
    images: ["/og-image.png"],
  },
};

interface Term {
  slug: string;
  term: string;
  definition: string;
  related: { label: string; href: string };
}

const TERMS: Term[] = [
  {
    slug: "prompt-injection",
    term: "Prompt injection",
    definition:
      "An attack in which text a model is meant to read as data — a document, a web page, a tool result — contains instructions the model follows as if they came from its operator. Direct injection arrives in the user prompt; indirect injection arrives through retrieved content. A prompt injection defence screens both before the model is called.",
    related: { label: "The engines that detect it", href: "/engines" },
  },
  {
    slug: "jailbreak",
    term: "LLM jailbreak",
    definition:
      "A jailbreak persuades a model to ignore its own safety policy, usually through roleplay, encoding, or a long multi-turn story. It is not the same as prompt injection: injection hijacks the task, a jailbreak removes the guardrail. Detection has to read intent and structure across the conversation, not match one keyword.",
    related: { label: "Jailbreak and injection protection", href: "/engines" },
  },
  {
    slug: "llm-firewall",
    term: "LLM firewall",
    definition:
      "An inline control that inspects a prompt before it reaches a model and the response before it reaches the user, then allows, flags or blocks the call. A firewall produces a verdict and evidence for every request, rather than a periodic report.",
    related: { label: "How the gateway fails closed", href: "/security" },
  },
  {
    slug: "ai-guardrails",
    term: "AI guardrails",
    definition:
      "Policy constraints applied to model input, output and agent actions. Guardrails can prevent an action, redact data, or require human approval. Detection without enforcement is monitoring; a guardrail changes what the system is allowed to do.",
    related: { label: "Policy packs and two-approver promotion", href: "/security" },
  },
  {
    slug: "ai-dlp",
    term: "AI data loss prevention (DLP)",
    definition:
      "Inspecting AI traffic for personal data, credentials, source code and regulated information, then redacting or blocking it. DLP has to cover both directions: what the user sends and what the model returns.",
    related: { label: "Data loss prevention engine", href: "/engines" },
  },
  {
    slug: "pii-redaction",
    term: "PII redaction",
    definition:
      "Replacing personal identifiers with placeholders before data crosses a boundary, so the model can still complete the task without holding the identity. Redaction should be reversible only by the system that owns the data.",
    related: { label: "What the engine stores", href: "/privacy" },
  },
  {
    slug: "ai-agent-security",
    term: "AI agent security",
    definition:
      "Governing autonomous agents: which tools they may call, what they may spend, which goals they may pursue, and when a human must approve. Agents fail differently from chatbots because their actions have side effects outside the conversation.",
    related: { label: "Agent action policy and drift", href: "/engines" },
  },
  {
    slug: "mcp-security",
    term: "MCP security (Model Context Protocol)",
    definition:
      "The Model Context Protocol connects models to tools and data sources. Securing it means auditing tool descriptions for poisoning, constraining scopes, and detecting confused-deputy calls where a trusted server is used to reach something it should not.",
    related: { label: "MCP and tool governance", href: "/engines" },
  },
  {
    slug: "model-supply-chain",
    term: "AI model supply chain security",
    definition:
      "Verifying where a model came from and that it is the model you think it is: provenance, hashes, formats and known-bad artefacts. A tampered model can behave correctly in testing and differently in production.",
    related: { label: "Model supply chain engine", href: "/engines" },
  },
  {
    slug: "ai-red-teaming",
    term: "AI red teaming",
    definition:
      "Adversarial testing of an AI system with the prompts, tool calls and multi-turn strategies an attacker would use. The useful output is evidence of which attacks succeed and which controls stopped them, not a single score.",
    related: { label: "Run an adversarial scan", href: "/console/scanner" },
  },
  {
    slug: "denial-of-wallet",
    term: "Denial of wallet",
    definition:
      "An attack that makes an AI system consume far more tokens or API calls than intended — recursive prompts, long loops, or abusive clients — until the bill or a rate limit stops it. Controls need per-session ceilings, not just a global quota.",
    related: { label: "Wallet guard", href: "/engines" },
  },
  {
    slug: "ai-audit-trail",
    term: "AI audit trail",
    definition:
      "A durable, ordered record of what the system decided and why: input hash, verdict, policy, action and evidence. A tamper-evident trail chains each record to the one before it, so a later edit is detectable rather than invisible.",
    related: { label: "The evidence model", href: "/security" },
  },
  {
    slug: "proof-of-intent",
    term: "Proof of intent",
    definition:
      "A signed statement that a specific human authorized a specific action within a defined scope, at a known time. It turns “the agent did it” into a verifiable claim about who approved it and what they approved.",
    related: { label: "Verifiable proof of intent", href: "/engines" },
  },
  {
    slug: "ai-escrow",
    term: "AI escrow",
    definition:
      "Holding an agent's funds or permissions until an independent check confirms the work was done. Escrow limits the damage a compromised or mistaken agent can do with money or authority.",
    related: { label: "Agent escrow pricing", href: "/pricing" },
  },
  {
    slug: "ai-content-moderation",
    term: "AI content moderation",
    definition:
      "Screening model inputs and outputs for spam, sexual content, minor safety, profanity, violent threats, self-harm and hate, with a category and a confidence for each. The engine supplies the evidence; the policy decision stays with you.",
    related: { label: "Content moderation engine", href: "/engines" },
  },
  {
    slug: "owasp-llm-top-10",
    term: "OWASP Top 10 for LLM Applications",
    definition:
      "A community risk taxonomy for LLM applications that includes prompt injection, sensitive information disclosure, supply chain risks, excessive agency and unbounded consumption. It is a map of risks, not a certification; Intellirity's engines address several of its categories and produce evidence for each verdict.",
    related: { label: "See the engine coverage", href: "/engines" },
  },
];

export default function GlossaryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/glossary#terms`,
    name: "AI Security Glossary",
    description:
      "Definitions for the vocabulary of AI security: prompt injection, jailbreaks, LLM firewalls, guardrails, DLP, agent security, MCP, model supply chain and evidence.",
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: TERMS.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.definition,
      url: `${SITE_URL}/glossary#${t.slug}`,
      inDefinedTermSet: `${SITE_URL}/glossary#terms`,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
        <Link href="/" className="inline-flex min-h-6 items-center transition-colors hover:text-ink">
          {SITE_NAME}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-dim">Glossary</span>
      </nav>

      <h1 className="text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
        AI security glossary.
      </h1>
      <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-dim">
        The vocabulary of AI security, in plain language: prompt injection,
        LLM jailbreaks, firewalls, guardrails, data loss prevention, agent
        security, MCP, model supply chain and the evidence that ties a
        decision to a record. Each entry links to the part of the product that
        handles it.
      </p>

      <nav aria-label="Glossary index" className="mt-10 rounded-lg border border-line bg-raise/40 p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">Jump to</p>
        <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {TERMS.map((t) => (
            <li key={t.slug}>
              <a
                href={`#${t.slug}`}
                className="inline-flex min-h-6 items-center text-[13.5px] text-dim transition-colors hover:text-ink"
              >
                {t.term}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-12 space-y-10">
        {TERMS.map((t) => (
          <section key={t.slug} id={t.slug} className="scroll-mt-24">
            <h2 className="text-[20px] font-medium tracking-[-0.01em]">{t.term}</h2>
            <p className="mt-2 max-w-[72ch] text-[15px] leading-relaxed text-dim">
              {t.definition}
            </p>
            <Link
              href={t.related.href}
              className="mt-2 inline-flex min-h-6 items-center text-[13px] text-steel transition-colors hover:text-ink"
            >
              {t.related.label} →
            </Link>
          </section>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-line pt-8">
        <Link
          href="/engines"
          className="inline-flex h-10 items-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
        >
          See the sixteen engines
        </Link>
        <Link
          href="/security"
          className="inline-flex h-10 items-center rounded border border-line-strong px-5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
        >
          Read the AI security model
        </Link>
      </div>
    </main>
  );
}
