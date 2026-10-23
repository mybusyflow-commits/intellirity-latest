"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { LEGAL_DOCS } from "@/lib/legal";

export interface ModalDoc {
  title: string;
  updated: string;
  sections: Array<{ heading: string; body: string[] }>;
}

/* The modal reads the same documents as the crawlable /privacy, /terms
   and /security pages, so the two can never disagree about what we
   promise. */
export const MODAL_DOCS: Record<string, ModalDoc> = Object.fromEntries(
  Object.entries(LEGAL_DOCS).map(([key, d]) => [
    key,
    { title: d.title, updated: d.updated, sections: d.sections },
  ])
);

export function InfoModal({ docKey, onClose }: { docKey: string | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doc = docKey ? MODAL_DOCS[docKey] : null;

  return (
    <AnimatePresence>
      {doc && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={doc.title}
            className="panel relative flex max-h-[82vh] w-full max-w-[600px] flex-col overflow-hidden rounded-lg"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h3 className="text-[17px] font-medium tracking-[-0.01em]">{doc.title}</h3>
                <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                  {doc.updated}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded border border-line text-dim transition-colors hover:border-line-strong hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              {doc.sections.map((s) => (
                <section key={s.heading} className="mb-6 last:mb-0">
                  <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-steel">
                    {s.heading}
                  </h4>
                  {s.body.map((p, i) => (
                    <p key={i} className="mb-2.5 text-[14px] leading-relaxed text-dim last:mb-0">
                      {p}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
