"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export interface ModalDoc {
  title: string;
  updated: string;
  sections: Array<{ heading: string; body: string[] }>;
}

export const MODAL_DOCS: Record<string, ModalDoc> = {
  about: {
    title: "About Intellirity",
    updated: "Company",
    sections: [
      {
        heading: "What we do",
        body: [
          "Intellirity is the security operations layer for AI systems. We sit in front of your models, agents, and data pipelines and judge every call for injection, jailbreak, and exfiltration in real time, with evidence attached to every verdict.",
          "We were founded by infrastructure and applied-AI engineers who watched the first wave of prompt-injection incidents and concluded that AI needs its own security stack, not a repurposed WAF.",
        ],
      },
      {
        heading: "How we operate",
        body: [
          "Layered detection patterns maintained against current attack technique, policy bundles pinned per model, and an immutable evidence vault on every plan.",
        ],
      },
    ],
  },
  research: {
    title: "Research",
    updated: "Adversarial lab",
    sections: [
      {
        heading: "What we publish",
        body: [
          "Research notes tracking public prompt-injection techniques, jailbreak chains, and agent-abuse patterns, with mitigations for every finding we cover.",
          "If you find a novel bypass in this product, report it through the contact channel. Valid reports land in the policy bundle.",
        ],
      },
    ],
  },
  careers: {
    title: "Careers",
    updated: "Hiring",
    sections: [
      {
        heading: "Open roles",
        body: [
          "We are a small team and we hire slowly.",
          "If you break AI systems for fun and fix them for a living, write to careers@intellirity.example.com with something you broke and how you fixed it.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact",
    updated: "Reach us",
    sections: [
      {
        heading: "Channels",
        body: [
          "Sales and trials: hello@intellirity.example.com. We reply on business days.",
          "Security issues: security@intellirity.example.com. Encrypted reports welcome, triaged first, safe-harbor for good-faith research.",
          "Press: press@intellirity.example.com.",
        ],
      },
    ],
  },
  trust: {
    title: "Trust center",
    updated: "Compliance",
    sections: [
      {
        heading: "Certifications",
        body: [
          "SOC 2 Type II (audited annually), ISO/IEC 27001:2022, GDPR-compliant data processing with EU residency available.",
          "Penetration tests by two independent firms, yearly. Reports available under NDA from the console.",
        ],
      },
      {
        heading: "Data handling",
        body: [
          "We never train on your traffic. Verdict metadata belongs to you, retention is configurable, and Sovereign plans run fully air-gapped inside your VPC.",
        ],
      },
    ],
  },
  disclosure: {
    title: "Coordinated disclosure",
    updated: "Security",
    sections: [
      {
        heading: "Policy",
        body: [
          "If you find a vulnerability in Intellirity or a bypass worth $500 of attacker time, tell us first at security@intellirity.example.com.",
          "We acknowledge within 24 hours, ship a fix or mitigation within 30 days, and credit researchers publicly unless you prefer anonymity. Good-faith research is authorized and will never be pursued legally.",
        ],
      },
    ],
  },
  status: {
    title: "Status",
    updated: "Live",
    sections: [
      {
        heading: "Current state",
        body: [
          "All systems operational. Median verdict latency is reported live in the console.",
          "Incident history lives in the audit log. Subscribe to status updates from the console.",
        ],
      },
    ],
  },
  changelog: {
    title: "Changelog",
    updated: "Shipping",
    sections: [
      {
          heading: "v4.2 (current)",
          body: [
          "Layered policy bundle. Agent escrow for autonomous spend. Intent-proof verification for support copilots.",
        ],
      },
      {
        heading: "v4.1",
        body: [
          "Vibe-code audit for generated diffs. Evidence vault on all plans.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    updated: "Effective 1 January 2026",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account data (name, work email, billing contact) and product telemetry (verdict metadata, latency, error rates). Scan payloads are processed only to return a verdict. We never train models on your traffic.",
        ],
      },
      {
        heading: "What we never do",
        body: [
          "We never sell data, never train models on your traffic, and never share customer data with third parties except subprocessors listed in the trust center, bound by data-processing agreements.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Access, correction, export, and deletion of your data at any time from the console or via privacy@intellirity.example.com. EU data residency available on request.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms & conditions",
    updated: "Effective 1 January 2026",
    sections: [
      {
        heading: "The service",
        body: [
          "Intellirity provides AI security enforcement as a subscription service. Trials are free for 14 days with full production features.",
          "Trials are free for 14 days with full production features. Paid plans bill per workspace, monthly or annually, cancelable anytime with pro-rata refunds on annual plans.",
        ],
      },
      {
        heading: "Fair use",
        body: [
          "Unlimited scans means unlimited good-faith security testing of systems you own or operate. Resale of scan capacity, or use of the scanner against third-party systems without authorization, terminates the account.",
        ],
      },
    ],
  },
  "terms-use": {
    title: "Terms of use",
    updated: "Acceptable use",
    sections: [
      {
        heading: "Allowed",
        body: [
          "Testing your own models, agents, and applications. Red-teaming client systems with written authorization. Academic research with coordinated disclosure.",
        ],
      },
      {
        heading: "Prohibited",
        body: [
          "Attacking systems you do not own or operate. Exfiltrating or reproducing the policy bundle. Using verdict data to train competing detection models. Any attempt to disrupt the mesh itself.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie policy",
    updated: "Effective 1 January 2026",
    sections: [
      {
        heading: "What we set",
        body: [
          "Strictly necessary: local workspace preferences in your browser. Analytics: privacy-preserving, cookie-free page metrics, no cross-site tracking, ever.",
          "The marketing site sets zero advertising cookies. The console sets one session cookie required for sign-in.",
        ],
      },
      {
        heading: "Control",
        body: [
          "Block all cookies and the site still works, except staying signed in. No consent banner is needed because there is nothing to consent to.",
        ],
      },
    ],
  },
};

export function InfoModal({ docKey, onClose }: { docKey: string | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doc = docKey ? MODAL_DOCS[docKey] : null;

  return (
    <AnimatePresence>
      {doc && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={doc.title}
            className="panel relative flex max-h-[82vh] w-full max-w-[600px] flex-col overflow-hidden rounded-lg"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h3 className="text-[17px] font-medium tracking-[-0.01em]">{doc.title}</h3>
                <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                  {doc.updated}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded border border-line text-dim transition-colors hover:border-line-strong hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              {doc.sections.map((s) => (
                <section key={s.heading} className="mb-6 last:mb-0">
                  <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-steel">
                    {s.heading}
                  </h4>
                  {s.body.map((p, i) => (
                    <p key={i} className="mb-2.5 text-[14px] leading-relaxed text-dim last:mb-0">
                      {p}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
