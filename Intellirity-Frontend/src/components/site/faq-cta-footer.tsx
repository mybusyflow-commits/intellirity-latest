"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Soffit } from "@/components/fx/soffit";
import { SoftSurfaceButton } from "@/components/fx/study-buttons";
import { InfoModal } from "@/components/site/info-modal";
import { Logo } from "@/components/site/logo";

const FAQS = [
  {
    q: "Will Intellirity slow down our AI?",
    a: "Verdicts compute inline on every call with async enforcement, so your users never wait on security. Measured latency is shown live in the dashboard.",
  },
  {
    q: "Which models and frameworks are supported?",
    a: "Anything that speaks text: OpenAI, Anthropic, Google, Mistral, Llama, plus LangChain, LlamaIndex, Bedrock, Vertex, and raw HTTP endpoints. If it prompts, we guard it.",
  },
  {
    q: "Where does our data live?",
    a: "Verdict metadata is yours. We never train on your traffic. Self-hosted deployments keep everything inside your VPC with a local evidence vault.",
  },
  {
    q: "How is this different from a WAF?",
    a: "WAFs understand HTTP. Intellirity understands intent: semantic injection, multi-turn jailbreak chains, agent abuse, and exfiltration patterns no regex will ever catch.",
  },
];

export function Faq() {
  return (
    <section className="relative z-10 mx-auto max-w-[860px] px-6 py-24 md:py-32">
      <div className="mb-10">
        <div className="reveal mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">07</span>
          <span className="h-px w-8 bg-line-strong" />
          questions
        </div>
        <h2 className="reveal font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
          Asked by every security team.
        </h2>
      </div>

      <Accordion.Root
        type="single"
        collapsible
        className="reveal panel overflow-hidden rounded-lg"
      >
        {FAQS.map((f, i) => (
          <Accordion.Item key={f.q} value={`item-${i}`} className="border-b border-line last:border-b-0">
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]">
                <span className="flex items-center gap-4">
                  <span className="font-mono text-[11px] tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[15px] font-medium tracking-[-0.01em]">{f.q}</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-faint transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-ink" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[acc-up_0.25s_ease] data-[state=open]:animate-[acc-down_0.3s_cubic-bezier(0.16,1,0.3,1)]">
              <p className="px-6 pb-6 pl-[3.7rem] text-[14px] leading-relaxed text-dim">{f.a}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>

      <style>{`
        @keyframes acc-down { from { height: 0; opacity: 0; } to { height: var(--radix-accordion-content-height); opacity: 1; } }
        @keyframes acc-up { from { height: var(--radix-accordion-content-height); opacity: 1; } to { height: 0; opacity: 0; } }
      `}</style>
    </section>
  );
}

export function FinalCta() {
  return (
    <section id="contact" className="relative z-10 mx-auto max-w-[1240px] px-6 pb-24 md:pb-32">
      <div className="reveal relative overflow-hidden rounded-lg border border-black/10 px-6 py-16 text-center md:py-24">
        {/* Soffit — animated WebGL2 gradient field */}
        <Soffit className="absolute inset-0 block h-full w-full" />
        <div className="relative text-[#14161a]">
          <div className="mx-auto mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#14161a]/60">
            free recon tier · no card · 11 min to first block
          </div>
          <h2 className="mx-auto max-w-2xl font-display text-[clamp(2rem,4.6vw,3.6rem)] font-medium leading-[1.06] tracking-[-0.03em]">
            Arm your AI before it&apos;s used against you.
          </h2>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/console"
              className="group inline-flex h-11 items-center gap-2 rounded bg-[#14161a] px-7 text-[14px] font-medium text-white transition-transform duration-300 hover:scale-[1.02]"
            >
              Open Dashboard
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#scanner"
              className="inline-flex h-11 items-center gap-2 rounded border border-[#14161a]/25 px-7 text-[14px] font-medium text-[#14161a] transition-colors duration-300 hover:border-[#14161a]/60 hover:bg-black/[0.04]"
            >
              Attack it first
              <ArrowUpRight className="size-4 opacity-60" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

type FooterLink = { label: string; href?: string; modal?: string };

const FOOTER_COLS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Platform",
    links: [
      { label: "Overview", href: "/console" },
      { label: "Scanner", href: "/console/scanner" },
      { label: "Verdict stream", href: "/console/verdicts" },
      { label: "Changelog", modal: "changelog" },
    ],
  },
  {
    title: "Security",
    links: [
      { label: "Trust center", modal: "trust" },
      { label: "Evidence vault", href: "/console/audit" },
      { label: "Disclosure", modal: "disclosure" },
      { label: "Status", modal: "status" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", modal: "about" },
      { label: "Research", modal: "research" },
      { label: "Careers", modal: "careers" },
      { label: "Contact", modal: "contact" },
    ],
  },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy policy", modal: "privacy" },
  { label: "Terms & conditions", modal: "terms" },
  { label: "Terms of use", modal: "terms-use" },
  { label: "Cookie policy", modal: "cookies" },
];

export function Footer() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  return (
    <footer className="relative z-10 border-t border-line bg-raise/40">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-14 md:grid-cols-[1.4fr,1fr,1fr,1fr]">
        <div>
          <a href="#top" aria-label="Back to top">
            <Logo />
          </a>
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-dim">
            The security operations layer for AI. Detect, judge, neutralize,
            with evidence for every verdict.
          </p>
          <div className="mt-5 flex gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
            {["soc 2", "iso 27001", "gdpr"].map((t) => (
              <span key={t} className="rounded border border-line px-2 py-1">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-6 max-w-[320px]">
            <SoftSurfaceButton label="Explore Services" href="/console" scale={0.8} />
            <span className="mt-2 block font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
              the live product, not a demo
            </span>
          </div>
        </div>
        {FOOTER_COLS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h6 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              {col.title}
            </h6>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <a href={l.href} className="text-[13.5px] text-dim transition-colors hover:text-ink">
                      {l.label}
                    </a>
                  ) : (
                    <button
                      onClick={() => l.modal && setOpenDoc(l.modal)}
                      className="text-[13.5px] text-dim transition-colors hover:text-ink"
                    >
                      {l.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          {LEGAL_LINKS.map((l) => (
            <button
              key={l.label}
              onClick={() => l.modal && setOpenDoc(l.modal)}
              className="font-mono text-[11px] text-faint transition-colors hover:text-dim"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-3 px-6 py-5 sm:flex-row sm:items-center">
        <span className="font-mono text-[11px] text-faint">© 2026 Intellirity, Inc.</span>
        <span className="flex items-center gap-2 font-mono text-[11px] text-faint">
          <span className="dot animate-status bg-ok" />
          all systems operational
        </span>
      </div>
      <InfoModal docKey={openDoc} onClose={() => setOpenDoc(null)} />
    </footer>
  );
}
