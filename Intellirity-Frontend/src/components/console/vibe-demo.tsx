"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Code2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { demoVibeScan, type DemoVibeResult } from "@/lib/api";
import { useEntitlements } from "./entitlements";
import { cn } from "@/lib/utils";

/* One free Vibe-Code review per visitor.
 *
 * The engine rate-limits the route per IP; this owner-side flag keeps a
 * returning visitor from re-opening the form. Nothing is stored server-side
 * and no tenant data is read, so the demo carries no workspace records.
 */

const STORAGE_KEY = "intellirity.demo.vibe.v1";
const MAX_CHARS = 12_000;

const SAMPLE = `// sample: a small Express service
const express = require("express");
const app = express();
const API_KEY = "sk_live_example_do_not_use";

app.get("/user", (req, res) => {
  const q = "SELECT * FROM users WHERE id=" + req.query.id;
  db.query(q);
  res.send("<div>" + req.query.name + "</div>");
});

app.get("/fetch", async (req, res) => {
  const r = await fetch(req.query.url);
  res.send(await r.text());
});
`;

interface Stored {
  result: DemoVibeResult | null;
}

function severityTone(severity?: string) {
  const s = (severity ?? "").toLowerCase();
  if (s === "critical") return "text-crit border-crit/30 bg-crit/10";
  if (s === "high") return "text-crit border-crit/25 bg-crit/[0.07]";
  if (s === "medium") return "text-warn border-warn/30 bg-warn/10";
  return "text-dim border-line-strong bg-raise";
}

function verdictTone(verdict?: string) {
  const v = (verdict ?? "").toLowerCase();
  if (v === "block" || v === "deny") return "text-crit border-crit/30 bg-crit/10";
  if (v === "flag" || v === "review") return "text-warn border-warn/30 bg-warn/10";
  return "text-ok border-ok/30 bg-ok/10";
}

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    return { result: parsed?.result ?? null };
  } catch {
    return null;
  }
}

