"""Intellirity AI security SDK client.

One client for the whole platform: every detection module, the trust
machinery (ledger, escrow, proof-of-intent), threats, scans, and
organizations. All calls hit the live engine; nothing is simulated.

Example:
    from intellirity import Shield
    shield = Shield(base_url="http://localhost:8000")
    print(shield.check_jailbreak("Ignore all previous instructions"))
"""

import requests

DEFAULT_BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"
TIMEOUT_SECONDS = 10


class Shield:
    """Client for the Intellirity API."""

    def __init__(self, api_key=None, base_url="http://localhost:8000"):
        self.api_key = api_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")

    def _headers(self):
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    def _post(self, path, payload):
        url = self.base_url + path
        try:
            resp = requests.post(
                url, json=payload, headers=self._headers(), timeout=TIMEOUT_SECONDS
            )
        except requests.RequestException as exc:
            raise RuntimeError("request failed: %s" % exc)
        if resp.status_code == 403:
            raise PermissionError(
                "403 Forbidden: plan lacks this feature, upgrade required."
            )
        if resp.status_code >= 400:
            raise RuntimeError(
                "request failed with status %s: %s" % (resp.status_code, resp.text)
            )
        return resp.json()

    def _get(self, path):
        url = self.base_url + path
        try:
            resp = requests.get(url, headers=self._headers(), timeout=TIMEOUT_SECONDS)
        except requests.RequestException as exc:
            raise RuntimeError("request failed: %s" % exc)
        if resp.status_code >= 400:
            raise RuntimeError(
                "request failed with status %s: %s" % (resp.status_code, resp.text)
            )
        return resp.json()

    def _module(self, key, payload):
        return self._post(API_PREFIX + "/modules/" + key + "/scan", payload)

    # -- prompt & output guarding -------------------------------------------

    def check_jailbreak(self, text):
        """Scan text with the jailbreak protection module."""
        payload = {"text": text, "direction": "input"}
        return self._post(
            API_PREFIX + "/modules/jailbreak_injection_protection/scan", payload
        )

    def check_vibe(self, target, code=""):
        """Scan code with the vibe code security module."""
        payload = {"target": target, "code": code, "target_type": "code"}
        return self._post(API_PREFIX + "/modules/vibe_code_security/scan", payload)

    def check_dlp(self, text, direction="input"):
        """Scan text with the data loss prevention module."""
        payload = {"text": text, "direction": direction}
        return self._post(API_PREFIX + "/modules/data_loss_prevention/scan", payload)

    def moderate(self, text, direction="input"):
        """Score text with the content moderation module (7 categories)."""
        return self._module(
            "content_moderation", {"text": text, "direction": direction}
        )

    def check_advanced(self, text, agent_id="sdk", direction="input"):
        """Probe text with the advanced threat intelligence engine."""
        return self._module(
            "advanced_threat_intelligence",
            {"text": text, "agent_id": agent_id, "direction": direction},
        )

    def scan(self, text, modules=None):
        """Run a multi module scan."""
        if modules is None:
            modules = [
                "jailbreak_injection_protection",
                "vibe_code_security",
                "data_loss_prevention",
            ]
        payload = {"text": text, "target": text, "modules": modules}
        return self._post(API_PREFIX + "/scans/run", payload)

    # -- agent governance ----------------------------------------------------

    def check_action(self, action, agent_id="sdk-agent", tool_calls=None):
        """Test an agent action against the policy enforcer. Returns allowed bool."""
        return self._module(
            "ai_action_policy_enforcer",
            {"action": action, "agent_id": agent_id,
             "tool_calls": tool_calls or []},
        )

    def score_session(self, agent_id, session_history, session_id="",
                      current_action=None):
        """Score an agent session for drift and destructive behavior."""
        history = session_history or []
        return self._module(
            "behavioral_analysis_engine",
            {"agent_id": agent_id, "session_id": session_id,
             "current_action": current_action or (history[-1] if history else {}),
             "session_history": history},
        )

    def audit_mcp(self, tool_calls, mcp_servers=None, agent_permissions=None):
        """Audit MCP tool calls and servers for poisoning and misuse."""
        servers = []
        for s in mcp_servers or []:
            servers.append(s if isinstance(s, dict) else {"name": s, "tools": []})
        return self._module(
            "mcp_security_monitor",
            {"tool_calls": tool_calls or [], "mcp_servers": servers,
             "agent_permissions": agent_permissions or []},
        )

    def score_workflow(self, actions, workflow_id="", config=None):
        """Detect loops, runaway spend, and destructive sequences in a workflow."""
        return self._module(
            "workflow_anomaly_detector",
            {"workflow_id": workflow_id, "actions": actions or [],
             "config": config or {}},
        )

    def track_flow(self, data_id, pipeline_stages, data_classification="internal",
                   trusted_domains=None, blocked_domains=None):
        """Trace a data pipeline hop by hop. Stages accept destination/domain keys."""
        stages = []
        for s in pipeline_stages or []:
            stages.append(s if isinstance(s, dict) else {"destination": str(s)})
        return self._module(
            "data_flow_tracker",
            {"data_id": data_id, "pipeline_stages": stages,
             "data_classification": data_classification,
             "trusted_domains": trusted_domains or [],
             "blocked_domains": blocked_domains or []},
        )

    def audit_wallet(self, session_id, token_usage=None, api_calls=None, config=None):
        """Audit an AI spend session for runaway budgets and cost spikes."""
        return self._module(
            "denial_of_wallet_protector",
            {"session_id": session_id, "token_usage": token_usage or {},
             "api_calls": api_calls or [], "config": config or {}},
        )

    def verify_supply(self, model_source, model_format="unknown", expected_hash=""):
        """Verify a model source for poisoning, hash mismatch, unsafe format."""
        return self._module(
            "model_supply_chain_security",
            {"model_source": model_source, "model_format": model_format,
             "expected_hash": expected_hash},
        )

    # -- trust machinery -----------------------------------------------------

    def issue_intent(self, human_id, instruction, action_scope=None,
                     expiry_minutes=30, proposed_action=""):
        """Issue a signed proof-of-intent certificate, optionally verifying an action."""
        return self._module(
            "verifiable_proof_of_intent",
            {"human_id": human_id, "instruction": instruction,
             "action_scope": action_scope or [],
             "expiry_minutes": expiry_minutes, "proposed_action": proposed_action},
        )

    def ledger_log(self, ai_decision="", prompt="", action_taken="",
                   confidence_score=0.0, metadata=None):
        """Append a sealed record to the black-box ledger."""
        return self._module(
            "black_box_ledger",
            {"action": "log", "ai_decision": ai_decision, "prompt": prompt,
             "action_taken": action_taken, "confidence_score": confidence_score,
             "metadata": metadata or {}},
        )

    def ledger_verify(self):
        """Verify the hash chain of the black-box ledger."""
        return self._module("black_box_ledger", {"action": "verify"})

    def escrow_create(self, agent_id, amount):
        """Hold funds/value in autonomous escrow pending human review."""
        return self._module(
            "autonomous_escrow",
            {"action": "create", "agent_id": agent_id, "amount": amount},
        )

    def escrow_verify(self, escrow_id):
        """Release an escrow hold after verification."""
        return self._module(
            "autonomous_escrow", {"action": "verify", "escrow_id": escrow_id}
        )

    def escrow_reject(self, escrow_id):
        """Reject an escrow hold and return value to the maker."""
        return self._module(
            "autonomous_escrow", {"action": "reject", "escrow_id": escrow_id}
        )

    # -- threats, scans, system ----------------------------------------------

    def summary(self):
        """Live fleet summary: scores, counts, monitored models."""
        return self._get(API_PREFIX + "/system/summary")

    def threats(self, status=None, severity=None):
        """List threat events, optionally filtered by status/severity."""
        path = API_PREFIX + "/threats"
        query = []
        if status:
            query.append("status=" + status)
        if severity:
            query.append("severity=" + severity)
        if query:
            path += "?" + "&".join(query)
        return self._get(path)

    def resolve_threat(self, threat_id):
        """Mark a threat resolved."""
        return self._post(
            API_PREFIX + "/threats/" + str(threat_id) + "/resolve", {}
        )

    def threat_intel(self, feed_type="all", severity=None, limit=10):
        """Query the live threat intelligence feed."""
        payload = {"type": feed_type, "limit": limit}
        if severity:
            payload["severity"] = severity
        return self._module("threat_intelligence_feed", payload)

    def create_organization(self, name, slug):
        """Create a new organization."""
        payload = {"name": name, "slug": slug}
        return self._post(API_PREFIX + "/organizations/", payload)

    def ingest_event(self, event):
        """Ingest a live event into the real-time risk pipeline."""
        return self._post(API_PREFIX + "/realtime/ingest", event or {})

    def realtime_feed(self):
        """Read the rolling real-time risk feed."""
        return self._get(API_PREFIX + "/realtime/feed")
