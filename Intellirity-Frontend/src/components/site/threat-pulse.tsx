"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, FileWarning, ShieldX } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { Area } from "@/components/charts/area";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { chartCssVars } from "@/components/charts/chart-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { getThreats, type Threat } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ---------- live bucketing ---------- */

type RangeKey = "24H" | "7D" | "30D";
const RANGE_HOURS: Record<RangeKey, number> = { "24H": 24, "7D": 168, "30D": 720 };

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

function iconFor(sev: string) {
  const s = sev.toLowerCase();
  if (s === "high") return { Icon: ShieldX, tone: "text-crit" };
  if (s === "medium") return { Icon: Eye, tone: "text-warn" };
  return { Icon: FileWarning, tone: "text-steel" };
}

/* ---------- section ---------- */

export function ThreatPulse() {
  const [range, setRange] = useState<RangeKey>("24H");
  const [threats, setThreats] = useState<Threat[]>([]);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const items = await getThreats();
        if (live) setThreats(items);
      } catch {
        /* chart keeps its empty state offline */
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
  const totals = useMemo(
    () => ({
      blocked: data.reduce((s, d) => s + d.blocked, 0),
      flagged: data.reduce((s, d) => s + d.flagged, 0),
    }),
    [data]
  );
  const feed = useMemo(() => threats.slice(0, 6), [threats]);

  return (
    <section id="pulse" className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 md:py-32">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="reveal mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">01</span>
            <span className="h-px w-8 bg-line-strong" />
            live threats
          </div>
          <h2 className="reveal max-w-xl font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
            Attack traffic, judged as it arrives.
          </h2>
        </div>
        <p className="reveal max-w-sm text-[14.5px] leading-relaxed text-dim">
          Every prompt, completion, and tool call, scored by the live
          detection engine. Below is the live engine feed.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        {/* volume chart */}
        <div className="reveal panel card rounded-lg p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 font-mono text-[11px] text-dim">
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
              <TabsList className="rounded border border-line bg-sunken p-0.5">
                {(["24H", "7D", "30D"] as RangeKey[]).map((r) => (
                  <TabsTrigger
                    key={r}
                    value={r}
                    className="rounded-[3px] px-3 py-1.5 data-[state=active]:bg-white/[0.08] data-[state=active]:text-ink"
                  >
                    {r}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <AreaChart
            data={data}
            xDataKey="date"
            aspectRatio="2.2 / 1"
            animationDuration={1100}
            revealSignature={range}
          >
            <Grid vertical={false} stroke={chartCssVars.grid} />
            <XAxis numTicks={6} />
            <Area
              dataKey="blocked"
              stroke={chartCssVars.linePrimary}
              fill={chartCssVars.linePrimary}
              fillOpacity={0.22}
              strokeWidth={1.5}
            />
            <Area
              dataKey="flagged"
              stroke={chartCssVars.lineSecondary}
              fill={chartCssVars.lineSecondary}
              fillOpacity={0.12}
              strokeWidth={1.25}
            />
            <ChartTooltip indicatorColor={chartCssVars.crosshair} />
          </AreaChart>

          <div className="mt-5 flex items-center gap-5 border-t border-line pt-4">
            <div>
              <div className="font-mono text-xl font-medium tabular-nums">
                {totals.blocked.toLocaleString()}
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                blocked · {range}
              </div>
            </div>
            <Separator orientation="vertical" className="h-9" />
            <div>
              <div className="font-mono text-xl font-medium tabular-nums text-dim">
                {totals.flagged.toLocaleString()}
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                flagged · {range}
              </div>
            </div>
            <div className="ml-auto hidden font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint sm:block">
              live engine feed
            </div>
          </div>
        </div>

        {/* verdict stream */}
        <div className="reveal panel card flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              <span className="dot animate-status bg-ok" />
              verdict stream
            </span>
            <span className="font-mono text-[11px] tabular-nums text-faint">
              {threats.length} events
            </span>
          </div>
          <div className="flex-1 space-y-0.5 overflow-hidden p-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {feed.map((e) => {
                const { Icon, tone } = iconFor(e.severity);
                return (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: -14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 rounded px-2.5 py-2 transition-colors hover:bg-white/[0.03]"
                  >
                    <Icon className={cn("size-4 shrink-0", tone)} strokeWidth={1.5} />
                    <span className="truncate text-[13px] text-ink/85">{e.threat_type}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-faint">
                      {e.source}
                    </span>
                    <span className="hidden w-16 shrink-0 text-right font-mono text-[10.5px] text-faint lg:block">
                      {(e.created_at ?? "").slice(11, 16) || "now"}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {feed.length === 0 && (
              <p className="px-2.5 py-8 font-mono text-[12px] text-faint">
                Waiting for the first live event from the engine…
              </p>
            )}
          </div>
          <div className="border-t border-line px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            allow · flag · block, with reasons
          </div>
        </div>
      </div>
    </section>
  );
}
