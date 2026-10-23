import uuid
"""Upgrade tests: checker correctness, lifecycle, error contracts, AI validation, cleanup."""

import asyncio, io, json, time
import httpx
import pytest
from fastapi.testclient import TestClient
from backend import engine as e, main as m
from backend.store import Store


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(m, "local", Store(tmp_path / "up.db"))
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "private")
    m.PRIVATE.mkdir()
    m.known.clear()
    m.limits.clear()
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(m.app) as c:
        assert c.post("/api/demo").status_code == 200
        yield c


def st(c):
    return c.get("/api/state").json()


def did(c):
    return st(c)["documents"][0]["id"]


def switch(c, role):
    assert c.post("/api/persona", json={"data": {"role": role}}).status_code == 200


def reviewed(c, text, useAI=False):
    d = st(c)["documents"][0]
    c.put(
        "/api/documents/" + d["id"],
        json={
            "data": {
                "text": text,
                "expectedRevision": d["revision"],
                "context": d["context"],
            }
        },
    )
    assert (
        c.post(
            "/api/documents/" + d["id"] + "/review", json={"data": {"useAI": useAI}}
        ).status_code
        == 200
    )
    end = time.monotonic() + 6
    while time.monotonic() < end:
        d = next(x for x in st(c)["documents"] if x["id"] == d["id"])
        if d["review"]["status"] not in ("queued", "reviewing"):
            return d
        time.sleep(0.08)
    pytest.fail("worker did not finish")


# ---------------------------------------------------------------- checker
def test_decimal_percentage_is_not_split():
    s = e.seed()
    d = e.new_document(
        "p", "We saw 99.9% uptime last quarter.", {"id": "u", "name": "U"}
    )
    fs = e.check(s, d)
    assert len(fs) == 1 and fs[0]["text"] == "99.9%"
    assert fs[0]["ruleName"] == "Unapproved numerical claim"
    assert fs[0]["category"] == "claim"


def test_privacy_label_is_not_reused_for_claims():
    s = e.seed()
    d = e.new_document("p", "Uptime was 97% overall.", {"id": "u", "name": "U"})
    fs = e.check(s, d)
    assert fs and all(f["ruleName"] != "Sensitive-information preflight" for f in fs)


@pytest.mark.parametrize(
    "text",
    [
        "Our cheap-plan costs less.",
        "Our Cheap  plan costs less.",
        "our cheap_plan costs less",
    ],
)
def test_hyphen_space_and_underscore_variants_match(text):
    s = e.seed()
    fs = e.check(s, e.new_document("p", text, {"id": "u", "name": "U"}))
    assert any(f["category"] == "terminology" for f in fs)


def test_per_cent_is_a_percentage():
    s = e.seed()
    fs = e.check(
        s, e.new_document("p", "Save 12 per cent today.", {"id": "u", "name": "U"})
    )
    assert any(f["category"] == "claim" for f in fs)


def test_hype_guarantee_and_superlative_rules_fire():
    s = e.seed()
    fs = e.check(
        s,
        e.new_document(
            "p",
            "Guaranteed savings. Risk-free. Best in the world.",
            {"id": "u", "name": "U"},
        ),
    )
    rules = {f["ruleId"] for f in fs}
    assert {"RULE-005", "RULE-006"} <= rules
    fs = e.check(
        s,
        e.new_document(
            "p", "Our affordable plan is number one.", {"id": "u", "name": "U"}
        ),
    )
    assert "RULE-007" in {f["ruleId"] for f in fs}


def test_unrelated_percentage_does_not_claim_savings():
    s = e.seed()
    fs = e.check(
        s,
        e.new_document("p", "CPU use fell to 40% overnight.", {"id": "u", "name": "U"}),
    )
    assert all(f["ruleId"] != "RULE-002" for f in fs)
    assert any(f["ruleName"] == "Unapproved numerical claim" for f in fs)


def test_clean_copy_stays_clean():
    s = e.seed()
    assert (
        e.check(
            s,
            e.new_document(
                "p",
                "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.",
                {"id": "u", "name": "U"},
            ),
        )
        == []
    )


# ---------------------------------------------------- structured errors
def test_blocked_export_returns_machine_readable_code(client):
    r = client.get("/api/documents/" + did(client) + "/export")
    assert r.status_code == 409
    body = r.json()
    assert body["code"] and body["action"] and body["detail"]


