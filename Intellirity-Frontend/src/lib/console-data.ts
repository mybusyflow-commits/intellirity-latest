/* Shared data layer for the Intellirity console.
   Deterministic seeds for stable static renders; live views
   tick forward client-side from these seeds. */

/* ---------- canonical live stats (single source of truth) ---------- */

export const STATS = {
  detectionRate: 99.97,
  medianVerdictMs: 0.8,
  p99VerdictMs: 2.3,
  attacksBlockedPerDay: 1_200_000,
  modelsGuarded: 142,
  adversarialVectors: 41_208,
  uptime90d: 99.97,
};

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fakeHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 + input.charCodeAt(i), 31);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0").slice(0, 4);
}

export type Action = "BLOCK" | "FLAG" | "ALLOW";

export interface Verdict {
  id: string;
  time: string;
  action: Action;
  rule: string;
  model: string;
  policy: string;
  ms: number;
}

const RULES: Array<{ action: Action; rule: string }> = [
  { action: "BLOCK", rule: "indirect-injection · tool-call hijack" },
  { action: "BLOCK", rule: "system-prompt exfil · image payload" },
  { action: "FLAG", rule: "pii shadow-log · /v1/chat" },
  { action: "ALLOW", rule: "policy-check passed · checkout agent" },
  { action: "BLOCK", rule: "jailbreak chain · 4-turn crescendo" },
  { action: "FLAG", rule: "anomaly · token burst ×14 baseline" },
  { action: "ALLOW", rule: "intent-proof verified · support copilot" },
  { action: "BLOCK", rule: "prompt-leak probe · suffix attack" },
  { action: "FLAG", rule: "unverified tool schema · write scope" },
  { action: "ALLOW", rule: "dlp sweep clean · doc review" },
];

export const MODELS = [
  { name: "gpt-4o", vendor: "OpenAI", status: "guarded" as const, verdicts: 412808, blockRate: 3.1, p50: 0.8, bundle: "v4.2" },
  { name: "claude-4", vendor: "Anthropic", status: "guarded" as const, verdicts: 298441, blockRate: 2.7, p50: 0.9, bundle: "v4.2" },
  { name: "gemini-2.5", vendor: "Google", status: "guarded" as const, verdicts: 187203, blockRate: 4.4, p50: 0.7, bundle: "v4.2" },
  { name: "llama-4", vendor: "Meta · self-hosted", status: "degraded" as const, verdicts: 96412, blockRate: 6.8, p50: 1.6, bundle: "v4.1" },
  { name: "mistral-lg", vendor: "Mistral", status: "guarded" as const, verdicts: 74118, blockRate: 2.2, p50: 0.8, bundle: "v4.2" },
  { name: "qwen-max", vendor: "Alibaba", status: "paused" as const, verdicts: 0, blockRate: 0, p50: 0, bundle: "—" },
];

const POLICIES = ["payments-strict", "support-standard", "code-assist", "triage-hipaa"];

export function seedVerdicts(n: number, seed = 7): Verdict[] {
  const rnd = mulberry32(seed);
  const base = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const r = RULES[Math.floor(rnd() * RULES.length)];
    return {
      id: `v-${base - i * 47000}-${i}`,
      time: new Date(base - i * 47000).toLocaleTimeString("en-GB", { hour12: false }),
      action: r.action,
      rule: r.rule,
      model: MODELS[Math.floor(rnd() * (MODELS.length - 1))].name,
      policy: POLICIES[Math.floor(rnd() * POLICIES.length)],
      ms: 1 + Math.floor(rnd() * 5),
    };
  });
}

