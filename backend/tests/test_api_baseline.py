"""Baseline API tests. Written BEFORE the perf/UX changes; must pass today
and after every change below. Uses the live in-memory stores."""
import sys, os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)
P = "/api/v1"


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_summary_shape():
    r = client.get(f"{P}/system/summary")
    assert r.status_code == 200
    for k in ("security_score", "threats_blocked", "threats_active",
              "threats_high", "models_monitored", "total_scans"):
        assert k in r.json(), k


def test_threats_list_and_filters():
    r = client.get(f"{P}/threats")
    assert r.status_code == 200 and isinstance(r.json(), list)
    r = client.get(f"{P}/threats", params={"status": "active"})
    assert r.status_code == 200
    assert all(not t["is_resolved"] for t in r.json())
    r = client.get(f"{P}/threats", params={"severity": "high"})
    assert r.status_code == 200
    assert all(t["severity"] == "high" for t in r.json())


def test_threat_get_and_404():
    tid = client.get(f"{P}/threats").json()[0]["id"]
    assert client.get(f"{P}/threats/{tid}").status_code == 200
    assert client.get(f"{P}/threats/EVT-NOPE").status_code == 404


def test_module_scan_and_404_and_413():
    r = client.post(f"{P}/modules/jailbreak_injection_protection/scan",
                    json={"text": "hello", "direction": "input"})
    assert r.status_code == 200
    assert "result" in r.json()
    assert client.post(f"{P}/modules/nope/scan", json={}).status_code == 404
    big = "A" * 250_000
    r = client.post(f"{P}/modules/jailbreak_injection_protection/scan",
                    json={"text": big})
    assert r.status_code == 413


def test_scan_run_and_history():
    r = client.post(f"{P}/scans/run", json={
        "text": "hello world", "target": "baseline",
        "modules": ["jailbreak_injection_protection"]})
    assert r.status_code == 200
    body = r.json()
    assert "scan" in body and "module_results" in body
    r = client.get(f"{P}/scans/history")
    assert r.status_code == 200 and "scans" in r.json()


def test_escrow_lifecycle():
    c = client.post(f"{P}/modules/autonomous_escrow/scan",
                    json={"action": "create", "agent_id": "t", "amount": 5})
    assert c.status_code == 200
    eid = c.json()["result"]["escrow_id"]
    v = client.post(f"{P}/modules/autonomous_escrow/scan",
                    json={"action": "verify", "escrow_id": eid})
    assert v.status_code == 200


def test_ledger_log_verify():
    l = client.post(f"{P}/modules/black_box_ledger/scan",
                    json={"action": "log", "ai_decision": "baseline"})
    assert l.status_code == 200
    v = client.post(f"{P}/modules/black_box_ledger/scan", json={"action": "verify"})
    assert v.status_code == 200
    assert v.json()["result"]["valid"] is True


def test_vpi_issue_and_scope():
    r = client.post(f"{P}/modules/verifiable_proof_of_intent/scan", json={
        "human_id": "u", "instruction": "pay 1",
        "action_scope": ["payments.read"], "proposed_action": "payments.read"})
    assert r.status_code == 200
    res = r.json()["result"]
    assert res["certificate"] and res["action_verification"]["approved"] is True


def test_orgs_crud():
    import time as _t
    slug = f"base-{int(_t.time())}"
    c = client.post(f"{P}/organizations/", json={"name": "B", "slug": slug})
    assert c.status_code == 200
    oid = c.json()["id"]
    assert client.get(f"{P}/organizations/").status_code == 200
    assert client.get(f"{P}/organizations/{oid}").status_code == 200
    assert client.get(f"{P}/organizations/nope").status_code == 404


def test_realtime():
    i = client.post(f"{P}/realtime/ingest", json={"agent_id": "t", "action": "read docs"})
    assert i.status_code == 200
    f = client.get(f"{P}/realtime/feed")
    assert f.status_code == 200 and "events" in f.json()


