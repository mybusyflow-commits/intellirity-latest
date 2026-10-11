"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/console/sidebar";
import { Topbar, MobileNav } from "@/components/console/topbar";

/* Per-tab document titles (client pages cannot export metadata). */
const TAB_TITLES: Record<string, string> = {
  "/console": "Overview",
  "/console/scanner": "Scanner",
  "/console/verdicts": "Verdicts",
  "/console/leakage": "Leakage guard",
  "/console/anomalies": "Anomalies",
  "/console/proof": "Proof of intent",
  "/console/flow": "Data flow",
  "/console/content": "Content guard",
  "/console/behavior": "Agent behavior",
  "/console/intel": "Threat intel",
  "/console/wallet": "Wallet guard",
  "/console/models": "Models & agents",
  "/console/policies": "Policies",
  "/console/escrow": "Agent escrow",
  "/console/audit": "Audit log",
};

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.title = `${TAB_TITLES[pathname] ?? "Console"} · Intellirity Console`;
  }, [pathname]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* landing-grade backdrop: dot field + soft top light, theme-aware */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="grid-texture-console absolute inset-0" />
        <div className="console-glow absolute inset-x-0 top-0 h-[420px]" />
      </div>
      <Sidebar />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="relative z-10 lg:pl-60">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
