"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { UserChip } from "./user-chip";
import { OrgSwitcher } from "./org-switcher";
import { Logo } from "@/components/site/logo";
import { CONSOLE_ROUTES, consoleHref } from "@/lib/routes";

/* Titles come from the shared route registry — the same source the sidebar
   and the document title use. */
const TITLES: Record<string, { title: string; sub: string }> = Object.fromEntries(
  CONSOLE_ROUTES.map((r) => [consoleHref(r.path), { title: r.title, sub: r.sub }])
);

function useClock() {
  const [now, setNow] = useState("--:--:--");
  useEffect(() => {
    // Real UTC, not the browser's local time relabelled.
    const f = () =>
      setNow(
        new Date().toLocaleTimeString("en-GB", {
          hour12: false,
          timeZone: "UTC",
        }) + " UTC"
      );
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const meta = TITLES[pathname] ?? TITLES["/console"];
  const clock = useClock();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-5 md:px-8">
        <button
          onClick={onMenu}
          aria-label="Open navigation"
          className="grid size-9 place-items-center rounded border border-line text-dim lg:hidden"
        >
          <Menu className="size-4" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[16px] font-medium tracking-[-0.01em]">{meta.title}</h1>
          <p className="hidden truncate text-[12.5px] text-faint sm:block">{meta.sub}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <CommandPalette />
          <span className="hidden items-center gap-2 rounded border border-line px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim md:flex">
            <span className="dot animate-status bg-ok" />
            {process.env.NEXT_PUBLIC_DEPLOY_ENV || "development"}
          </span>
          <span className="hidden font-mono text-[11.5px] tabular-nums text-faint sm:block">
            {clock}
          </span>
          <Link
            href="/console/scanner"
            className="inline-flex h-9 items-center gap-1.5 rounded bg-ink px-3.5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
          >
            <Plus className="size-3.5" />
            New scan
          </Link>
          <OrgSwitcher className="hidden sm:flex" />
          <UserChip />
        </div>
      </div>
    </header>
  );
}

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-60 border-r border-line bg-raise">
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Logo />
          <button onClick={onClose} aria-label="Close navigation" className="grid size-9 place-items-center rounded border border-line text-dim">
            <X className="size-4" />
          </button>
        </div>
        <Sidebar drawer />
      </div>
    </div>
  );
}
