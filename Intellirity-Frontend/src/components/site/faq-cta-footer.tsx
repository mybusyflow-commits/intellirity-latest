"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Soffit } from "@/components/fx/soffit";
import { SoftSurfaceButton } from "@/components/fx/study-buttons";
import { InfoModal } from "@/components/site/info-modal";
import { Turnstile } from "@/components/site/turnstile";
import { Logo } from "@/components/site/logo";
import { sendContact } from "@/lib/api";

type AnswerSeg = { t: string; href?: string };

const FAQS: Array<{ q: string; a: AnswerSeg[] }> = [
  {
    q: "Will Intellirity slow down our AI?",
    a: [
      { t: "No. Verdicts compute inline with async enforcement, so users never wait on security. The live round-trip is measured on every page — open the " },
      { t: "dashboard", href: "/console" },
      { t: " and watch the mesh-health readout in the sidebar." },
    ],
  },
  {
    q: "Which models and frameworks are supported?",
    a: [
      { t: "Anything that speaks text: OpenAI, Anthropic, Google, Mistral, Llama, plus LangChain, Bedrock, Vertex, and raw HTTP. Register each endpoint under " },
      { t: "Models & agents", href: "/console/models" },
      { t: " and scan it against the live engine." },
    ],
  },
  {
    q: "Can we attack it ourselves before buying?",
    a: [
      { t: "Please do. Paste a jailbreak into the " },
      { t: "live scanner", href: "/console/scanner" },
      { t: " and watch the verdict stream, or run the full barrage across six detection modules." },
    ],
  },
  {
    q: "Where does our data live?",
    a: [
      { t: "With you. Verdict metadata is yours and we never train on traffic. Every decision lands in the tamper-evident " },
      { t: "evidence vault", href: "/console/audit" },
      { t: ", verifiable any time." },
    ],
  },
  {
    q: "What happens when the AI tries something risky?",
    a: [
      { t: "Dangerous actions are held in " },
      { t: "agent escrow", href: "/console/escrow" },
      { t: " until a human approves them, and every approval carries a signed " },
      { t: "proof of intent", href: "/console/proof" },
      { t: "." },
    ],
  },
  {
    q: "How is this different from a WAF?",
    a: [
      { t: "WAFs understand HTTP. Intellirity understands intent: semantic injection, multi-turn jailbreak chains, agent abuse, and exfiltration. See each control mapped to its live tab on the " },
      { t: "platform", href: "#platform" },
      { t: " section." },
    ],
  },
  {
    q: "How much does it cost?",
    a: [
      { t: "Starter workspaces begin at ₹99/month and Growth at ₹3,999. Compare every tier in " },
      { t: "pricing", href: "#pricing" },
      { t: "." },
    ],
  },
];

function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a.map((s) => s.t).join(""),
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function Faq() {
  return (
    <section className="relative z-10 mx-auto max-w-[860px] px-6 py-24 md:py-32">
      <FaqJsonLd />
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
              <p className="px-6 pb-6 pl-[3.7rem] text-[14px] leading-relaxed text-dim">
                {f.a.map((seg, j) =>
                  seg.href ? (
                    <a key={j} href={seg.href} className="text-ink underline decoration-steel/60 underline-offset-2 transition-colors hover:decoration-ink">
                      {seg.t}
                    </a>
                  ) : (
                    <span key={j}>{seg.t}</span>
                  )
                )}
              </p>
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
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [note, setNote] = useState("");

  async function submit() {
    if (state === "sending") return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      setState("error");
      setNote("Name, email, and message are all required.");
      return;
    }
    setState("sending");
    setNote("");
    try {
      const r = await sendContact({
        name: name.trim(),
        email: email.trim(),
        subject: "Landing contact",
        message: message.trim(),
        ...(token !== "" ? { turnstile_token: token } : {}),
      });
      setState("sent");
      setNote(`Received · ticket ${r.ticket}. We reply on business days.`);
      setName("");
      setEmail("");
      setMessage("");
    } catch (e) {
      setState("error");
      setNote(e instanceof Error ? e.message : "Send failed — try again.");
    }
  }

  if (state === "sent") {
    return <p className="mx-auto mt-8 max-w-md font-mono text-[12px] text-[#14161a]/80">{note}</p>;
  }

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="Name"
          spellCheck={false}
          className="h-10 flex-1 rounded border border-[#14161a]/25 bg-white/60 px-3 text-[13px] text-[#14161a] placeholder:text-[#14161a]/50 focus:border-[#14161a]/60 focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Work email"
          aria-label="Work email"
          inputMode="email"
          spellCheck={false}
          className="h-10 flex-1 rounded border border-[#14161a]/25 bg-white/60 px-3 text-[13px] text-[#14161a] placeholder:text-[#14161a]/50 focus:border-[#14161a]/60 focus:outline-none"
        />
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What should we guard for you?"
        aria-label="Message"
        rows={3}
        spellCheck={false}
        className="mt-2 w-full rounded border border-[#14161a]/25 bg-white/60 p-3 text-[13px] text-[#14161a] placeholder:text-[#14161a]/50 focus:border-[#14161a]/60 focus:outline-none"
      />
      <div className="mt-3 flex flex-col items-center gap-3">
        <Turnstile onToken={setToken} />
        <button
          onClick={submit}
          disabled={state === "sending"}
          className="inline-flex h-10 items-center rounded bg-[#14161a] px-6 text-[13px] font-medium text-white transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
        >
          {state === "sending" ? "sending…" : "Contact sales"}
        </button>
        {note !== "" && <p className="font-mono text-[11.5px] text-[#a33]">{note}</p>}
      </div>
    </div>
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
