/* Live engine client. Same-origin /backend rewrite (next.config.ts)
   proxies to the FastAPI brain. Every number on screen comes from here. */

const BASE = "/backend";

/* Session token source, wired by <AuthBridge/> when Clerk is configured.
   Without it (keyless local dev) requests simply carry no auth header and
   the backend stays in open mode. */
let tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: (() => Promise<string | null>) | null) {
  tokenGetter = fn;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch {
      /* unauthenticated request */
    }
  }
  const r = await fetch(BASE + path, {
    headers,
    cache: "no-store",
    ...init,
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    // The raw body can contain internal detail (stack fragments, SQL text).
    // Surface a concise, safe message; the full body stays server-side.
    let detail = "";
    try {
      const parsed = JSON.parse(body);
      detail = typeof parsed?.detail === "string" ? parsed.detail : "";
    } catch {
      /* not JSON */
    }
    throw new Error(detail || `Request failed (HTTP ${r.status})`);
  }
  return r.json() as Promise<T>;
}

export interface Summary {
  security_score: number;
  threats_blocked: number;
  threats_active: number;
  threats_high: number;
  models_monitored: number;
  compliance_score: number;
  total_scans: number;
  average_risk_score: number;
  synthetic_threats?: number;
  sample_threats?: number;
  demo_feed?: boolean;
}

export interface Threat {
  id: string;
  threat_type: string;
  severity: string;
  source: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
  origin?: "detection" | "synthetic" | "sample";
}

export interface ScanRun {
  scan: { id: string; target: string; risk_score: number };
  module_results: Record<string, Record<string, unknown>>;
  max_risk_score: number;
  total_findings: number;
}

export interface ModuleScan {
  module_id: string;
  module_name: string;
  result: Record<string, unknown>;
}

export const getSummary = () => req<Summary>("/system/summary");
export const getThreats = () => req<Threat[]>("/threats");

export interface ThreatPage {
  items: Threat[];
  next_cursor: string | null;
  has_more: boolean;
}

export function getThreatsPage(opts: { limit?: number; cursor?: string | null; severity?: string } = {}) {
  const q = new URLSearchParams();
  if (opts.limit) q.set("limit", String(opts.limit));
  if (opts.cursor) q.set("cursor", opts.cursor);
  if (opts.severity) q.set("severity", opts.severity);
  const qs = q.toString();
  return req<ThreatPage>(`/threats${qs ? `?${qs}` : ""}`);
}

export function runScan(
  target: string,
  modules: string[] = [
    "jailbreak_injection_protection",
    "vibe_code_security",
    "data_loss_prevention",
  ]
) {
  return req<ScanRun>("/scans/run", {
    method: "POST",
    body: JSON.stringify({ text: target, target, modules }),
  });
}

export function scanModule(key: string, text: string, extra?: Record<string, unknown>) {
  return req<ModuleScan>(`/modules/${encodeURIComponent(key)}/scan`, {
    method: "POST",
    body: JSON.stringify({
      text,
      direction: "input",
      target: text,
      code: text,
      url: text,
      target_type: text.trim().startsWith("http") ? "url" : "code",
      ...(extra ?? {}),
    }),
  });
}

export function createOrg(name: string, slug: string) {
  return req<{ id: string; name: string; slug: string }>("/organizations/", {
    method: "POST",
    body: JSON.stringify({ name, slug }),
  });
}

export function sendContact(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstile_token?: string;
}) {
  return req<{ ok: boolean; ticket: string; message: string }>("/system/contact", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface Job {
  job_id: string;
  kind: string;
  status: "queued" | "running" | "done" | "failed";
  result: ScanRun | null;
  error: string | null;
  attempts: number;
}

export function createJob(kind: "sweep" | "reasoning", payload: Record<string, unknown>) {
  return req<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify({ kind, ...payload }),
  });
}

export function getJob(id: string) {
  return req<Job>(`/jobs/${encodeURIComponent(id)}`);
}

export function resolveThreat(id: string) {
  return req<Threat>(`/threats/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
  });
}

export function ledger(action: string, payload: Record<string, unknown> = {}) {
  return req<Record<string, unknown>>("/modules/black_box_ledger/scan", {
    method: "POST",
    body: JSON.stringify({ action, ...payload }),
  });
}

/* ---------- workspace (model endpoints + policy packs) ---------- */

export interface ModelEndpoint {
  id: string;
  kind: string;
  paused: boolean;
  last_risk: number | null;
  last_scan: string | null;
  created_at: string;
}

export interface PolicyPack {
  id: string;
  name: string;
  desc: string;
  version: string;
  rules: number;
  enabled: boolean;
  updated_at: string;
  promoted_at: string | null;
  promoted_by: string | null;
  approved_by?: string[];
  promotions?: number;
  yaml: string;
}

export const getModelEndpoints = () =>
  req<{ models: ModelEndpoint[] }>("/workspace/models");

export const registerModelEndpoint = (id: string, kind = "Custom") =>
  req<{ model: ModelEndpoint }>("/workspace/models", {
    method: "POST",
    body: JSON.stringify({ id, kind }),
  });

export const setModelEndpointStatus = (id: string, paused: boolean) =>
  req<{ model: ModelEndpoint }>(`/workspace/models/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: JSON.stringify({ paused }),
  });

export const recordModelScan = (id: string, riskScore: number) =>
  req<{ model: ModelEndpoint }>(`/workspace/models/${encodeURIComponent(id)}/scan-result`, {
    method: "POST",
    body: JSON.stringify({ risk_score: riskScore }),
  });

export const getPolicyPacks = () => req<{ policies: PolicyPack[] }>("/workspace/policies");

export const setPolicyEnabled = (id: string, enabled: boolean) =>
  req<{ policy: PolicyPack }>(`/workspace/policies/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });

export const promotePolicyPack = (id: string) =>
  req<{ policy: PolicyPack; approved: boolean; approvals?: number; needs_second_approver?: boolean }>(
    `/workspace/policies/${encodeURIComponent(id)}/promote`,
    { method: "POST" }
  );

/* ---------- billing ---------- */

export interface Product {
  id: string;
  name: string;
  price: number;
  blurb: string;
  engines: string[];
  href: string;
  tier: "basic" | "core";
}

export interface CheckoutResult {
  order_id: string;
  total_inr: number;
  status: string;
  modules: string[];
  razorpay_order_id?: string;
  amount?: number;
  currency?: string;
  key_id?: string;
}

export const getProducts = () =>
  req<{ products: Product[]; currency: string; enforced: boolean; payment: string }>(
    "/billing/products"
  );

export const checkoutBundle = (modules: string[]) =>
  req<CheckoutResult>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ modules }),
  });

export interface VerifyPayload {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const verifyPayment = (payload: VerifyPayload) =>
  req<{ order: CheckoutResult; owned: string[] }>("/billing/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
