"""Proofline 2.0 - Round 3 Final Submission Verification Suite.

Tests the three flagship Round 3 improvements delivered:
1. Evidence Lifecycle: Automatic Re-Review Queue
2. Measured Detection Quality for AI-Assisted Review (30-item evaluation benchmark)
3. Multi-Reviewer Approval Policy, Quorum & Explicit Revocation
Plus cryptographic Ed25519 release receipt tamper detection.
"""

import pytest
from fastapi.testclient import TestClient
from backend import engine as e, main as m
from backend.store import Store
from backend.crypto_passport import verify_passport


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(m, "local", Store(tmp_path / "r3.db"))
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "private_r3")
    m.PRIVATE.mkdir()
    m.known.clear()
    m.limits.clear()
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(m.app) as c:
        assert c.post("/api/demo").status_code == 200
        yield c


def test_re_review_queue_lifecycle(client):
    """Improvement 1: Verify automatic re-review queue generates tasks on source retirement and resolves them."""
    # Switch to manager
    assert client.post("/api/persona", json={"data": {"role": "manager"}}).status_code == 200
    
    st = client.get("/api/state").json()
    source_id = st["sources"][0]["id"]
    source_title = st["sources"][0]["title"]

    # Retire the source
    r_retire = client.post(f"/api/sources/{source_id}/retire")
    assert r_retire.status_code == 200
    retire_data = r_retire.json()
    assert retire_data["ok"] is True
    assert "tasksQueued" in retire_data

    # Check the Re-Review Queue
    r_q = client.get("/api/re-review-queue")
    assert r_q.status_code == 200
    q_data = r_q.json()
    assert len(q_data["tasks"]) >= 1
    assert q_data["pendingCount"] >= 1
    
    task = q_data["tasks"][0]
    assert task["trigger"] == "SOURCE_RETIRED"
    assert task["status"] == "pending"
    assert "assignee" in task

    # Resolve the task with an auditor note
    assert client.post("/api/persona", json={"data": {"role": "reviewer"}}).status_code == 200
    r_resolve = client.post(
        f"/api/re-review-queue/{task['id']}/resolve",
        json={"data": {"note": "Confirmed document wording re-anchored to active source pack v2."}},
    )
    assert r_resolve.status_code == 200
    res_task = r_resolve.json()
    assert res_task["status"] == "resolved"
    assert res_task["resolvedBy"] == "Jordan Lee"


def test_measured_detection_quality_30_case_benchmark(client):
    """Improvement 2: Execute frozen 30-item evaluation benchmark and verify precision, recall, FPR, and quote validity."""
    r = client.post("/api/benchmark/run")
    assert r.status_code == 200
    data = r.json()
    
    assert data["totalCases"] == 30
    assert data["accuracy"] >= 95.0
    assert data["precision"] >= 95.0
    assert data["recall"] >= 95.0
    assert data["f1Score"] >= 95.0
    assert data["quoteValidityRate"] == 100.0
    assert "falsePositiveRate" in data
    assert "falseNegativeRate" in data
    assert "breakdown" in data
    assert data["breakdown"]["annotators"] == 2
    assert len(data["cases"]) == 30


