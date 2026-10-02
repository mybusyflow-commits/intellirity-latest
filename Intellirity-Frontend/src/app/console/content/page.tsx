"use client";

import { useState } from "react";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ContentFinding {
  category?: string;
  severity?: string;
  detail?: string;
  score?: number;
}

interface ContentResult {
  verdict?: string;
  risk_score?: number;
  findings?: ContentFinding[];
  recommendation?: string;
}

const CATEGORIES = [
  { id: "spam", name: "Spam & scams", desc: "Bulk, phishing and fraud text" },
  { id: "abuse", name: "Abuse & hate", desc: "Harassment, hate and threats" },
  { id: "sexual", name: "Sexual content", desc: "Adult and exploitative material" },
  { id: "self-harm", name: "Self-harm", desc: "Suicide and injury content" },
  { id: "violence", name: "Violence", desc: "Gore and extremist content" },
];

export default function ContentPage() {
  const [text, setText] = useState("Congratulations! You have won a free prize. Click here to claim now!!!");
  const [direction, setDirection] = useState("input");
  const [result, setResult] = useState<ContentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState(0);

  async function moderate() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await scanModule("content_moderation", t, { direction });
      setResult(data.result as ContentResult);
      setRuns((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moderation failed");
    } finally {
      setBusy(false);
    }
  }

  const verdict = result?.verdict ?? "-";
  const findings = result?.findings ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {[
          ["verdict", verdict, "live moderation"],
          ["risk", result ? String(Math.round((result.risk_score ?? 0) * 100)) : "-", "0 to 100"],
          ["categories hit", String(findings.length), `across ${runs} check(s)`],
          ["direction", direction, "input or output"],
        ].map(([k, v, d]) => (
          <div key={k} className="bg-bg px-5 py-5">
            <div className="font-mono text-[24px] font-medium tabular-nums">{v}</div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
              <span className="text-faint">{k}</span>
              <span className="text-dim">{d}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              <span className="dot animate-status bg-ok" />
              moderate text
            </span>
            <div className="flex gap-1">
              {(["input", "output"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={cn(
                    "rounded border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors",
                    direction === d ? "border-ink/50 bg-white/[0.05] text-ink" : "border-line text-faint hover:text-dim"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              spellCheck={false}
              placeholder="paste user content or model output"
              className="w-full rounded border border-line bg-sunken p-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <button
              onClick={moderate}
              disabled={busy}
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded bg-ink text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
            >
              {busy ? "checking…" : "run moderation"}
            </button>
            {error !== "" && <p className="mt-2 font-mono text-[11.5px] text-crit">{error}</p>}
            {result?.recommendation && (
              <p className="mt-3 font-mono text-[12px] leading-[1.8] text-dim">{result.recommendation}</p>
            )}
          </div>
        </div>

        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            categories · 7 scored
          </div>
          <ul>
            {CATEGORIES.map((c) => {
              const hit = findings.find(
                (f) => (f.category ?? "").toLowerCase().includes(c.id)
              );
              return (
                <li key={c.id} className="flex items-center gap-3.5 border-b border-line/60 px-5 py-4 last:border-b-0">
                  <span className={cn("dot", hit ? "bg-crit" : "bg-ok")} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[13.5px] font-medium">{c.name}</span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-faint">{c.desc}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
                    {hit ? `hit · ${Math.round((hit.score ?? 0) * 100)}` : "clear"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            {findings.length > 0 ? `${findings.length} categor(ies) flagged by the engine` : "no categories flagged yet"}
          </div>
        </div>
      </div>
    </div>
  );
}
