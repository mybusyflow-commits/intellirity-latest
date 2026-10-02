"use client";

import { useState } from "react";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Anomaly {
  type?: string;
  detail?: string;
  severity?: string;
}

export default function AnomaliesPage() {
  const [text, setText] = useState(
    "create_invoice, send_email, create_invoice, send_email, create_invoice, send_email"
  );
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [risk, setRisk] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState(0);

  async function score() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError("");
    try {
      const actions = t
        .split(/[,→\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((type) => ({ type, cost: 0.4, duration: 12 }));
      const data = await scanModule("workflow_anomaly_detector", t, {
        workflow_id: `live-${Date.now()}`,
        actions,
        config: { max_iterations: 20, max_spend: 10, timeout_seconds: 60 },
      });
      const r = data.result as {
        risk_score?: number;
        anomalies?: Anomaly[];
        anomalies_detected?: number;
        recommendation?: string;
      };
      setRisk(Number(r.risk_score ?? 0));
      setAnomalies(Array.isArray(r.anomalies) ? r.anomalies : []);
      setRuns((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <div className="panel rounded-lg p-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            submit an action sequence
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="create_invoice, send_email, …"
            className="mt-3 w-full rounded border border-line bg-sunken p-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
          <p className="mt-2 font-mono text-[11px] text-faint">
            Comma-separated. A repeating loop pattern triggers the detector.
          </p>
          <button
            onClick={score}
            disabled={busy}
            className="mt-3 inline-flex h-10 items-center rounded bg-ink px-5 font-mono text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {busy ? "scoring…" : "score sequence"}
          </button>
          {error !== "" && <p className="mt-2 font-mono text-[11.5px] text-crit">{error}</p>}
        </div>

        <div className="panel rounded-lg p-5">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            <span>anomaly report · live</span>
            <span className="tabular-nums text-dim">
              {risk === null ? "no runs yet" : `risk ${risk} · ${runs} run${runs === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {anomalies.slice(0, 8).map((a, i) => (
              <div key={i} className="rounded border border-line bg-sunken px-3.5 py-2.5">
                <div className="flex items-center gap-2 font-mono text-[12px]">
                  <span className={cn(
                    (a.severity ?? "") === "high" || (a.severity ?? "") === "critical" ? "text-crit" : "text-warn"
                  )}>
                    {(a.severity ?? "med").toUpperCase()}
                  </span>
                  <span className="text-ink">{a.type ?? "anomaly"}</span>
                </div>
                <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-faint">{a.detail ?? ""}</p>
              </div>
            ))}
            {anomalies.length === 0 && (
              <p className="font-mono text-[12px] text-faint">
                Run a sequence to see live anomaly detection from the workflow brain.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
