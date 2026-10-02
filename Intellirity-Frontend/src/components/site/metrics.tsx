"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { getSummary } from "@/lib/api";

const METRICS = [
  { key: "score", decimals: 0, suffix: "/100", label: "live security score" },
  { key: "blocked", decimals: 0, suffix: "", label: "threats blocked" },
  { key: "scans", decimals: 0, suffix: "", label: "adversarial scans run" },
  { key: "models", decimals: 0, suffix: "", label: "models monitored" },
] as const;

function Big({ end, decimals, suffix }: { end: number; decimals: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1800);
      setVal(end * (1 - Math.pow(2, -10 * p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end]);

  return (
    <span ref={ref} className="tabular-nums">
      {val.toFixed(decimals)}
      <span className="text-steel">{suffix}</span>
    </span>
  );
}

export function Metrics() {
  const [vals, setVals] = useState<Record<string, number>>({});

  useEffect(() => {
    let live = true;
    getSummary()
      .then((s) => {
        if (!live) return;
        setVals({
          score: Math.round(s.security_score),
          blocked: s.threats_blocked,
          scans: s.total_scans,
          models: s.models_monitored,
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="relative z-10 border-y border-line bg-raise/40">
      <div className="mx-auto grid max-w-[1240px] grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m, i) => (
          <div
            key={m.label}
            className={
              "reveal px-7 py-10 md:px-9 md:py-12 " +
              (i > 0 ? "border-l border-line " : "") +
              (i >= 2 ? "max-lg:border-t max-lg:border-line " : "") +
              (i === 2 ? "max-lg:border-l-0" : "")
            }
          >
            <div className="font-display text-[clamp(2rem,3.6vw,3rem)] font-medium tracking-[-0.025em]">
              {m.key in vals ? (
                <Big end={vals[m.key]} decimals={m.decimals} suffix={m.suffix} />
              ) : (
                <span className="tabular-nums text-faint">-</span>
              )}
            </div>
            <div className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
