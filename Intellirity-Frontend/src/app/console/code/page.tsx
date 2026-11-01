"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileCode2,
  FolderOpen,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { scanModule } from "@/lib/api";
import { FreeVibeScanner } from "@/components/console/free-vibe-scanner";
import { useEntitlements } from "@/components/console/entitlements";
import { cn } from "@/lib/utils";

/* Repository review for Vibe-Code Security.
 *
 * Files are read in the browser and sent as a bounded JSON snapshot; the
 * engine reviews them statically and returns per-file findings, a threat
 * model, coverage and a SARIF report. Nothing is executed and the request
 * carries no workspace records beyond the files the reviewer chose.
 */

const MAX_FILES = 300;
const MAX_FILE_CHARS = 200_000;
const MAX_TOTAL_CHARS = 1_500_000;

const BINARY = /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|tgz|rar|7z|exe|dll|so|dylib|class|jar|woff2?|ttf|eot|mp3|mp4|mov|wav|avif|wasm|map)$/i;

interface RepoFile {
  path: string;
  content: string;
}

interface Finding {
  file: string;
  line: number;
  rule_id: string;
  title: string;
  severity: string;
  cwe: string;
  category: string;
  description: string;
  remediation: string;
  confidence: string;
  fix_effort: string;
}

interface Threat {
  category: string;
  surface: string;
  risk: string;
  question: string;
}

interface Report {
  target: string;
  generated_at: string;
  summary: string;
  severity_counts: Record<string, number>;
  risk_score: number;
  severity: string;
  verdict: string;
  findings: Finding[];
  files: { path: string; language: string; lines: number; findings: number }[];
  threat_model: {
    routes: { path: string; method: string; route: string }[];
    signals: Record<string, string[]>;
    threats: Threat[];
    assumptions: string[];
  };
  coverage: {
    files_scanned: number;
    files_skipped: { path: string; reason: string }[];
    skipped_count: number;
    languages: Record<string, number>;
    rules_evaluated: number;
    rules_fired: string[];
    confidence: string;
  };
  remediation_plan: { severity: string; fix: string; file: string }[];
  sarif: Record<string, unknown>;
}

function severityTone(severity: string) {
  const s = severity.toLowerCase();
  if (s === "critical") return "text-crit border-crit/30 bg-crit/10";
  if (s === "high") return "text-crit border-crit/25 bg-crit/[0.07]";
  if (s === "medium") return "text-warn border-warn/30 bg-warn/10";
  if (s === "low") return "text-dim border-line-strong bg-raise";
  return "text-faint border-line bg-raise";
}

function verdictTone(verdict: string) {
  const v = verdict.toLowerCase();
  if (v === "block") return "text-crit border-crit/30 bg-crit/10";
  if (v === "flag") return "text-warn border-warn/30 bg-warn/10";
  return "text-ok border-ok/30 bg-ok/10";
}

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const SAMPLE: RepoFile[] = [
  {
    path: "server.js",
    content: `const express = require("express");
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
`,
  },
  {
    path: "package.json",
    content: `{
  "name": "sample-service",
  "dependencies": {
    "express": "^4.18.2",
    "vm2": "^3.9.19",
    "left-pad": "*"
  }
}
`,
  },
  {
    path: "requirements.txt",
    content: `requests>=2.31
pycrypto
flask==3.0.0
`,
  },
];

