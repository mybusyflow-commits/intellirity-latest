"use client";

import {
  ShieldCheck, Radar, Braces, DatabaseZap, ScrollText, Split, Landmark,
  AudioWaveform, Crosshair, ArrowUpRight, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Cell = {
  icon: LucideIcon;
  index: string;
  title: string;
  desc: string;
  tags: string[];
  span: string;
};

const CELLS: Cell[] = [
  {
    icon: ShieldCheck,
    index: "01",
    title: "Injection Shield",
    desc: "Every prompt scored by layered pattern families in real time. Blocks, rewrites, or allows, with a reason.",
    tags: ["inline", "real-time"],
    span: "md:col-span-2",
  },
  {
    icon: Radar,
    index: "02",
    title: "Live Mesh",
    desc: "Streaming verdicts across every model, agent and route you operate.",
    tags: ["stream"],
    span: "",
  },
  {
    icon: Braces,
    index: "03",
    title: "Vibe-Code Scan",
    desc: "SQLi, XSS, SSRF and weak crypto caught in AI-generated code before it merges.",
    tags: ["sast"],
    span: "",
  },
  {
    icon: DatabaseZap,
    index: "04",
    title: "Leakage Guard",
    desc: "PII, secrets and source code detected and redacted in flight.",
    tags: ["DLP"],
    span: "",
  },
  {
    icon: AudioWaveform,
    index: "05",
    title: "Anomaly Waves",
    desc: "Behavioral baselines per identity, key and tenant. Outliers surface themselves.",
    tags: ["UEBA"],
    span: "md:col-span-2",
  },
  {
    icon: Split,
    index: "06",
    title: "Policy as Code",
    desc: "Guardrails live in YAML, versioned with your stack. Ship policy in PRs.",
    tags: ["git-ops"],
    span: "",
  },
  {
    icon: ScrollText,
    index: "07",
    title: "Immutable Audit",
    desc: "Tamper-evident trails for every decision your AI ever made.",
    tags: ["evidence"],
    span: "",
  },
  {
    icon: Landmark,
    index: "08",
    title: "Agent Escrow",
    desc: "Custody rules for autonomous transactions: value moves only when policy says so.",
    tags: ["agents"],
    span: "",
  },
  {
    icon: Crosshair,
    index: "09",
    title: "Intent Proof",
    desc: "Verifies what the user actually meant, catching social-engineering chains.",
    tags: ["signals"],
    span: "",
  },
];

export function Platform() {
  return (
    <section id="platform" className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 md:py-32">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="reveal mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">02</span>
            <span className="h-px w-8 bg-line-strong" />
            the platform
          </div>
          <h2 className="reveal max-w-xl font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
            Nine sentinels. One defensive mesh.
          </h2>
        </div>
        <p className="reveal max-w-sm text-[14.5px] leading-relaxed text-dim">
          A single proxy, sidecar, or gateway in front of your AI stack.
          Every control below runs inline on the request path.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {CELLS.map((cell) => {
          const Icon = cell.icon;
          return (
            <article
              key={cell.index}
              className={cn(
                "reveal group relative flex min-h-[230px] flex-col bg-bg p-6 transition-colors duration-300 hover:bg-raise",
                cell.span
              )}
            >
              <div className="mb-8 flex items-start justify-between">
                <span className="font-mono text-[11px] tabular-nums text-faint">
                  {cell.index}
                </span>
                <span className="flex items-center gap-3">
                  <span className="flex gap-1.5">
                    {cell.tags.map((t) => (
                      <span key={t} className="rounded border border-line px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-faint">
                        {t}
                      </span>
                    ))}
                  </span>
                  <Icon
                    className="size-5 text-faint transition-colors duration-300 group-hover:text-steel"
                    strokeWidth={1.25}
                  />
                </span>
              </div>
              <h3 className="font-display text-[16px] font-medium tracking-[-0.01em]">
                {cell.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{cell.desc}</p>
              <ArrowUpRight className="absolute bottom-6 right-6 size-4 text-faint opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
            </article>
          );
        })}
      </div>
    </section>
  );
}
