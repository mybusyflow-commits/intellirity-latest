/* Shared console types.

   This file used to hold a large seeded dataset (fake verdict counts, fake
   audit actors, fake escrow holds, fake traffic series). None of it was
   reachable from live views, and keeping it around only invites fabricated
   numbers leaking back into the UI. Live data now comes from the engine
   via @/lib/api; only the shapes are shared from here. */

/* ---------- verdicts ---------- */

export type Action = "BLOCK" | "FLAG" | "ALLOW";

export interface Verdict {
  id: string;
  time: string;
  action: Action;
  rule: string;
  model: string;
  policy: string;
  ms: number;
  /** Where the row came from: "engine" (real detection), "demo feed", "sample". */
  origin?: string;
  /** Resolved or open. */
  state?: string;
}

/* ---------- scanner history ---------- */

export interface ScanRecord {
  id: string;
  profile: string;
  target: string;
  started: string;
  duration: string;
  crit: number;
  warn: number;
  status: "passed" | "attention" | "failed";
}