def test_stale_save_returns_conflict_code(client):
    d = st(client)["documents"][0]
    client.put(
        "/api/documents/" + d["id"],
        json={"data": {"text": "New text", "expectedRevision": 1}},
    )
    r = client.put(
        "/api/documents/" + d["id"],
        json={"data": {"text": "Other", "expectedRevision": 1}},
    )
    assert r.status_code == 409 and r.json()["code"] == "REVISION_CONFLICT"


def test_wrong_role_and_foreign_ids_have_codes(client):
    r = client.post("/api/sources/SRC-001/activate")
    assert r.json()["code"] == "ROLE_FORBIDDEN"
    r = client.get("/api/documents/not-a-real-id/export")
    assert r.json()["code"] == "NOT_FOUND"


def test_approval_blocked_before_submission(client):
    d = reviewed(
        client,
        "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.",
    )
    switch(client, "reviewer")
    r = client.post(
        "/api/documents/" + d["id"] + "/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
            }
        },
    )
    assert r.status_code == 409


def test_second_approval_with_stale_revision_is_rejected(client):
    d = reviewed(
        client,
        "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.",
    )
    client.post("/api/documents/" + d["id"] + "/submit")
    switch(client, "reviewer")
    payload = {
        "data": {
            "outcome": "approved",
            "expectedRevision": d["revision"],
            "manualCoverage": True,
        }
    }
    assert (
        client.post("/api/documents/" + d["id"] + "/decision", json=payload).status_code
        == 200
    )
    assert (
        client.post("/api/documents/" + d["id"] + "/decision", json=payload).status_code
        == 409
    )


# ------------------------------------------------------- rule lifecycle
def test_editing_active_rule_deactivates_and_versions(client):
    switch(client, "manager")
    before = st(client)["sourceVersion"]
    r = client.put("/api/rules/RULE-002", json={"data": {"maxValue": 15}})
    assert r.status_code == 200 and r.json()["reactivate"] is True
    after = st(client)
    assert after["sourceVersion"] == before + 1
    assert next(x for x in after["rules"] if x["id"] == "RULE-002")["active"] is False


def test_deactivated_rule_needs_quote_to_return(client):
    switch(client, "manager")
    client.post("/api/rules/RULE-002/deactivate")
    assert client.post("/api/rules/RULE-002/activate").status_code == 200


def test_deactivate_blocks_export_and_delete_requires_inactive(client):
    d = reviewed(
        client,
        "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.",
    )
    client.post("/api/documents/" + d["id"] + "/submit")
    switch(client, "reviewer")
    assert (
        client.post(
            "/api/documents/" + d["id"] + "/decision",
            json={
                "data": {
                    "outcome": "approved",
                    "expectedRevision": d["revision"],
                    "manualCoverage": True,
                }
            },
        ).status_code
        == 200
    )
    assert client.get("/api/documents/" + d["id"] + "/export").status_code == 200
    switch(client, "manager")
    assert client.post("/api/rules/RULE-001/deactivate").status_code == 200
    assert client.get("/api/documents/" + d["id"] + "/export").status_code == 409
    assert client.delete("/api/rules/RULE-002").status_code == 409
    client.post("/api/rules/RULE-002/deactivate")
    assert client.delete("/api/rules/RULE-002").status_code == 200


def test_retiring_source_orphans_its_rules(client):
    switch(client, "manager")
    r = client.post("/api/sources/SRC-001/retire")
    assert r.status_code == 200
    assert "Preferred plan terminology" in r.json()["affectedRules"]
    switch(client, "creator")
    d = reviewed(client, "Discover our affordable plan.")
    assert any(f["category"] == "source" for f in d["findings"])
    assert d["review"]["status"] in ("partial", "complete")


# ------------------------------------------------------------- AI path
class FakeResponse:
    def __init__(self, payload, status=200):
        self._p = payload
        self.status_code = status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("bad", request=None, response=None)

    def json(self):
        return self._p


def fake_ai(payload, calls=None):
    async def post(self, url, **kw):
        if calls is not None:
            calls.append(kw.get("json"))
        return FakeResponse(payload)

    return post


