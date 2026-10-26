"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/console/sidebar";
import { Topbar, MobileNav } from "@/components/console/topbar";
import { EntitlementsProvider, useEntitlements } from "@/components/console/entitlements";
import { Paywall, PaywallNotice } from "@/components/console/paywall";
import { CONSOLE_ROUTES, consoleHref } from "@/lib/routes";
import { useState } from "react";

/* Per-tab document titles. Client pages cannot export metadata, so the tab
   title is set here — from the same route registry the nav uses, so the
   two can never disagree. */
const TAB_TITLES: Record<string, string> = Object.fromEntries(
  CONSOLE_ROUTES.map((r) => [consoleHref(r.path), r.title])
);

const ROUTES_BY_HREF: Record<string, (typeof CONSOLE_ROUTES)[number]> = Object.fromEntries(
  CONSOLE_ROUTES.map((r) => [consoleHref(r.path), r])
);

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <EntitlementsProvider>
      <ConsoleBody>{children}</ConsoleBody>
    </EntitlementsProvider>
  );
}

function ConsoleBody({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const route = ROUTES_BY_HREF[pathname];
  const { loading, enforced, isUnlocked } = useEntitlements();

  useEffect(() => {
    document.title = `${TAB_TITLES[pathname] ?? "Console"} · Intellirity Console`;
  }, [pathname]);

  // Only a paid route waits for the plan. Free routes render immediately so
  // a slow entitlement call never blocks the overview or the scanner.
  const needsPlan = Boolean(route?.product);
  const locked = needsPlan && enforced && !isUnlocked(route?.product);
  const checking = needsPlan && loading && !locked;

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
        <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
          {locked ? (
            <Paywall route={route} />
          ) : checking ? (
            <div className="grid min-h-[50vh] place-items-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                verifying plan
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <PaywallNotice />
    </div>
  );
}
