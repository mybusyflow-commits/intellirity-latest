const API_BASE = "/api/v1";

// Optional session-token provider (unused in open mode).
let authTokenGetter: (() => Promise<string | null>) | null = null;
export function setAuthTokenGetter(fn: (() => Promise<string | null>) | null) {
  authTokenGetter = fn;
}

export interface Stats {
  total_scans: number;
  active_threats: number;
  resolved_threats: number;
  average_risk_score: number;
  threats_high: number;
  security_score: number;
  models_monitored: number;
  compliance_score: number;
}

export interface ThreatEvent {
  id: string;
  threat_type: string;
  severity: string;
  source: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
}

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  tier: string;
  enabled: boolean;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch {
      // No session yet — leave header off; server decides if auth is required.
    }
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`API ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

interface SummaryResponse {
  security_score: number;
  threats_blocked: number;
  threats_active: number;
  threats_high: number;
  total_scans: number;
  average_risk_score: number;
  models_monitored: number;
  compliance_score: number;
}

export const api = {
  async getStats(): Promise<Stats> {
    const s = await req<SummaryResponse>("/system/summary");
    return {
      total_scans: s.total_scans,
      active_threats: s.threats_active,
      resolved_threats: s.threats_blocked,
      average_risk_score: s.average_risk_score,
      threats_high: s.threats_high,
      security_score: s.security_score,
      models_monitored: s.models_monitored,
      compliance_score: s.compliance_score,
    };
  },

  async getThreats(status: "active" | "resolved" | "" = ""): Promise<ThreatEvent[]> {
    const q = status ? `?status=${status}` : "";
    return req<ThreatEvent[]>(`/threats${q}`);
  },

  async getModules(): Promise<ModuleInfo[]> {
    const r = await req<{ modules: ModuleInfo[] }>("/modules");
    return r.modules;
  },

  async getScanHistory(): Promise<any[]> {
    const r = await req<{ scans: any[] }>("/scans/history");
    return r.scans ?? [];
  },

  async runModuleScan(moduleId: string, payload: any): Promise<any> {
    return req<any>(`/modules/${moduleId}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async runScan(payload: { text?: string; target?: string; modules?: string[] }): Promise<any> {
    return req<any>("/scans/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async reason(prompt: string, model: string = "hy3(free)"): Promise<string> {
    const r = await req<{ reasoning: string }>("/reasoning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model }),
    });
    return r.reasoning;
  },

  async realtimeIngest(payload: any): Promise<any> {
    return req<any>("/realtime/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async realtimeFeed(): Promise<any> {
    return req<any>("/realtime/feed");
  },
};