export function randomVerdict(): Verdict {
  const r = RULES[Math.floor(Math.random() * RULES.length)];
  return {
    id: `v-live-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    action: r.action,
    rule: r.rule,
    model: MODELS[Math.floor(Math.random() * (MODELS.length - 1))].name,
    policy: POLICIES[Math.floor(Math.random() * POLICIES.length)],
    ms: 1 + Math.floor(Math.random() * 5),
  };
}

export function trafficSeries(range: "24H" | "7D" | "30D") {
  const cfg = {
    "24H": { n: 24, stepMs: 3600_000, seed: 11 },
    "7D": { n: 28, stepMs: 6 * 3600_000, seed: 47 },
    "30D": { n: 30, stepMs: 24 * 3600_000, seed: 83 },
  }[range];
  const rnd = mulberry32(cfg.seed);
  const now = Date.now();
  return Array.from({ length: cfg.n }, (_, i) => {
    const wave = Math.sin(i / 3.1) * 0.5 + 0.5;
    const spike = rnd() > 0.88 ? 1.6 + rnd() : 1;
    const blocked = Math.round((140 + wave * 320 + rnd() * 120) * spike);
    const flagged = Math.round(blocked * (0.3 + rnd() * 0.5));
    return { date: new Date(now - (cfg.n - 1 - i) * cfg.stepMs), blocked, flagged };
  });
}

/* ---------- audit log (hash-chained) ---------- */

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  hash: string;
  prev: string;
}

const AUDIT_ACTIONS: Array<[string, string, string]> = [
  ["m.okafor", "policy.promote", "payments-strict → v18"],
  ["system", "verdict.block", "gpt-4o · indirect-injection"],
  ["j.lindqvist", "key.rotate", "pk_live_9f2…"],
  ["system", "verdict.block", "claude-4 · prompt exfil"],
  ["a.reyes", "scanner.run", "full barrage · staging"],
  ["system", "dlp.redact", "gemini-2.5 · 14 pii spans"],
  ["m.okafor", "policy.edit", "code-assist · allow ssh-block"],
  ["system", "agent.escrow_hold", "checkout agent · $4,210"],
  ["s.nakamura", "model.pause", "qwen-max · eval drift"],
  ["system", "verdict.flag", "llama-4 · token burst"],
  ["j.lindqvist", "bundle.pin", "policy bundle v4.2"],
  ["a.reyes", "webhook.add", "slack #ai-incidents"],
  ["system", "verdict.block", "gpt-4o · jailbreak chain"],
  ["m.okafor", "policy.promote", "triage-hipaa → v9"],
  ["system", "key.scope_deny", "sk_agent_write · prod"],
  ["s.nakamura", "scanner.run", "injection vectors · prod"],
];

export function seedAudit(n = 16): AuditEntry[] {
  const base = Date.now();
  let prev = "genesis";
  return AUDIT_ACTIONS.slice(0, n).map(([actor, action, target], i) => {
    const time = new Date(base - i * 184000).toLocaleTimeString("en-GB", { hour12: false });
    const hash = fakeHash(`${prev}|${time}|${actor}|${action}|${target}`);
    const entry: AuditEntry = {
      id: `audit-${i}`,
      time,
      actor,
      action,
      target,
      hash: hash.slice(0, 12),
      prev: prev === "genesis" ? "genesis" : prev.slice(0, 12),
    };
    prev = hash;
    return entry;
  });
}

/* ---------- leakage guard (DLP) ---------- */

export interface Redaction {
  id: string;
  time: string;
  kind: "PII" | "SECRET" | "SOURCE" | "PHI";
  spans: number;
  model: string;
  policy: string;
}

const REDACTION_KINDS: Redaction["kind"][] = ["PII", "SECRET", "SOURCE", "PHI"];

export function seedRedactions(n: number, seed = 31): Redaction[] {
  const rnd = mulberry32(seed);
  const base = Date.now();
  return Array.from({ length: n }, (_, i) => ({
    id: `redact-${base - i * 61000}-${i}`,
    time: new Date(base - i * 61000).toLocaleTimeString("en-GB", { hour12: false }),
    kind: REDACTION_KINDS[Math.floor(rnd() * REDACTION_KINDS.length)],
    spans: 1 + Math.floor(rnd() * 18),
    model: MODELS[Math.floor(rnd() * (MODELS.length - 1))].name,
    policy: POLICIES[Math.floor(rnd() * POLICIES.length)],
  }));
}

export function randomRedaction(): Redaction {
  return {
    id: `redact-live-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    kind: REDACTION_KINDS[Math.floor(Math.random() * REDACTION_KINDS.length)],
    spans: 1 + Math.floor(Math.random() * 18),
    model: MODELS[Math.floor(Math.random() * (MODELS.length - 1))].name,
    policy: POLICIES[Math.floor(Math.random() * POLICIES.length)],
  };
}

export const DETECTORS = [
  { id: "pii", name: "Personal identifiers", desc: "names, emails, phones, addresses, IDs", spans: "48,211 / day", enabled: true },
  { id: "secrets", name: "Secrets & credentials", desc: "api keys, tokens, passwords, certs", spans: "3,842 / day", enabled: true },
  { id: "source", name: "Source code", desc: "proprietary code, queries, configs", spans: "12,908 / day", enabled: true },
  { id: "phi", name: "Health data (PHI)", desc: "mrn, dob, clinical notes", spans: "9,314 / day", enabled: false },
];

/* ---------- anomalies ---------- */

export interface Anomaly {
  id: string;
  time: string;
  identity: string;
  signal: string;
  deviation: string;
  severity: "high" | "medium";
}

