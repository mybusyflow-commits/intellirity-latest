"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const TEAMS = [
  "API",
  "Reverse proxy",
  "SDK",
  "VPC sidecar",
  "MCP server",
  "Framework plugins",
];

export function ProofStrip() {
  return (
    <section className="relative z-10 border-b border-line">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        <p className="reveal shrink-0 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
          deploy as
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {TEAMS.map((t) => (
            <li
              key={t}
              className="reveal font-display text-[17px] font-medium tracking-[-0.01em] text-faint transition-colors duration-300 hover:text-dim"
            >
              {t}
            </li>
          ))}
        </ul>
        <p className="reveal hidden shrink-0 font-mono text-[10.5px] tabular-nums text-faint lg:block">
          live engine
        </p>
      </div>
    </section>
  );
}

// Every one of these is a protocol/endpoint shape the screening proxy and
// SDKs actually speak. Nothing here is a certification claim.
const PROVIDERS = [
  { name: "OpenAI", detail: "gpt-4o · o-series", status: "openai-compatible" },
  { name: "Anthropic", detail: "claude-4 · sonnet", status: "openai-compatible" },
  { name: "Google", detail: "gemini-2.5 · vertex", status: "openai-compatible" },
  { name: "Meta", detail: "llama-4 · self-hosted", status: "openai-compatible" },
  { name: "Mistral", detail: "large · mixtral", status: "openai-compatible" },
  { name: "Bedrock", detail: "aws marketplace", status: "gateway" },
  { name: "LangChain", detail: "callbacks hook", status: "sdk" },
  { name: "Raw HTTP", detail: "any endpoint", status: "proxy" },
];

const SNIPPET = `export OPENAI_BASE_URL="https://YOUR-INTELLIRITY-GATEWAY/v1"
export OPENAI_API_KEY="$INTELLIRITY_KEY"  # policy: payments-strict

# every call below is now judged inline, in real time.
# blocked attacks land in your verdict stream with evidence.`;

/* The gateway host is shown in the terminal and copied by the button, so
   the two can never disagree. Set NEXT_PUBLIC_GATEWAY_URL to the origin of
   your deployment; until then the placeholder is shown and clearly
   labelled as such. */
const GATEWAY_HOST = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://YOUR-INTELLIRITY-GATEWAY";
const GATEWAY_IS_PLACEHOLDER = !process.env.NEXT_PUBLIC_GATEWAY_URL;

const TERMINAL_SNIPPET = `# route your traffic through the mesh
export OPENAI_BASE_URL="${GATEWAY_HOST}/v1"
export OPENAI_API_KEY="$INTELLIRITY_KEY"  # policy: payments-strict`;

export function Integrate() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      // Copy exactly what the terminal shows, so the snippet and the screen
      // can never disagree about the gateway host.
      await navigator.clipboard.writeText(TERMINAL_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable: selection still works */
    }
  };

  return (
    <section className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 md:py-32">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="reveal mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">03</span>
            <span className="h-px w-8 bg-line-strong" />
            integrate
          </div>
          <h2 className="reveal max-w-xl font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
            Two env vars. Zero code changes.
          </h2>
        </div>
        <p className="reveal max-w-sm text-[14.5px] leading-relaxed text-dim">
          Point your existing SDK at the mesh. Policies attach by key prefix.
          Staging stays permissive while production enforces.{" "}
          {GATEWAY_IS_PLACEHOLDER && (
            <>
              Set <code className="font-mono text-[13px]">NEXT_PUBLIC_GATEWAY_URL</code> to
              your own gateway origin — the host below is a placeholder until
              you do.
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
        <div className="reveal panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="font-mono text-[11px] text-faint">terminal</span>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim transition-colors hover:border-line-strong hover:text-ink"
            >
              {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
              {copied ? "copied" : "copy"}
            </button>
          </div>
          <pre className="overflow-x-auto bg-sunken p-5 font-mono text-[12.5px] leading-[1.9]">
            <code>
              <span className="text-faint"># route your traffic through the mesh</span>
              {"\n"}
              <span className="text-steel">export</span> <span className="text-ink">OPENAI_BASE_URL</span>
              <span className="text-faint">=</span>
              <span className="text-dim">&quot;{GATEWAY_HOST}/v1&quot;</span>
              {"\n"}
              <span className="text-steel">export</span> <span className="text-ink">OPENAI_API_KEY</span>
              <span className="text-faint">=</span>
              <span className="text-dim">&quot;$INTELLIRITY_KEY&quot;</span>
              <span className="text-faint">  # policy: payments-strict</span>
              {"\n\n"}
              <span className="text-faint"># every call below is now judged inline, in real time.</span>
              {"\n"}
              <span className="text-faint"># blocked attacks land in your verdict stream with evidence.</span>
            </code>
          </pre>
        </div>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
          {PROVIDERS.map((p) => (
            <li key={p.name} className="reveal group flex items-center gap-3 bg-bg px-5 py-4 transition-colors hover:bg-raise">
              <span className="dot bg-ok" />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium">{p.name}</span>
                <span className="block truncate font-mono text-[11px] text-faint">{p.detail}</span>
              </span>
              <span className="ml-auto shrink-0 rounded border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-faint transition-colors group-hover:border-line-strong group-hover:text-dim">
                {p.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
