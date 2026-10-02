"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "monthly" | "annual";

type Plan = {
  name: string;
  blurb: string;
  monthly?: number;
  annual?: number;
  custom?: boolean;
  cta: string;
  featured: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    blurb: "For individuals and teams starting to secure their AI.",
    monthly: 99,
    annual: 79,
    cta: "Start free trial",
    featured: false,
    features: [
      "Adversarial endpoint scanner",
      "Prompt injection and jailbreak detection",
      "Basic code security scan",
      "Data leakage protection",
      "Real-time threat monitoring",
      "Live security dashboard",
    ],
  },
  {
    name: "Growth",
    blurb: "For teams running AI in production.",
    monthly: 3999,
    annual: 3199,
    cta: "Start free trial",
    featured: true,
    features: [
      "Everything in Starter",
      "Behavioral anomaly detection",
      "AI action policy enforcement",
      "Deep code scan (SQLi, XSS, command injection, SSRF, weak crypto, headers)",
      "Data flow tracker",
      "Black box audit ledger",
      "Verifiable proof of intent",
      "Autonomous escrow",
      "Workflow anomaly detection",
    ],
  },
];

export function Pricing() {
  const [period, setPeriod] = useState<Period>("annual");

  return (
    <section id="pricing" className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 md:py-32">
      <div className="mb-12 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <div>
          <div className="reveal mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">06</span>
            <span className="h-px w-8 bg-line-strong" />
            pricing
          </div>
          <h2 className="reveal max-w-xl font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
            Pay for coverage, not for seats.
          </h2>
        </div>

        <div className="reveal inline-flex items-center rounded border border-line bg-raise p-0.5 font-mono text-[12px]">
          {(["monthly", "annual"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={cn(
                "rounded-[3px] px-4 py-2 uppercase tracking-[0.1em] transition-colors",
                period === p ? "bg-ink text-bg" : "text-faint hover:text-dim"
              )}
            >
              {p}
              {p === "annual" && <span className="ml-1.5 normal-case tracking-normal">−20%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-2">
        {PLANS.map((plan) => {
          const price = plan.custom
            ? null
            : period === "monthly"
              ? (plan.monthly ?? 0)
              : (plan.annual ?? 0);
          return (
            <article
              key={plan.name}
              className={cn(
                "reveal relative flex flex-col rounded-lg border p-7 md:p-8",
                plan.featured ? "border-steel/50 bg-raise" : "border-line bg-bg"
              )}
            >
              {plan.featured && (
                <div className="absolute right-6 top-6 rounded border border-line-strong px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
                  most deployed
                </div>
              )}

              <h3 className="font-mono text-[12px] uppercase tracking-[0.16em] text-dim">
                {plan.name}
              </h3>
              <p className="mt-1.5 text-[13.5px] text-faint">{plan.blurb}</p>

              <div className="mt-7 flex items-baseline gap-1.5">
                {plan.custom || price === null ? (
                  <span className="text-[40px] font-medium tracking-[-0.025em]">Custom</span>
                ) : (
                  <>
                    <span
                      key={period}
                      className="animate-in fade-in slide-in-from-bottom-1 font-display text-[44px] font-medium tabular-nums tracking-[-0.025em]"
                    >
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="font-mono text-[12px] text-faint">/mo</span>
                  </>
                )}
              </div>
              {!plan.custom && price !== null && price > 0 && (
                <div className="mt-1 font-mono text-[10.5px] text-faint">
                  {period === "annual" ? "billed annually" : "billed monthly"} · per workspace
                </div>
              )}

              <ul className="mt-7 flex flex-1 flex-col gap-2.5 border-t border-line pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-dim">
                    <Check className="mt-0.5 size-4 shrink-0 text-steel" strokeWidth={1.75} />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className={cn(
                  "mt-8 inline-flex h-10 items-center justify-center rounded text-[13.5px] font-medium transition-colors",
                  plan.featured
                    ? "bg-ink text-bg hover:bg-white"
                    : "border border-line-strong text-ink hover:border-ink/40 hover:bg-white/[0.03]"
                )}
              >
                {plan.cta}
              </a>
            </article>
          );
        })}
      </div>

      <p className="reveal mt-6 text-center font-mono text-[11px] text-faint">
        every plan ships the full layered policy bundle · cancel anytime
      </p>
    </section>
  );
}
