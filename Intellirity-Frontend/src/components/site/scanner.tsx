"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Terminal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { runScan } from "@/lib/api";
import { cn } from "@/lib/utils";

type Phase = "idle" | "running" | "done";
type Profile = "full" | "injection" | "exfiltration";

const PROFILES: Record<Profile, { label: string; cmd: string; modules: string[] }> = {
  full: {
    label: "Full barrage",
    cmd: "intellirity scan --adversarial --deep --all-models",
    modules: ["jailbreak_injection_protection", "vibe_code_security", "data_loss_prevention"],
  },
  injection: {
    label: "Injection",
    cmd: "intellirity scan --vectors injection --all-models",
    modules: ["jailbreak_injection_protection"],
  },
  exfiltration: {
    label: "Exfiltration",
    cmd: "intellirity scan --vectors exfiltration --deep",
    modules: ["data_loss_prevention", "vibe_code_security"],
  },
};

function toneOf(line: string) {
  if (line.startsWith("  [BLOCK]")) return "text-crit";
  if (line.startsWith("  [FLAG]")) return "text-warn";
  if (line.startsWith("  [ALLOW]")) return "text-ok";
  return "text-dim";
}

function verdictTag(v: unknown): "BLOCK" | "FLAG" | "ALLOW" {
  const s = String(
    (v as { verdict?: string; action?: string })?.verdict ??
      (v as { action?: string })?.action ??
      ""
  ).toLowerCase();
  if (s === "block" || s === "deny") return "BLOCK";
  if (["flag", "review", "warn", "alert", "redact"].includes(s)) return "FLAG";
  return "ALLOW";
}

export function Scanner() {
  const [profile, setProfile] = useState<Profile>("full");
  const [target, setTarget] = useState("https://api.openai.com/v1/chat/completions");
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<string[]>(["// enter a target, then run a live scan"]);
  const [pct, setPct] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const switchProfile = (p: Profile) => {
    if (phase === "running") return;
    setProfile(p);
    setPhase("idle");
    setPct(0);
    setLines(["// enter a target, then run a live scan"]);
  };

  async function run() {
    if (phase === "running") return;
    const s = PROFILES[profile];
    const t = target.trim() || "https://api.openai.com/v1/chat/completions";
    setPhase("running");
    setPct(0);
    setLines([`→ target: ${t}`, "→ contacting Intellirity engine…"]);
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      setPct(Math.min(92, Math.round(elapsed * 22)));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    try {
      const data = await runScan(t, s.modules);
      const mods = Object.entries(data.module_results ?? {});
      const report: string[] = [
        "",
        `SCAN REPORT · ${data.scan.id} · risk ${(data.max_risk_score * 10).toFixed(1)}`,
        "─────────────────────────────────────────",
      ];
      for (const [key, raw] of mods) {
        const tag = verdictTag(raw);
        const risk = (raw as { risk_score?: number }).risk_score ?? 0;
          report.push(`  [${tag}] ${key} · risk ${risk}`);
        const f = (raw as { findings?: unknown[] }).findings;
        if (Array.isArray(f)) {
          for (const item of f.slice(0, 2)) {
            const rec = item as { title?: unknown; type?: unknown };
            const text = typeof item === "string" ? item : (rec?.title ?? rec?.type ?? JSON.stringify(item));
            report.push(`    · ${String(text).slice(0, 90)}`);
          }
        }
      }
      report.push("", `  verdict · ${data.total_findings} finding(s) across ${mods.length} controls`);
      setLines((p) => [...p, ...report]);
      setPct(100);
      setPhase("done");
    } catch {
      setLines((p) => [...p, "✕ engine unreachable. Is the backend running on :8000?"]);
      setPct(100);
      setPhase("done");
    }
  }

  return (
    <div className="panel overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <span className="flex items-center gap-2.5 font-mono text-[12px] text-dim">
          <Terminal className="size-4 text-steel" strokeWidth={1.5} />
          live adversarial scan
        </span>
        <Tabs value={profile} onValueChange={(v) => switchProfile(v as Profile)}>
          <TabsList>
            {(Object.keys(PROFILES) as Profile[]).map((p) => (
              <TabsTrigger key={p} value={p} disabled={phase === "running"}>
                {PROFILES[p].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="p-5 md:p-6">
        <label className="block font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
          target endpoint
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="https://api.example.com/v1/..."
            spellCheck={false}
            className="mt-2 h-10 w-full rounded border border-line bg-sunken px-3 font-mono text-[12.5px] normal-case tracking-normal text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
        </label>
        <div className="mt-5 h-px bg-line">
          <div className="h-px bg-steel transition-[width] duration-150" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2.5 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
          <span>{phase === "running" ? "scanning live controls…" : phase === "done" ? "report ready" : "awaiting command"}</span>
          <span className="tabular-nums text-dim">{Math.round(pct)}%</span>
        </div>
        <pre className="mt-4 max-h-[280px] min-h-[210px] overflow-y-auto rounded border border-line bg-sunken p-4 font-mono text-[12px] leading-[1.9]">
          {lines.map((l, i) => (
            <div key={i} className={cn("whitespace-pre-wrap", toneOf(l))}>{l || " "}</div>
          ))}
        </pre>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            onClick={run}
            disabled={phase === "running"}
            className="inline-flex h-10 items-center gap-2 rounded bg-ink px-5 font-mono text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {phase === "running" && <Loader2 className="size-4 animate-spin" />}
            {phase === "running" ? "running…" : phase === "done" ? "run again" : "run live scan"}
          </button>
          <span className="font-mono text-[11px] text-faint">results stream from the live engine</span>
        </div>
      </div>
    </div>
  );
}
