"use client";

import { useState } from "react";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Certificate {
  id?: string;
  status?: string;
  signature?: string;
  algorithm?: string;
  data?: {
    human_id?: string;
    action_scope?: string[];
    timestamp?: string;
    expiry?: number;
  };
}

interface Verification {
  approved?: boolean;
  within_scope?: boolean;
  certificate_valid?: boolean;
  proposed_action_hash?: string;
}

interface ProofResult {
  certificate?: Certificate | null;
  action_verification?: Verification | null;
  message?: string;
  error?: string;
}

export default function ProofPage() {
  const [human, setHuman] = useState("priya.ops");
  const [instruction, setInstruction] = useState("pay invoice INV-2042 up to $12,400");
  const [scope, setScope] = useState("payments.read, payments.hold");
  const [expiry, setExpiry] = useState("30");
  const [proposed, setProposed] = useState("payments.hold INV-2042 $12,400");
  const [result, setResult] = useState<ProofResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [certs, setCerts] = useState(0);

  async function issue() {
    const h = human.trim();
    const ins = instruction.trim();
    if (!h || !ins || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await scanModule("verifiable_proof_of_intent", ins, {
        human_id: h,
        instruction: ins,
        action_scope: scope.split(",").map((s) => s.trim()).filter(Boolean),
        expiry_minutes: Number(expiry) || 30,
        proposed_action: proposed.trim(),
      });
      setResult(data.result as ProofResult);
      setCerts((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Issue failed");
    } finally {
      setBusy(false);
    }
  }

  const cert = result?.certificate ?? null;
  const v = result?.action_verification ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {[
          ["certificates issued", String(certs), "this session"],
          ["certificate", cert?.id ?? "-", cert?.status ?? "none yet"],
          ["in scope", v ? (v.within_scope ? "yes" : "no") : "-", "proposed action"],
          ["approved", v ? (v.approved ? "yes" : "no") : "-", "expiry + scope check"],
        ].map(([k, val, d]) => (
          <div key={k} className="bg-bg px-5 py-5">
            <div className="truncate font-mono text-[20px] font-medium tabular-nums">{val}</div>
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
            issue intent certificate
          </div>
          <div className="space-y-2 p-5">
            <input
              value={human}
              onChange={(e) => setHuman(e.target.value)}
              placeholder="human id"
              spellCheck={false}
              className="h-10 w-full rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="what the human authorized"
              className="w-full rounded border border-line bg-sunken p-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="action scope, comma separated"
                spellCheck={false}
                className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
              <input
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="mins"
                inputMode="numeric"
                className="h-10 w-24 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
            </div>
            <input
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder="proposed agent action to verify"
              spellCheck={false}
              className="h-10 w-full rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <button
              onClick={issue}
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center rounded bg-ink text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
            >
              {busy ? "issuing…" : "issue + verify"}
            </button>
            {error !== "" && <p className="font-mono text-[11.5px] text-crit">{error}</p>}
          </div>
        </div>

        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              certificate
            </span>
            {v && (
              <span className={cn(
                "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
                v.approved ? "border-ok/30 bg-ok/10 text-ok" : "border-crit/30 bg-crit/10 text-crit"
              )}>
                {v.approved ? "approved" : "rejected"}
              </span>
            )}
          </div>
          <pre className="min-h-[280px] flex-1 overflow-auto bg-sunken p-5 font-mono text-[12px] leading-[1.9] text-dim">
            {result === null
              ? "// issue a certificate to see the signed intent"
              : JSON.stringify({ certificate: cert, action_verification: v, message: result.message }, null, 2)}
          </pre>
          <div className="border-t border-line px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            sha-256 signed · hash-chained into the audit ledger
          </div>
        </div>
      </div>
    </div>
  );
}