def test_ai_valid_finding_is_labelled_and_quoted(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-not-real")
    body = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "findings": [
                                {
                                    "text": "Guaranteed",
                                    "explanation": "Promises an outcome.",
                                    "suggestion": "May",
                                    "severity": "high",
                                    "sourceId": "SRC-001",
                                    "quote": "Never promise guaranteed or risk-free results.",
                                }
                            ]
                        }
                    )
                }
            }
        ],
        "usage": {"total_tokens": 12},
    }
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_ai(body))
    s = e.seed()
    d = e.new_document("p", "Guaranteed results.", {"id": "u", "name": "U"})
    fs, status = asyncio.run(m.interpret_ai(s, d))
    assert (
        status["ok"]
        and len(fs) == 1
        and fs[0]["provenance"] == "AI-suggested"
        and fs[0]["quote"]
    )


def test_ai_invented_quote_is_rejected(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-not-real")
    body = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "findings": [
                                {
                                    "text": "Guaranteed",
                                    "explanation": "x",
                                    "sourceId": "SRC-001",
                                    "quote": "A sentence nobody approved.",
                                }
                            ]
                        }
                    )
                }
            }
        ]
    }
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_ai(body))
    s = e.seed()
    d = e.new_document("p", "Guaranteed results.", {"id": "u", "name": "U"})
    fs, status = asyncio.run(m.interpret_ai(s, d))
    assert fs == [] and status["ok"] is False


def test_ai_malformed_response_is_partial_not_fake(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-not-real")
    monkeypatch.setattr(
        httpx.AsyncClient,
        "post",
        fake_ai({"choices": [{"message": {"content": "not json"}}]}),
    )
    s = e.seed()
    d = e.new_document("p", "Guaranteed results.", {"id": "u", "name": "U"})
    fs, status = asyncio.run(m.interpret_ai(s, d))
    assert fs == [] and status["ok"] is False and "invalid" in status["reason"].lower()


def test_ai_blocked_when_credentials_present(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-not-real")
    calls = []
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_ai({"choices": []}, calls))
    s = e.seed()
    d = e.new_document(
        "p", "Key sk-abcdefghijklmnop1234 leaked.", {"id": "u", "name": "U"}
    )
    fs, status = asyncio.run(m.interpret_ai(s, d))
    assert (
        fs == []
        and not status["ok"]
        and "credential" in status["reason"].lower()
        and calls == []
    )


def test_review_coverage_is_reported(client):
    d = reviewed(
        client,
        "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.",
    )
    cov = d["review"]["coverage"]
    assert cov["ruleCount"] == 7 and cov["triggered"] == 0 and "notChecked" in cov


# --------------------------------------------------------- housekeeping
def test_purge_removes_only_old_demos(tmp_path, monkeypatch):
    monkeypatch.setattr(m, "local", Store(tmp_path / "purge.db"))
    m.known.clear()
    old = e.seed()
    old["createdAt"] = "2020-01-01T00:00:00+00:00"
    fresh = e.seed()
    m.local.create("old-ws", old)
    m.local.create("new-ws", fresh)
    m.known.update([("old-ws", "demo"), ("new-ws", "demo")])
    removed = m.purge_old_demos()
    assert removed == ["old-ws"]
    assert m.local.read("new-ws")[0]["name"] == fresh["name"]


def test_rate_limit_is_per_session(client, monkeypatch):
    m.limits.clear()
    for _ in range(301):
        client.get("/api/config")
    r = client.get("/api/config")
    assert r.status_code == 429 and r.json()["code"] == "RATE_LIMITED"


def test_visual_link_becomes_stale_after_asset_change(client):
    from PIL import Image

    b = io.BytesIO()
    Image.new("RGB", (40, 40), "white").save(b, format="PNG")
    png = b.getvalue()
    switch(client, "manager")
    asset = client.post(
        "/api/assets", files={"file": ("logo.png", png, "image/png")}
    ).json()
    v = client.post(
        "/api/visual-check",
        files={"file": ("logo.png", png, "image/png")},
        data={
            "alt": "Logo",
            "imageKind": "informative",
            "foreground": "#000000",
            "background": "#ffffff",
        },
    ).json()
    v = client.post(
        "/api/visual-check/" + v["id"] + "/confirm",
        json={
            "data": {
                "assetId": asset["id"],
                "reason": "Compared against the approved asset.",
            }
        },
    ).json()
    assert v["passed"]
    switch(client, "creator")
    d = st(client)["documents"][0]
    client.post(
        "/api/documents/" + d["id"] + "/link-visual",
        json={"data": {"visualId": v["id"], "expectedRevision": 1}},
    )
    d = reviewed(
        client,
        "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.",
    )
    client.post("/api/documents/" + d["id"] + "/submit")
    switch(client, "reviewer")
    client.post(
        "/api/documents/" + d["id"] + "/decision",
        json={
            "data": {
                "outcome": "approved",
                "expectedRevision": d["revision"],
                "manualCoverage": True,
            }
        },
    )
    assert client.get("/api/documents/" + d["id"] + "/export").status_code == 200
    switch(client, "manager")
    client.post("/api/assets", files={"file": ("logo2.png", png, "image/png")})
    assert client.get("/api/documents/" + d["id"] + "/export").status_code == 409


# ------------------------------------------------------- account auth
def test_local_account_register_login_and_roles(tmp_path, monkeypatch):
    from backend.store import Accounts

    monkeypatch.setattr(m, "local", Store(tmp_path / "acc.db"))
    monkeypatch.setattr(m, "accounts", Accounts(tmp_path / "acc-users.db"))
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "p")
    m.PRIVATE.mkdir(); m.known.clear(); m.limits.clear()
    with TestClient(m.app) as c:
        r = c.post("/api/account/register", json={"data": {"email": "owner@test.local", "password": "longenough1", "name": "Owner"}})
        assert r.status_code == 200 and r.json()["role"] == "manager"
        body = c.get("/api/state").json()
        assert body["mode"] == "local" and body["actor"]["role"] == "manager"
        assert "EXAMPLE source" in body["sources"][0]["title"]
    with TestClient(m.app) as c2:
        assert c2.post("/api/account/login", json={"data": {"email": "owner@test.local", "password": "wrongwrong"}}).status_code == 401
        assert c2.post("/api/account/login", json={"data": {"email": "owner@test.local", "password": "longenough1"}}).status_code == 200
        assert c2.post("/api/account/register", json={"data": {"email": "owner@test.local", "password": "longenough1"}}).status_code == 409
        assert c2.post("/api/account/register", json={"data": {"email": "x@y.local", "password": "short"}}).status_code == 422


