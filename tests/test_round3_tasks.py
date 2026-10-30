import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from backend import engine as e, main as m
from backend.store import Store
from tests.test_core import client, state, switch, run_review, GOOD


@pytest.fixture(autouse=True)
def enable_tasks(monkeypatch):
    """Enable Q1 cascade re-review with ownership for all tests in this module."""
    monkeypatch.setenv("FEATURE_TASKS", "true")


def _setup_docs_for_cascade(client):
    """Helper to set up 5 affected docs (with approvals) and 1 unaffected doc (0 findings, no approval)."""
    switch(client, "creator")

    # Document 1-5: Will be reviewed, submitted and approved
    affected_ids = []
    for i in range(1, 6):
        r = client.post(
            "/api/documents",
            json={
                "data": {
                    "title": f"Approved Campaign Copy #{i}",
                    "text": GOOD,
                    "context": {"channel": "website", "audience": "public", "purpose": "Launch"},
                }
            },
        )
        assert r.status_code == 200
        did = r.json()["id"]
        run_review(client, did)
        client.post(f"/api/documents/{did}/submit")
        affected_ids.append(did)

    # Approve all 5 as reviewer
    switch(client, "reviewer")
    st = client.get("/api/state?documents=all").json()
    doc_map = {d["id"]: d for d in st["documents"]}
    for did in affected_ids:
        d = doc_map[did]
        r_dec = client.post(
            f"/api/documents/{did}/decision",
            json={
                "data": {
                    "outcome": "approved",
                    "expectedRevision": d["revision"],
                    "manualCoverage": True,
                    "reason": "Initial verified sign-off.",
                }
            },
        )
        assert r_dec.status_code == 200

    # Document 6: Unaffected (clean text, no findings, never submitted or approved)
    switch(client, "creator")
    r_unaffected = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Fresh Unapproved Draft",
                "text": GOOD,
                "context": {"channel": "website", "audience": "internal", "purpose": "Drafting"},
            }
        },
    )
    assert r_unaffected.status_code == 200
    unaffected_id = r_unaffected.json()["id"]

    return affected_ids, unaffected_id


def test_cascade_creates_one_task_per_affected_document(client):
    """1 workspace, 5 affected docs + 1 unaffected; activate a new source version -> len(open_tasks) == 5;
    each has ownerId == doc.creatorId, status == 'open', unique dedupeKey."""
    affected_ids, unaffected_id = _setup_docs_for_cascade(client)

    # Manager creates and activates a new source to trigger cascade
    switch(client, "manager")
    r_src = client.post(
        "/api/sources",
        json={
            "data": {
                "title": "Updated Brand Guidelines v2",
                "body": "Official Northstar guidelines updated for Round 3.",
            }
        },
    )
    assert r_src.status_code == 200
    new_src_id = r_src.json()["id"]

    r_act = client.post(f"/api/sources/{new_src_id}/activate")
    assert r_act.status_code == 200

    # Inspect tasks
    r_tasks = client.get("/api/tasks?status=open")
    assert r_tasks.status_code == 200
    body = r_tasks.json()
    open_t = body["tasks"]

    # Must have exactly 5 tasks for the 5 affected documents
    doc_tasks = [t for t in open_t if t["documentId"] in affected_ids]
    assert len(doc_tasks) == 5

    # Each task must have ownerId == doc creatorId, status == "open", and unique dedupeKey
    st = client.get("/api/state?documents=all").json()
    doc_map = {d["id"]: d for d in st["documents"]}

    dedupe_keys = set()
    for t in doc_tasks:
        did = t["documentId"]
        assert t["ownerId"] == doc_map[did]["creatorId"]
        assert t["status"] == "open"
        assert t["dedupeKey"] not in dedupe_keys
        dedupe_keys.add(t["dedupeKey"])
    assert len(dedupe_keys) == 5


