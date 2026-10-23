import copy, io, time
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from backend import engine as e, main as m
from backend.store import Store, Supabase

GOOD = "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary."


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(m, "local", Store(tmp_path / "tests.db"))
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "private")
    m.PRIVATE.mkdir()
    m.known.clear()
    m.limits.clear()
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(m.app) as c:
        assert c.post("/api/demo").status_code == 200
        yield c


def state(c):
    return c.get("/api/state").json()


def switch(c, role):
    assert c.post("/api/persona", json={"data": {"role": role}}).status_code == 200


def run_review(c, did):
    assert (
        c.post(
            f"/api/documents/{did}/review", json={"data": {"useAI": False}}
        ).status_code
        == 200
    )
    deadline = time.monotonic() + 6
    while time.monotonic() < deadline:
        d = next(x for x in state(c)["documents"] if x["id"] == did)
        if d["review"]["status"] not in ["queued", "reviewing"]:
            return d
        time.sleep(0.08)
    pytest.fail("Review worker did not finish")


def ready_draft(c):
    d = state(c)["documents"][0]
    r = c.put(
        "/api/documents/" + d["id"],
        json={
            "data": {
                "text": GOOD,
                "expectedRevision": d["revision"],
                "context": d["context"],
            }
        },
    )
    assert r.status_code == 200
    d = run_review(c, d["id"])
    assert d["findings"] == []
    assert c.post("/api/documents/" + d["id"] + "/submit").status_code == 200
    return d


def approve(c):
    d = ready_draft(c)
    switch(c, "reviewer")
    r = c.post(
        "/api/documents/" + d["id"] + "/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
                "reason": "Full content and source context manually inspected.",
            }
        },
    )
    assert r.status_code == 200, r.text
    return d


def test_initial_findings_are_executed_not_seeded(client):
    d = state(client)["documents"][0]
    assert d["findings"] == [] and d["review"] is None
    d = run_review(client, d["id"])
    assert {"terminology", "claim", "required", "prohibited"} <= {
        f["category"] for f in d["findings"]
    }
    assert all(f["provenance"] == "Rule-based" and f["quote"] for f in d["findings"])
    assert d["review"]["status"] == "partial"
    assert not d["readiness"]["eligible"]


def test_happy_journey_and_receipt(client):
    d = approve(client)
    r = client.get("/api/documents/" + d["id"] + "/export")
    assert r.status_code == 200
    data = r.json()
    assert (
        data["content"] == GOOD
        and data["receipt"]["revision"] == 2
        and data["receipt"]["manualCoverage"]
    )
    assert len(data["receipt"]["fingerprint"]) == 64
    assert client.get(
        "/api/documents/" + d["id"] + "/export?format=pdf"
    ).content.startswith(b"%PDF")
    assert client.get("/api/documents/" + d["id"] + "/export?format=txt").text == GOOD


def test_creator_cannot_approve(client):
    d = ready_draft(client)
    assert (
        client.post(
            "/api/documents/" + d["id"] + "/decision",
            json={
                "data": {
                    "outcome": "approved",
                    "expectedRevision": 2,
                    "manualCoverage": True,
                }
            },
        ).status_code
        == 403
    )


def test_manager_cannot_self_approve(client):
    switch(client, "manager")
    r = client.post(
        "/api/documents", json={"data": {"text": GOOD, "title": "Manager draft"}}
    )
    did = r.json()["id"]
    assert (
        client.post(
            "/api/documents/" + did + "/decision",
            json={"data": {"outcome": "approved", "expectedRevision": 1}},
        ).status_code
        == 403
    )


def test_partial_requires_human_semantics(client):
    d = ready_draft(client)
    switch(client, "reviewer")
    assert (
        client.post(
            "/api/documents/" + d["id"] + "/decision",
            json={"data": {"outcome": "approved", "expectedRevision": 2}},
        ).status_code
        == 422
    )


def test_content_edit_revokes_export(client):
    d = approve(client)
    switch(client, "creator")
    assert (
        client.put(
            "/api/documents/" + d["id"],
            json={
                "data": {
                    "text": GOOD + " Learn more.",
                    "context": d["context"],
                    "expectedRevision": 2,
                }
            },
        ).status_code
        == 200
    )
    assert client.get("/api/documents/" + d["id"] + "/export").status_code == 409
    assert state(client)["documents"][0]["status"] == "Approval outdated"


