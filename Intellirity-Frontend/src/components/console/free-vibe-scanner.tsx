"use client";

import { useState } from "react";
import { Code2, Globe2, Loader2, ScanSearch, ShieldCheck } from "lucide-react";
import { scanVibeCode, type DemoVibeResult } from "@/lib/api";
import { cn } from "@/lib/utils";

const SAMPLE = `app.get("/user", (req, res) => {
  const query = "SELECT * FROM users WHERE id=" + req.query.id;
  db.query(query);
  res.send("<div>" + req.query.name + "</div>");
});

const API_KEY = "sk_live_example_do_not_use";
`;

function severityTone(severity?: string) {
  const s = (severity ?? "").toLowerCase();
  if (s === "critical") return "text-crit border-crit/30 bg-crit/10";
  if (s === "high") return "text-crit border-crit/25 bg-crit/[0.07]";
  if (s === "medium") return "text-warn border-warn/30 bg-warn/10";
  return "text-dim border-line-strong bg-raise";
}

function verdictTone(verdict: string) {
  const v = verdict.toLowerCase();
  if (v === "block" || v === "deny") return "text-crit border-crit/30 bg-crit/10";
  if (v === "flag" || v === "review") return "text-warn border-warn/30 bg-warn/10";
  return "text-ok border-ok/30 bg-ok/10";
}

/** The free, no-setup Vibe-Code scanner. One input, one button, real results. */
export function FreeVibeScanner() {
  const [mode, setMode] = useState<"url" | "code">("url");
  const [url, setUrl] = useState("");
  const [code, setCode] = useState(SAMPLE);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<DemoVibeResult | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    const input = (mode === "url" ? url : code).trim();
    if (!input) {
      setError(mode === "url" ? "Enter a website URL first." : "Paste some code first.");
      return;
    }
    setPhase("running");
    setError("");
    try {
      const data = await scanVibeCode(mode, input);
      setResult(data);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The scan could not run.");
      setPhase("idle");
    }
  };

  const switchMode = (next: "url" | "code") => {
    if (phase === "running") return;
    setMode(next);
    setResult(null);
    setPhase("idle");
    setError("");
  };

  return (
    <section className="panel overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          <ScanSearch className="size-4 text-steel" strokeWidth={1.5} />
          free security scanner
        </span>
        <span className="rounded border border-ok/30 bg-ok/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ok">
          free · no payment
        </span>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[620px]">
            <h2 className="text-[22px] font-medium tracking-[-0.02em]">
              Check a website or your code.
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
              Choose one option and run the scan. Website checks cover transport,
              response headers and URL risks. Code checks find injection flaws,
              secrets and unsafe functions with a concrete fix.
            </p>
          </div>
          <div className="flex shrink-0 rounded border border-line bg-sunken p-1">
            {([
              ["url", "Website URL", Globe2],
              ["code", "Paste code", Code2],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => switchMode(key)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded px-3.5 text-[12.5px] font-medium transition-colors",
                  mode === key ? "bg-raise text-ink" : "text-faint hover:text-dim"
                )}
                aria-pressed={mode === key}
              >
                <Icon className="size-3.5" strokeWidth={1.7} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {mode === "url" ? (
            <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              public website URL
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void run();
                }}
                placeholder="https://your-website.com"
                inputMode="url"
                spellCheck={false}
                disabled={phase === "running"}
                className="mt-2 h-11 w-full rounded border border-line bg-sunken px-3.5 font-mono text-[13px] normal-case tracking-normal text-ink placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-60"
              />
            </label>
          ) : (
            <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              code to review
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                disabled={phase === "running"}
                className="mt-2 h-[190px] w-full resize-y rounded border border-line bg-sunken p-4 font-mono text-[12px] leading-[1.8] normal-case tracking-normal text-ink placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-60"
              />
            </label>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void run()}
            disabled={phase === "running"}
            className="inline-flex h-10 items-center gap-2 rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {phase === "running" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanSearch className="size-4" strokeWidth={1.7} />
            )}
            {phase === "running" ? "Scanning…" : phase === "done" ? "Scan again" : "Run free scan"}
          </button>
          {mode === "code" && (
            <button
              onClick={() => setCode(SAMPLE)}
              disabled={phase === "running"}
              className="inline-flex h-10 items-center rounded border border-line-strong px-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-ink disabled:opacity-50"
            >
              reset sample
            </button>
          )}
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-faint">
            no code is saved by this free scan
          </span>
        </div>

        {error && (
          <p role="alert" className="mt-3 font-mono text-[11px] leading-relaxed text-warn">
            {error}
          </p>
        )}
      </div>

      {phase === "done" && result && (
        <div className="border-t border-line bg-sunken/60 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                scan complete
              </p>
              <p className="mt-1 truncate text-[13px] text-dim">{result.target}</p>
            </div>
            <span
              className={cn(
                "rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em]",
                verdictTone(result.verdict)
              )}
            >
              {result.verdict}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line">
            {[
              { label: "risk", value: Math.round(result.risk_score * 100), suffix: "/100" },
              { label: "critical", value: result.critical_count, suffix: "" },
              { label: "high", value: result.high_count, suffix: "" },
            ].map((k) => (
              <div key={k.label} className="bg-bg px-4 py-3">
                <div className="text-[22px] font-medium tracking-[-0.02em] tabular-nums">
                  {k.value}
                  <span className="text-[11px] text-faint">{k.suffix}</span>
                </div>
                <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {result.findings.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {result.findings.map((finding, i) => (
                <li key={`${finding.title}-${finding.line}-${i}`} className="rounded border border-line bg-raise/60 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em]",
                        severityTone(finding.severity)
                      )}
                    >
                      {finding.severity ?? "info"}
                    </span>
                    <span className="text-[13px] font-medium text-ink">
                      {finding.title ?? finding.type ?? "Issue"}
                    </span>
                    {finding.cwe && <span className="font-mono text-[10px] text-faint">{finding.cwe}</span>}
                  </div>
                  {finding.description && (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-dim">{finding.description}</p>
                  )}
                  {finding.remediation && (
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
                      Fix: {finding.remediation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 flex items-start gap-2.5 rounded border border-ok/25 bg-ok/[0.06] p-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={1.7} />
              <p className="text-[12.5px] leading-relaxed text-dim">
                No issues matched these checks. A clean static scan is a useful
                baseline, not proof that every vulnerability is absent.
              </p>
            </div>
          )}

          {result.recommendation && (
            <p className="mt-4 text-[12px] leading-relaxed text-faint">{result.recommendation}</p>
          )}
        </div>
      )}
    </section>
  );
}
