import pytest
from backend import main as m
from tests.test_core import client, state, switch, run_review, GOOD


@pytest.fixture(autouse=True)
def enable_quorum(monkeypatch):
    """Enable Q3 multi-reviewer approval policy for all tests in this module."""
    monkeypatch.setenv("FEATURE_QUORUM", "true")


def test_quorum_single_signature_approves(client):
    """Channel with required: 1 approves with 1 signature and export succeeds."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Email Newsletter Announcement",
                "text": GOOD,
                "context": {
                    "channel": "email",
                    "audience": "subscribers",
                    "purpose": "Monthly update",
                },
            }
        },
    )
    assert r.status_code == 200
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    switch(client, "reviewer")
    r_dec = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Email copy verified against active sources",
            }
        },
    )
    assert r_dec.status_code == 200
    res = r_dec.json()
    assert res["decision"]["outcome"] == "approved"
    assert res["quorum"]["satisfied"] is True
    assert res["quorum"]["received"] == 1
    assert res["quorum"]["required"] == 1

    r_exp = client.get(f"/api/documents/{did}/export")
    assert r_exp.status_code == 200


def test_quorum_two_signatures_required(client):
    """Channel with required: 2 requires two distinct signatures before export is allowed."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Website Landing Page Launch",
                "text": GOOD,
                "context": {
                    "channel": "website",
                    "audience": "public",
                    "purpose": "Product launch",
                },
            }
        },
    )
    assert r.status_code == 200
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    # 1st signature
    switch(client, "reviewer")
    r_dec1 = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "First peer review pass",
            }
        },
    )
    assert r_dec1.status_code == 200
    res1 = r_dec1.json()
    assert res1["decision"]["outcome"] == "pending"
    assert res1["quorum"]["received"] == 1
    assert res1["quorum"]["required"] == 2
    assert res1["quorum"]["satisfied"] is False

    # Export is blocked with 409 QUORUM_NOT_MET
    r_exp1 = client.get(f"/api/documents/{did}/export")
    assert r_exp1.status_code == 409
    assert r_exp1.json()["code"] == "QUORUM_NOT_MET"

    # 2nd signature by distinct reviewer
    switch(client, "reviewer2")
    r_dec2 = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Second distinct peer review pass",
            }
        },
    )
    assert r_dec2.status_code == 200
    res2 = r_dec2.json()
    assert res2["decision"]["outcome"] == "approved"
    assert res2["quorum"]["received"] == 2
    assert res2["quorum"]["satisfied"] is True

    # Export now passes
    r_exp2 = client.get(f"/api/documents/{did}/export")
    assert r_exp2.status_code == 200


def test_same_person_twice_is_not_two_signatures(client):
    """The same reviewer signing twice is rejected with 403 when distinctUsers is true."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Website Landing Page Copy",
                "text": GOOD,
                "context": {
                    "channel": "website",
                    "audience": "public",
                    "purpose": "Product launch",
                },
            }
        },
    )
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    switch(client, "reviewer")
    r1 = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "First pass",
            }
        },
    )
    assert r1.status_code == 200

    # Same reviewer tries to sign again
    r2 = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Second pass attempt by same reviewer",
            }
        },
    )
    assert r2.status_code == 403

    doc_state = next(x for x in state(client)["documents"] if x["id"] == did)
    assert doc_state["decision"]["received"] == 1


def test_revocation_blocks_export_until_new_signatures(client):
    """Revoking an approval clears signatures, cascades a task, and blocks export until re-approved."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Website Launch Copy",
                "text": GOOD,
                "context": {
                    "channel": "website",
                    "audience": "public",
                    "purpose": "Product launch",
                },
            }
        },
    )
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    # 2 signatures to approve
    switch(client, "reviewer")
    client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Rev 1",
            }
        },
    )
    switch(client, "reviewer2")
    client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Rev 2",
            }
        },
    )
    assert client.get(f"/api/documents/{did}/export").status_code == 200

    # Manager revokes approval with reason (>= 8 chars)
    switch(client, "manager")
    r_rev = client.post(
        f"/api/documents/{did}/revoke",
        json={"data": {"reason": "Revoking release due to emerging regulatory guidance"}},
    )
    assert r_rev.status_code == 200

    # Export is blocked with APPROVAL_REVOKED
    r_exp_block = client.get(f"/api/documents/{did}/export")
    assert r_exp_block.status_code == 409
    assert r_exp_block.json()["code"] == "APPROVAL_REVOKED"

    # Tasks cascade created
    st = state(client)
    rev_tasks = [
        t
        for t in st.get("tasks", [])
        if t.get("documentId") == did and t.get("reason") == "approval_revoked"
    ]
    assert len(rev_tasks) >= 1

    # Re-submit and re-sign twice
    switch(client, "creator")
    assert client.post(f"/api/documents/{did}/submit").status_code == 200
    switch(client, "reviewer")
    assert (
        client.post(
            f"/api/documents/{did}/decision",
            json={
                "data": {
                    "outcome": "approved",
                    "expectedRevision": d["revision"],
                    "manualCoverage": True,
                    "reason": "Re-approved 1",
                }
            },
        ).status_code
        == 200
    )
    switch(client, "reviewer2")
    assert (
        client.post(
            f"/api/documents/{did}/decision",
            json={
                "data": {
                    "outcome": "approved",
                    "expectedRevision": d["revision"],
                    "manualCoverage": True,
                    "reason": "Re-approved 2",
                }
            },
        ).status_code
        == 200
    )

    # Export succeeds after re-approval meets quorum
    assert client.get(f"/api/documents/{did}/export").status_code == 200


