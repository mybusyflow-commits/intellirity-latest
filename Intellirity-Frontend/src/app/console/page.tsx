"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { Area } from "@/components/charts/area";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { chartCssVars } from "@/components/charts/chart-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { getSummary, getThreats, type Summary, type Threat } from "@/lib/api";
import type { Action } from "@/lib/console-data";
import { cn } from "@/lib/utils";

/* ---------- count-up ---------- */

function CountUp({ end, decimals = 0, suffix = "" }: { end: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1600);
      setVal(end * (1 - Math.pow(2, -10 * p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end]);
  return (
    <span ref={ref} className="tabular-nums">
      {val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      <span className="text-steel">{suffix}</span>
    </span>
  );
}

/* ---------- shared bits ---------- */

function actionTone(a: Action) {
  if (a === "BLOCK") return "text-crit border-crit/30 bg-crit/10";
  if (a === "FLAG") return "text-warn border-warn/30 bg-warn/10";
  return "text-dim border-line bg-white/[0.02]";
}

function toAction(sev: string): Action {
  const s = sev.toLowerCase();
  return s === "high" ? "BLOCK" : s === "medium" ? "FLAG" : "ALLOW";
}

function bucketize(threats: Threat[], hours: number) {
  const now = Date.now();
  const size = (hours * 3600 * 1000) / 24;
  const buckets = Array.from({ length: 24 }, (_, i) => ({
    date: new Date(now - (23 - i) * size),
    blocked: 0,
    flagged: 0,
  }));
  for (const t of threats) {
    const ts = Date.parse(t.created_at);
    if (Number.isNaN(ts)) continue;
    const idx = Math.floor((ts - (now - hours * 3600 * 1000)) / size);
    if (idx < 0 || idx > 23) continue;
    if (t.severity.toLowerCase() === "high") buckets[idx].blocked += 1;
    else if (t.severity.toLowerCase() === "medium") buckets[idx].flagged += 1;
  }
  return buckets;
}

type RangeKey = "24H" | "7D" | "30D";
const RANGE_HOURS: Record<RangeKey, number> = { "24H": 24, "7D": 168, "30D": 720 };

/* ---------- page ---------- */

export default function OverviewPage() {
  const [range, setRange] = useState<RangeKey>("24H");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [threats, setThreats] = useState<Threat[]>([]);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const [s, t] = await Promise.all([getSummary(), getThreats()]);
        if (!live) return;
        setSummary(s);
        setThreats(t);
      } catch {
        /* panels keep their loading state */
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const data = useMemo(() => bucketize(threats, RANGE_HOURS[range]), [threats, range]);
  const open = useMemo(() => threats.filter((t) => !t.is_resolved), [threats]);
  const openQueue = useMemo(
    () => open.filter((t) => t.severity.toLowerCase() !== "low").slice(0, 5),
    [open]
  );

  const kpis = [
    { label: "security score", end: summary ? Math.round(summary.security_score) : 0, decimals: 0, suffix: "/100", delta: `${summary?.models_monitored ?? "-"} models` },
    { label: "threats blocked", end: summary?.threats_blocked ?? 0, decimals: 0, suffix: "", delta: "all time" },
    { label: "active threats", end: summary?.threats_active ?? 0, decimals: 0, suffix: "", delta: `${summary?.threats_high ?? 0} high` },
    { label: "total scans", end: summary?.total_scans ?? 0, decimals: 0, suffix: "", delta: "this engine" },
  ];

  return (
    <div className="space-y-4">
      {/* KPI strip · live engine */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-bg px-5 py-5">
            <div className="text-[26px] font-medium tracking-[-0.02em]">
              <CountUp end={k.end} decimals={k.decimals} suffix={k.suffix} />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
              <span className="text-faint">{k.label}</span>
              <span className="text-dim">{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* volume + live feed */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="panel rounded-lg p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 font-mono text-[11px] text-dim">
              <span className="uppercase tracking-[0.12em] text-faint">live engine volume</span>
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-4 rounded-full" style={{ background: chartCssVars.linePrimary }} />
                blocked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-4 rounded-full" style={{ background: chartCssVars.lineSecondary }} />
                flagged
              </span>
            </div>
            <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <TabsList>
                {(["24H", "7D", "30D"] as RangeKey[]).map((r) => (
                  <TabsTrigger key={r} value={r}>{r}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <AreaChart data={data} xDataKey="date" aspectRatio="2.4 / 1" animationDuration={1100} revealSignature={range}>
            <Grid vertical={false} stroke={chartCssVars.grid} />
            <XAxis numTicks={6} />
            <Area dataKey="blocked" stroke={chartCssVars.linePrimary} fill={chartCssVars.linePrimary} fillOpacity={0.2} strokeWidth={1.5} />
            <Area dataKey="flagged" stroke={chartCssVars.lineSecondary} fill={chartCssVars.lineSecondary} fillOpacity={0.12} strokeWidth={1.25} />
            <ChartTooltip indicatorColor={chartCssVars.crosshair} />
          </AreaChart>
          <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            <span className="tabular-nums text-dim">{threats.length} events in window</span>
            <span className="ml-auto">bucketed from live engine timestamps</span>
          </div>
        </div>

        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              <span className="dot animate-status bg-ok" />
              live verdicts
            </span>
            <Link href="/console/verdicts" className="group flex items-center gap-1 font-mono text-[11px] text-faint transition-colors hover:text-dim">
              view all
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="min-h-[280px] flex-1 space-y-0.5 p-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {threats.slice(0, 7).map((t, i) => {
                const a = toAction(t.severity);
                return (
                  <motion.div
                    key={`${t.id}-${i}`}
                    layout
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-2.5 rounded px-2.5 py-2 hover:bg-white/[0.03]"
                  >
                    <span className={cn("w-[52px] shrink-0 rounded border px-1.5 py-0.5 text-center font-mono text-[10px] font-medium", actionTone(a))}>
                      {a}
                    </span>
                    <span className="truncate font-mono text-[12px] text-ink/85">{t.threat_type}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-faint">
                      {(t.created_at ?? "").slice(11, 16) || "now"}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {threats.length === 0 && (
              <p className="px-2.5 py-6 font-mono text-[12px] text-faint">
                Waiting for the first live event from the engine…
              </p>
            )}
          </div>
        </div>
      </div>

      {/* review queue + engine status */}
      <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              review queue
            </span>
            <span className="rounded border border-warn/30 bg-warn/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-warn">
              {openQueue.length} open
            </span>
          </div>
          <ul>
            {openQueue.map((t, i) => {
              const a = toAction(t.severity);
              return (
                <li key={`${t.id}-${i}`}>
                  <Link href="/console/verdicts" className="group flex w-full items-center gap-3 border-b border-line/60 px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.02]">
                    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium", actionTone(a))}>
                      {a}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px]">{t.threat_type}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-faint">
                        {t.source} · {(t.created_at ?? "").slice(11, 16)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {openQueue.length === 0 && (
              <li className="px-5 py-6 font-mono text-[12px] text-faint">
                Queue clear. New non-low threats appear here live.
              </li>
            )}
          </ul>
        </div>

        <div className="panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              engine status
            </span>
            <Link href="/console/models" className="group flex items-center gap-1 font-mono text-[11px] text-faint transition-colors hover:text-dim">
              endpoints
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <ul className="divide-y divide-line/60 font-mono text-[12px]">
            <li className="flex items-center justify-between px-5 py-3">
              <span className="uppercase tracking-[0.1em] text-faint">compliance score</span>
              <span className="tabular-nums text-ink">{summary ? `${Math.round(summary.compliance_score)}%` : "-"}</span>
            </li>
            <li className="flex items-center justify-between px-5 py-3">
              <span className="uppercase tracking-[0.1em] text-faint">average risk</span>
              <span className="tabular-nums text-ink">{summary ? summary.average_risk_score.toFixed(3) : "-"}</span>
            </li>
            <li className="flex items-center justify-between px-5 py-3">
              <span className="uppercase tracking-[0.1em] text-faint">models monitored</span>
              <span className="tabular-nums text-ink">{summary ? summary.models_monitored : "-"}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong px-5 py-4">
        <Separator orientation="vertical" className="hidden h-8 sm:block" />
        <p className="text-[13px] text-dim">
          Every number on this page streams from the live engine and refreshes
          every 15 seconds. Full history lives in the audit log.
        </p>
        <Link
          href="/console/audit"
          className="ml-auto hidden shrink-0 items-center gap-1.5 rounded border border-line-strong px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:border-ink/40 sm:inline-flex"
        >
          Open audit log
        </Link>
      </div>
    </div>
  );
}
