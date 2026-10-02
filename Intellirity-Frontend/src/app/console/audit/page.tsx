"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ledger } from "@/lib/api";

type Filter = "ALL" | "system" | "human";

interface Entry {
  record_id: string;
  merkle_hash: string;
  ai_decision: string;
  actor: string;
  time: string;
}

export default function AuditPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState("approve_refund order_id=88421 amount=12400");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [root, setRoot] = useState("");

  async function seal() {
    const t = decision.trim();
    if (!t || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await ledger("log", {
        ai_decision: t,
        prompt: t,
        reasoning_trace: "sealed from console",
        metadata: { actor: "human" },
      });
      setEntries((prev) => [
        {
          record_id: String(r.record_id ?? "unknown"),
          merkle_hash: String(r.merkle_hash ?? ""),
          ai_decision: t,
          actor: "human",
          time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
        },
        ...prev,
      ]);
      setDecision("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seal failed");
    } finally {
      setBusy(false);
    }
  }

  async function verifyChain() {
    setError("");
    try {
      const r = await ledger("root", {});
      setRoot(`root ${String(r.merkle_root ?? "").slice(0, 16)}… · ${String(r.total_records ?? 0)} records`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verify failed");
    }
  }

  const visible = entries.filter((e) => {
    if (filter === "system" && e.actor === "human") return false;
    if (filter === "human" && e.actor !== "human") return false;
    const q = query.trim().toLowerCase();
    return (
      q === "" ||
      e.ai_decision.toLowerCase().includes(q) ||
      e.record_id.toLowerCase().includes(q) ||
      e.actor.toLowerCase().includes(q)
    );
  });

  const exportCsv = () => {
    const head = "time,actor,decision,record_id,merkle_hash";
    const body = visible.map((e) =>
      [e.time, e.actor, `"${e.ai_decision.replace(/"/g, '""')}"`, e.record_id, e.merkle_hash].join(",")
    );
    const blob = new Blob([[head, ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intellirity-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="panel rounded-lg p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
          seal a decision · live ledger
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") seal(); }}
            placeholder="AI decision to log…"
            spellCheck={false}
            className="h-10 flex-1 rounded border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
          <button
            onClick={seal}
            disabled={busy}
            className="inline-flex h-10 items-center rounded bg-ink px-5 font-mono text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
          >
            {busy ? "sealing…" : "seal to ledger"}
          </button>
          <button
            onClick={verifyChain}
            className="inline-flex h-10 items-center rounded border border-line-strong px-4 font-mono text-[12.5px] font-medium transition-colors hover:border-ink/40"
          >
            verify chain
          </button>
        </div>
        {error !== "" && <p className="mt-2 font-mono text-[11.5px] text-crit">{error}</p>}
        {root !== "" && <p className="mt-2 font-mono text-[11.5px] text-ok">{root}</p>}
      </div>

      <div className="panel overflow-hidden rounded-lg">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="ALL">all</TabsTrigger>
              <TabsTrigger value="system">system</TabsTrigger>
              <TabsTrigger value="human">humans</TabsTrigger>
            </TabsList>
          </Tabs>
          <label className="relative flex h-9 w-full items-center sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute left-3 size-3.5 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter decision, record…"
              className="h-full w-full rounded border border-line bg-sunken pl-9 pr-3 text-[13px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
          </label>
          <button
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded border border-line-strong px-3.5 text-[12.5px] font-medium transition-colors hover:border-ink/40"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                <th className="px-5 py-3 font-normal">time</th>
                <th className="px-3 py-3 font-normal">actor</th>
                <th className="px-3 py-3 font-normal">decision</th>
                <th className="px-3 py-3 font-normal">record</th>
                <th className="px-5 py-3 font-normal">merkle hash</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12.5px]">
              {visible.map((e) => (
                <tr key={e.record_id} className="border-b border-line/60 last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 tabular-nums text-faint">{e.time}</td>
                  <td className="px-3 py-3 text-dim">{e.actor}</td>
                  <td className="max-w-[280px] truncate px-3 py-3 text-ink">{e.ai_decision}</td>
                  <td className="px-3 py-3 text-steel">{e.record_id.slice(0, 12)}</td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-faint">{e.merkle_hash.slice(0, 24)}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 font-mono text-[12px] text-faint">
                    No sealed records this session. Seal your first decision above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
          append-only · merkle-chained · verify any time
        </div>
      </div>
    </div>
  );
}
