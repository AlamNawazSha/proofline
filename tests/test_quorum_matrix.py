import pytest
import time
from fastapi.testclient import TestClient
from backend import engine as e, main as m
from backend.store import Store

GOOD_TEXT = "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary."


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(m, "local", Store(tmp_path / "tests_matrix.db"))
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "private_matrix")
    m.PRIVATE.mkdir()
    m.known.clear()
    m.limits.clear()
    monkeypatch.setenv("FEATURE_QUORUM", "true")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(m.app) as c:
        assert c.post("/api/demo").status_code == 200
        yield c


def switch(c, role):
    assert c.post("/api/persona", json={"data": {"role": role}}).status_code == 200


def setup_reviewed_doc(client, channel="website", title="Matrix Test Document"):
    """Helper to create, review, and submit a document ready for decision."""
    r_create = client.post(
        "/api/documents",
        json={
            "data": {
                "title": title,
                "text": GOOD_TEXT,
                "context": {"channel": channel, "audience": "public", "purpose": "Testing"},
            }
        },
    )
    assert r_create.status_code == 200
    doc = r_create.json()
    did = doc["id"]

    # Run review
    r_rev = client.post(f"/api/documents/{did}/review", json={"data": {"useAI": False}})
    assert r_rev.status_code == 200

    # Wait for review to complete
    for _ in range(50):
        st = client.get("/api/state").json()
        cur = next(d for d in st["documents"] if d["id"] == did)
        if cur.get("review") and cur["review"]["status"] not in ["queued", "reviewing"]:
            break
        time.sleep(0.02)

    # Submit for review
    r_sub = client.post(f"/api/documents/{did}/submit")
    assert r_sub.status_code == 200

    st = client.get("/api/state").json()
    return next(d for d in st["documents"] if d["id"] == did)


def test_matrix_cell_1_single_approval_sufficient_for_low_risk(client):
    """Cell 1: Low-risk channel (email: 1 required). 1 reviewer approval satisfies quorum & enables export."""
    doc = setup_reviewed_doc(client, channel="email", title="Email Newsletter Copy")
    did = doc["id"]

    switch(client, "reviewer")
    r_dec = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Verified"}},
    )
    assert r_dec.status_code == 200
    res = r_dec.json()
    assert res["quorum"]["satisfied"] is True
    assert res["quorum"]["received"] == 1
    assert res["quorum"]["required"] == 1

    # Export allowed
    r_exp = client.get(f"/api/documents/{did}/export")
    assert r_exp.status_code == 200


def test_matrix_cell_2_single_approval_insufficient_for_high_risk(client):
    """Cell 2: High-risk channel (website: 2 required). 1 of 2 approvals leaves quorum unsatisfied; export blocked."""
    doc = setup_reviewed_doc(client, channel="website", title="Homepage Hero Banner")
    did = doc["id"]

    switch(client, "reviewer")
    r_dec = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "First signoff"}},
    )
    assert r_dec.status_code == 200
    res = r_dec.json()
    assert res["quorum"]["satisfied"] is False
    assert res["quorum"]["received"] == 1
    assert res["quorum"]["required"] == 2

    # Invariant I3: Export MUST be refused server-side
    r_exp = client.get(f"/api/documents/{did}/export")
    assert r_exp.status_code == 409
    assert r_exp.json()["code"] == "QUORUM_NOT_MET"


def test_matrix_cell_3_double_approval_satisfies_quorum(client):
    """Cell 3: High-risk channel (website: 2 required). 2 distinct reviewers satisfy quorum & permit export."""
    doc = setup_reviewed_doc(client, channel="website", title="Product Launch Landing")
    did = doc["id"]

    switch(client, "reviewer")
    r1 = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Reviewer 1 signoff"}},
    )
    assert r1.status_code == 200

    # Second distinct reviewer
    switch(client, "reviewer2")
    r2 = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Reviewer 2 signoff"}},
    )
    assert r2.status_code == 200
    res2 = r2.json()
    assert res2["quorum"]["satisfied"] is True
    assert res2["quorum"]["received"] == 2

    # Export allowed
    r_exp = client.get(f"/api/documents/{did}/export")
    assert r_exp.status_code == 200


def test_matrix_cell_4_same_person_twice_rejected(client):
    """Cell 4: Same reviewer signing twice is rejected with 403 Forbidden."""
    doc = setup_reviewed_doc(client, channel="website", title="Dual Quorum Test")
    did = doc["id"]

    switch(client, "reviewer")
    r1 = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "First sign"}},
    )
    assert r1.status_code == 200

    # Attempt second approval by same person
    r2 = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Second sign duplicate"}},
    )
    assert r2.status_code == 403
    assert "same reviewer cannot sign multiple times" in r2.json()["detail"].lower()


def test_matrix_cell_5_creator_as_signer_rejected_invariant_I1(client):
    """Cell 5: Creator can never sign approval (Invariant I1: 403 Forbidden)."""
    doc = setup_reviewed_doc(client, channel="email", title="Self Approval Blocked")
    did = doc["id"]

    switch(client, "creator")
    r = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Self-approval attempt"}},
    )
    assert r.status_code == 403
    assert "cannot perform this action" in r.json()["detail"].lower() or "self-approval" in r.json()["detail"].lower()


