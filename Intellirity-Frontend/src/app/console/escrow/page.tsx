"use client";

import { useState } from "react";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "held" | "released" | "rejected";

interface Hold {
  id: string;
  agent: string;
  amount: number;
  status: Status;
}

function statusTone(s: Status) {
  if (s === "released") return "text-ok border-ok/30 bg-ok/10";
  if (s === "rejected") return "text-crit border-crit/30 bg-crit/10";
  return "text-warn border-warn/30 bg-warn/10";
}

export default function EscrowPage() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [agent, setAgent] = useState("agent-billing");
  const [amount, setAmount] = useState("12400");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const held = holds.filter((h) => h.status === "held").reduce((s, h) => s + h.amount, 0);

  async function create() {
    const a = agent.trim() || "agent-billing";
    const amt = Number(amount) || 0;
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await scanModule("autonomous_escrow", `${a} holds ${amt}`, {
        action: "create",
        agent_id: a,
        amount: amt,
      });
      const r = data.result as { escrow_id?: string; status?: string };
      setHolds((hs) => [
        {
          id: String(r.escrow_id ?? `ESC-${Date.now().toString(36).toUpperCase()}`),
          agent: a,
          amount: amt,
          status: "held",
        },
        ...hs,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, action: "verify" | "reject") {
    setError("");
    try {
      await scanModule("autonomous_escrow", `${id} ${action}`, {
        action,
        escrow_id: id,
      });
      setHolds((hs) =>
        hs.map((h) => (h.id === id ? { ...h, status: action === "verify" ? "released" : "rejected" } : h))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {[
          ["value in custody", `$${held.toLocaleString()}`, `${holds.filter((h) => h.status === "held").length} open holds`],
          ["released this session", `$${holds.filter((h) => h.status === "released").reduce((s, h) => s + h.amount, 0).toLocaleString()}`, "oracle verified"],
          ["rejected this session", `$${holds.filter((h) => h.status === "rejected").reduce((s, h) => s + h.amount, 0).toLocaleString()}`, "returned to maker"],
          ["total holds", String(holds.length), "this session"],
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

      <div className="panel rounded-lg p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
          create hold · live escrow
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="agent id"
            spellCheck={false}
            className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="amount"
            inputMode="numeric"
            className="h-10 w-full rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none sm:w-40"
          />
          <button
            onClick={create}
            disabled={busy}
            className="inline-flex h-10 items-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {busy ? "creating…" : "create hold"}
          </button>
        </div>
        {error !== "" && <p className="mt-2 font-mono text-[11.5px] text-crit">{error}</p>}
      </div>

      <div className="panel overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            custody queue
          </span>
          <span className="font-mono text-[11px] text-faint">value moves only on oracle verdict</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                <th className="px-5 py-3 font-normal">hold</th>
                <th className="px-3 py-3 font-normal">agent</th>
                <th className="px-3 py-3 font-normal">amount</th>
                <th className="px-3 py-3 font-normal">status</th>
                <th className="px-5 py-3 text-right font-normal">decision</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12.5px]">
              {holds.map((h) => (
                <tr key={h.id} className="border-b border-line/60 last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-ink">{h.id}</td>
                  <td className="px-3 py-3 text-dim">{h.agent}</td>
                  <td className="px-3 py-3 tabular-nums text-ink">{h.amount.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em]", statusTone(h.status))}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {h.status === "held" ? (
                      <span className="inline-flex gap-2">
                        <button
                          onClick={() => decide(h.id, "verify")}
                          className="h-8 rounded bg-ink px-3 text-[12px] font-medium text-bg transition-colors hover:bg-white"
                        >
                          Release
                        </button>
                        <button
                          onClick={() => decide(h.id, "reject")}
                          className="h-8 rounded border border-line-strong px-3 text-[12px] font-medium transition-colors hover:border-ink/40"
                        >
                          Deny
                        </button>
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-faint">decided · logged</span>
                    )}
                  </td>
                </tr>
              ))}
              {holds.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 font-mono text-[12px] text-faint">
                    No holds this session. Create your first hold above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
          every decision hits the live escrow brain
        </div>
      </div>
    </div>
  );
}