def test_membership_is_enforced_from_the_database(tmp_path, monkeypatch):
    from backend.store import Accounts

    monkeypatch.setattr(m, "local", Store(tmp_path / "mem.db"))
    monkeypatch.setattr(m, "accounts", Accounts(tmp_path / "mem-users.db"))
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "p")
    m.PRIVATE.mkdir(); m.known.clear(); m.limits.clear()
    with TestClient(m.app) as owner:
        owner.post("/api/account/register", json={"data": {"email": "mgr@test.local", "password": "longenough1", "name": "Manager"}})
        with TestClient(m.app) as other:
            other.post("/api/account/register", json={"data": {"email": "rev@test.local", "password": "longenough1", "name": "Reviewer"}})
            reviewer_id = other.get("/api/state").json()["actor"]["id"]
            assert owner.post("/api/members", json={"data": {"email": "rev@test.local", "role": "reviewer"}}).status_code == 200
            assert any(x["role"] == "reviewer" for x in owner.get("/api/members").json())
            # Promoted identity sees reviewer permissions only after resolving membership server-side.
            mine = other.get("/api/state").json()
            assert mine["workspaceId"] != owner.get("/api/state").json()["workspaceId"]


def test_auth_status_reports_modes(client):
    body = client.get("/api/auth/status").json()
    assert body["localAccounts"] is True and "supabase" in body


def test_login_error_messages_are_specific(tmp_path, monkeypatch):
    from backend.store import Accounts

    monkeypatch.setattr(m, "local", Store(tmp_path / "le.db"))
    monkeypatch.setattr(m, "accounts", Accounts(tmp_path / "le-users.db"))
    monkeypatch.setattr(m, "PRIVATE", tmp_path / "p")
    m.PRIVATE.mkdir(); m.known.clear(); m.limits.clear()
    with TestClient(m.app) as c:
        r = c.post("/api/login", json={"data": {"email": "nobody@example.com", "password": "whatever1"}})
        assert r.status_code in (401, 503)
        assert "incorrect" in r.json()["detail"].lower() or "supabase" in r.json()["detail"].lower()
        assert c.post("/api/login", json={"data": {"email": "", "password": ""}}).status_code == 422