def test_threats_pagination_stable():
    p1 = client.get(f"{P}/threats", params={"limit": 20}).json()
    assert set(p1) == {"items", "next_cursor", "has_more"}
    assert len(p1["items"]) <= 20
    if p1["has_more"]:
        p2 = client.get(f"{P}/threats", params={"limit": 20, "cursor": p1["next_cursor"]}).json()
        ids1 = {t["id"] for t in p1["items"]}
        ids2 = [t["id"] for t in p2["items"]]
        assert not (ids1 & set(ids2)), "page overlap = repeat bug"
        assert len(ids2) == len(set(ids2)), "dupes inside page 2"
    # filters compose with paging
    r = client.get(f"{P}/threats", params={"status": "active", "limit": 5})
    assert r.status_code == 200 and len(r.json()["items"]) <= 5
    # legacy shape untouched when no limit
    assert isinstance(client.get(f"{P}/threats").json(), list)
    # unknown cursor starts from the top
    r = client.get(f"{P}/threats", params={"limit": 5, "cursor": "EVT-NOPE"})
    assert r.status_code == 200 and len(r.json()["items"]) <= 5


def test_scans_history_pagination():
    r = client.get(f"{P}/scans/history", params={"limit": 5})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"scans", "next_cursor", "has_more"}
    assert isinstance(client.get(f"{P}/scans/history").json()["scans"], list)


def test_jobs_sweep_lifecycle():
    import time as _t
    c = client.post(f"{P}/jobs", json={
        "kind": "sweep", "text": "hello world", "target": "jobs-test",
        "modules": ["data_loss_prevention"]})
    assert c.status_code == 202, c.text
    jid = c.json()["job_id"]
    assert c.json()["status"] in ("queued", "running", "done")
    # Background worker finishes within seconds; poll for completion.
    final = None
    for _ in range(40):
        g = client.get(f"{P}/jobs/{jid}")
        assert g.status_code == 200
        if g.json()["status"] in ("done", "failed"):
            final = g.json()
            break
        _t.sleep(0.25)
    assert final is not None, "job never finished"
    assert final["status"] == "done", final.get("error")
    assert final["result"]["max_risk_score"] == 0.0
    assert final["attempts"] >= 1


def test_jobs_validation():
    assert client.post(f"{P}/jobs", json={"kind": "nope"}).status_code == 422
    assert client.post(f"{P}/jobs", json={"kind": "sweep"}).status_code == 422
    assert client.post(f"{P}/jobs", json={"kind": "reasoning"}).status_code == 422
    assert client.get(f"{P}/jobs/JOB-NOPE").status_code == 404
    assert "jobs" in client.get(f"{P}/jobs").json()


def test_health_reports_database_mode():
    h = client.get("/health").json()
    assert h["status"] == "healthy"
    assert h["database"] in ("connected", "memory")


def test_ledger_result_carries_record():
    import asyncio
    from app.db.persist import persist_ledger_record

    r = client.post(f"{P}/modules/black_box_ledger/scan",
                    json={"action": "log", "ai_decision": "persist-probe"}).json()["result"]
    assert isinstance(r.get("record"), dict)
    assert r["record"]["record_id"] == r["record_id"]
    # Memory mode (no Postgres here): dual-write is a safe no-op.
    assert asyncio.run(persist_ledger_record(r["record"])) is False


def _escrow(action, **kw):
    return client.post(f"{P}/modules/autonomous_escrow/scan", json={"action": action, **kw}).json()["result"]


def test_escrow_state_machine():
    c = _escrow("create", agent_id="sm", amount=25)
    assert c["status"] == "held" and c["escrow_id"]
    eid = c["escrow_id"]
    # bogus ids fail instead of echoing fake success
    assert _escrow("verify", escrow_id="NOPE-NOPE").get("error")
    assert _escrow("reject", escrow_id="NOPE-NOPE").get("error")
    # invalid amounts rejected, no phantom holds
    assert _escrow("create", agent_id="sm", amount=0).get("error")
    assert _escrow("create", agent_id="sm", amount=-3).get("error")
    # single transition only
    v = _escrow("verify", escrow_id=eid)
    assert v["status"] == "released"
    assert _escrow("verify", escrow_id=eid).get("error")
    assert _escrow("reject", escrow_id=eid).get("error")
    # second hold takes the reject path
    c2 = _escrow("create", agent_id="sm", amount=7)
    assert _escrow("reject", escrow_id=c2["escrow_id"])["status"] == "rejected"
    assert _escrow("verify", escrow_id=c2["escrow_id"]).get("error")
    # status introspection
    s = _escrow("status", escrow_id=eid)
    assert s["status"] == "released"


def test_contact_and_reasoning_empty():
    c = client.post(f"{P}/system/contact", json={
        "name": "T", "email": "t@example.com", "message": "hi"})
    assert c.status_code == 200 and c.json()["ok"] is True
    r = client.post(f"{P}/reasoning", json={"prompt": ""})
    assert r.status_code == 200 and "unavailable" in r.json()["reasoning"]
