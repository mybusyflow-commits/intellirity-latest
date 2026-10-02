"use client";

import { useState } from "react";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Anomaly {
  type?: string;
  detail?: string;
  severity?: string;
}

interface SessionResult {
  risk_score?: number;
  risk_level?: string;
  anomalies_detected?: number;
  anomalies?: Anomaly[];
  behavioral_drift?: boolean;
  recommendation?: string;
}

interface McpResult {
  status?: string;
  risk_score?: number;
  servers_checked?: number;
  tool_calls_checked?: number;
  findings?: Array<{ type?: string; detail?: string; severity?: string }>;
}

export default function BehaviorPage() {
  const [agent, setAgent] = useState("agent-billing");
  const [session, setSession] = useState("sess-1042");
  const [history, setHistory] = useState("read:docs/invoices\nread:db.customers\ndelete:/etc/passwd");
  const [sessRes, setSessRes] = useState<SessionResult | null>(null);
  const [sessBusy, setSessBusy] = useState(false);
  const [sessError, setSessError] = useState("");

  const [tools, setTools] = useState("http.post:evil-collector.io\nfile.read:secrets.env");
  const [servers, setServers] = useState("fs-local, web-fetch");
  const [mcpRes, setMcpRes] = useState<McpResult | null>(null);
  const [mcpBusy, setMcpBusy] = useState(false);
  const [mcpError, setMcpError] = useState("");

  async function scoreSession() {
    const a = agent.trim() || "agent-billing";
    if (sessBusy) return;
    setSessBusy(true);
    setSessError("");
    try {
      const items = history
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [action_type, ...rest] = l.split(":");
          return { action_type: action_type.trim(), target: rest.join(":").trim() };
        });
      const data = await scanModule("behavioral_analysis_engine", `${a} session`, {
        agent_id: a,
        session_id: session.trim(),
        current_action: items[items.length - 1] ?? {},
        session_history: items,
      });
      setSessRes(data.result as SessionResult);
    } catch (e) {
      setSessError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setSessBusy(false);
    }
  }

  async function checkMcp() {
    if (mcpBusy) return;
    setMcpBusy(true);
    setMcpError("");
    try {
      const calls = tools
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [tool, ...rest] = l.split(":");
          return { tool: tool.trim(), target: rest.join(":").trim() };
        });
      const data = await scanModule("mcp_security_monitor", "mcp audit", {
        tool_calls: calls,
        mcp_servers: servers.split(",").map((s) => s.trim()).filter(Boolean),
        agent_permissions: ["fs.read", "web.fetch"],
      });
      setMcpRes(data.result as McpResult);
    } catch (e) {
      setMcpError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setMcpBusy(false);
    }
  }

  const sessAnoms = sessRes?.anomalies ?? [];
  const mcpFindings = mcpRes?.findings ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {[
          ["session risk", sessRes ? String(Math.round((sessRes.risk_score ?? 0) * 100)) : "-", sessRes?.risk_level ?? "not scored"],
          ["session anomalies", String(sessRes?.anomalies_detected ?? "-"), sessRes?.behavioral_drift ? "drift detected" : "no drift"],
          ["mcp status", mcpRes?.status ?? "-", `${mcpRes?.tool_calls_checked ?? 0} calls checked`],
          ["mcp findings", String(mcpFindings.length), `${mcpRes?.servers_checked ?? 0} servers checked`],
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
            score an agent session
          </div>
          <div className="space-y-2 p-5">
            <div className="flex gap-2">
              <input
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                placeholder="agent id"
                spellCheck={false}
                className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
              <input
                value={session}
                onChange={(e) => setSession(e.target.value)}
                placeholder="session id"
                spellCheck={false}
                className="h-10 w-36 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
            </div>
            <textarea
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="one action per line, action:target"
              className="w-full rounded border border-line bg-sunken p-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <button
              onClick={scoreSession}
              disabled={sessBusy}
              className="inline-flex h-10 w-full items-center justify-center rounded bg-ink text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
            >
              {sessBusy ? "scoring…" : "score session"}
            </button>
            {sessError !== "" && <p className="font-mono text-[11.5px] text-crit">{sessError}</p>}
            <ul className="space-y-1 pt-1">
              {sessAnoms.length === 0 && (
                <li className="font-mono text-[12px] text-faint">
                  {sessRes === null ? "// score a session to see anomalies" : "// clean · behavior within parameters"}
                </li>
              )}
              {sessAnoms.map((a, i) => (
                <li key={i} className="font-mono text-[12px] text-warn">
                  [{a.severity ?? "info"}] {a.type ?? "anomaly"} — {a.detail ?? ""}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              <span className="dot animate-status bg-ok" />
              audit mcp tool use
            </span>
            {mcpRes?.status && (
              <span className={cn(
                "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
                mcpRes.status === "clean" ? "border-ok/30 bg-ok/10 text-ok" : "border-warn/30 bg-warn/10 text-warn"
              )}>
                {mcpRes.status}
              </span>
            )}
          </div>
          <div className="space-y-2 p-5">
            <textarea
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="one tool call per line, tool:target"
              className="w-full rounded border border-line bg-sunken p-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <input
              value={servers}
              onChange={(e) => setServers(e.target.value)}
              placeholder="mcp servers, comma separated"
              spellCheck={false}
              className="h-10 w-full rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <button
              onClick={checkMcp}
              disabled={mcpBusy}
              className="inline-flex h-10 w-full items-center justify-center rounded bg-ink text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
            >
              {mcpBusy ? "auditing…" : "audit tool calls"}
            </button>
            {mcpError !== "" && <p className="font-mono text-[11.5px] text-crit">{mcpError}</p>}
            <ul className="space-y-1 pt-1">
              {mcpFindings.length === 0 && (
                <li className="font-mono text-[12px] text-faint">
                  {mcpRes === null ? "// audit tool calls to see findings" : "// clean · no risky tool use"}
                </li>
              )}
              {mcpFindings.map((f, i) => (
                <li key={i} className="font-mono text-[12px] text-warn">
                  [{f.severity ?? "info"}] {f.type ?? "finding"} — {f.detail ?? ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
