"use client";

import { useState } from "react";
import { runScan, scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SupplyResult {
  verdict?: string;
  risk_score?: number;
  findings?: Array<{ type?: string; detail?: string; severity?: string }>;
  recommendation?: string;
}

interface Endpoint {
  id: string;
  kind: string;
  paused: boolean;
  lastRisk: number | null;
  lastTime: string;
  scanning: boolean;
}

const STARTERS: Endpoint[] = [
  { id: "gpt-prod-01", kind: "OpenAI", paused: false, lastRisk: null, lastTime: "-", scanning: false },
  { id: "claude-prod", kind: "Anthropic", paused: false, lastRisk: null, lastTime: "-", scanning: false },
  { id: "chatbot-cust", kind: "Custom", paused: false, lastRisk: null, lastTime: "-", scanning: false },
];

export default function ModelsPage() {
  const [models, setModels] = useState<Endpoint[]>(STARTERS);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [src, setSrc] = useState("huggingface.co/acmeprod/llama-guard-8b");
  const [fmt, setFmt] = useState("safetensors");
  const [supply, setSupply] = useState<SupplyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [supplyError, setSupplyError] = useState("");

  async function verifySupply() {
    const s = src.trim();
    if (!s || verifying) return;
    setVerifying(true);
    setSupplyError("");
    try {
      const data = await scanModule("model_supply_chain_security", s, {
        model_source: s,
        model_format: fmt.trim() || "unknown",
      });
      setSupply(data.result as SupplyResult);
    } catch (e) {
      setSupplyError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  function add() {
    const id = draft.trim();
    if (!id) return;
    if (models.some((m) => m.id === id)) {
      setError("That endpoint is already registered.");
      return;
    }
    setError("");
    setModels((ms) => [...ms, { id, kind: "Custom", paused: false, lastRisk: null, lastTime: "-", scanning: false }]);
    setDraft("");
  }

  function togglePause(id: string) {
    setModels((ms) => ms.map((m) => (m.id === id ? { ...m, paused: !m.paused } : m)));
  }

  async function scan(id: string) {
    setModels((ms) => ms.map((m) => (m.id === id ? { ...m, scanning: true } : m)));
    setError("");
    try {
      const data = await runScan(id);
      setModels((ms) =>
        ms.map((m) =>
          m.id === id
            ? {
                ...m,
                scanning: false,
                lastRisk: Math.round(data.max_risk_score * 100),
                lastTime: new Date().toLocaleTimeString("en-GB", { hour12: false }),
              }
            : m
        )
      );
    } catch (e) {
      setModels((ms) => ms.map((m) => (m.id === id ? { ...m, scanning: false } : m)));
      setError(e instanceof Error ? e.message : "Scan failed");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-line bg-raise px-5 py-4 sm:flex-row">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="Register endpoint id, e.g. agent-billing"
          spellCheck={false}
          className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
        />
        <button
          onClick={add}
          className="inline-flex h-10 items-center justify-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
        >
          Register endpoint
        </button>
      </div>
      {error !== "" && <p className="mb-4 font-mono text-[11.5px] text-crit">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {models.map((m) => (
          <article key={m.id} className="panel card flex flex-col rounded-lg p-5">
            <div className="flex items-center gap-2.5">
              <span className={cn("dot", m.paused ? "bg-faint" : "bg-ok")} />
              <h2 className="truncate font-mono text-[15px] font-medium">{m.id}</h2>
              <span className={cn(
                "ml-auto shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
                m.paused ? "border-line text-faint" : "border-ok/30 bg-ok/10 text-ok"
              )}>
                {m.paused ? "paused" : "guarded"}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11.5px] text-faint">{m.kind}</div>

            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 font-mono">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-faint">last risk</dt>
                <dd className="mt-1 text-[14px] tabular-nums">
                  {m.lastRisk === null ? "-" : `${m.lastRisk}/100`}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-faint">last scan</dt>
                <dd className="mt-1 text-[14px] tabular-nums">{m.lastTime}</dd>
              </div>
            </dl>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => scan(m.id)}
                disabled={m.scanning || m.paused}
                className="inline-flex h-9 flex-1 items-center justify-center rounded bg-ink text-[12.5px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-50"
              >
                {m.scanning ? "scanning…" : "run scan"}
              </button>
              <button
                onClick={() => togglePause(m.id)}
                className="inline-flex h-9 items-center rounded border border-line-strong px-3.5 text-[12.5px] font-medium transition-colors hover:border-ink/40"
              >
                {m.paused ? "resume" : "pause"}
              </button>
            </div>
            <p className="mt-3 font-mono text-[11px] text-faint">
              {m.paused ? "paused by operator" : "scans run against the live engine"}
            </p>
          </article>
        ))}
      </div>
      <div className="panel mt-4 overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            <span className="dot animate-status bg-ok" />
            supply-chain verification · live engine
          </span>
          {supply?.verdict && (
            <span className={cn(
              "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
              supply.verdict === "block" ? "border-crit/30 bg-crit/10 text-crit"
                : supply.verdict === "flag" ? "border-warn/30 bg-warn/10 text-warn"
                : "border-ok/30 bg-ok/10 text-ok"
            )}>
              {supply.verdict} · risk {Math.round((supply.risk_score ?? 0) * 100)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row">
          <input
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="model source, e.g. huggingface.co/org/model"
            spellCheck={false}
            className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
          <input
            value={fmt}
            onChange={(e) => setFmt(e.target.value)}
            placeholder="format"
            spellCheck={false}
            className="h-10 w-full rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none sm:w-40"
          />
          <button
            onClick={verifySupply}
            disabled={verifying}
            className="inline-flex h-10 items-center justify-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {verifying ? "verifying…" : "verify model"}
          </button>
        </div>
        {(supply !== null || supplyError !== "") && (
          <div className="border-t border-line px-5 py-4">
            {supplyError !== "" && <p className="font-mono text-[11.5px] text-crit">{supplyError}</p>}
            {supply !== null && (
              <div className="font-mono text-[12px] leading-[1.9] text-dim">
                <div>{supply.recommendation ?? "-"}</div>
                {(supply.findings ?? []).length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {(supply.findings ?? []).map((f, i) => (
                      <li key={i} className="text-warn">
                        [{f.severity ?? "info"}] {f.type ?? "finding"} — {f.detail ?? ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-ok">no findings · source verified clean</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-4 font-mono text-[11px] text-faint">
        endpoints are workspace-local · scan results stream from the live engine
      </p>
    </div>
  );
}
