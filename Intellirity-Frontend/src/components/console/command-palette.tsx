"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";
import { MODELS, POLICY_PACKS } from "@/lib/console-data";
import { cn } from "@/lib/utils";

type Entry = { label: string; hint: string; href: string; group: string };

const PAGES: Entry[] = [
  { label: "Overview", hint: "fleet status", href: "/console", group: "Go to" },
  { label: "Scanner", hint: "run a scan", href: "/console/scanner", group: "Go to" },
  { label: "Verdicts", hint: "live stream", href: "/console/verdicts", group: "Go to" },
  { label: "Leakage guard", hint: "dlp redactions", href: "/console/leakage", group: "Go to" },
  { label: "Anomalies", hint: "baselines", href: "/console/anomalies", group: "Go to" },
  { label: "Proof of intent", hint: "certificates", href: "/console/proof", group: "Go to" },
  { label: "Data flow", hint: "pipeline trace", href: "/console/flow", group: "Go to" },
  { label: "Content guard", hint: "moderation", href: "/console/content", group: "Go to" },
  { label: "Agent behavior", hint: "sessions + mcp", href: "/console/behavior", group: "Go to" },
  { label: "Threat intel", hint: "feed + probes", href: "/console/intel", group: "Go to" },
  { label: "Wallet guard", hint: "spend audit", href: "/console/wallet", group: "Go to" },
  { label: "Models & agents", hint: "coverage", href: "/console/models", group: "Go to" },
  { label: "Policies", hint: "guardrails", href: "/console/policies", group: "Go to" },
  { label: "Agent escrow", hint: "custody queue", href: "/console/escrow", group: "Go to" },
  { label: "Audit log", hint: "evidence", href: "/console/audit", group: "Go to" },
  { label: "New scan", hint: "full barrage", href: "/console/scanner", group: "Actions" },
  { label: "Export audit CSV", hint: "filtered view", href: "/console/audit", group: "Actions" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setOpenWithReset = (v: boolean) => {
    if (v) {
      setQuery("");
      setCursor(0);
    }
    setOpen(v);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenWithReset(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open ]);

  const entries: Entry[] = useMemo(
    () => [
      ...PAGES,
      ...MODELS.map((m) => ({
        label: m.name,
        hint: `${m.status} · ${m.vendor}`,
        href: "/console/models",
        group: "Models",
      })),
      ...POLICY_PACKS.map((p) => ({
        label: p.name,
        hint: `${p.version} · ${p.enabled ? "enforced" : "disabled"}`,
        href: "/console/policies",
        group: "Policies",
      })),
    ],
    []
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q === "" ? entries : entries.filter((e) => `${e.label} ${e.hint}`.toLowerCase().includes(q));
    return list.slice(0, 12);
  }, [entries, query]);

  const onQuery = (v: string) => {
    setQuery(v);
    setCursor(0);
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpenWithReset(true)}
        className="hidden h-9 items-center gap-2.5 rounded border border-line px-3 text-[12.5px] text-faint transition-colors hover:border-line-strong hover:text-dim md:flex"
        aria-label="Open command palette"
      >
        <Search className="size-3.5" />
        <span className="w-28 text-left">Search console…</span>
        <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-label="Command palette"
              className="absolute left-1/2 top-[16vh] w-[calc(100vw-2.5rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-lg border border-line-strong bg-raise shadow-2xl"
            >
              <div className="flex items-center gap-2.5 border-b border-line px-4">
                <Search className="size-4 shrink-0 text-faint" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setCursor((c) => Math.min(c + 1, results.length - 1));
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setCursor((c) => Math.max(c - 1, 0));
                    }
                    if (e.key === "Enter" && results[cursor]) go(results[cursor].href);
                  }}
                  placeholder="Jump to verdicts, models, policies…"
                  className="h-12 w-full bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
                />
                <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
                  esc
                </kbd>
              </div>
              <ul className="max-h-[320px] overflow-y-auto p-1.5">
                {results.map((r, i) => (
                  <li key={`${r.group}-${r.label}`}>
                    <button
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(r.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-colors",
                        cursor === i ? "bg-white/[0.06]" : "bg-transparent"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px]">{r.label}</span>
                        <span className="block truncate font-mono text-[11px] text-faint">
                          {r.group} · {r.hint}
                        </span>
                      </span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-faint" />
                    </button>
                  </li>
                ))}
                {results.length === 0 && (
                  <li className="px-3 py-8 text-center font-mono text-[12px] text-faint">
                    nothing matches “{query}”
                  </li>
                )}
              </ul>
              <div className="border-t border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                ↑↓ navigate · ↵ open · esc close
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