def test_cascade_is_idempotent(client):
    """Call the same trigger twice -> still 5 tasks total."""
    affected_ids, unaffected_id = _setup_docs_for_cascade(client)

    switch(client, "manager")
    # Add a source
    r_src = client.post(
        "/api/sources",
        json={"data": {"title": "Idempotence Source", "body": "Body content."}},
    )
    sid = r_src.json()["id"]
    client.post(f"/api/sources/{sid}/activate")

    r_tasks_1 = client.get("/api/tasks?status=open").json()["tasks"]
    count_1 = len([t for t in r_tasks_1 if t["documentId"] in affected_ids])
    assert count_1 == 5

    # Trigger cascade again with the exact same trigger
    st = client.get("/api/state").json()
    wid = st["workspaceId"]
    curr_v = st["sourceVersion"]
    actor = {"id": "demo-manager", "name": "Alex Morgan", "role": "manager"}

    # Use internal store mutate to re-fire identical cascade_tasks call
    def re_fire(st_mut):
        e.cascade_tasks(
            st_mut,
            reason="source_updated",
            trigger_id=f"v{curr_v}",
            reason_detail=f"Source pack v{curr_v-1} -> v{curr_v}",
            actor=actor,
        )
        return {"ok": True}

    m.local.mutate(wid, re_fire)

    r_tasks_2 = client.get("/api/tasks?status=open").json()["tasks"]
    count_2 = len([t for t in r_tasks_2 if t["documentId"] in affected_ids])
    assert count_2 == 5, "Duplicate trigger must not generate duplicate open tasks"


def test_unaffected_document_is_never_queued(client):
    """The doc that yields zero findings and holds no approval is absent from tasks."""
    affected_ids, unaffected_id = _setup_docs_for_cascade(client)

    switch(client, "manager")
    r_src = client.post(
        "/api/sources",
        json={"data": {"title": "Brand Source v3", "body": "Updated content text."}},
    )
    sid = r_src.json()["id"]
    client.post(f"/api/sources/{sid}/activate")

    r_tasks = client.get("/api/tasks").json()["tasks"]
    task_doc_ids = [t["documentId"] for t in r_tasks]
    assert unaffected_id not in task_doc_ids


def test_task_closes_on_reapproval(client):
    """Reviewer approves the re-reviewed revision -> that task's status == 'closed', closedByReapproval is True."""
    affected_ids, _ = _setup_docs_for_cascade(client)
    target_did = affected_ids[0]

    # Trigger a cascade task by updating source
    switch(client, "manager")
    r_src = client.post(
        "/api/sources",
        json={"data": {"title": "Update Pack", "body": "Guidelines updated."}},
    )
    sid = r_src.json()["id"]
    client.post(f"/api/sources/{sid}/activate")

    # Verify task is open
    tasks_before = client.get(f"/api/tasks?documentId={target_did}").json()["tasks"]
    open_tasks = [t for t in tasks_before if t["status"] == "open"]
    assert len(open_tasks) >= 1
    tid = open_tasks[0]["id"]

    # Creator creates new revision for re-review and submits
    switch(client, "creator")
    st = client.get("/api/state?documents=all").json()
    d_curr = next(d for d in st["documents"] if d["id"] == target_did)
    r_edit = client.put(
        f"/api/documents/{target_did}",
        json={
            "data": {
                "text": GOOD + " Re-reviewed version.",
                "expectedRevision": d_curr["revision"],
                "context": d_curr["context"],
            }
        },
    )
    assert r_edit.status_code == 200
    run_review(client, target_did)
    client.post(f"/api/documents/{target_did}/submit")

    # Reviewer approves new revision
    switch(client, "reviewer")
    st = client.get("/api/state?documents=all").json()
    d_after_sub = next(d for d in st["documents"] if d["id"] == target_did)
    r_dec = client.post(
        f"/api/documents/{target_did}/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d_after_sub["revision"],
                "manualCoverage": True,
                "reason": "Re-approved under updated guidelines.",
            }
        },
    )
    assert r_dec.status_code == 200

    # Task must now be closed with closedByReapproval is True
    tasks_after = client.get(f"/api/tasks?documentId={target_did}").json()["tasks"]
    closed_task = next(t for t in tasks_after if t["id"] == tid)
    assert closed_task["status"] == "closed"
    assert closed_task["closedByReapproval"] is True


