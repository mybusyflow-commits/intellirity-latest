"use client";

import Link from "next/link";
import { ArrowRight, Code2, Globe2, ScanSearch } from "lucide-react";

const TOOLS = [
  {
    title: "Vibe-Code Security",
    description: "Scan a public website URL or paste code. Get real findings and fixes with no payment or setup.",
    href: "/console/code",
    label: "Open free scanner",
    icon: Code2,
  },
  {
    title: "Injection Scanner",
    description: "Test prompts against the live injection and jailbreak engine.",
    href: "/console/scanner",
    label: "Open scanner",
    icon: ScanSearch,
  },
  {
    title: "Threat Intelligence",
    description: "Explore the live threat feed and known adversarial patterns.",
    href: "/console/intel",
    label: "Open threat intel",
    icon: Globe2,
  },
];

/** Free tools are visible on the overview instead of hiding behind module locks. */
export function VibeDemo() {
  return (
    <section className="panel overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          free tools · start here
        </span>
        <span className="rounded border border-ok/30 bg-ok/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ok">
          no payment required
        </span>
      </div>
      <div className="grid gap-px bg-line md:grid-cols-3">
        {TOOLS.map((tool) => (
          <div key={tool.title} className="flex flex-col bg-bg p-5">
            <tool.icon className="size-4 text-steel" strokeWidth={1.6} />
            <h2 className="mt-3 text-[15px] font-medium text-ink">{tool.title}</h2>
            <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-dim">
              {tool.description}
            </p>
            <Link
              href={tool.href}
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink transition-colors hover:text-bright"
            >
              {tool.label}
              <ArrowRight className="size-3.5" strokeWidth={1.7} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