export default function CodeReviewPage() {
  const { enforced, owned } = useEntitlements();
  const canUseRepository = !enforced || owned.has("vibe-code");
  const dirRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  const total = useMemo(() => files.reduce((n, f) => n + f.content.length, 0), [files]);

  const byFile = useMemo(() => {
    if (!report) return [];
    const groups = new Map<string, Finding[]>();
    for (const f of report.findings) {
      const list = groups.get(f.file) ?? [];
      list.push(f);
      groups.set(f.file, list);
    }
    return [...groups.entries()];
  }, [report]);

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const notes: string[] = [];
    const accepted: RepoFile[] = [];
    let running = total;

    for (const file of Array.from(list)) {
      const path = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/\\/g, "/");
      if (files.some((f) => f.path === path) || accepted.some((f) => f.path === path)) continue;
      if (BINARY.test(path)) {
        notes.push(`${path} · binary or asset, skipped`);
        continue;
      }
      if (file.size > MAX_FILE_CHARS) {
        notes.push(`${path} · larger than ${bytes(MAX_FILE_CHARS)}, skipped`);
        continue;
      }
      if (files.length + accepted.length >= MAX_FILES) {
        notes.push(`${path} · file limit reached`);
        continue;
      }
      if (running + file.size > MAX_TOTAL_CHARS) {
        notes.push(`${path} · repository budget reached`);
        continue;
      }
      const content = await file.text();
      running += content.length;
      accepted.push({ path, content });
    }

    setFiles((prev) => [...prev, ...accepted]);
    setSkipped(notes.slice(0, 8));
    setError("");
  };

  const run = async () => {
    if (files.length === 0) {
      setError("Choose a folder or at least one file first.");
      return;
    }
    setPhase("running");
    setError("");
    try {
      const res = await scanModule("vibe_code_security", "", {
        files,
        target: files.length === 1 ? files[0].path : `${files.length} files`,
      });
      const result = res.result as { report?: Report | null; error?: string };
      if (!result?.report) {
        setError(result?.error || "The review returned no report. Try a smaller snapshot.");
        setPhase("idle");
        return;
      }
      setReport(result.report);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The review could not run.");
      setPhase("idle");
    }
  };

  const downloadSarif = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report.sarif, null, 2)], {
      type: "application/sarif+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intellirity-vibe-code.sarif";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <FreeVibeScanner />

      {canUseRepository && (
        <>
      <div className="panel overflow-hidden rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            <FileCode2 className="size-4 text-steel" strokeWidth={1.5} />
            repository review · vibe-code security
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
            static · nothing executed
          </span>
        </div>

        <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[1fr,0.9fr]">
          <div>
            <p className="text-[13.5px] leading-relaxed text-dim">
              Review a repository for injection flaws, unsafe sinks, hardcoded
              secrets, risky dependencies and other code-level weaknesses. Each
              finding carries a file and line, a CWE, a severity and a fix. The
              report includes a derived threat model, coverage of what was read
              and a SARIF file for your pipeline.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => dirRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded border border-line-strong px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
              >
                <FolderOpen className="size-4" strokeWidth={1.6} />
                choose folder
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded border border-line-strong px-4 text-[13px] font-medium text-dim transition-colors hover:text-ink"
              >
                choose files
              </button>
              <button
                onClick={() => {
                  setFiles(SAMPLE);
                  setSkipped([]);
                  setReport(null);
                  setPhase("idle");
                  setError("");
                }}
                className="inline-flex h-10 items-center rounded px-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint transition-colors hover:text-dim"
              >
                use sample repo
              </button>
            </div>

            <input
              ref={dirRef}
              type="file"
              multiple
              className="hidden"
              {...({ webkitdirectory: "" } as Record<string, string>)}
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              <span>{files.length} file(s) selected</span>
              <span className="tabular-nums">{bytes(total)}</span>
            </div>
            <div className="mt-2 max-h-[200px] min-h-[92px] overflow-y-auto rounded border border-line bg-sunken">
              {files.length === 0 ? (
                <p className="p-4 font-mono text-[11.5px] leading-relaxed text-faint">
                  No files yet. A folder keeps the repository paths, which is
                  what the report uses to place each finding.
                </p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {files.map((f) => (
                    <li key={f.path} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-dim">
                        {f.path}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-faint">
                        {bytes(f.content.length)}
                      </span>
                      <button
                        aria-label={`Remove ${f.path}`}
                        onClick={() => setFiles((prev) => prev.filter((x) => x.path !== f.path))}
                        className="shrink-0 rounded p-1 text-faint transition-colors hover:text-crit"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.6} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {skipped.length > 0 && (
              <ul className="mt-2 space-y-1">
                {skipped.map((note) => (
                  <li key={note} className="font-mono text-[10.5px] text-faint">
                    {note}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={run}
                disabled={phase === "running" || files.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
              >
                {phase === "running" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldAlert className="size-4" strokeWidth={1.6} />
                )}
                {phase === "running" ? "reviewing…" : phase === "done" ? "review again" : "review repository"}
              </button>
              {files.length > 0 && (
                <button
                  onClick={() => {
                    setFiles([]);
                    setSkipped([]);
                    setReport(null);
                    setPhase("idle");
                    setError("");
                  }}
                  className="inline-flex h-10 items-center rounded border border-line-strong px-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-ink"
                >
                  clear
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-3 font-mono text-[11px] leading-relaxed text-warn">
                {error}
              </p>
            )}
          </div>

          <div className="rounded border border-line bg-sunken p-4">
            {report ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                    {report.generated_at}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em]",
                      verdictTone(report.verdict)
                    )}
                  >
                    {report.verdict}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line">
                  {[
                    { label: "risk", value: Math.round(report.risk_score * 100), suffix: "/100" },
                    { label: "findings", value: report.findings.length, suffix: "" },
                    { label: "files", value: report.coverage.files_scanned, suffix: "" },
                    { label: "skipped", value: report.coverage.skipped_count, suffix: "" },
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

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(report.severity_counts)
                    .filter(([, n]) => n > 0)
                    .map(([sev, n]) => (
                      <span
                        key={sev}
                        className={cn(
                          "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em]",
                          severityTone(sev)
                        )}
                      >
                        {n} {sev}
                      </span>
                    ))}
                  <span className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-faint">
                    coverage {report.coverage.confidence}
                  </span>
                </div>

                <p className="text-[12.5px] leading-relaxed text-dim">{report.summary}</p>

                <button
                  onClick={downloadSarif}
                  className="inline-flex h-9 items-center gap-2 rounded border border-line-strong px-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-ink"
                >
                  <Download className="size-3.5" strokeWidth={1.6} />
                  download sarif
                </button>

                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                  {report.coverage.rules_evaluated} rules · {report.coverage.rules_fired.length} fired
                </p>
              </div>
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <span className="grid size-11 place-items-center rounded-full border border-line bg-raise text-faint">
                  <ShieldCheck className="size-5" strokeWidth={1.5} />
                </span>
                <p className="mt-4 max-w-[34ch] text-[12.5px] leading-relaxed text-faint">
                  The summary appears here: risk score, severity counts, files
                  reviewed and what was skipped.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {report && (
        <>
          <div className="panel overflow-hidden rounded-lg">
            <div className="border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              findings · {report.findings.length} across {byFile.length} file(s)
            </div>
            {byFile.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-dim">
                No issues matched the rule set. Treat this as a baseline: a
                static review cannot prove the absence of a vulnerability.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {byFile.map(([path, list]) => (
                  <details key={path} open className="group">
                    <summary className="flex cursor-pointer items-center gap-3 px-5 py-3 font-mono text-[12px] text-ink hover:bg-white/[0.02]">
                      <ChevronDown className="size-3.5 shrink-0 text-faint transition-transform group-open:rotate-0 -rotate-90" />
                      <span className="min-w-0 flex-1 truncate">{path}</span>
                      <span className="shrink-0 text-[10.5px] uppercase tracking-[0.08em] text-faint">
                        {list.length} finding(s)
                      </span>
                    </summary>
                    <ul className="space-y-2 px-5 pb-4">
                      {list.map((f, i) => (
                        <li key={`${f.file}-${f.line}-${f.rule_id}-${i}`} className="rounded border border-line bg-sunken p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em]",
                                severityTone(f.severity)
                              )}
                            >
                              {f.severity}
                            </span>
                            <span className="text-[13px] font-medium text-ink">{f.title}</span>
                            <span className="font-mono text-[10px] text-faint">line {f.line}</span>
                            <span className="font-mono text-[10px] text-faint">{f.cwe}</span>
                            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.08em] text-faint">
                              {f.confidence} confidence · {f.fix_effort} effort
                            </span>
                          </div>
                          {f.description && (
                            <p className="mt-1.5 text-[12px] leading-relaxed text-dim">{f.description}</p>
                          )}
                          <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
                            Fix: {f.remediation}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                threat model · derived from the code
              </div>
              <div className="space-y-2 p-5">
                {report.threat_model.threats.map((t) => (
                  <div key={`${t.category}-${t.surface}`} className="rounded border border-line bg-sunken p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-dim">
                        {t.category}
                      </span>
                      <span className="text-[12px] text-ink">{t.surface}</span>
                      <span
                        className={cn(
                          "ml-auto rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em]",
                          severityTone(t.risk)
                        )}
                      >
                        {t.risk}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">{t.question}</p>
                  </div>
                ))}
                {report.threat_model.routes.length > 0 && (
                  <div className="pt-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                      routes found
                    </p>
                    <ul className="mt-2 space-y-1">
                      {report.threat_model.routes.slice(0, 12).map((r, i) => (
                        <li key={`${r.path}-${r.method}-${r.route}-${i}`} className="truncate font-mono text-[11px] text-dim">
                          <span className="text-faint">{r.method}</span> {r.route}
                          <span className="text-faint"> · {r.path}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                remediation plan · ordered
              </div>
              <ol className="space-y-2 p-5">
                {report.remediation_plan.map((p, i) => (
                  <li key={`${p.fix}-${i}`} className="flex gap-3">
                    <span className="mt-0.5 font-mono text-[10px] tabular-nums text-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] leading-relaxed text-dim">{p.fix}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-faint">
                        {p.severity} · {p.file}
                      </p>
                    </div>
                  </li>
                ))}
                {report.remediation_plan.length === 0 && (
                  <li className="text-[12.5px] text-dim">Nothing to fix from this rule set.</li>
                )}
              </ol>
              <div className="border-t border-line px-5 py-3">
                <p className="font-mono text-[10px] leading-relaxed text-faint">
                  {report.coverage.files_skipped.length > 0
                    ? `Skipped: ${report.coverage.files_skipped
                        .slice(0, 3)
                        .map((s) => `${s.path} (${s.reason})`)
                        .join("; ")}`
                    : "Every selected file was reviewed within the size limits."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}
