"use client";

import { useState } from "react";
import { Sidebar } from "@/components/console/sidebar";
import { Topbar, MobileNav } from "@/components/console/topbar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

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
