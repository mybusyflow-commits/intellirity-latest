"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Radar, ScrollText, Boxes, ShieldCheck, FileSearch, LifeBuoy,
  DatabaseZap, AudioWaveform, Landmark, Fingerprint, Waypoints, ShieldAlert, Bot, Globe, Wallet,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

const SECTIONS: Array<{
  title: string;
  items: Array<{ num: string; href: string; label: string; icon: typeof Radar; hint?: string }>;
}> = [
  {
    title: "Operate",
    items: [
      { num: "01", href: "/console", label: "Overview", icon: LayoutDashboard },
      { num: "02", href: "/console/scanner", label: "Scanner", icon: Radar },
      { num: "03", href: "/console/verdicts", label: "Verdicts", icon: ScrollText, hint: "live" },
      { num: "04", href: "/console/leakage", label: "Leakage guard", icon: DatabaseZap },
      { num: "05", href: "/console/anomalies", label: "Anomalies", icon: AudioWaveform },
    ],
  },
  {
    title: "Defend",
    items: [
      { num: "10", href: "/console/proof", label: "Proof of intent", icon: Fingerprint },
      { num: "11", href: "/console/flow", label: "Data flow", icon: Waypoints },
      { num: "12", href: "/console/content", label: "Content guard", icon: ShieldAlert },
      { num: "13", href: "/console/behavior", label: "Agent behavior", icon: Bot },
      { num: "14", href: "/console/intel", label: "Threat intel", icon: Globe, hint: "live" },
      { num: "15", href: "/console/wallet", label: "Wallet guard", icon: Wallet },
    ],
  },
  {
    title: "Govern",
    items: [
      { num: "06", href: "/console/models", label: "Models & agents", icon: Boxes },
      { num: "07", href: "/console/policies", label: "Policies", icon: ShieldCheck },
      { num: "08", href: "/console/escrow", label: "Agent escrow", icon: Landmark },
      { num: "09", href: "/console/audit", label: "Audit log", icon: FileSearch },
    ],
  },
];

export function Sidebar({ drawer = false }: { drawer?: boolean }) {
  const pathname = usePathname();
  const [latency, setLatency] = useState("-");
  const [score, setScore] = useState("-");

  useEffect(() => {
    let live = true;
    const probe = async () => {
      const t0 = performance.now();
      try {
        const r = await fetch("/backend/system/summary");
        if (!r.ok || !live) return;
        const s = await r.json();
        if (!live) return;
        setLatency(`${Math.max(1, Math.round(performance.now() - t0))}ms`);
        setScore(`${Math.round(s.security_score)}/100`);
      } catch {
        if (live) setLatency("offline");
      }
    };
    probe();
    const id = setInterval(probe, 30000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  return (
    <aside
      className={
        drawer
          ? "flex h-[calc(100%-4rem)] flex-col"
          : "fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-raise/60 lg:flex"
      }
    >
      <Link href="/" className="flex h-16 items-center gap-2.5 border-b border-line px-5" aria-label="Back to site">
        <Logo />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          console
        </span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        {SECTIONS.map((s) => (
          <div key={s.title} className="mb-6 last:mb-0">
            <div className="mb-2 flex items-center justify-between px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              <span>{s.title}</span>
              <span className="tabular-nums">{s.items.length}</span>
            </div>
            <ul className="space-y-0.5">
              {s.items.map((item) => {
                const active =
                  item.href === "/console" ? pathname === "/console" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] transition-colors",
                        active ? "bg-white/[0.06] text-ink" : "text-dim hover:bg-white/[0.03] hover:text-ink"
                      )}
                    >
                      <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-faint">
                        {item.num}
                      </span>
                      <Icon
                        className={cn("size-4 shrink-0", active ? "text-ink" : "text-faint group-hover:text-dim")}
                        strokeWidth={1.5}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.hint && (
                        <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                          <span className="dot animate-status bg-ok" />
                          {item.hint}
                        </span>
                      )}
                      {active && !item.hint && <span className="ml-auto h-4 w-px shrink-0 bg-steel" aria-hidden />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-4">
        <div className="rounded border border-line bg-sunken p-3.5">
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
            <span className="dot animate-status bg-ok" />
            mesh health
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>
              <div className="text-[15px] font-medium tabular-nums text-ink">{score}</div>
              <div className="text-faint">security score</div>
            </div>
            <div>
              <div className="text-[15px] font-medium tabular-nums text-ink">{latency}</div>
              <div className="text-faint">engine round-trip</div>
            </div>
          </div>
        </div>
        <Link
          href="/"
          className="mt-3 flex items-center gap-2 px-1 text-[12.5px] text-faint transition-colors hover:text-dim"
        >
          <LifeBuoy className="size-3.5" />
          Back to site
        </Link>
      </div>
    </aside>
  );
}