def test_task_close_requires_reason(client):
    """POST /api/tasks/{id}/close with {'reason': 'x'} -> 422."""
    affected_ids, _ = _setup_docs_for_cascade(client)
    target_did = affected_ids[0]

    switch(client, "manager")
    r_src = client.post(
        "/api/sources",
        json={"data": {"title": "Source Close Test", "body": "Content body."}},
    )
    sid = r_src.json()["id"]
    client.post(f"/api/sources/{sid}/activate")

    tasks = client.get(f"/api/tasks?documentId={target_did}&status=open").json()["tasks"]
    assert len(tasks) >= 1
    tid = tasks[0]["id"]

    # Short reason (< 8 chars) -> 422
    r_fail = client.post(f"/api/tasks/{tid}/close", json={"data": {"reason": "x"}})
    assert r_fail.status_code == 422

    # Valid reason (>= 8 chars) -> 200
    r_ok = client.post(
        f"/api/tasks/{tid}/close",
        json={"data": {"reason": "Dismissed: verified unaffected by manual audit."}},
    )
    assert r_ok.status_code == 200
    assert r_ok.json()["task"]["status"] == "closed"


def test_task_assign_requires_manager(client):
    """Creator tries to reassign -> 403. Manager succeeds -> assigneeId changes, notification created for the new assignee."""
    affected_ids, _ = _setup_docs_for_cascade(client)
    target_did = affected_ids[0]

    switch(client, "manager")
    r_src = client.post(
        "/api/sources",
        json={"data": {"title": "Assign Test Source", "body": "Content."}},
    )
    sid = r_src.json()["id"]
    client.post(f"/api/sources/{sid}/activate")

    tasks = client.get(f"/api/tasks?documentId={target_did}&status=open").json()["tasks"]
    assert len(tasks) >= 1
    tid = tasks[0]["id"]

    # Creator attempts reassignment -> 403
    switch(client, "creator")
    r_unauth = client.post(
        f"/api/tasks/{tid}/assign",
        json={"data": {"assigneeId": "demo-reviewer"}},
    )
    assert r_unauth.status_code == 403

    # Manager reassigns -> 200
    switch(client, "manager")
    r_assign = client.post(
        f"/api/tasks/{tid}/assign",
        json={"data": {"assigneeId": "demo-reviewer", "dueAt": None}},
    )
    assert r_assign.status_code == 200
    task_data = r_assign.json()["task"]
    assert task_data["assigneeId"] == "demo-reviewer"

    # Notification created for the new assignee
    switch(client, "reviewer")
    r_notif = client.get("/api/notifications")
    assert r_notif.status_code == 200
    notifs = r_notif.json()["items"]
    assert any(n["kind"] == "task_assigned" and n["taskId"] == tid for n in notifs)


def test_task_escalation_sets_flag_not_status(client):
    """Escalate -> escalatedAt not null, status unchanged."""
    affected_ids, _ = _setup_docs_for_cascade(client)
    target_did = affected_ids[0]

    switch(client, "manager")
    r_src = client.post(
        "/api/sources",
        json={"data": {"title": "Escalate Test Source", "body": "Content text."}},
    )
    sid = r_src.json()["id"]
    client.post(f"/api/sources/{sid}/activate")

    tasks = client.get(f"/api/tasks?documentId={target_did}&status=open").json()["tasks"]
    assert len(tasks) >= 1
    tid = tasks[0]["id"]
    assert tasks[0]["status"] == "open"
    assert tasks[0]["escalatedAt"] is None

    # Manager escalates
    r_esc = client.post(
        f"/api/tasks/{tid}/escalate",
        json={"data": {"reason": "Overdue SLA deadline for re-review", "to": "demo-manager"}},
    )
    assert r_esc.status_code == 200
    esc_task = r_esc.json()["task"]

    assert esc_task["escalatedAt"] is not None
    assert esc_task["status"] == "open"


