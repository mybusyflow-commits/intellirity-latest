"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerdictDrawer } from "@/components/console/verdict-drawer";
import type { Action, Verdict } from "@/lib/console-data";
import { getThreats, type Threat } from "@/lib/api";
import { cn } from "@/lib/utils";

type Filter = "ALL" | Action;

function actionTone(a: Action) {
  if (a === "BLOCK") return "text-crit border-crit/30 bg-crit/10";
  if (a === "FLAG") return "text-warn border-warn/30 bg-warn/10";
  return "text-dim border-line bg-white/[0.02]";
}

function toVerdict(t: Threat): Verdict {
  const sev = t.severity.toLowerCase();
  const action: Action = sev === "high" ? "BLOCK" : sev === "medium" ? "FLAG" : "ALLOW";
  return {
    id: t.id,
    time: (t.created_at ?? "").slice(11, 16) || "now",
    action,
    rule: t.threat_type,
    model: t.source,
    policy: "default",
    ms: 0,
  };
}

export default function VerdictsPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Verdict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Verdict | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Threat | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = await getThreats();
      setRows(items.map(toVerdict));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load verdicts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (v) =>
        (filter === "ALL" || v.action === filter) &&
        (q === "" ||
          v.rule.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.policy.toLowerCase().includes(q))
    );
  }, [rows, filter, query]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: rows.length, BLOCK: 0, FLAG: 0, ALLOW: 0 };
    for (const v of rows) c[v.action] += 1;
    return c;
  }, [rows]);

  async function openRow(v: Verdict) {
    setSelected(v);
    try {
      const items = await getThreats();
      setSelectedDetail(items.find((t) => t.id === v.id) ?? null);
    } catch {
      setSelectedDetail(null);
    }
  }

  return (
    <div className="panel overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {(["ALL", "BLOCK", "FLAG", "ALLOW"] as Filter[]).map((f) => (
              <TabsTrigger key={f} value={f}>
                {f} <span className="ml-1.5 tabular-nums text-faint">{counts[f]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <label className="relative ml-auto flex h-9 w-full items-center sm:w-64">
          <Search className="pointer-events-none absolute left-3 size-3.5 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter rule, model, policy…"
            className="h-full w-full rounded border border-line bg-sunken pl-9 pr-3 text-[13px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
        </label>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded border border-line-strong px-3 text-[12.5px] font-medium transition-colors hover:border-ink/40 disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              <th className="px-5 py-3 font-normal">verdict</th>
              <th className="px-3 py-3 font-normal">rule / reason</th>
              <th className="px-3 py-3 font-normal">model</th>
              <th className="px-3 py-3 font-normal">policy</th>
              <th className="px-3 py-3 font-normal">time</th>
              <th className="px-5 py-3 text-right font-normal">latency</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {visible.map((v, i) => (
                <motion.tr
                  key={`${v.id}-${i}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => openRow(v)}
                  onKeyDown={(e) => e.key === "Enter" && openRow(v)}
                  tabIndex={0}
                  className="cursor-pointer border-b border-line/60 last:border-b-0 hover:bg-white/[0.02] focus:bg-white/[0.03] focus:outline-none"
                >
                  <td className="px-5 py-2.5">
                    <span className={cn("rounded border px-2 py-0.5 font-mono text-[10.5px] font-medium", actionTone(v.action))}>
                      {v.action}
                    </span>
                  </td>
                  <td className="max-w-[320px] truncate px-3 py-2.5 font-mono text-[12.5px] text-ink/85">{v.rule}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-dim">{v.model}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-faint">{v.policy}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-faint">{v.time}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-[12px] tabular-nums text-steel">live</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {loading && rows.length === 0 && (
          <div className="px-5 py-12 text-center font-mono text-[12px] text-faint">
            loading live verdicts from the engine…
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div className="px-5 py-12 text-center font-mono text-[12px] text-faint">
            {error !== "" ? error : "no verdicts match this filter"}
          </div>
        )}
      </div>
      <div className="border-t border-line px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
        live from engine · refreshes every 15s · click any row for evidence
      </div>
      <VerdictDrawer
        verdict={selected}
        detail={selectedDetail}
        onClose={() => { setSelected(null); setSelectedDetail(null); }}
        acknowledged={acknowledged}
        onAcknowledge={(id) => setAcknowledged((s) => new Set(s).add(id))}
      />
    </div>
  );
}