def test_multi_reviewer_quorum_enforcement(client, monkeypatch):
    """Improvement 3: Channel- and risk-driven quorum requires two distinct reviewers for high-risk copy."""
    monkeypatch.setenv("FEATURE_QUORUM", "true")
    # 1. Creator drafts a press release (high-risk channel requiring 2-reviewer quorum)
    d_draft = {
        "title": "Q4 Earnings & Product Release Notice",
        "text": "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.",
        "context": {"channel": "press_release", "audience": "public", "purpose": "Financial release"},
    }
    r_create = client.post("/api/documents", json={"data": d_draft})
    assert r_create.status_code == 200
    doc = r_create.json()

    # Run clean review and submit
    r_rev = client.post(f"/api/documents/{doc['id']}/review", json={"data": {"useAI": False}})
    assert r_rev.status_code == 200
    
    # Wait briefly for worker
    import time
    for _ in range(20):
        st = client.get("/api/state").json()
        doc = next(d for d in st["documents"] if d["id"] == doc["id"])
        if doc.get("review") and doc["review"]["status"] == "partial":
            break
        time.sleep(0.05)
    
    r_sub = client.post(f"/api/documents/{doc['id']}/submit")
    assert r_sub.status_code == 200

    # 2. First Reviewer approves -> Status must become 'quorum_pending' (1/2)
    client.post("/api/persona", json={"data": {"role": "reviewer", "name": "Reviewer 1", "id": "rev-1"}})
    r_app1 = client.post(
        f"/api/documents/{doc['id']}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "First peer review pass"}},
    )
    assert r_app1.status_code == 200
    dec1 = r_app1.json()
    assert dec1.get("outcome") in ("quorum_pending", "pending") or dec1.get("decision", {}).get("outcome") in ("quorum_pending", "pending")
    q_needed = dec1.get("quorumNeeded") or dec1.get("quorum", {}).get("required") or dec1.get("decision", {}).get("required")
    q_count = dec1.get("quorumCount") or dec1.get("quorum", {}).get("received") or dec1.get("decision", {}).get("received")
    assert q_needed == 2
    assert q_count == 1

    # Export must be BLOCKED because quorum is unsatisfied (only 1 of 2 approved)
    r_exp_blocked = client.get(f"/api/documents/{doc['id']}/export")
    assert r_exp_blocked.status_code == 409

    # Same reviewer cannot approve a second time to bypass quorum
    r_dup = client.post(
        f"/api/documents/{doc['id']}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Duplicate attempt"}},
    )
    assert r_dup.status_code in (403, 409)

    # 3. Second distinct reviewer approves -> Quorum 2/2 satisfied -> Fully Approved!
    client.post("/api/persona", json={"data": {"role": "manager", "name": "Reviewer 2 (Manager)", "id": "rev-2"}})
    r_app2 = client.post(
        f"/api/documents/{doc['id']}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Second manager quorum signoff"}},
    )
    assert r_app2.status_code == 200
    dec2 = r_app2.json()
    out2 = dec2.get("outcome") or dec2.get("decision", {}).get("outcome")
    q_count2 = dec2.get("quorumCount") or dec2.get("quorum", {}).get("received") or dec2.get("decision", {}).get("received")
    assert out2 == "approved"
    assert q_count2 == 2

    # Export now SUCCEEDS and produces an Ed25519 cryptographic release receipt
    r_exp = client.get(f"/api/documents/{doc['id']}/export")
    assert r_exp.status_code == 200
    exp_data = r_exp.json()
    receipt = exp_data["receipt"]
    assert receipt["signatureAlgorithm"] == "Ed25519"
    assert "signature" in receipt

    # 4. Explicit Approval Revocation
    r_revoke = client.post(
        f"/api/documents/{doc['id']}/revoke",
        json={"data": {"reason": "Material update to quarterly metrics requires re-evaluation."}},
    )
    assert r_revoke.status_code == 200
    assert r_revoke.json()["ok"] is True

    # Export must now be BLOCKED again
    r_exp_revoked = client.get(f"/api/documents/{doc['id']}/export")
    assert r_exp_revoked.status_code == 409


def test_ed25519_single_char_tamper_detection(client):
    """Verify bitwise document integrity: untouched document verifies, 1-character modification fails."""
    # Reset to rich demo state with pre-approved doc5 and receipt
    r_reset = client.post("/api/demo/reset")
    assert r_reset.status_code == 200
    st = client.get("/api/state").json()
    
    doc = next(d for d in st["documents"] if d["title"] == "Approved Q4 Executive Release Statement")
    rcp = st["receipts"][0]

    # Verify original unchanged document
    r_ver_clean = client.post(
        "/api/receipts/verify",
        json={"data": {"receipt": rcp, "candidateText": doc["text"]}},
    )
    assert r_ver_clean.status_code == 200
    res_clean = r_ver_clean.json()
    assert res_clean["valid"] is True
    assert res_clean["status"] == "AUTHENTIC_AND_VERIFIED"
    assert res_clean["tamperDetected"] is False

    # Modify single character: '20%' -> '21%'
    tampered_text = doc["text"].replace("20%", "21%")
    r_ver_tampered = client.post(
        "/api/receipts/verify",
        json={"data": {"receipt": rcp, "candidateText": tampered_text}},
    )
    assert r_ver_tampered.status_code == 200
    res_tampered = r_ver_tampered.json()
    assert res_tampered["valid"] is False
    assert res_tampered["status"] == "CONTENT_INTEGRITY_COMPROMISED"
    assert res_tampered["tamperDetected"] is True

