"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, X } from "lucide-react";
import type { Action, Verdict } from "@/lib/console-data";
import type { Threat } from "@/lib/api";
import { cn } from "@/lib/utils";

function actionTone(a: Action) {
  if (a === "BLOCK") return "text-crit border-crit/30 bg-crit/10";
  if (a === "FLAG") return "text-warn border-warn/30 bg-warn/10";
  return "text-dim border-line bg-white/[0.02]";
}

export function VerdictDrawer({
  verdict,
  detail,
  onClose,
  onAcknowledge,
  acknowledged,
}: {
  verdict: Verdict | null;
  detail: Threat | null;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  acknowledged: Set<string>;
}) {
  const exportJson = () => {
    if (!verdict) return;
    const blob = new Blob([JSON.stringify(detail ?? verdict, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verdict-${verdict.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {verdict && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label={`Evidence for verdict ${verdict.id}`}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-line bg-raise"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                verdict evidence · live record
              </span>
              <button
                onClick={onClose}
                aria-label="Close evidence"
                className="grid size-8 place-items-center rounded border border-line text-dim transition-colors hover:border-line-strong hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex items-center gap-2.5">
                <span className={cn("rounded border px-2 py-0.5 font-mono text-[11px] font-medium", actionTone(verdict.action))}>
                  {verdict.action}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-faint">
                  {verdict.time}
                </span>
                {detail && (
                  <span className={cn("font-mono text-[11px]", detail.is_resolved ? "text-ok" : "text-warn")}>
                    {detail.is_resolved ? "resolved" : "open"}
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-mono text-[14px] leading-relaxed">{verdict.rule}</h3>

              <dl className="mt-5 space-y-0 rounded border border-line font-mono text-[12px]">
                {[
                  ["source", detail?.source ?? verdict.model],
                  ["severity", detail?.severity ?? "-"],
                  ["detected", detail?.created_at ?? "-"],
                  ["verdict id", verdict.id.slice(0, 24) + "…"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-line/60 px-3.5 py-2.5 last:border-b-0">
                    <dt className="uppercase tracking-[0.1em] text-faint">{k}</dt>
                    <dd className="max-w-[230px] truncate text-dim">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                engine description
              </div>
              <pre className="mt-2 overflow-x-auto rounded border border-line bg-sunken p-3.5 font-mono text-[11.5px] leading-[1.8] text-dim">
                {detail?.description ?? "No further detail recorded for this event."}
              </pre>

              <div className="mt-5 rounded border border-line bg-sunken p-3.5 text-[13px] leading-relaxed text-dim">
                <span className="font-medium text-ink">Recommended: </span>
                {verdict.action === "BLOCK"
                  ? "keep blocked. Rotate any credentials the agent could reach, then re-run the scanner on this policy."
                  : verdict.action === "FLAG"
                    ? "review the description above, then resolve it from the threats table once handled."
                    : "no action. This event passed clean."}
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t border-line px-5 py-4">
              <button
                onClick={() => onAcknowledge(verdict.id)}
                disabled={acknowledged.has(verdict.id)}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded bg-ink text-[13px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-50"
              >
                <Check className="size-3.5" />
                {acknowledged.has(verdict.id) ? "acknowledged" : "acknowledge"}
              </button>
              <button
                onClick={exportJson}
                className="inline-flex h-9 items-center gap-1.5 rounded border border-line-strong px-3.5 text-[13px] font-medium transition-colors hover:border-ink/40"
              >
                <Download className="size-3.5" />
                JSON
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