def test_expired_exception_blocks_export(client):
    """An expired exception must not satisfy quorum and blocks export with EXCEPTION_EXPIRED."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Exception Document",
                "text": GOOD,
                "context": {
                    "channel": "website",
                    "audience": "public",
                    "purpose": "Product launch",
                },
            }
        },
    )
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    # 1 signature recorded (under website channel which needs 2)
    switch(client, "reviewer")
    client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Single signer",
            }
        },
    )

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
    wid = state(client)["workspaceId"]
    def make_expired(st):
        for x in st.get("exceptions", []):
            if x.get("scope", {}).get("value") == did:
                x["expiresAt"] = "2020-01-01T00:00:00Z"

    m.local.mutate(wid, make_expired)

    # Export is blocked with EXCEPTION_EXPIRED
    r_exp = client.get(f"/api/documents/{did}/export")
    assert r_exp.status_code == 409
    assert r_exp.json()["code"] == "EXCEPTION_EXPIRED"


def test_concurrent_signatures_both_land(client):
    """Two concurrent signatures against the same revision both record; stale revision gets 409."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Concurrent Signing Doc",
                "text": GOOD,
                "context": {
                    "channel": "website",
                    "audience": "public",
                    "purpose": "Product launch",
                },
            }
        },
    )
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    # Reviewer 1 signs
    switch(client, "reviewer")
    r_a = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Signer A",
            }
        },
    )
    assert r_a.status_code == 200

    # Reviewer 2 signs against same revision
    switch(client, "reviewer2")
    r_b = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Signer B",
            }
        },
    )
    assert r_b.status_code == 200

    # Stale expectedRevision is rejected with 409
    switch(client, "manager")
    r_c = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": 999,
                "manualCoverage": True,
                "reason": "Signer C stale",
            }
        },
    )
    assert r_c.status_code == 409

    st = state(client)
    doc_after = next(x for x in st["documents"] if x["id"] == did)
    assert doc_after["decision"]["received"] == 2


def test_policy_validation_rejects_nonsense(client):
    """Invalid approval policy parameters return 422 POLICY_INVALID."""
    switch(client, "manager")

    # required: 0
    p1 = {
        "policy": {
            "byChannel": {"website": {"required": 0, "roles": ["reviewer"]}},
            "escalation": {"hours": 24},
        }
    }
    r1 = client.put("/api/approval-policy", json={"data": p1})
    assert r1.status_code == 422
    assert r1.json()["code"] == "POLICY_INVALID"

    # unknown role
    p2 = {
        "policy": {
            "byChannel": {"website": {"required": 2, "roles": ["astronaut"]}},
            "escalation": {"hours": 24},
        }
    }
    r2 = client.put("/api/approval-policy", json={"data": p2})
    assert r2.status_code == 422
    assert r2.json()["code"] == "POLICY_INVALID"

    # hours: 0
    p3 = {
        "policy": {
            "byChannel": {"website": {"required": 2, "roles": ["reviewer"]}},
            "escalation": {"hours": 0},
        }
    }
    r3 = client.put("/api/approval-policy", json={"data": p3})
    assert r3.status_code == 422
    assert r3.json()["code"] == "POLICY_INVALID"


def test_creator_cannot_be_a_signer(client):
    """Invariant I1: creator cannot approve their own document, rejected with 403."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Self Approval Test Doc",
                "text": GOOD,
                "context": {
                    "channel": "website",
                    "audience": "public",
                    "purpose": "Product launch",
                },
            }
        },
    )
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    switch(client, "creator")
    r_self = client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Creator self sign",
            }
        },
    )
    assert r_self.status_code == 403


def test_escalation_notifies_but_never_approves(client):
    """Escalation deadlines create an alert notification for manager but never auto-approve."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Overdue Doc",
                "text": GOOD,
                "context": {
                    "channel": "website",
                    "audience": "public",
                    "purpose": "Product launch",
                },
            }
        },
    )
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    # Simulate reviewDueAt in the past
    wid = state(client)["workspaceId"]
    def set_overdue(st):
        d_found = next(x for x in st["documents"] if x["id"] == did)
        d_found["reviewDueAt"] = "2020-01-01T00:00:00Z"

    m.local.mutate(wid, set_overdue)

    # Trigger read sweep
    st = client.get("/api/state").json()
    doc_state = next(x for x in st["documents"] if x["id"] == did)
    assert doc_state["escalatedAt"] is not None
    assert doc_state["decision"] is None or doc_state["decision"].get("outcome") != "approved"

    mgr_notifs = [
        n
        for n in st.get("notifications", [])
        if n.get("kind") == "task_escalated" and n.get("documentId") == did
    ]
    assert len(mgr_notifs) == 1

    # Export remains blocked
    assert client.get(f"/api/documents/{did}/export").status_code == 409


def test_receipt_lists_all_signers_and_policy_version(client):
    """Release certificate receipt lists all distinct signers and policyVersion."""
    r = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Dual Signer Doc",
                "text": GOOD,
                "context": {
                    "channel": "website",
                    "audience": "public",
                    "purpose": "Product launch",
                },
            }
        },
    )
    did = r.json()["id"]
    d = run_review(client, did)
    assert client.post(f"/api/documents/{did}/submit").status_code == 200

    switch(client, "reviewer")
    client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Signer Jordan",
            }
        },
    )
    switch(client, "reviewer2")
    client.post(
        f"/api/documents/{did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Signer Taylor",
            }
        },
    )

    r_exp = client.get(f"/api/documents/{did}/export")
    assert r_exp.status_code == 200
    receipt = r_exp.json()["receipt"]

    assert receipt["policyVersion"] >= 1
    sig_names = [s["reviewerName"] for s in receipt["signatures"]]
    assert "Jordan Lee" in sig_names
    assert "Taylor Reed" in sig_names

