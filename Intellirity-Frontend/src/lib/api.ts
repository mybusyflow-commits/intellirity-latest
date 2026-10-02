/* Live engine client. Same-origin /backend rewrite (next.config.ts)
   proxies to the FastAPI brain. Every number on screen comes from here. */

const BASE = "/backend";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${body.slice(0, 160)}`);
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
}

export interface Threat {
  id: string;
  threat_type: string;
  severity: string;
  source: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
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
}) {
  return req<{ ok: boolean; ticket: string; message: string }>("/system/contact", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