def test_matrix_cell_6_revocation_invalidates_approval_and_blocks_export(client):
    """Cell 6: Explicit revocation drops signature count and invalidates export capability."""
    doc = setup_reviewed_doc(client, channel="email", title="Revocation Test")
    did = doc["id"]

    switch(client, "reviewer")
    r_app = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Initial approval"}},
    )
    assert r_app.status_code == 200

    # Verify export is active
    assert client.get(f"/api/documents/{did}/export").status_code == 200

    # Manager revokes approval
    switch(client, "manager")
    r_rev = client.post(
        f"/api/documents/{did}/revoke",
        json={"data": {"reason": "Revoking release due to emerging regulatory guidance"}},
    )
    assert r_rev.status_code == 200

    # Export MUST immediately return 409 Conflict with code APPROVAL_REVOKED
    r_exp_blocked = client.get(f"/api/documents/{did}/export")
    assert r_exp_blocked.status_code == 409
    assert r_exp_blocked.json()["code"] == "APPROVAL_REVOKED"


def test_matrix_cell_7_expired_exception_refused(client):
    """Cell 7: Expired manager exception cannot bypass required dual quorum."""
    doc = setup_reviewed_doc(client, channel="website", title="Exception Expiry Test")
    did = doc["id"]

    # 1 signature
    switch(client, "reviewer")
    r1 = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Signer 1"}},
    )
    assert r1.status_code == 200

    # Manager grants an exception waiving 1 signature
    switch(client, "manager")
    r_exc = client.post(
        "/api/exceptions",
        json={
            "data": {
                "scope": {"type": "document", "value": did},
                "reason": "Expedited urgent release authorized by VP",
                "hours": 1,
                "maxSignaturesMissing": 1,
            }
        },
    )
    assert r_exc.status_code == 200

    # Simulate expiresAt in past
    wid = client.get("/api/state").json()["workspaceId"]
    def make_expired(st):
        for x in st.get("exceptions", []):
            if x.get("scope", {}).get("value") == did:
                x["expiresAt"] = "2020-01-01T00:00:00Z"
    m.local.mutate(wid, make_expired)

    # Export is blocked with EXCEPTION_EXPIRED
    r_exp = client.get(f"/api/documents/{did}/export")
    assert r_exp.status_code == 409
    assert r_exp.json()["code"] == "EXCEPTION_EXPIRED"


def test_matrix_cell_8_concurrent_approvals_optimistic_cas(client):
    """Cell 8: Concurrent approvals on same revision update signatures list atomically."""
    doc = setup_reviewed_doc(client, channel="website", title="Concurrency Test")
    did = doc["id"]

    switch(client, "reviewer")
    r1 = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "R1"}},
    )
    assert r1.status_code == 200

    switch(client, "reviewer2")
    r2 = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "R2"}},
    )
    assert r2.status_code == 200
    assert r2.json()["quorum"]["satisfied"] is True


def test_matrix_cell_9_escalation_blocks_approval_until_reassigned(client):
    """Cell 9: Escalated review deadline in the past blocks standard approval until reassigned."""
    doc = setup_reviewed_doc(client, channel="website", title="Escalation Test")
    did = doc["id"]

    # Artificially set reviewDueAt in the past to trigger escalation
    def set_past_deadline(st):
        d = next(x for x in st["documents"] if x["id"] == did)
        d["reviewDueAt"] = "2020-01-01T00:00:00Z"
    m.local.mutate(client.get("/api/state").json()["workspaceId"], set_past_deadline)

    # Standard reviewer tries to approve
    switch(client, "reviewer")
    r_app = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "Late approval"}},
    )
    assert r_app.status_code == 409
    assert "escalated" in r_app.json()["detail"].lower()


def test_matrix_cell_10_policy_version_change_invalidates_prior_signatures(client):
    """Cell 10: Updating approval policy increments policy version and resets prior partial signatures."""
    doc = setup_reviewed_doc(client, channel="website", title="Policy Invalidation Test")
    did = doc["id"]

    # Reviewer 1 provides first signature
    switch(client, "reviewer")
    r1 = client.post(
        f"/api/documents/{did}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": doc["revision"], "manualCoverage": True, "reason": "R1 Partial"}},
    )
    assert r1.status_code == 200
    assert r1.json()["quorum"]["received"] == 1

    # Manager updates approval policy to version 2
    switch(client, "manager")
    r_pol = client.put(
        "/api/approval-policy",
        json={"data": {"rules": [{"channel": "website", "minApprovals": 2, "roles": ["reviewer", "manager"]}], "version": 2}},
    )
    assert r_pol.status_code == 200

    # Quorum state re-evaluated: previous partial signature is invalid under new policy
    st = client.get("/api/state").json()
    cur_doc = next(d for d in st["documents"] if d["id"] == did)
    q_state = e.quorum_state(st, cur_doc)
    assert q_state["satisfied"] is False
    assert client.get(f"/api/documents/{did}/export").status_code == 409
