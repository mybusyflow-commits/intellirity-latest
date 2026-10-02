"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Terminal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScanRecord } from "@/lib/console-data";
import { runScan } from "@/lib/api";
import { cn } from "@/lib/utils";

type Phase = "idle" | "running" | "done";
type Profile = "full" | "injection" | "exfiltration" | "content" | "advanced" | "wallet";

const PROFILES: Record<Profile, { label: string; cmd: string; modules: string[] }> = {
  full: {
    label: "Full barrage",
    cmd: "intellirity scan --adversarial --deep --all-models",
    modules: ["jailbreak_injection_protection", "vibe_code_security", "data_loss_prevention", "advanced_threat_intelligence", "content_moderation", "denial_of_wallet_protector"],
  },
  injection: {
    label: "Injection",
    cmd: "intellirity scan --vectors injection --all-models",
    modules: ["jailbreak_injection_protection", "advanced_threat_intelligence"],
  },
  exfiltration: {
    label: "Exfiltration",
    cmd: "intellirity scan --vectors exfiltration --deep",
    modules: ["data_loss_prevention", "vibe_code_security"],
  },
  content: {
    label: "Content",
    cmd: "intellirity scan --vectors content --deep",
    modules: ["content_moderation"],
  },
  advanced: {
    label: "Advanced",
    cmd: "intellirity scan --vectors advanced --all-models",
    modules: ["advanced_threat_intelligence"],
  },
  wallet: {
    label: "Wallet",
    cmd: "intellirity scan --vectors wallet --deep",
    modules: ["denial_of_wallet_protector"],
  },
};

function toneOf(line: string) {
  if (line.startsWith("  [BLOCK]") || line.startsWith("  [CRIT]")) return "text-crit";
  if (line.startsWith("  [FLAG]") || line.startsWith("  [WARN]")) return "text-warn";
  if (line.startsWith("  [PASS]")) return "text-ok";
  return "text-dim";
}

function statusTone(s: ScanRecord["status"]) {
  if (s === "passed") return "text-ok border-ok/30 bg-ok/10";
  if (s === "failed") return "text-crit border-crit/30 bg-crit/10";
  return "text-warn border-warn/30 bg-warn/10";
}

function verdictTag(v: unknown): "BLOCK" | "FLAG" | "PASS" {
  const s = String(
    (v as { verdict?: string; action?: string })?.verdict ??
      (v as { action?: string })?.action ??
      ""
  ).toLowerCase();
  if (s === "block" || s === "deny") return "BLOCK";
  if (["flag", "review", "warn", "alert", "redact"].includes(s)) return "FLAG";
  return "PASS";
}

export default function ScannerPage() {
  const [profile, setProfile] = useState<Profile>("full");
  const [target, setTarget] = useState("https://api.openai.com/v1/chat/completions");
  const [typed, setTyped] = useState(PROFILES.full.cmd);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<string[]>(["// enter a target, then run a live scan"]);
  const [pct, setPct] = useState(0);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const switchProfile = (p: Profile) => {
    if (phase === "running") return;
    setProfile(p);
    setTyped(PROFILES[p].cmd);
    setPhase("idle");
    setPct(0);
    setLines(["// enter a target, then run a live scan"]);
  };

  const run = useCallback(async () => {
    const s = PROFILES[profile];
    const t = target.trim() || "https://api.openai.com/v1/chat/completions";
    setPhase("running");
    setPct(0);
    setLines([`→ target: ${t}`, "→ contacting Intellirity engine…"]);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      setPct(Math.min(92, Math.round(elapsed * 22)));
      if (phase !== "done") requestAnimationFrame(tick);
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
      let crit = 0;
      let warn = 0;
      for (const [key, raw] of mods) {
        const tag = verdictTag(raw);
        const risk = (raw as { risk_score?: number }).risk_score ?? 0;
        if (tag === "BLOCK") crit += 1;
        else if (tag === "FLAG") warn += 1;
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
      setHistory((h) => [
        {
          id: data.scan.id,
          profile: s.label,
          target: t,
          started: new Date().toLocaleTimeString("en-GB", { hour12: false }),
          duration: `${((performance.now() - start) / 1000).toFixed(1)}s`,
          crit,
          warn,
          status: crit > 0 ? "failed" : warn > 0 ? "attention" : "passed",
        },
        ...h,
      ]);
    } catch (e) {
      setLines((p) => [...p, "✕ engine unreachable. Is the backend running on :8000?"]);
      setPct(100);
      setPhase("done");
    }
  }, [profile, target, phase]);

  return (
    <div className="space-y-4">
      <div className="panel overflow-hidden rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <span className="flex items-center gap-2.5 font-mono text-[12px] text-dim">
            <Terminal className="size-4 text-steel" strokeWidth={1.5} />
            new scan · live engine
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
          <div className="font-mono text-[13px]">
            <span className="text-steel">sentinel</span>
            <span className="text-faint"> ~ $ </span>
            <span className="text-ink">{typed}</span>
            <span className="ml-1 inline-block h-4 w-[7px] animate-blink bg-steel align-middle" />
          </div>
          <label className="mt-4 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
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
            <span>{phase === "running" ? "scanning live controls…" : phase === "done" ? "report ready · saved to history" : "awaiting command"}</span>
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

      <div className="panel overflow-hidden rounded-lg">
        <div className="border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          scan history · this session
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                <th className="px-5 py-3 font-normal">scan</th>
                <th className="px-3 py-3 font-normal">profile</th>
                <th className="px-3 py-3 font-normal">target</th>
                <th className="px-3 py-3 font-normal">started</th>
                <th className="px-3 py-3 font-normal">duration</th>
                <th className="px-3 py-3 font-normal">findings</th>
                <th className="px-5 py-3 text-right font-normal">status</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12.5px]">
              {history.map((s) => (
                <tr key={s.id} className="border-b border-line/60 transition-colors last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-ink">{s.id}</td>
                  <td className="px-3 py-3 text-dim">{s.profile}</td>
                  <td className="max-w-[220px] truncate px-3 py-3 text-dim">{s.target}</td>
                  <td className="px-3 py-3 tabular-nums text-faint">{s.started}</td>
                  <td className="px-3 py-3 tabular-nums text-faint">{s.duration}</td>
                  <td className="px-3 py-3 tabular-nums">
                    <span className="text-crit">{s.crit} crit</span>
                    <span className="text-faint"> · </span>
                    <span className="text-warn">{s.warn} warn</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn("rounded border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em]", statusTone(s.status))}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 font-mono text-[12px] text-faint">
                    No scans yet this session. Run your first live scan above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