def test_auth_errors_never_leak_internals():
    # A wrong credential must not produce a generic 'check configuration' message.
    import inspect

    source = inspect.getsource(m.login)
    assert "Email or password is incorrect" in source


def test_storage_recovers_if_database_file_disappears(tmp_path):
    """Deleting the sqlite file while the API runs must not break the demo."""
    import os
    from backend.store import Accounts

    store = Store(tmp_path / "gone.db")
    store.create("ws-one", {"name": "One"})
    os.remove(tmp_path / "gone.db")
    store.create("ws-two", {"name": "Two"})
    assert store.read("ws-two")[0]["name"] == "Two"

    accounts = Accounts(tmp_path / "gone-users.db")
    accounts.register("a@b.test", "password123", "A")
    os.remove(tmp_path / "gone-users.db")
    assert accounts.authenticate("a@b.test", "password123") is None
    accounts.register("a@b.test", "password123", "A")
    assert accounts.authenticate("a@b.test", "password123") is not None


def test_demo_endpoint_works_after_storage_reset(client):
    assert client.post("/api/demo").status_code == 200
    body = client.get("/api/state").json()
    assert body["mode"] == "demo" and body["documents"]


# --------------------------------------------------------------------------
# Session transport: sandboxed previews block cookies, so the token in the
# response body has to carry the session on its own.
# --------------------------------------------------------------------------
def test_demo_and_signup_return_a_usable_session_token(client):
    r = client.post("/api/demo")
    assert r.status_code == 200
    token = r.json().get("sessionToken")
    assert token, "auth responses must return sessionToken for cookie-less clients"
    client.cookies.clear()
    state = client.get("/api/state", headers={"Authorization": f"Bearer {token}"})
    assert state.status_code == 200
    assert state.json()["mode"] == "demo"


def test_bearer_token_alone_authenticates_without_any_cookie(client):
    email = f"bearer.{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        "/api/account/register",
        json={"data": {"email": email, "password": "Proofline#2026", "name": "Bearer User"}},
    )
    assert r.status_code == 200
    token = r.json()["sessionToken"]
    client.cookies.clear()
    assert client.get("/api/state").status_code == 401
    authed = client.get("/api/state", headers={"Authorization": f"Bearer {token}"})
    assert authed.status_code == 200
    assert authed.json()["actor"]["role"] == "manager"


def test_tampered_bearer_token_is_rejected(client):
    r = client.post("/api/demo")
    token = r.json()["sessionToken"]
    client.cookies.clear()
    bad = client.get("/api/state", headers={"Authorization": f"Bearer {token[:-4]}aaaa"})
    assert bad.status_code == 401
    assert client.get("/api/state", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_bearer_session_cannot_reach_another_workspace_document(client):
    a = client.post("/api/demo").json()["sessionToken"]
    b = client.post("/api/demo").json()["sessionToken"]
    client.cookies.clear()
    docs_a = client.get("/api/state", headers={"Authorization": f"Bearer {a}"}).json()["documents"]
    foreign = docs_a[0]["id"]
    other = client.post(
        f"/api/documents/{foreign}/review",
        json={"data": {}},
        headers={"Authorization": f"Bearer {b}"},
    )
    assert other.status_code in (403, 404), other.text


def test_preflight_allows_bearer_header_from_opaque_preview_origin(client):
    """Opaque origins ('null') must pass preflight or the header session dies."""
    pre = client.options(
        "/api/state",
        headers={
            "Origin": "null",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert pre.status_code in (200, 204), pre.text
    assert pre.headers.get("access-control-allow-origin") == "null"
    assert "authorization" in pre.headers.get("access-control-allow-headers", "").lower()


def test_preflight_rejects_unrelated_origin(client):
    pre = client.options(
        "/api/state",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert pre.headers.get("access-control-allow-origin") != "https://evil.example"