def test_rule_deactivation_cascades(client):
    """Deactivate a rule used by 2 docs -> 2 tasks with reason == 'rule_deactivated'."""
    switch(client, "creator")

    # Document 1 & Document 2 both have approvals and match website channel
    r1 = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Rule Deactivate Doc 1",
                "text": GOOD,
                "context": {"channel": "website", "audience": "public", "purpose": "Test"},
            }
        },
    )
    did1 = r1.json()["id"]
    run_review(client, did1)
    client.post(f"/api/documents/{did1}/submit")

    r2 = client.post(
        "/api/documents",
        json={
            "data": {
                "title": "Rule Deactivate Doc 2",
                "text": GOOD,
                "context": {"channel": "website", "audience": "public", "purpose": "Test"},
            }
        },
    )
    did2 = r2.json()["id"]
    run_review(client, did2)
    client.post(f"/api/documents/{did2}/submit")

    switch(client, "reviewer")
    st = client.get("/api/state?documents=all").json()
    doc_map = {d["id"]: d for d in st["documents"]}
    for did in (did1, did2):
        d = doc_map[did]
        client.post(
            f"/api/documents/{did}/decision",
            json={
                "data": {
                    "outcome": "approved",
                    "expectedRevision": d["revision"],
                    "manualCoverage": True,
                    "reason": "Signed off.",
                }
            },
        )

    # Manager deactivates an active rule applicable to 'website' channel
    switch(client, "manager")
    st = client.get("/api/state").json()
    rule_to_deactivate = next(
        (r for r in st.get("rules", []) if r.get("active") and r.get("channel") in ("website", "any")),
        None,
    )
    rid = rule_to_deactivate["id"]

    # Deactivate the rule
    r_deact = client.post(f"/api/rules/{rid}/deactivate")
    assert r_deact.status_code == 200

    # Query tasks generated with reason == 'rule_deactivated'
    r_tasks = client.get("/api/tasks").json()["tasks"]
    deact_tasks = [
        t for t in r_tasks
        if t.get("reason") == "rule_deactivated" and t.get("triggerId") == rid and t.get("documentId") in (did1, did2)
    ]
    assert len(deact_tasks) == 2
    for t in deact_tasks:
        assert t["reason"] == "rule_deactivated"
        assert t["status"] == "open"


def test_tasks_are_workspace_scoped(tmp_path, monkeypatch):
    """Docs from another workspace are never visible in /api/tasks."""
    store = Store(tmp_path / "scope_test.db")
    monkeypatch.setattr(m, "local", store)
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "private_scope")
    m.PRIVATE.mkdir(exist_ok=True)
    m.known.clear()
    m.limits.clear()

    # Workspace A
    with TestClient(m.app) as c1:
        assert c1.post("/api/demo").status_code == 200
        switch(c1, "creator")
        r_doc = c1.post(
            "/api/documents",
            json={"data": {"title": "Doc in WS A", "text": GOOD, "context": {"channel": "website"}}},
        )
        did_a = r_doc.json()["id"]
        run_review(c1, did_a)
        c1.post(f"/api/documents/{did_a}/submit")
        switch(c1, "reviewer")
        st_a = c1.get("/api/state?documents=all").json()
        d_a = next(d for d in st_a["documents"] if d["id"] == did_a)
        c1.post(
            f"/api/documents/{did_a}/decision",
            json={"data": {"outcome": "approved", "expectedRevision": d_a["revision"], "manualCoverage": True, "reason": "ok"}},
        )

        switch(c1, "manager")
        r_src = c1.post("/api/sources", json={"data": {"title": "WS A Guideline", "body": "Guideline body text."}})
        c1.post(f"/api/sources/{r_src.json()['id']}/activate")

        tasks_a = c1.get("/api/tasks").json()["tasks"]
        assert len(tasks_a) >= 1
        assert any(t["documentId"] == did_a for t in tasks_a)

        # Workspace B (independent session and store entry)
        with TestClient(m.app) as c2:
            assert c2.post("/api/demo").status_code == 200
            tasks_b = c2.get("/api/tasks").json()["tasks"]
            assert not any(t["documentId"] == did_a for t in tasks_b)


