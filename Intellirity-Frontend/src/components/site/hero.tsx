"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { RectangleButtons } from "@/components/fx/threeui-buttons";
import { loadAnime } from "@/lib/use-anime";
import { getSummary, getThreats, type Threat } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ---------- live verdict console (real engine feed) ---------- */

function actionTone(a: string) {
  if (a === "BLOCK") return "text-crit border-crit/30 bg-crit/10";
  if (a === "FLAG") return "text-warn border-warn/30 bg-warn/10";
  return "text-dim border-line bg-white/[0.02]";
}

function toAction(sev: string): "BLOCK" | "FLAG" | "ALLOW" {
  const s = sev.toLowerCase();
  return s === "high" ? "BLOCK" : s === "medium" ? "FLAG" : "ALLOW";
}

function VerdictConsole() {
  const [rows, setRows] = useState<Threat[]>([]);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const [s, t] = await Promise.all([getSummary(), getThreats()]);
        if (!live) return;
        setRows(t.slice(0, 6));
        setOpen(s.threats_active);
      } catch {
        /* offline: console stays in its loading state */
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="hero-console panel scanlines relative overflow-hidden rounded-lg opacity-0">
      {/* title bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          <span className="dot animate-status bg-ok" />
          verdicts · live
        </span>
        <span className="font-mono text-[11px] tabular-nums text-faint">
          {open} open threats
        </span>
      </div>
      {/* rows */}
      <div className="min-h-[248px] p-2">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((v, i) => {
            const a = toAction(v.severity);
            return (
              <motion.div
                key={`${v.id}-${i}`}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 border-b border-line/60 px-2 py-2.5 last:border-b-0"
              >
                <span
                  className={cn(
                    "w-[52px] shrink-0 rounded border px-1.5 py-0.5 text-center font-mono text-[10px] font-medium tracking-[0.08em]",
                    actionTone(a)
                  )}
                >
                  {a}
                </span>
                <span className="truncate font-mono text-[12px] text-ink/85">{v.threat_type}</span>
                <span className="ml-auto hidden shrink-0 font-mono text-[11px] text-faint sm:block">
                  {v.source}
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-faint">
                  {(v.created_at ?? "").slice(11, 16) || "now"}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {rows.length === 0 && (
          <p className="px-2 py-8 font-mono text-[12px] text-faint">
            Connecting to the live engine…
          </p>
        )}
      </div>
      {/* footer */}
      <div className="flex items-center justify-between border-t border-line bg-sunken px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
        <span>live engine feed</span>
        <span className="tabular-nums text-dim">refreshes every 15s</span>
      </div>
    </div>
  );
}

/* ---------- hero ---------- */

export function Hero() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<number | null>(null);
  const [models, setModels] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    getSummary()
      .then((s) => {
        if (!live) return;
        setScore(Math.round(s.security_score));
        setBlocked(s.threats_blocked);
        setModels(s.models_monitored);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
      loadAnime().then(({ animate, stagger, eases }) => {
      if (cancelled || !rootRef.current) return;
      animate(".mask-line > span", {
        translateY: ["110%", "0%"],
        duration: 1100,
        ease: eases.outExpo,
        delay: stagger(110, { start: 380 }),
      });
      animate(".hero-fade", {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 900,
        ease: eases.outExpo,
        delay: stagger(110, { start: 800 }),
      });
      animate(".hero-console", {
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 1200,
        ease: eases.outExpo,
        delay: 950,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="top"
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* local scrim so copy stays crisp over the wave field */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        aria-hidden
        style={{
          background:
            "linear-gradient(to top, var(--bg) 2%, transparent 36%), radial-gradient(ellipse 80% 62% at 30% 42%, rgba(10,11,13,0.55), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-14 px-6 pb-20 pt-36 lg:grid-cols-[1.05fr,0.95fr] lg:pt-32">
        <div>
          <h1 className="font-display text-[clamp(2.9rem,6vw,4.9rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            <span className="mask-line pb-1">
              <span>Intelligent threats</span>
            </span>
            <span className="mask-line pb-1">
              <span>demand intelligent</span>
            </span>
            <span className="mask-line pb-1">
              <span>
                security<span className="text-steel">.</span>
              </span>
            </span>
          </h1>

          <p className="hero-fade mt-6 max-w-lg text-[16.5px] leading-relaxed text-dim opacity-0">
            Intellirity sits in front of your models, agents, and data
            pipelines, judging every call for injection, jailbreak, and
            exfiltration in real time, with evidence attached to every verdict.
          </p>

          <div className="hero-fade mt-9 flex flex-wrap items-center gap-x-5 gap-y-4 opacity-0">
            <a
              href="/console"
              className="group inline-flex h-12 items-center gap-2 rounded bg-ink px-7 text-[14.5px] font-medium text-bg transition-colors duration-300 hover:bg-white"
            >
              Open Dashboard
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
            <div
              role="link"
              tabIndex={0}
              aria-label="See the work"
              onClick={() => document.querySelector("#platform")?.scrollIntoView({ behavior: "smooth" })}
              onKeyDown={(e) => {
                if (e.key === "Enter") document.querySelector("#platform")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="halvorsen-bare cursor-pointer transition-transform duration-300 hover:scale-[1.03] focus:outline-none"
            >
              <RectangleButtons variant="halvorsen-arrow-pill" mode="dark" />
            </div>
          </div>

          <dl className="hero-fade mt-12 flex flex-wrap gap-x-10 gap-y-4 opacity-0">
            <div>
              <dt className="sr-only">security score</dt>
              <dd className="font-mono text-[19px] font-medium tabular-nums">
                {score === null ? "-" : `${score}/100`}
              </dd>
              <dd className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                security score · live
              </dd>
            </div>
            <div>
              <dt className="sr-only">threats blocked</dt>
              <dd className="font-mono text-[19px] font-medium tabular-nums">
                {blocked === null ? "-" : blocked.toLocaleString()}
              </dd>
              <dd className="mt-1 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                <span className="dot animate-status bg-ok" />
                threats blocked · live
              </dd>
            </div>
            <div>
              <dt className="sr-only">models monitored</dt>
              <dd className="font-mono text-[19px] font-medium tabular-nums">
                {models === null ? "-" : models}
              </dd>
              <dd className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                models monitored
              </dd>
            </div>
          </dl>
        </div>

        <VerdictConsole />
      </div>
    </section>
  );
}