export function VibeDemo() {
  const { enforced, owned } = useEntitlements();
  const [code, setCode] = useState(SAMPLE);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "used">("idle");
  const [result, setResult] = useState<DemoVibeResult | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      if (stored.result) {
        setResult(stored.result);
        setPhase("done");
      } else {
        setPhase("used");
      }
    }
    setReady(true);
  }, []);

  const hasModule = enforced && owned.has("vibe-code");
  const findings = useMemo(() => (result?.findings ?? []).slice(0, 8), [result]);

  const run = async () => {
    const body = code.trim();
    if (!body) {
      setError("Paste a snippet first.");
      return;
    }
    if (body.length > MAX_CHARS) {
      setError(`Keep the demo under ${MAX_CHARS.toLocaleString()} characters.`);
      return;
    }
    setError("");
    setPhase("running");
    try {
      const data = await demoVibeScan(body);
      setResult(data);
      setPhase("done");
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ result: { ...data, findings: (data.findings ?? []).slice(0, 8) } })
        );
      } catch {
        /* storage is best-effort; the engine still rate-limits */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The demo engine is unavailable right now.");
      setPhase("idle");
    }
  };

  /* A workspace that already owns the module gets the real console, not a
     one-shot demo. */
  if (hasModule) return null;
  if (!ready) return null;

  return (
    <section className="panel overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          <Code2 className="size-4 text-steel" strokeWidth={1.5} />
          free demo · vibe-code review
        </span>
        <span className="rounded border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
          one free run
        </span>
      </div>

      <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[1fr,1fr]">
        <div>
          <p className="text-[13.5px] leading-relaxed text-dim">
            Paste a snippet and review it with the same detectors the
            Vibe-Code Security module runs on every repository. Injection
            flaws, unsafe sinks, hardcoded secrets and risky dependencies are
            reported with a severity, CWE and a fix. One free run per visitor;
            nothing you paste is stored.
          </p>

          {phase !== "done" && phase !== "used" ? (
            <>
              <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                <span>snippet</span>
                <span className="tabular-nums">
                  {code.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                disabled={phase === "running"}
                aria-label="Code snippet to review"
                className="mt-2 h-[220px] w-full resize-y rounded border border-line bg-sunken p-4 font-mono text-[12px] leading-[1.8] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-60"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={run}
                  disabled={phase === "running"}
                  className="inline-flex h-10 items-center gap-2 rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
                >
                  {phase === "running" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="size-4" strokeWidth={1.6} />
                  )}
                  {phase === "running" ? "reviewing…" : "run free review"}
                </button>
                <button
                  onClick={() => setCode(SAMPLE)}
                  disabled={phase === "running"}
                  className="inline-flex h-10 items-center rounded border border-line-strong px-4 font-mono text-[11px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-ink disabled:opacity-50"
                >
                  use sample
                </button>
              </div>
              {error && (
                <p role="alert" className="mt-3 font-mono text-[11px] leading-relaxed text-warn">
                  {error}
                </p>
              )}
            </>
          ) : phase === "used" ? (
            <div className="mt-4 rounded border border-line bg-sunken p-4">
              <p className="text-[13.5px] leading-relaxed text-dim">
                You have already used the free review on this browser. The
                full module reviews every file, diff and pull request with the
                same detectors.
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/pricing?module=vibe-code#pricing"
              className="inline-flex h-9 items-center gap-1.5 rounded border border-line-strong px-4 text-[12.5px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              Unlock Vibe-Code Security
              <ArrowRight className="size-3.5" strokeWidth={1.8} />
            </Link>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
              full module · repos, diffs, PRs
            </span>
          </div>
        </div>

        <div className="rounded border border-line bg-sunken p-4">
          {phase === "done" && result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                  review result
                </span>
                <span
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em]",
                    verdictTone(result.verdict)
                  )}
                >
                  {result.verdict || result.severity || "reviewed"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line">
                {[
                  { label: "risk", value: Math.round((result.risk_score ?? 0) * 100), suffix: "/100" },
                  { label: "critical", value: result.critical_count ?? 0, suffix: "" },
                  { label: "high", value: result.high_count ?? 0, suffix: "" },
                ].map((k) => (
                  <div key={k.label} className="bg-bg px-3 py-3">
                    <div className="text-[20px] font-medium tracking-[-0.02em] tabular-nums">
                      {k.value}
                      <span className="text-[11px] text-faint">{k.suffix}</span>
                    </div>
                    <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
                      {k.label}
                    </div>
                  </div>
                ))}
              </div>

              {findings.length > 0 ? (
                <ul className="space-y-2">
                  {findings.map((f, i) => (
                    <li key={`${f.title ?? f.type ?? "finding"}-${i}`} className="rounded border border-line bg-raise/60 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em]",
                            severityTone(f.severity)
                          )}
                        >
                          {f.severity ?? "info"}
                        </span>
                        <span className="text-[13px] font-medium text-ink">
                          {f.title ?? f.type ?? "Issue"}
                        </span>
                        {f.cwe && (
                          <span className="font-mono text-[10px] text-faint">{f.cwe}</span>
                        )}
                      </div>
                      {f.description && (
                        <p className="mt-1.5 text-[12px] leading-relaxed text-dim">
                          {f.description}
                        </p>
                      )}
                      {f.remediation && (
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
                          Fix: {f.remediation}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-start gap-2.5 rounded border border-ok/25 bg-ok/[0.06] p-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={1.7} />
                  <p className="text-[12.5px] leading-relaxed text-dim">
                    No issues matched the detectors in this snippet. The full
                    module also reviews dependency manifests, secrets history
                    and whole-repository context.
                  </p>
                </div>
              )}

              {result.vulnerabilities_found > findings.length && (
                <p className="font-mono text-[10.5px] text-faint">
                  {result.vulnerabilities_found - findings.length} more finding(s) in the
                  full report.
                </p>
              )}

              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                demo used · this browser
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <span className="grid size-11 place-items-center rounded-full border border-line bg-raise text-faint">
                <Code2 className="size-5" strokeWidth={1.5} />
              </span>
              <p className="mt-4 max-w-[34ch] text-[12.5px] leading-relaxed text-faint">
                The review appears here with a risk score, severity counts and
                one finding per issue.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