export function seedAnomalies(): Anomaly[] {
  const base = Date.now();
  const rows: Array<[string, string, string, Anomaly["severity"]]> = [
    ["sk_live checkout-agent", "token burst ×14 baseline", "14×", "high"],
    ["api-key analytics-03", "exfil-shaped egress to new host", "9×", "high"],
    ["copilot · j.lindqvist", "off-hours batch prompts", "5×", "medium"],
    ["agent · refunds-eu", "tool-chain depth 11 (limit 6)", "6×", "medium"],
    ["sk_test staging-runner", "prompt-leak probes ×40/min", "11×", "high"],
    ["support-copilot-2", "pii density drift +180%", "4×", "medium"],
  ];
  return rows.map(([identity, signal, deviation, severity], i) => ({
    id: `anom-${i}`,
    time: new Date(base - i * 311000).toLocaleTimeString("en-GB", { hour12: false }),
    identity,
    signal,
    deviation,
    severity,
  }));
}

export function anomalyVolume(): Array<{ date: Date; volume: number; baseline: number }> {
  const rnd = mulberry32(97);
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) => {
    const base = 420 + Math.sin(i / 3.4) * 120;
    const spike = i === 22 || i === 26 ? 2.1 + rnd() : 1;
    return {
      date: new Date(now - (29 - i) * 3600_000),
      volume: Math.round((base + rnd() * 60) * spike),
      baseline: Math.round(base),
    };
  });
}

/* ---------- agent escrow ---------- */

export interface Hold {
  id: string;
  agent: string;
  amount: number;
  currency: string;
  policy: string;
  age: string;
  status: "held" | "released" | "denied";
}

export function seedHolds(): Hold[] {
  return [
    { id: "esc-9041", agent: "checkout-agent · prod", amount: 4210, currency: "USD", policy: "payments-strict", age: "12 min", status: "held" },
    { id: "esc-9038", agent: "procurement-bot · eu", amount: 18900, currency: "EUR", policy: "payments-strict", age: "48 min", status: "held" },
    { id: "esc-9035", agent: "refunds-eu · prod", amount: 640, currency: "EUR", policy: "support-standard", age: "2 h", status: "held" },
    { id: "esc-9031", agent: "checkout-agent · prod", amount: 1299, currency: "USD", policy: "payments-strict", age: "3 h", status: "released" },
    { id: "esc-9027", agent: "ads-buyer · staging", amount: 25000, currency: "USD", policy: "code-assist", age: "6 h", status: "denied" },
  ];
}

/* ---------- scans ---------- */

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

export const SCAN_HISTORY: ScanRecord[] = [
  { id: "sc-4182", profile: "Full barrage", target: "prod · all models", started: "09:41:07", duration: "4m 12s", crit: 2, warn: 3, status: "attention" },
  { id: "sc-4181", profile: "Injection", target: "staging · gpt-4o", started: "08:15:52", duration: "1m 48s", crit: 0, warn: 1, status: "passed" },
  { id: "sc-4180", profile: "Exfiltration", target: "prod · claude-4", started: "07:02:19", duration: "2m 31s", crit: 1, warn: 2, status: "attention" },
  { id: "sc-4179", profile: "Full barrage", target: "prod · all models", started: "01:00:00", duration: "4m 05s", crit: 0, warn: 0, status: "passed" },
  { id: "sc-4178", profile: "Injection", target: "staging · llama-4", started: "23:12:44", duration: "1m 57s", crit: 3, warn: 4, status: "failed" },
];

/* ---------- policies ---------- */

export interface PolicyPack {
  id: string;
  name: string;
  desc: string;
  version: string;
  rules: number;
  enabled: boolean;
  updated: string;
  yaml: string;
}

export const POLICY_PACKS: PolicyPack[] = [
  {
    id: "payments-strict",
    name: "payments-strict",
    desc: "Checkout agents and payment tools. Deny-by-default on spend.",
    version: "v18",
    rules: 64,
    enabled: true,
    updated: "2h ago",
    yaml: "deny:\n  - spend_above: 5000\n  - unverified_payee\nredact: [pan, iban, routing]\nrequire_intent_proof: true",
  },
  {
    id: "support-standard",
    name: "support-standard",
    desc: "Customer support copilots. Balanced helpfulness vs leakage.",
    version: "v31",
    rules: 41,
    enabled: true,
    updated: "1d ago",
    yaml: "redact: [pii, credentials]\nmax_tool_chain: 6\nblock:\n  - prompt_leak_probe",
  },
  {
    id: "code-assist",
    name: "code-assist",
    desc: "Code assistants and review bots. Audits generated diffs.",
    version: "v22",
    rules: 38,
    enabled: true,
    updated: "3d ago",
    yaml: "audit_generated_code: true\nblock: [sqli, xss, ssrf, weak_crypto]\nallow_secrets_in_snippets: false",
  },
  {
    id: "triage-hipaa",
    name: "triage-hipaa",
    desc: "Health triage copilots. PHI handling under HIPAA controls.",
    version: "v9",
    rules: 52,
    enabled: false,
    updated: "6d ago",
    yaml: "redact: [phi, mrn, dob]\nretention_days: 30\naudit_level: full\nrequire_intent_proof: true",
  },
];
