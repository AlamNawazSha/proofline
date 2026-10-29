import pytest
from fastapi.testclient import TestClient
from backend import engine as e, main as m
from backend.store import Store
from backend.crypto_passport import canonical_fingerprint, sign_passport, verify_passport


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(m, "local", Store(tmp_path / "tests2.db"))
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "private2")
    m.PRIVATE.mkdir()
    m.known.clear()
    m.limits.clear()
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(m.app) as c:
        assert c.post("/api/demo").status_code == 200
        yield c


def test_ed25519_passport_signature_and_tamper_detection():
    """Verify Ed25519 digital signature and detect 1-character content tamper."""
    text = "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary."
    raw = {
        "id": "RCP-TEST-001",
        "documentId": "DOC-001",
        "revision": 1,
        "sourceVersion": 1,
        "policyVersion": 1,
        "fingerprint": canonical_fingerprint(text),
        "reviewer": "Jordan Lee",
        "decision": "approved",
        "timestamp": "2026-10-29T12:00:00Z",
    }
    signed = sign_passport(raw)
    assert signed.get("signature")
    assert signed.get("signatureAlgorithm") == "Ed25519"
    assert signed.get("publicKey")

    # 1. Unaltered candidate text passes
    res_clean = verify_passport(signed, candidate_text=text)
    assert res_clean["valid"]
    assert res_clean["status"] == "AUTHENTIC_AND_VERIFIED"
    assert not res_clean["tamperDetected"]

    # 2. Altered candidate text (1 single character change) FAILS integrity check
    tampered_text = text.replace("20%", "21%")
    res_tampered = verify_passport(signed, candidate_text=tampered_text)
    assert not res_tampered["valid"]
    assert res_tampered["tamperDetected"]
    assert res_tampered["status"] == "CONTENT_INTEGRITY_COMPROMISED"


def test_graph_endpoint(client):
    """Verify evidence graph returns connected nodes and edges from persisted state."""
    r = client.get("/api/graph")
    assert r.status_code == 200
    data = r.json()
    assert "nodes" in data and "edges" in data
    assert any(n["type"] == "source" for n in data["nodes"])
    assert any(n["type"] == "rule" for n in data["nodes"])
    assert any(n["type"] == "document" for n in data["nodes"])


def test_risk_intelligence_endpoint(client):
    """Verify risk matrix and evidence coverage metrics are derived from stored state."""
    r = client.get("/api/risk/intelligence")
    assert r.status_code == 200
    data = r.json()
    assert "severityCounts" in data
    assert "evidenceCoveragePct" in data
    assert "totalDocuments" in data
    assert "openFindings" in data


def test_impact_cascade_endpoint(client):
    """Verify downstream change impact cascades to affected rules and documents."""
    st = client.get("/api/state").json()
    sid = st["sources"][0]["id"]
    r = client.get(f"/api/impact/{sid}")
    assert r.status_code == 200
    data = r.json()
    assert data["changedSourceId"] == sid
    assert data["affectedRulesCount"] >= 1


def test_adversarial_benchmark_runner(client):
    """Verify the 12-case adversarial evaluation lab runs and reports precision/recall/F1."""
    r = client.post("/api/benchmark/run")
    assert r.status_code == 200
    data = r.json()
    assert data["totalCases"] >= 10
    assert "precision" in data
    assert "recall" in data
    assert "f1Score" in data
    assert "accuracy" in data
    assert len(data["cases"]) == data["totalCases"]


def test_audit_ledger_hash_chain_verification(client):
    """Verify the append-only SHA-256 hash-chained audit ledger."""
    r = client.get("/api/audit/verify")
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is True
    assert data["totalEvents"] >= 1
    assert "Hash chain" not in data.get("message", "")


def test_ssrf_protection_in_ingestion(client):
    """Verify SSRF guards block internal network access attempts."""
    # Switch to manager to access ingestion
    client.post("/api/persona", json={"data": {"role": "manager"}})
    
    # Try localhost
    r1 = client.post("/api/sources/ingest", json={"data": {"url": "http://127.0.0.1:8000/api/state"}})
    assert r1.status_code == 422
    assert "SSRF" in r1.text or "blocked" in r1.text or "loopback" in r1.text

    # Try AWS/GCP metadata IP
    r2 = client.post("/api/sources/ingest", json={"data": {"url": "http://169.254.169.254/latest/meta-data"}})
    assert r2.status_code == 422
    assert "SSRF" in r2.text or "blocked" in r2.text or "metadata" in r2.text


def test_nl_policy_builder(client):
    """Verify Natural-Language Policy Builder generates structured rule candidates."""
    client.post("/api/persona", json={"data": {"role": "manager"}})
    r = client.post(
        "/api/policies/build-nl",
        json={"data": {"description": "Never allow claims guaranteeing 100% success or zero risk."}},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["proposedRule"]["kind"] == "prohibited"
    assert len(data["proposedRule"]["testCases"]) >= 2


def test_demo_reset(client):
    """Verify 1-click Demo Reset initializes all 9 rich hackathon scenarios."""
    r = client.post("/api/demo/reset")
    assert r.status_code == 200
    st = client.get("/api/state").json()
    # 4 sources
    assert len(st["sources"]) >= 4
    # Multiple documents
    assert len(st["documents"]) >= 4
    # Receipts present
    assert len(st["receipts"]) >= 1
