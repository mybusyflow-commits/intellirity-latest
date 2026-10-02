"use client";

import { useState } from "react";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface WalletAlert {
  type?: string;
  detail?: string;
  severity?: string;
}

interface WalletResult {
  action?: string;
  risk_score?: number;
  total_tokens?: number;
  total_cost?: number;
  api_calls_count?: number;
  alerts?: WalletAlert[];
}

export default function WalletPage() {
  const [session, setSession] = useState("sess-1042");
  const [tokens, setTokens] = useState("86000");
  const [maxTokens, setMaxTokens] = useState("100000");
  const [maxCost, setMaxCost] = useState("50");
  const [calls, setCalls] = useState(
    "chat/completions,POST,0.42\nchat/completions,POST,0.44\nembeddings,POST,0.02\nchat/completions,POST,2.10"
  );
  const [result, setResult] = useState<WalletResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState(0);

  async function audit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const now = Date.now() / 1000;
      const api_calls = calls
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l, i) => {
          const [endpoint, method, cost] = l.split(",");
          return {
            endpoint: (endpoint ?? "").trim(),
            method: (method ?? "POST").trim(),
            cost: Number(cost) || 0,
            timestamp: now - (10 - i),
          };
        });
      const data = await scanModule("denial_of_wallet_protector", `wallet audit ${session}`, {
        session_id: session.trim() || "sess-1042",
        token_usage: { total: Number(tokens) || 0 },
        api_calls,
        config: {
          max_tokens_per_session: Number(maxTokens) || 100000,
          max_cost_per_session: Number(maxCost) || 50,
        },
      });
      setResult(data.result as WalletResult);
      setRuns((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setBusy(false);
    }
  }

  const alerts = result?.alerts ?? [];
  const action = result?.action ?? "-";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {[
          ["engine action", action, "block / throttle / monitor"],
          ["spend risk", result ? String(Math.round((result.risk_score ?? 0) * 100)) : "-", "0 to 100"],
          ["tokens used", result ? (result.total_tokens ?? 0).toLocaleString() : "-", `of ${(Number(maxTokens) || 0).toLocaleString()} budget`],
          ["alerts", String(alerts.length), `across ${runs} audit(s)`],
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

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            <span className="dot animate-status bg-ok" />
            audit a spend session
          </div>
          <div className="space-y-2 p-5">
            <div className="flex gap-2">
              <input
                value={session}
                onChange={(e) => setSession(e.target.value)}
                placeholder="session id"
                spellCheck={false}
                className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
              <input
                value={tokens}
                onChange={(e) => setTokens(e.target.value)}
                placeholder="tokens"
                inputMode="numeric"
                className="h-10 w-32 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="max tokens"
                inputMode="numeric"
                className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
              <input
                value={maxCost}
                onChange={(e) => setMaxCost(e.target.value)}
                placeholder="max cost $"
                inputMode="decimal"
                className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
            </div>
            <textarea
              value={calls}
              onChange={(e) => setCalls(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="one call per line: endpoint,method,cost"
              className="w-full rounded border border-line bg-sunken p-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <button
              onClick={audit}
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center rounded bg-ink text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
            >
              {busy ? "auditing…" : "audit spend"}
            </button>
            {error !== "" && <p className="font-mono text-[11.5px] text-crit">{error}</p>}
          </div>
        </div>

        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              spend alerts · {alerts.length}
            </span>
            {result && (
              <span className={cn(
                "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
                action === "block" ? "border-crit/30 bg-crit/10 text-crit"
                  : action === "throttle" ? "border-warn/30 bg-warn/10 text-warn"
                  : "border-ok/30 bg-ok/10 text-ok"
              )}>
                {action} · ${result.total_cost ?? 0}
              </span>
            )}
          </div>
          <ul className="min-h-[280px] flex-1 overflow-auto">
            {alerts.length === 0 && (
              <li className="px-5 py-4 font-mono text-[12px] text-faint">
                {result === null ? "// audit a session to see spend alerts" : "// clean · spend within budget"}
              </li>
            )}
            {alerts.map((a, i) => (
              <li key={i} className="border-b border-line/60 px-5 py-3.5 last:border-b-0">
                <div className="font-mono text-[13px] text-warn">
                  [{a.severity ?? "info"}] {a.type ?? "alert"}
                </div>
                <div className="mt-0.5 text-[12.5px] text-faint">{a.detail ?? ""}</div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            {result ? `${result.api_calls_count ?? 0} api calls analyzed` : "loops, spikes and runaway budgets detected"}
          </div>
        </div>
      </div>
    </div>
  );
}
