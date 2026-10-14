/* Intellirity Shield SDK for JavaScript/TypeScript (Node 18+ / browsers).
   Every call hits the live engine; nothing is simulated.
   const { Shield } = await import("./intellirity.js");
   const shield = new Shield("http://localhost:8000");
   console.log(await shield.checkJailbreak("Ignore all previous instructions")); */

const DEFAULT_BASE_URL = "http://localhost:8000";
const API_PREFIX = "/api/v1";
const TIMEOUT_MS = 10000;

export class Shield {
  constructor(baseUrl = DEFAULT_BASE_URL, apiKey = null) {
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  async #req(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (this.apiKey) headers["X-API-Key"] = this.apiKey;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(this.baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (r.status === 403) throw new Error("403 Forbidden: plan lacks this feature.");
      if (!r.ok) throw new Error(`request failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.json();
    } finally {
      clearTimeout(timer);
    }
  }

  #post(path, body) {
    return this.#req("POST", path, body);
  }

  #get(path) {
    return this.#req("GET", path);
  }

  #module(key, payload) {
    return this.#post(`${API_PREFIX}/modules/${key}/scan`, payload);
  }

  checkJailbreak(text) {
    return this.#module("jailbreak_injection_protection", { text, direction: "input" });
  }

  checkVibe(target, code = "") {
    return this.#module("vibe_code_security", { target, code, target_type: "code" });
  }

  checkDlp(text, direction = "input") {
    return this.#module("data_loss_prevention", { text, direction });
  }

  moderate(text, direction = "input") {
    return this.#module("content_moderation", { text, direction });
  }

  scan(text, modules = ["jailbreak_injection_protection", "vibe_code_security", "data_loss_prevention"]) {
    return this.#post(`${API_PREFIX}/scans/run`, { text, target: text, modules });
  }

  checkAction(action, agentId = "js-agent", toolCalls = []) {
    return this.#module("ai_action_policy_enforcer", { action, agent_id: agentId, tool_calls: toolCalls });
  }

  trackFlow(dataId, stages, classification = "internal") {
    return this.#module("data_flow_tracker", {
      data_id: dataId,
      pipeline_stages: (stages || []).map((s) => (typeof s === "string" ? { destination: s } : s)),
      data_classification: classification,
    });
  }

  auditWallet(sessionId, tokenUsage = {}, apiCalls = []) {
    return this.#module("denial_of_wallet_protector", { session_id: sessionId, token_usage: tokenUsage, api_calls: apiCalls });
  }

  verifySupply(modelSource, modelFormat = "unknown") {
    return this.#module("model_supply_chain_security", { model_source: modelSource, model_format: modelFormat });
  }

  issueIntent(humanId, instruction, scope = []) {
    return this.#module("verifiable_proof_of_intent", { human_id: humanId, instruction, action_scope: scope });
  }

  ledgerLog(decision, extra = {}) {
    return this.#module("black_box_ledger", { action: "log", ai_decision: decision, ...extra });
  }

  ledgerVerify() {
    return this.#module("black_box_ledger", { action: "verify" });
  }

  async escrowCreate(agentId, amount) {
    return this.#module("autonomous_escrow", { action: "create", agent_id: agentId, amount });
  }

  escrowVerify(escrowId) {
    return this.#module("autonomous_escrow", { action: "verify", escrow_id: escrowId });
  }

  escrowReject(escrowId) {
    return this.#module("autonomous_escrow", { action: "reject", escrow_id: escrowId });
  }

  summary() {
    return this.#get(`${API_PREFIX}/system/summary`);
  }

  threats() {
    return this.#get(`${API_PREFIX}/threats`);
  }

  resolveThreat(id) {
    return this.#post(`${API_PREFIX}/threats/${encodeURIComponent(id)}/resolve`, {});
  }

  threatIntel(limit = 5) {
    return this.#module("threat_intelligence_feed", { type: "all", limit });
  }

  createOrg(name, slug) {
    return this.#post(`${API_PREFIX}/organizations/`, { name, slug });
  }

  proxyChat(messages, opts = {}) {
    return this.#post(`${API_PREFIX}/proxy/chat`, { messages, ...opts });
  }
}