def test_source_update_revokes_export(client):
    d = approve(client)
    switch(client, "manager")
    assert client.post("/api/sources/SRC-001/activate").status_code == 200
    assert client.get("/api/documents/" + d["id"] + "/export").status_code == 409


def test_context_change_revokes_export(client):
    d = approve(client)
    switch(client, "creator")
    assert (
        client.put(
            "/api/documents/" + d["id"],
            json={
                "data": {
                    "text": GOOD,
                    "context": {
                        "channel": "social",
                        "audience": "public",
                        "purpose": "New purpose",
                    },
                    "expectedRevision": 2,
                }
            },
        ).status_code
        == 200
    )
    assert client.get("/api/documents/" + d["id"] + "/export").status_code == 409


def test_stale_save_is_conflict(client):
    d = state(client)["documents"][0]
    payload = {"data": {"text": GOOD, "expectedRevision": 1}}
    assert client.put("/api/documents/" + d["id"], json=payload).status_code == 200
    assert client.put("/api/documents/" + d["id"], json=payload).status_code == 409
    assert state(client)["documents"][0]["revision"] == 2


def test_wrong_role_cannot_publish_sources(client):
    assert client.post("/api/sources/SRC-001/activate").status_code == 403
    assert (
        client.post("/api/rules", json={"data": {"kind": "terminology"}}).status_code
        == 403
    )


def test_missing_evidence_cannot_be_dismissed(client):
    d = state(client)["documents"][0]
    client.put(
        "/api/documents/" + d["id"],
        json={"data": {"text": "Contact someone@example.com", "expectedRevision": 1}},
    )
    d = run_review(client, d["id"])
    switch(client, "reviewer")
    f = d["findings"][0]
    assert (
        client.post(
            "/api/documents/" + d["id"] + "/feedback",
            json={
                "data": {
                    "findingId": f["id"],
                    "outcome": "false_positive",
                    "reason": "Try to waive missing evidence.",
                }
            },
        ).status_code
        == 422
    )


def test_suggestion_preview_changes_nothing(client):
    d = run_review(client, state(client)["documents"][0]["id"])
    f = next(f for f in d["findings"] if f["category"] == "claim")
    r = client.post(
        "/api/documents/" + d["id"] + "/suggestion",
        json={"data": {"findingId": f["id"], "expectedRevision": 1}},
    )
    assert r.status_code == 200 and "20%" in r.json()["text"]
    assert state(client)["documents"][0]["revision"] == 1
    assert (
        r.json()["regression"]["numbersBefore"]
        != r.json()["regression"]["numbersAfter"]
    )


def test_comments_do_not_change_content_revision(client):
    d = state(client)["documents"][0]
    assert (
        client.post(
            "/api/documents/" + d["id"] + "/comments",
            json={"data": {"text": "Please confirm the audience scope."}},
        ).status_code
        == 200
    )
    new = state(client)["documents"][0]
    assert new["revision"] == 1 and len(new["comments"]) == 1


def test_cross_workspace_documents_denied(client):
    did = state(client)["documents"][0]["id"]
    with TestClient(m.app) as other:
        other.post("/api/demo")
        assert other.get("/api/documents/" + did + "/export").status_code == 404
        assert (
            other.put(
                "/api/documents/" + did,
                json={"data": {"text": GOOD, "expectedRevision": 1}},
            ).status_code
            == 404
        )


def test_unsigned_requests_denied(client):
    with TestClient(m.app) as other:
        assert other.get("/api/state").status_code == 401


def test_api_consent_required(client):
    did = state(client)["documents"][0]["id"]
    assert (
        client.post(
            "/api/documents/" + did + "/review",
            json={"data": {"useAI": True, "consent": False}},
        ).status_code
        == 422
    )


def test_no_key_returns_no_fake_ai(monkeypatch):
    import asyncio

    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    st = e.seed()
    d = e.new_document("Test", GOOD, {"id": "a", "name": "A"})
    fs, status = asyncio.run(m.interpret_ai(st, d))
    assert not fs and not status["ok"] and "not configured" in status["reason"]


