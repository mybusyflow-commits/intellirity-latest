"use client";

import { useState } from "react";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FlowResult {
  status?: string;
  risk_score?: number;
  data_classification?: string;
  destinations_tracked?: number;
  flagged_destinations?: Array<{ domain?: string; reason?: string; severity?: string } | string>;
  reasoning_flags?: Array<{ flag?: string; detail?: string }>;
  tool_call_anomalies?: Array<{ flag?: string; detail?: string }>;
}

export default function FlowPage() {
  const [dataId, setDataId] = useState("customer-export-042");
  const [classification, setClassification] = useState("confidential");
  const [stages, setStages] = useState("app.acme.com\nwarehouse.acme.com\nanalytics-vendor.io");
  const [trusted, setTrusted] = useState("acme.com");
  const [blocked, setBlocked] = useState("analytics-vendor.io");
  const [result, setResult] = useState<FlowResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState(0);

  async function trace() {
    const id = dataId.trim();
    if (!id || busy) return;
    setBusy(true);
    setError("");
    try {
      const lines = stages.split("\n").map((s) => s.trim()).filter(Boolean);
      const data = await scanModule("data_flow_tracker", `${id} ${classification}`, {
        data_id: id,
        data_classification: classification,
        pipeline_stages: lines.map((domain, i) => ({ stage: `stage-${i + 1}`, domain })),
        trusted_domains: trusted.split(",").map((s) => s.trim()).filter(Boolean),
        blocked_domains: blocked.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setResult(data.result as FlowResult);
      setRuns((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trace failed");
    } finally {
      setBusy(false);
    }
  }

  const flagged = result?.flagged_destinations ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {[
          ["flow status", result?.status ?? "-", "live verdict"],
          ["risk", result ? String(Math.round((result.risk_score ?? 0) * 100)) : "-", "0 to 100"],
          ["destinations", String(result?.destinations_tracked ?? "-"), "tracked in pipeline"],
          ["flagged", String(flagged.length), `across ${runs} trace(s)`],
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
            trace a data pipeline
          </div>
          <div className="space-y-2 p-5">
            <div className="flex gap-2">
              <input
                value={dataId}
                onChange={(e) => setDataId(e.target.value)}
                placeholder="data id"
                spellCheck={false}
                className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="h-10 rounded border border-line bg-sunken px-2 font-mono text-[12.5px] text-ink focus:border-line-strong focus:outline-none"
              >
                {["public", "internal", "confidential", "restricted"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <textarea
              value={stages}
              onChange={(e) => setStages(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="one destination domain per line"
              className="w-full rounded border border-line bg-sunken p-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                value={trusted}
                onChange={(e) => setTrusted(e.target.value)}
                placeholder="trusted domains, comma separated"
                spellCheck={false}
                className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
              <input
                value={blocked}
                onChange={(e) => setBlocked(e.target.value)}
                placeholder="blocked domains"
                spellCheck={false}
                className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
            </div>
            <button
              onClick={trace}
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center rounded bg-ink text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
            >
              {busy ? "tracing…" : "trace flow"}
            </button>
            {error !== "" && <p className="font-mono text-[11.5px] text-crit">{error}</p>}
          </div>
        </div>

        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            flagged destinations · {flagged.length}
          </div>
          <ul className="min-h-[280px] flex-1 overflow-auto">
            {flagged.length === 0 && (
              <li className="px-5 py-4 font-mono text-[12px] text-faint">
                {result === null ? "// trace a pipeline to see flagged hops" : "// clean · no hops flagged"}
              </li>
            )}
            {flagged.map((f, i) => {
              const domain = typeof f === "string" ? f : (f.domain ?? "unknown hop");
              const reason = typeof f === "string" ? "" : (f.reason ?? "");
              return (
                <li key={i} className="border-b border-line/60 px-5 py-3.5 last:border-b-0">
                  <div className={cn("font-mono text-[13px]", "text-warn")}>{domain}</div>
                  {reason !== "" && <div className="mt-0.5 text-[12.5px] text-faint">{reason}</div>}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            classification: {result?.data_classification ?? "-"} · reasoning + tool-call checks included
          </div>
        </div>
      </div>
    </div>
  );
}
