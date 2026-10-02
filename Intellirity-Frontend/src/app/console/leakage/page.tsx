"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scanModule } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Finding {
  id: number;
  kind: string;
  title: string;
  desc: string;
  tone: string;
}

const DETECTOR_DEFS = [
  { id: "pii", name: "PII patterns", desc: "Emails, SSNs, phones, national IDs" },
  { id: "credential", name: "Credentials", desc: "API keys, tokens, private keys" },
  { id: "code", name: "Code leak", desc: "SQLi, XSS and exec output in responses" },
];

export default function LeakagePage() {
  const [text, setText] = useState(
    "Sure, sending the report to jane.smith@acme.com (SSN 123-45-6789)."
  );
  const [rows, setRows] = useState<Finding[]>([]);
  const [enabled, setEnabled] = useState<string[]>(["pii", "credential", "code"]);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState("-");
  const [error, setError] = useState("");
  let id = 0;
  const nextId = () => ++id + Date.now();

  function toggleDetector(detId: string) {
    setEnabled((prev) =>
      prev.includes(detId) ? prev.filter((d) => d !== detId) : [...prev, detId]
    );
  }

  async function scan() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await scanModule("data_loss_prevention", t);
      const r = data.result as {
        action?: string;
        risk_score?: number;
        findings?: Array<{ type?: string; subtype?: string; severity?: string; count?: number }>;
      };
      setAction(String(r.action ?? "-"));
      const mapped: Finding[] = (r.findings ?? []).map((f) => {
        const kind =
          f.type === "credential" ? "SECRET" : f.type === "pii" ? "PHI" : "CODE";
        return {
          id: nextId(),
          kind,
          title: f.subtype ? String(f.subtype).replace(/_/g, " ") : kind.toLowerCase(),
          desc: `${f.count ?? 1} match(es) · severity ${f.severity ?? "-"}`,
          tone:
            kind === "SECRET"
              ? "text-crit border-crit/30 bg-crit/10"
              : kind === "PHI"
                ? "text-warn border-warn/30 bg-warn/10"
                : "text-steel border-line-strong bg-white/[0.03]",
        };
      });
      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  const visible = rows.filter((r) =>
    enabled.includes(r.kind === "SECRET" ? "credential" : r.kind === "PHI" ? "pii" : "code")
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {[
          ["engine action", action, "live verdict"],
          ["findings this scan", String(rows.length), "shown below"],
          ["detectors on", `${enabled.length} of 3`, "toggle on the right"],
          ["direction", "output", "payloads leaving models"],
        ].map(([k, v, d]) => (
          <div key={k} className="bg-bg px-5 py-5">
            <div className="font-mono text-[24px] font-medium tabular-nums">{v}</div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
              <span className="text-faint">{k}</span>
              <span className="text-dim">{d}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="panel flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
              <span className="dot animate-status bg-ok" />
              inspect a payload
            </span>
            <button
              onClick={scan}
              disabled={busy}
              className="inline-flex h-8 items-center rounded bg-ink px-3.5 text-[12px] font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
            >
              {busy ? "scanning…" : "scan payload"}
            </button>
          </div>
          <div className="border-b border-line px-5 py-3.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              spellCheck={false}
              className="w-full rounded border border-line bg-sunken p-3 font-mono text-[12.5px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            {error !== "" && <p className="mt-2 font-mono text-[11.5px] text-crit">{error}</p>}
          </div>
          <div className="min-h-[220px] flex-1 space-y-0.5 overflow-hidden p-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((r) => (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2.5 rounded px-2.5 py-2 hover:bg-white/[0.03]"
                >
                  <span className={cn("w-[64px] shrink-0 rounded border px-1.5 py-0.5 text-center font-mono text-[10px] font-medium", r.tone)}>
                    {r.kind}
                  </span>
                  <span className="truncate font-mono text-[12px] text-ink/85">
                    {r.title} <span className="text-faint">{r.desc}</span>
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {visible.length === 0 && (
              <p className="px-2.5 py-6 font-mono text-[12px] text-faint">
                {rows.length === 0
                  ? "Run a scan to see live DLP findings."
                  : "All findings filtered out by disabled detectors."}
              </p>
            )}
          </div>
          <div className="border-t border-line px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            findings stream from the live DLP brain
          </div>
        </div>

        <div className="panel overflow-hidden rounded-lg">
          <div className="border-b border-line px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            detectors
          </div>
          <ul>
            {DETECTOR_DEFS.map((d) => (
              <li key={d.id} className="flex items-center gap-3.5 border-b border-line/60 px-5 py-4 last:border-b-0">
                <button
                  role="switch"
                  aria-checked={enabled.includes(d.id)}
                  aria-label={`Detect ${d.name}`}
                  onClick={() => toggleDetector(d.id)}
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
                    enabled.includes(d.id) ? "border-ink/60 bg-ink" : "border-line-strong bg-sunken"
                  )}
                >
                  <span className={cn("absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all", enabled.includes(d.id) ? "left-[18px] bg-bg" : "left-[3px] bg-faint")} />
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{d.name}</span>
                  <span className="block truncate font-mono text-[11px] text-faint">{d.desc}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            toggles filter which live finding types are shown
          </div>
        </div>
      </div>
    </div>
  );
}