def test_false_quote_cannot_activate(client):
    switch(client, "manager")
    r = client.post(
        "/api/rules",
        json={
            "data": {
                "kind": "terminology",
                "name": "Invalid reference",
                "sourceId": "SRC-001",
                "quote": "This does not exist",
                "pattern": "cheap",
            }
        },
    )
    assert r.status_code == 200
    assert client.post("/api/rules/" + r.json()["id"] + "/activate").status_code == 422


def test_source_stages_before_confirmation(client):
    switch(client, "manager")
    r = client.post(
        "/api/sources",
        json={
            "data": {
                "title": "New reference",
                "body": "The offer is valid only for annual plans.",
            }
        },
    )
    assert not r.json()["active"]
    before = state(client)["sourceVersion"]
    assert (
        client.post("/api/sources/" + r.json()["id"] + "/activate").status_code == 200
    )
    assert state(client)["sourceVersion"] == before + 1


def test_rule_sandbox_does_not_activate(client):
    switch(client, "manager")
    before = state(client)["sourceVersion"]
    r = client.post(
        "/api/rules/sandbox",
        json={"data": {"text": "Our cheap plan", "ruleId": "RULE-001"}},
    )
    assert r.status_code == 200 and r.json()["findings"]
    assert state(client)["sourceVersion"] == before


def test_pdf_and_text_extraction_private(client):
    from reportlab.pdfgen.canvas import Canvas

    b = io.BytesIO()
    c = Canvas(b)
    c.drawString(40, 700, "Selectable text content.")
    c.save()
    r = client.post(
        "/api/extract", files={"file": ("test.pdf", b.getvalue(), "application/pdf")}
    )
    assert r.status_code == 200 and "Selectable text" in r.json()["text"]
    fid = r.json()["fileId"]
    assert client.get("/api/files/" + fid).content.startswith(b"%PDF")
    with TestClient(m.app) as other:
        other.post("/api/demo")
        assert other.get("/api/files/" + fid).status_code == 404
    assert client.delete("/api/files/" + fid).status_code == 200
    assert client.get("/api/files/" + fid).status_code == 404


def test_scanned_empty_pdf_rejected(client):
    from reportlab.pdfgen.canvas import Canvas

    b = io.BytesIO()
    c = Canvas(b)
    c.showPage()
    c.save()
    assert (
        client.post(
            "/api/extract",
            files={"file": ("scan.pdf", b.getvalue(), "application/pdf")},
        ).status_code
        == 422
    )


def test_pdf_page_limit(client):
    from reportlab.pdfgen.canvas import Canvas

    b = io.BytesIO()
    c = Canvas(b)
    for _ in range(6):
        c.drawString(40, 700, "Text")
        c.showPage()
    c.save()
    assert (
        client.post(
            "/api/extract",
            files={"file": ("long.pdf", b.getvalue(), "application/pdf")},
        ).status_code
        == 422
    )


def image_bytes():
    b = io.BytesIO()
    im = Image.new("RGB", (100, 60), "white")
    im.paste("teal", (20, 20, 80, 40))
    im.save(b, format="PNG")
    return b.getvalue()


def test_assets_visual_manual_check_and_link(client):
    switch(client, "manager")
    im = image_bytes()
    a = client.post("/api/assets", files={"file": ("logo.png", im, "image/png")})
    assert a.status_code == 200
    r = client.post(
        "/api/visual-check",
        files={"file": ("crop.png", im, "image/png")},
        data={
            "alt": "Northstar logo",
            "imageKind": "informative",
            "foreground": "#14253f",
            "background": "#ffffff",
        },
    )
    assert r.status_code == 200
    v = r.json()
    assert (
        v["contrastPassed"]
        and v["altPassed"]
        and not v["passed"]
        and v["candidates"][0]["distance"] == 0
    )
    v = client.post(
        "/api/visual-check/" + v["id"] + "/confirm",
        json={
            "data": {
                "assetId": a.json()["id"],
                "reason": "Checked crop visually against the approved logo.",
            }
        },
    ).json()
    assert v["passed"]
    switch(client, "creator")
    d = state(client)["documents"][0]
    assert (
        client.post(
            "/api/documents/" + d["id"] + "/link-visual",
            json={"data": {"visualId": v["id"], "expectedRevision": 1}},
        ).status_code
        == 200
    )
    assert state(client)["documents"][0]["revision"] == 2