def test_document_storage_roundtrip(tmp_path):
    """Phase B: Write, read and CAS-fail on a document via Documents; stale write -> 409."""
    store = Store(tmp_path / "docs_test.db")
    wid = "test-ws"
    did = "doc-roundtrip-1"
    doc_v1 = {"id": did, "title": "Version One", "body": "Original text"}

    # Write initial document (expected=None)
    store.documents.write(wid, did, doc_v1, expected=None)

    # Read document
    read_doc, rev = store.documents.read(wid, did)
    assert read_doc["title"] == "Version One"
    assert rev == 1

    # Stale write with mismatched revision -> 409
    doc_stale = {"id": did, "title": "Stale Update", "body": "Bad"}
    with pytest.raises(HTTPException) as exc_info:
        store.documents.write(wid, did, doc_stale, expected=99)
    assert exc_info.value.status_code == 409

    # Valid write with expected revision -> advances to rev 2
    doc_v2 = {"id": did, "title": "Version Two", "body": "Updated text"}
    store.documents.write(wid, did, doc_v2, expected=1)

    read_doc2, rev2 = store.documents.read(wid, did)
    assert read_doc2["title"] == "Version Two"
    assert rev2 == 2

    # list_ids
    assert did in store.documents.list_ids(wid)

    # delete
    store.documents.delete(wid, did)
    with pytest.raises(HTTPException) as exc_404:
        store.documents.read(wid, did)
    assert exc_404.value.status_code == 404


def test_state_pagination_default(client):
    """Phase B: Workspace with 60 docs -> GET /api/state returns 50 + cursor."""
    switch(client, "creator")

    # Seed 60 documents directly into state for performance
    def seed_60(st):
        current_docs = st.get("documents", [])
        for i in range(len(current_docs), 60):
            current_docs.append({
                "id": f"page-doc-{i:03d}",
                "title": f"Paginated Doc {i}",
                "text": GOOD,
                "revision": 1,
                "creatorId": "demo-creator",
                "creatorName": "Maya Chen",
                "createdAt": e.now(),
                "updatedAt": e.now(),
                "findings": [],
                "context": {"channel": "website"},
            })
        st["documents"] = current_docs
        return {"count": len(current_docs)}

    wid = client.get("/api/state").json()["workspaceId"]
    m.local.mutate(wid, seed_60)

    # Default call to GET /api/state (defaults to documents="page", cursor=0)
    r_default = client.get("/api/state")
    assert r_default.status_code == 200
    data_page1 = r_default.json()
    assert len(data_page1["documents"]) == 50
    assert data_page1["nextCursor"] == 50

    # Page 2 with cursor=50
    r_page2 = client.get("/api/state?cursor=50")
    assert r_page2.status_code == 200
    data_page2 = r_page2.json()
    assert len(data_page2["documents"]) == 10
    assert data_page2["nextCursor"] is None

    # documents=none
    r_none = client.get("/api/state?documents=none")
    assert r_none.status_code == 200
    assert len(r_none.json()["documents"]) == 0

    # documents=all
    r_all = client.get("/api/state?documents=all")
    assert r_all.status_code == 200
    assert len(r_all.json()["documents"]) >= 60
