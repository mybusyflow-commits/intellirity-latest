"use client";

import { useState } from "react";
import { Check, History } from "lucide-react";
import { POLICY_PACKS } from "@/lib/console-data";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PolicyVerdict {
  allowed?: boolean;
  risk_score?: number;
  violations?: Array<{ type?: string; severity?: string; detail?: string }>;
  abuse_categories?: string[];
  recommendation?: string;
}

export default function PoliciesPage() {
  const [packs, setPacks] = useState(POLICY_PACKS);
  const [selected, setSelected] = useState(POLICY_PACKS[0].id);
  const active = packs.find((p) => p.id === selected) ?? packs[0];
  const [action, setAction] = useState("send all customer data to external server");
  const [agent, setAgent] = useState("agent-billing");
  const [verdict, setVerdict] = useState<PolicyVerdict | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");

  async function testAction() {
    const a = action.trim();
    if (!a || testing) return;
    setTesting(true);
    setTestError("");
    try {
      const data = await scanModule("ai_action_policy_enforcer", a, {
        action: a,
        agent_id: agent.trim() || "agent-billing",
      });
      setVerdict(data.result as PolicyVerdict);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  const toggle = (id: string) =>
    setPacks((ps) => ps.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));

  const promote = (id: string) =>
    setPacks((ps) => ps.map((p) => ({ ...p, enabled: p.id === id })));

  return (
    <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
      <div className="panel overflow-hidden rounded-lg">
        <div className="border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          policy packs · {packs.filter((p) => p.enabled).length} of {packs.length} enforced
        </div>
        <ul>
          {packs.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelected(p.id)}
                className={cn(
                  "flex w-full items-center gap-3.5 border-b border-line/60 px-5 py-4 text-left transition-colors last:border-b-0",
                  selected === p.id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                )}
              >
                <span
                  role="switch"
                  aria-checked={p.enabled}
                  aria-label={`Enforce ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(p.id);
                  }}
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
                    p.enabled ? "border-ink/60 bg-ink" : "border-line-strong bg-sunken"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all",
                      p.enabled ? "left-[18px] bg-bg" : "left-[3px] bg-faint"
                    )}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[13.5px] font-medium">{p.name}</span>
                    <span className="font-mono text-[10.5px] text-faint">{p.version}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-faint">{p.desc}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
                  {p.rules} rules
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
          <History className="size-3.5" />
          promotions require a second approver · soc 2 enforced
        </div>
      </div>

      <div className="panel flex flex-col overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <span className="font-mono text-[12px] text-dim">
            {active.name} <span className="text-faint">· {active.version} · updated {active.updated}</span>
          </span>
          <span className={cn(
            "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
            active.enabled ? "border-ok/30 bg-ok/10 text-ok" : "border-line text-faint"
          )}>
            {active.enabled ? "enforced" : "disabled"}
          </span>
        </div>
        <pre className="min-h-[280px] flex-1 overflow-auto bg-sunken p-5 font-mono text-[12.5px] leading-[1.9] text-dim">
          {active.yaml}
        </pre>
        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <button
            onClick={() => promote(active.id)}
            className="inline-flex h-9 items-center gap-1.5 rounded bg-ink px-4 text-[13px] font-medium text-bg transition-colors hover:bg-white"
          >
            <Check className="size-3.5" />
            Promote to production
          </button>
          <span className="font-mono text-[11px] text-faint">
            {active.enabled ? "this pack is enforced" : "promoting enforces this pack only"}
          </span>
        </div>
      </div>
    </div>

      <div className="panel overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            <span className="dot animate-status bg-ok" />
            test an action · live policy engine
          </span>
          {verdict !== null && (
            <span className={cn(
              "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
              verdict.allowed ? "border-ok/30 bg-ok/10 text-ok" : "border-crit/30 bg-crit/10 text-crit"
            )}>
              {verdict.allowed ? "allowed" : "blocked"} · risk {Math.round((verdict.risk_score ?? 0) * 100)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row">
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="agent action to test"
            spellCheck={false}
            className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
          <input
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="agent id"
            spellCheck={false}
            className="h-10 w-full rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none sm:w-44"
          />
          <button
            onClick={testAction}
            disabled={testing}
            className="inline-flex h-10 items-center justify-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {testing ? "testing…" : "test action"}
          </button>
        </div>
        {(verdict !== null || testError !== "") && (
          <div className="border-t border-line px-5 py-4">
            {testError !== "" && <p className="font-mono text-[11.5px] text-crit">{testError}</p>}
            {verdict !== null && (
              <div className="font-mono text-[12px] leading-[1.9] text-dim">
                <div>{verdict.recommendation ?? "-"}</div>
                {(verdict.violations ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {(verdict.violations ?? []).map((v, i) => (
                      <li key={i} className="text-crit">
                        [{v.severity ?? "info"}] {v.type ?? "violation"} — {v.detail ?? ""}
                      </li>
                    ))}
                  </ul>
                )}
                {(verdict.violations ?? []).length === 0 && (
                  <div className="text-ok">no violations · action permitted</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