def test_visual_failures_do_not_become_passes(client):
    r = client.post(
        "/api/visual-check",
        files={"file": ("logo.png", image_bytes(), "image/png")},
        data={
            "alt": "",
            "imageKind": "informative",
            "foreground": "#ffffff",
            "background": "#ffffff",
        },
    )
    v = r.json()
    assert not v["altPassed"] and not v["contrastPassed"] and not v["passed"]


def test_campaign_blocks_unapproved_documents(client):
    d = state(client)["documents"][0]
    switch(client, "manager")
    c = client.post(
        "/api/campaigns", json={"data": {"name": "Launch", "documentIds": [d["id"]]}}
    )
    assert (
        c.status_code == 200
        and client.get("/api/campaigns/" + c.json()["id"] + "/export").status_code
        == 409
    )


def test_campaign_current_version_manifest(client):
    d = approve(client)
    switch(client, "manager")
    c = client.post(
        "/api/campaigns", json={"data": {"name": "Launch", "documentIds": [d["id"]]}}
    ).json()
    r = client.get("/api/campaigns/" + c["id"] + "/export")
    assert r.status_code == 200 and r.json()["items"][0]["text"] == GOOD


def test_delete_derived_content(client):
    d = run_review(client, state(client)["documents"][0]["id"])
    assert client.delete("/api/documents/" + d["id"]).status_code == 200
    assert not state(client)["documents"]


def test_word_limit(client):
    assert (
        client.post(
            "/api/documents",
            json={"data": {"text": "word " * 3001, "title": "Too long"}},
        ).status_code
        == 422
    )


def test_contrast_formula():
    assert m.contrast("#000000", "#ffffff") == 21
    assert m.contrast("#ffffff", "#ffffff") == 1


def test_hash_covers_context_and_linked_visuals():
    d = e.new_document("A", GOOD, {"id": "a", "name": "A"})
    h = e.digest(d)
    d["context"]["audience"] = "changed"
    assert e.digest(d) != h
    h = e.digest(d)
    d["visualCheckIds"].append("new")
    assert e.digest(d) != h


def test_terminology_boundaries_and_variants():
    st = e.seed()
    st["rules"] = [st["rules"][0]]
    st["rules"][0]["pattern"] = "cheap"
    st["rules"][0]["variants"] = ["budget bargain"]
    d = e.new_document(
        "A", "Cheapest and cheap and budget bargain", {"id": "a", "name": "A"}
    )
    fs = e.check(st, d)
    assert len(fs) == 2 and all(f["text"] != "Cheapest" for f in fs)


def test_section_and_channel_scopes():
    st = e.seed()
    st["rules"] = [st["rules"][0]]
    st["rules"][0].update(section="headline", channel="social")
    d = e.new_document(
        "A",
        "# Headline\ncheap plan\n# Body\ncheap plan",
        {"id": "a", "name": "A"},
        {"channel": "social"},
    )
    fs = e.check(st, d)
    assert len(fs) == 1
    d["context"]["channel"] = "email"
    assert not e.check(st, d)


def test_source_quote_loss_blocks_rule():
    st = e.seed()
    st["sources"][0]["body"] = "Unrelated approved text"
    d = e.new_document("A", GOOD, {"id": "a", "name": "A"})
    assert any(f["category"] == "source" for f in e.check(st, d))


def test_conflicting_fact_values_surface():
    st = e.seed()
    other = copy.deepcopy(st["rules"][1])
    other["id"] = "RULE-OTHER"
    other["maxValue"] = 30
    st["rules"].append(other)
    assert any(c["kind"] == "source" for c in e.conflicts(st))
    assert "conflict" in " ".join(
        e.readiness(st, e.new_document("A", GOOD, {"id": "a", "name": "A"}))["reasons"]
    )


def test_supabase_does_not_fallback(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with pytest.raises(Exception) as ex:
        Supabase().read("not-real")
    assert ex.value.status_code == 503
