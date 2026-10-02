"use client";

import { useEffect, useRef, useState } from "react";
import { Plug, SlidersHorizontal, Gauge, Radar } from "lucide-react";

const STEPS = [
  {
    icon: Plug,
    num: "01",
    title: "Connect the mesh",
    body: "One env var or sidecar in front of your models, agents, and routes. Zero code changes, full visibility in minutes.",
    meta: "proxy · sidecar · gateway",
  },
  {
    icon: SlidersHorizontal,
    num: "02",
    title: "Compose policy",
    body: "Guardrails as versioned YAML: what may be said, sent, spent, or executed. Promote policy through PR review like any other code.",
    meta: "yaml · versioned · reviewed",
  },
  {
    icon: Gauge,
    num: "03",
    title: "Judge every call",
    body: "Layered patterns, behavioral baselines, and intent proof, scored inline in real time.",
    meta: "inline · scored",
  },
  {
    icon: Radar,
    num: "04",
    title: "Answer for everything",
    body: "Every verdict streams with evidence and a plain-language reason: the audit trail your regulators and lawyers will ask for.",
    meta: "stream · evidence · alerts",
  },
];

export function HowItWorks() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const wrap = wrapRef.current;
        const track = trackRef.current;
        if (!wrap || !track) return;
        const rect = wrap.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const p = Math.min(1, Math.max(0, -rect.top / scrollable));
        setProgress(p);
        const maxShift = track.scrollWidth - window.innerWidth + 96;
        track.style.transform = `translate3d(${-p * maxShift}px, 0, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} id="how" className="relative z-10" style={{ height: `${120 + STEPS.length * 55}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-[1240px] px-6">
          <div className="mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">05</span>
            <span className="h-px w-8 bg-line-strong" />
            deployment
          </div>
          <h2 className="max-w-xl font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.025em]">
            Four moves to full AI coverage.
          </h2>
        </div>

        <div ref={trackRef} className="flex gap-4 px-6 will-change-transform md:px-12" style={{ width: "max-content" }}>
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <article
                key={s.num}
                className="panel relative flex h-[52vh] w-[80vw] flex-col rounded-lg p-7 sm:w-[60vw] md:h-[50vh] md:w-[44vw] lg:w-[34vw]"
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-steel" strokeWidth={1.25} />
                  <span className="font-mono text-[13px] tabular-nums text-faint">{s.num}</span>
                </div>
                <h3 className="mt-auto text-[26px] font-medium tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-dim">{s.body}</p>
                <div className="mt-5 border-t border-line pt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                  {s.meta}
                </div>
              </article>
            );
          })}

          <div className="flex h-[52vh] w-[80vw] flex-col items-start justify-center rounded-lg border border-dashed border-line-strong p-7 sm:w-[60vw] md:h-[50vh] md:w-[44vw] lg:w-[28vw]">
            <div className="text-[22px] font-medium tracking-[-0.02em]">
              That&apos;s the whole integration.
            </div>
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-dim">
              Median time from signup to first blocked attack: 11 minutes.
            </p>
            <a
              href="#pricing"
              className="mt-7 inline-flex h-10 items-center rounded bg-ink px-5 text-[13.5px] font-medium text-bg transition-colors hover:bg-white"
            >
              Start connecting
            </a>
          </div>
        </div>

        <div className="mx-auto mt-10 w-full max-w-[1240px] px-6">
          <div className="h-px w-full bg-line">
            <div className="h-px bg-steel" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            <span>keep scrolling</span>
            <span className="tabular-nums text-dim">
              {String(Math.round(progress * 4) + 1).padStart(2, "0")} / 04
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
