<USER_REQUEST>
# Proofline Round 3 — Implementation Specification (agent-executable)

**Version:** 1.0 · **Target release:** `0.2.0` · **Baseline commit:** `59d96a3` (deck) / current `main` of `AlamNawazSha/proofline`
**Audience:** an autonomous coding agent with shell + file access to this repository.
**Rule zero:** implement exactly what is written here. Where this document is silent, follow existing code conventions; do not invent product scope.

---

## 0. How to use this document

1. Read §1 (orientation) fully before touching code. It describes the real state model; guessing it is the top source of bugs.
2. Implement in this order: **Q2 (§4) → Q3 (§5) → Q1 (§3)**. Q2 needs no schema change and gives the fastest verifiable win; Q1 is the largest change and should land last.
3. After each improvement: run `pytest -q`, then `bash scripts/production.sh` + `python scripts/smoke.py http://127.0.0.1:8000`, then record status in `FEATURES_STATUS.md`.
4. **Never** mark a requirement done without the named test existing and passing. Never write a metric, percentage or coverage number that a command in this repo does not produce.

### 0.1 Hard invariants (violating any of these is a failed implementation)

| # | Invariant |
|---|---|
| I1 | The creator can never approve their own document. `403`. Test: `test_creator_cannot_approve`. |
| I2 | An approval is bound to (document id, revision, context, source version, content fingerprint). Any change to any of them invalidates it. |
| I3 | Export is evaluated **server-side** on every call. The UI may never be the gate. |
| I4 | Missing evidence, expired sources and privacy findings can never be waived as a clean pass. |
| I5 | No feature is described as "built" unless a test asserts it. No fabricated AI results, ever: provider failure returns `ok:false` with a reason. |
| I6 | The Supabase service-role key never reaches the browser. RLS is not disabled, and no public/anonymous read path to real data is created. |
| I7 | All state mutations go through `store(s).mutate(wid, fn)` so the workspace compare-and-set applies. No direct writes. |
| I8 | Every new HTTP error keeps the contract `{detail, code, action}` by raising `HTTPException` and adding a token to `ERROR_CODES` in `backend/main.py`. |
| I9 | The test suite must run **offline**. `tests/conftest.py` clears provider env vars; new tests must not depend on network. |
| I10 | The three improvement names are frozen (§1.6). Do not rename, merge, split or reorder them. |

---

## 1. Orientation — how this codebase actually works

### 1.1 Files that matter

| Path | Role |
|---|---|
| `backend/main.py` | FastAPI app, ~2,250 lines. All routes, session handling, permission checks, error envelope, rate limiting. |
| `backend/engine.py` | Pure domain logic: seeding, findings, readiness, conflicts, fingerprints, events. |
| `backend/store.py` | `Store` (SQLite, demo/local) and `Supabase` (real workspaces) with a shared read/mutate interface. |
| `supabase/001_proofline.sql` | Schema, RLS policies, CAS RPC, storage bucket. |
| `tests/` | `conftest.py` (offline guard), `test_core.py`, `test_upgrades.py`. |
| `scripts/smoke.py` | End-to-end HTTP journey against a running server. |
| `scripts/production.sh` | Single-process production launcher (API serves the exported UI). |
| `frontend/app/page.tsx` | The entire UI (single-page, ~4,140 lines). |
| `FEATURES_STATUS.md` | Authoritative feature ledger. Must be updated, never inflated. |

### 1.2 The state model (critical)

A workspace is **one JSON document** stored in one row:

* `Store`: `workspaces(id TEXT PK, state TEXT, rev INTEGER)` in SQLite.
* `Supabase`: `public.proofline_workspaces(id uuid PK, owner_id, state jsonb, revision bigint, …)`.

Top-level keys of `state` (from `engine.seed()`):

```
name, sourceVersion, sources[], rules[], documents[], events[],
receipts[], feedback[], assets[], visualChecks[], campaigns[], jobs[], files[], createdAt
```

Document shape (from `engine.new_document()`):

```
id, title, text, creatorId, creatorName, revision, context{channel,audience,purpose},
visualCheckIds[], history[], findings[], comments[], review, decision, submitted,
createdAt, updatedAt
```

Decision shape (from the `decision` route):

```
id, outcome, reviewerId, reviewerName, revision, sourceVersion, fingerprint,
manualCoverage, reason, at
```

Finding shape: `id, ruleId, ruleName, category, severity, start, end, text, explanation, suggestion, sourceId, sourceTitle, quote, sourceLocation, evidenceState, provenance, status, mandatory, createdAt`.

### 1.3 Concurrency and storage interface

```python
st, rev = store(s).read(wid)          # (state dict, workspace revision)
store(s).mutate(wid, fn)              # fn(state) -> result; CAS-protected; deep-copied result
```

* SQLite path uses `BEGIN IMMEDIATE` under a `threading.RLock`.
* Supabase path retries `read → fn → proofline_cas_state(p_id, p_expected, p_state)` up to 3 times, then raises `409`.
* Per-document optimistic locking already exists: `cas_doc(doc, expectedRevision)` raises `409` when the document moved.

**Consequence for Q1:** with one JSON row per workspace, any library-wide scan is O(documents) inside a single CAS write. `§3.4` adds per-document storage; the JSON row stays the system of record only for non-document state.

### 1.4 Auth, roles, permissions

* Session = signed cookie `proofline` (12h) + `sessionToken` in the JSON body for header use. Decoded by `session(request)`.
* `session()` returns `{"wid", "mode", "actor": {"id","name","role"}}`. `mode` is `demo` | `local` | `supabase`.
* `require(s, *roles)` → `403` if the actor's role is not in the list.
* `editable(s, doc)` → `403` unless the actor is the document creator (or a manager, per current code).
* `docget(state, did)` → `404 "Document not found in this workspace"`.

### 1.5 Error envelope

`HTTPException` is converted by the global handler into:

```json
{"detail": "human sentence", "code": "MACHINE_CODE", "action": "NEXT_ACTION"}
```

Codes come from the `ERROR_CODES` token table in `backend/main.py`. New codes must be added there (§7.1).

### 1.6 Frozen naming (must match the form, the deck, and the repo)

| ID | Name (exact) | One-line purpose |
|---|---|---|
| **Q1** | **Cascade re-review with ownership** | A source/rule/fact change creates tracked, owned re-review tasks per affected document. |
| **Q2** | **Benchmarked detection quality, enforced in CI** | A frozen labelled benchmark publishes precision/recall/FPR per layer and fails CI on regression. |
| **Q3** | **Multi-reviewer approval policy** | Quorum by channel/severity, revocation with reason, escalation deadlines, time-boxed exceptions. |

### 1.7 Non-goals (do not build)

OCR, layout understanding, semantic logo recognition for arbitrary images, publishing/scheduling to external channels, immutable/append-only ledger, digital signatures (the fingerprint is integrity, not a signature), SSO, billing, mobile apps. Each of these either contradicts a documented claim or is out of the graded scope.

---

## 2. Shared groundwork (do this first, once)

### 2.1 Version and ledger

* Bump `backend/main.py` `"/api/config"` `"version"` to `"0.2.0"`.
* Add the three improvements to `FEATURES_STATUS.md` under a new section `## J. Round 3 improvements`, each starting as `◐ in progress` and moving to `✅ built + tested` only when its §DoD passes.

### 2.2 New error codes

Add to `ERROR_CODES` (token, code, action):

```python
("quorum",        "QUORUM_NOT_MET",      "REQUEST_SECOND_APPROVAL"),
("revoked",       "APPROVAL_REVOKED",    "REQUEST_NEW_APPROVAL"),
("escalated",     "REVIEW_ESCALATED",    "ASSIGN_NEW_REVIEWER"),
("exception",     "EXCEPTION_EXPIRED",   "REQUEST_NEW_APPROVAL"),
("task",          "TASK_REQUIRED",       "OPEN_ASSIGNED_TASK"),
("benchmark",     "BENCHMARK_FAILED",    "FIX_QUALITY_REGRESSION"),
("policy",        "POLICY_INVALID",      "FIX_POLICY"),
```

### 2.3 Test scaffolding

* All new tests live at the **top level** of `tests/` (pytest `rootdir` behaviour; do not create packages without `__init__.py`).
* Reuse `tests/conftest.py`; it clears `GEMINI_API_KEY`, `OPENAI_API_KEY` and all `SUPABASE_*` vars for every test. Never bypass it.
* Use the FastAPI `TestClient` pattern already present in `test_core.py`. Any test that needs a model provider must monkeypatch the HTTP call and set a fake key.

### 2.4 Feature flags (all default `true` in production, `false` in tests unless set)

```
FEATURE_QUORUM=true      # Q3
FEATURE_TASKS=true       # Q1
FEATURE_BENCHMARK_CI=true# Q2 (governs the CI gate only, not runtime)
```

Read them in one helper `features()` in `backend/main.py`. A disabled feature must degrade to current behaviour, never crash.

---

## 3. Q1 — Cascade re-review with ownership

**Definition (do not paraphrase in code comments, docs or the ledger):** when an approved source, rule or fact changes, expires or conflicts, Proofline creates one owned, tracked re-review task per affected document and follows it until closure.

### 3.1 What exists today (do not duplicate)

* `POST /api/sources/{sid}/activate` bumps `state["sourceVersion"]` and mints a new pack version.
* Readiness already detects an outdated approval: `engine.readiness()` + `409 APPROVAL_OUTDATED` on export.
* `POST /api/sources/impact` already returns a **preview** (`before`/`after` finding counts, `approvalWillNeedReview`). This is read-only and stays.
* Manual re-opening of documents is the gap. There is no task object, no assignee, no closure tracking, no notification.

### 3.2 Data model — tasks (additive, inside JSON state)

Add to `engine.seed()`:

```python
"tasks": [],
"tasksPolicy": {"dedupe": True, "autoCloseOnReapproval": True}
```

Task object (exact shape — keep key names):

```json
{
  "id": "uuid",
  "workspaceId": "uuid",
  "documentId": "uuid",
  "documentTitle": "Annual plan launch — website",
  "ownerId": "user id - the document creatorId",
  "ownerName": "Maya Chen",
  "reason": "source_updated",
  "reasonDetail": "Source pack v1 → v2 (Northstar approved brand guide)",
  "status": "open",
  "assigneeId": "user id - defaults to ownerId, reassignable by manager",
  "assigneeName": "Maya Chen",
  "createdAt": "iso8601",
  "dueAt": "iso8601 | null",
  "closedAt": "iso8601 | null",
  "closedBy": "user id | null",
  "closedByReapproval": true,
  "dedupeKey": "sha256(documentId + ':' + reason + ':' + triggerId)",
  "triggerId": "sourceVersion or ruleId or factId that caused it",
  "escalatedAt": "iso8601 | null"
}
```

`status` enum: `open` → `in_progress` → `closed`. `escalated` is a flag (`escalatedAt`), **not** a status, so a task can be escalated and still open.

`reason` enum (exact strings): `source_updated`, `source_retired`, `rule_changed`, `rule_deactivated`, `fact_expired`, `approval_revoked`, `visual_check_stale`.

### 3.3 Engine functions to add (`backend/engine.py`)

```python
def task_key(document_id, reason, trigger_id) -> str
    # sha256(f"{document_id}:{reason}:{trigger_id}")

def affected_documents(state, *, sourceId=None, ruleId=None, factId=None) -> list[dict]
    # Uses the SAME applicability logic as engine.check()/applicable().
    # A document is affected if:
    #   - source_updated/retired: doc has an approval OR an open finding tied to that sourceId,
    #     OR any active rule from that source is applicable to the doc (engine.applicable()).
    #   - rule_changed/deactivated: engine.applicable(rule, doc) is True.
    #   - fact_expired: doc.review or doc.decision references the rule/fact and rule.validUntil < now.
    # MUST NOT include documents that produce no findings and hold no approval (see test Q1-3).

def cascade_tasks(state, *, reason, trigger_id, reason_detail, actor, dueHours=72) -> list[dict]
    # For each affected doc: create task unless dedupeKey already exists for an OPEN task.
    # Appends to state["tasks"], writes one event per created task, returns created tasks.
    # Idempotent: calling twice with the same trigger creates zero extra tasks.

def close_tasks_for_document(state, doc, actor, *, via="reapproval") -> list[dict]
    # Called after a successful approval (see 3.5). Closes every open task for that doc:
    # status="closed", closedAt, closedBy, closedByReapproval=(via=="reapproval").

def open_tasks(state, documentId=None) -> list[dict]
def task_summary(state) -> dict   # {"open": n, "escalated": n, "closedToday": n, "oldestOpenAt": iso|null}
```

### 3.4 Hook points — where cascade must fire (exact)

| Trigger | File / route | Call |
|---|---|---|
| Source activated (pack version bump) | `POST /api/sources/{sid}/activate` | after the new `sourceVersion` is written: `cascade_tasks(..., reason="source_updated", trigger_id=f"v{new_version}", reason_detail=f"Source pack v{n-1} → v{n} ({source title})")` |
| Source retired | `POST /api/sources/{sid}/retire` | `reason="source_retired", trigger_id=sid` |
| Rule edited (which deactivates it) | `PUT /api/rules/{rid}` | `reason="rule_changed", trigger_id=f"{rid}:{new_rule_version}"` |
| Rule deactivated | `POST /api/rules/{rid}/deactivate` | `reason="rule_deactivated", trigger_id=rid` |
| Fact/rule expiry observed during a review or readiness check | `engine.readiness()` caller in `POST /api/documents/{did}/review` and the export route | `reason="fact_expired", trigger_id=ruleId` |
| Approval revoked (Q3 only) | `POST /api/documents/{did}/revoke` | `reason="approval_revoked", trigger_id=decisionId` |
| Visual asset changed → check stale | `POST /api/assets` and `POST /api/visual-check` | `reason="visual_check_stale", trigger_id=visualCheckId` |

**Implementation note:** do not call `cascade_tasks` inside `engine.check()` (a pure function). Call it from the route layer, inside the same `store(s).mutate` closure that performs the trigger, so tasks and the triggering change commit atomically.

### 3.5 Task closure

* In `POST /api/documents/{did}/decision`, immediately after a decision with `outcome == "approved"` is stored and the readiness gate passes, call `close_tasks_for_document(state, doc, actor, via="reapproval")`.
* Manual close: `POST /api/tasks/{tid}/close` requires the assignee, the owner, or a manager, and a `reason` of ≥8 characters.

### 3.6 API surface (add to `backend/main.py`)

All routes require a session; all mutations go through `store(s).mutate`.

```
GET  /api/tasks?status=open|in_progress|closed&documentId=<id>&assignee=me
  -> 200 {"tasks": [...], "summary": {"open": n, "escalated": n, "closedToday": n, "oldestOpenAt": iso|null}}
  -> permission: any member; `assignee=me` filters to the caller

POST /api/tasks/{tid}/assign   body {"data": {"assigneeId": "...", "dueAt": "iso|null"}}
  -> 200 {"ok": true, "task": {...}}      permission: manager (any) or the current assignee (reassign to self only? NO — reassignment is manager-only)
  -> 404 NOT_FOUND | 403 ROLE_FORBIDDEN | 422 REQUEST_REJECTED (unknown user in this workspace)

POST /api/tasks/{tid}/close    body {"data": {"reason": ">= 8 chars"}}
  -> 200 {"ok": true, "task": {...}}      permission: assignee, owner, or manager
  -> 422 if reason too short; 409 if already closed (TASK_REQUIRED not applicable — return 409 REQUEST_REJECTED with detail "Task is already closed")

POST /api/tasks/{tid}/escalate body {"data": {"to": "<userId>", "reason": ">= 8 chars"}}
  -> 200 {"ok": true, "task": {...}}      permission: manager
  -> sets assigneeId/assigneeName, escalatedAt, appends event

GET  /api/tasks/summary -> 200 task_summary(state)
```

### 3.7 Notifications (in-app only — no email)

Add `state["notifications"]`, newest first, capped at 200:

```json
{"id","userId","kind":"task_assigned|task_escalated|task_closed","taskId","documentId","text","readAt","createdAt"}
```

* Created for the assignee on assign/escalate; for the owner on close-by-someone-else.
* `GET /api/notifications` → `{"items": [...], "unread": n}`; `POST /api/notifications/{nid}/read`.
* Do **not** claim email/Slack delivery anywhere (docs, deck, ledger).

### 3.8 Per-document storage (Phase B of Q1)

The deck and form say the queue "runs on per-document storage so it holds at library scale". Deliver both phases:

**Phase A (must ship first):** tasks collection as above.
**Phase B (ship in the same release unless the window is < 10 working days, in which case update the deck/form wording to "task queue today, per-document storage next" and record it in `FEATURES_STATUS.md`):**

1. New table, additive, no data loss:

```sql
create table if not exists public.proofline_documents (
  workspace_id uuid not null references public.proofline_workspaces(id) on delete cascade,
  doc_id uuid not null,
  doc jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, doc_id)
);
create index if not exists proofline_documents_workspace on public.proofline_documents(workspace_id);
alter table public.proofline_documents enable row level security;
-- no anon grants; service_role only + member read policy mirroring proofline_workspaces
create or replace function public.proofline_cas_document(
  p_workspace uuid, p_doc uuid, p_expected bigint, p_doc_state jsonb
) returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.proofline_documents
     set doc = p_doc_state, revision = revision + 1, updated_at = now()
   where workspace_id = p_workspace and doc_id = p_doc and revision = p_expected;
  return found;
end; $$;
revoke all on function public.proofline_cas_document(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.proofline_cas_document(uuid,uuid,bigint,jsonb) to service_role;
```

2. `store.py` gains a document gateway with **exactly** this interface, implemented for both backends:

```python
class Documents:
    def list_ids(self, wid) -> list[str]
    def read(self, wid, did) -> tuple[dict, int]        # (doc, revision)
    def read_many(self, wid, ids) -> dict[str, dict]
    def write(self, wid, did, doc, expected) -> None    # raises 409 on mismatch
    def delete(self, wid, did) -> None
    def migrate_from_state(self, wid, state) -> int     # idempotent; returns docs moved
```

3. Compatibility shim: `load_state_for(wid, doc_ids=None)` assembles `state["documents"]` from rows for the routes that need it. Workspace-level mutations (rules, sources, tasks) still use `store(s).mutate`. Document mutations use `Documents.write` **and** re-enter `mutate` only for the workspace counters/events.
4. Migration: run `migrate_from_state` lazily on first read per workspace; keep `state["documents"]` as a deprecated mirror for exactly one release, then delete the key.
5. Library-scale guard: `GET /api/state` must accept `?documents=page|none|all` (default `page`, 50 per page with `?cursor=`), so a 5,000-document workspace never ships the library to the browser.

### 3.9 Acceptance tests — file `tests/test_round3_tasks.py`

Each test name is normative; write these exact names.

| Test | Assertions |
|---|---|
| `test_cascade_creates_one_task_per_affected_document` | 1 workspace, 5 affected docs + 1 unaffected; activate a new source version → `len(open_tasks) == 5`; each has `ownerId == doc.creatorId`, `status == "open"`, unique `dedupeKey`. |
| `test_cascade_is_idempotent` | Call the same trigger twice → still 5 tasks total. |
| `test_unaffected_document_is_never_queued` | The doc that yields zero findings and holds no approval is absent from `tasks`. |
| `test_task_closes_on_reapproval` | Reviewer approves the re-reviewed revision → that task's `status == "closed"`, `closedByReapproval is True`. |
| `test_task_close_requires_reason` | `POST /api/tasks/{id}/close` with `{"reason": "x"}` → `422`. |
| `test_task_assign_requires_manager` | Creator tries to reassign → `403`. Manager succeeds → `assigneeId` changes, notification created for the new assignee. |
| `test_task_escalation_sets_flag_not_status` | Escalate → `escalatedAt` not null, `status` unchanged. |
| `test_rule_deactivation_cascades` | Deactivate a rule used by 2 docs → 2 tasks with `reason == "rule_deactivated"`. |
| `test_tasks_are_workspace_scoped` | Docs from another workspace are never visible in `/api/tasks`. |
| `test_document_storage_roundtrip` (Phase B only) | Write, read and CAS-fail on a document via `Documents`; stale write → `409`. |
| `test_state_pagination_default` (Phase B only) | Workspace with 60 docs → `GET /api/state` returns 50 + cursor. |

### 3.10 Q1 Definition of Done

- [ ] `state["tasks"]` exists with the exact shape in 3.2; seeded empty.
- [ ] All 7 hook points in §3.4 wired inside the same `mutate` closure as their trigger.
- [ ] 4 task routes + summary + notifications implemented, permissions as specified.
- [ ] All 10/11 tests above pass offline.
- [ ] `scripts/smoke.py` extended with a step 10: "change a rule → tasks appear → close via re-approval".
- [ ] `FEATURES_STATUS.md` rows added; no claim of email/Slack notification.
- [ ] If Phase B is deferred, deck/form wording updated and the deferral recorded (no silent gap).

---

## 4. Q2 — Benchmarked detection quality, enforced in CI

**Definition:** a frozen, human-labelled benchmark set publishes precision, recall, false-positive rate, quote validity, latency and failure rate per detection layer (deterministic rules vs AI), and a regression fails the CI build.

### 4.1 Dataset — `benchmark/dataset.v1.jsonl`

* Exactly **30** items, one JSON object per line, UTF-8, no trailing whitespace.
* Frozen: changing the file requires creating `dataset.v2.jsonl` and a version bump in `benchmark/manifest.json`.
* `benchmark/manifest.json` stores `{"version": 1, "sha256": "<hash of dataset file>", "items": 30, "createdAt": "...", "annotators": ["A","B"], "kappa": 0.0}`.
* CI recomputes the SHA-256; a mismatch with `manifest.json` **fails the build** (`BENCHMARK_FAILED`).

Item schema (exact keys):

```json
{
  "id": "BM-001",
  "category": "tone|unsupported_claim|terminology|valid_must_not_flag|ambiguous|conflicting_sources|malformed_model",
  "text": "…content under test…",
  "context": {"channel": "website", "audience": "public", "purpose": "Product launch"},
  "sources": [{"id": "SRC-BM-1", "title": "…", "body": "…exact approved text…"}],
  "expectedFindings": [{"category": "terminology", "quote": "cheap plan"}],
  "mustNotFlag": ["affordable plan"],
  "notes": "why this is the ground truth"
}
```

Category quotas (**must sum to 30**): `tone` 4, `unsupported_claim` 5, `terminology` 4, `valid_must_not_flag` 6, `ambiguous` 4, `conflicting_sources` 4, `malformed_model` 3.

**Labelling rules (hard):**

1. Ground truth is **human-authored**. Never generate `expectedFindings` by running the engine — that is circular and invalidates the benchmark. If the engine disagrees with a human label, the human label wins and the disagreement is recorded in `notes`.
2. Two annotators label independently; differences are adjudicated by a third pass. Record Cohen's kappa in the manifest. **κ < 0.60 ⇒ re-adjudicate before shipping.**
3. `valid_must_not_flag` items exist specifically to catch over-flagging; they count toward FPR, not recall.

### 4.2 Evaluator — `scripts/eval_quality.py`

```
python scripts/eval_quality.py --offline          # uses the deterministic engine + a stubbed model
python scripts/eval_quality.py --live             # uses the configured provider (never in CI)
python scripts/eval_quality.py --out benchmark/results.v1.json --csv benchmark/results.v1.csv
```

Behaviour:

* Creates an in-memory `state` from `engine.seed()`, injects each item's sources/rules, runs `engine.check()` for the rules layer.
* AI layer: `--offline` loads `benchmark/model_fixtures.json` (recorded provider responses) so results are deterministic; `--live` calls the provider with `temperature=0`, pinned `GEMINI_MODEL`, one retry, and records raw responses to `benchmark/raw/`.
* Matching rule: a predicted finding matches an expected finding when `category` matches **and** the predicted span overlaps the expected quote span. Report both exact and span-overlap variants; CI gates on span-overlap.
* Exit codes: `0` all gates pass · `1` gate failure · `2` dataset/manifest problem.

Output JSON (exact shape — the deck may quote these numbers only from this file):

```json
{
  "version": 1,
  "generatedAt": "iso8601",
  "mode": "offline|live",
  "model": "gemini-3.5-flash|null",
  "dataset": {"items": 30, "sha256": "…", "kappa": 0.0},
  "layers": {
    "rules": {"tp": 0,"fp": 0,"fn": 0,"tn": 0,"precision": 0.0,"recall": 0.0,"fpr": 0.0,"quoteValidity": 0.0},
    "ai":    {"tp": 0,"fp": 0,"fn": 0,"tn": 0,"precision": 0.0,"recall": 0.0,"fpr": 0.0,"quoteValidity": 0.0,
              "latencyMsP50": 0,"latencyMsP95": 0,"failureRate": 0.0}
  },
  "gates": [{"name": "rules.precision", "value": 0.0, "threshold": 0.95, "pass": true}],
  "overall": "pass|fail"
}
```

Metric formulas (implement exactly):

```
precision      = tp / (tp + fp)                     # 0.0 if denominator 0
recall         = tp / (tp + fn)
fpr            = fp / (fp + tn)                     # tn = items where nothing was flagged and none expected
quoteValidity  = (ai findings with a verbatim source quote) / (all ai findings)
failureRate    = failed provider runs / total provider runs
latencyMsP50   = median(per-run wall time)
latencyMsP95   = 95th percentile by linear interpolation
```

### 4.3 CI gates (`benchmark/gates.json`, committed)

```json
{
  "rules": {"precision": 0.95, "recall": 0.90, "quoteValidity": 1.00},
  "ai":    {"precision": 0.80, "recall": 0.75, "fpr": 0.15, "quoteValidity": 1.00, "failureRate": 0.05},
  "regression": {"maxAbsoluteDrop": 0.02}
}
```

* `quoteValidity` is a **hard** gate for AI: any invented quote ⇒ exit 1. (This mirrors the runtime invariant already enforced in code.)
* Regression gate: compare against committed `benchmark/results.baseline.json`; fail if any metric drops by more than `maxAbsoluteDrop`.
* Do **not** lower a threshold to make a build pass. Only a dataset-version bump may accompany a threshold change, with the reason in the commit message.

### 4.4 CI wiring — `.github/workflows/quality.yml`

```yaml
name: proofline-quality
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: "3.12"}
      - run: pip install -r backend/requirements.txt pytest
      - run: pytest -q
      - run: python scripts/eval_quality.py --offline --out benchmark/results.json
      - uses: actions/upload-artifact@v4
        with: {name: quality-report, path: benchmark/results.*}
```

The benchmark job must run **offline** — never spend live provider quota in CI.

### 4.5 Acceptance tests — `tests/test_round3_quality.py`

| Test | Assertions |
|---|---|
| `test_dataset_has_thirty_items_and_valid_schema` | 30 lines; every item validates against the schema; category quotas exactly as §4.1. |
| `test_dataset_sha_matches_manifest` | Recomputed hash equals `manifest.json.sha256`. |
| `test_no_item_is_derived_from_engine_output` | Each item has non-empty `notes` and a human `expectedFindings`; asserts a `source: "human"` marker per item. |
| `test_metrics_match_reference_counts` | Feed a hand-made prediction set with known TP/FP/FN and assert precision/recall/FPR equal the hand-computed values (±1e-9). |
| `test_gate_fails_on_quote_hallucination` | A prediction with an invented quote ⇒ `overall == "fail"` and gate `ai.quoteValidity` false. |
| `test_regression_gate_blocks_two_point_drop` | Baseline 0.90 vs new 0.88 precision ⇒ regression gate false. |
| `test_eval_runs_offline_without_provider` | `--offline` completes with no `GEMINI_API_KEY` set (relies on `conftest.py`). |

### 4.6 Q2 Definition of Done

- [ ] `benchmark/dataset.v1.jsonl` (30 items, quotas met) + `manifest.json` with real kappa ≥ 0.60.
- [ ] `scripts/eval_quality.py` runs offline and live; emits the exact JSON/CSV shapes.
- [ ] `benchmark/gates.json` committed; evaluator exits 1 on any gate miss.
- [ ] CI workflow green on a clean clone.
- [ ] `benchmark/results.baseline.json` committed and referenced by the deck only if the run actually produced it.
- [ ] 7 tests above pass offline.

---

## 5. Q3 — Multi-reviewer approval policy

**Definition:** approval becomes policy-driven — quorum by channel and severity, revocation with a logged reason, escalation deadlines, and time-boxed exceptions — still bound to one revision, one context and one source version.

### 5.1 Data model

Add to `engine.seed()`:

```python
"approvalPolicy": {
    "version": 1,
    "byChannel": {"website": {"required": 2, "roles": ["reviewer", "manager"], "distinctUsers": True},
                  "email":   {"required": 1, "roles": ["reviewer", "manager"], "distinctUsers": True},
                  "default": {"required": 1, "roles": ["reviewer", "manager"], "distinctUsers": True}},
    "bySeverity": {"high": {"required": 2}},
    "escalation": {"hours": 24, "to": "manager"},
    "updatedAt": "iso8601",
    "updatedBy": "userId"
},
"exceptions": []
```

Document gains:

```python
"approvals": []   # list of approval signature records, newest last
```

Signature record (a **decision** record plus quorum metadata):

```json
{"id","outcome":"approved|changes_requested","reviewerId","reviewerName","role","revision","sourceVersion",
 "fingerprint","manualCoverage","reason","at","policyVersion":1}
```

`doc["decision"]` is retained as a **derived summary** for backward compatibility:

```json
{"outcome":"approved|changes_requested|pending","required":2,"received":2,
 "satisfied":true,"signatures":[...ids...],"policyVersion":1,
 "revokedAt":null,"revokedBy":null,"revokeReason":null,"at":"iso8601"}
```

Exception record:

```json
{"id","scope":{"type":"document|channel","value":"<docId|channel>"},
 "grantedBy","grantedByName","reason":">= 8 chars","createdAt","expiresAt",
 "policyVersion","maxSignaturesMissing":1}
```

### 5.2 Policy resolution (implement exactly, in `engine.py`)

```python
def required_approvals(state, doc) -> dict
    # severity = max severity among OPEN findings (or among this revision's findings if none open)
    # channel  = doc["context"]["channel"]
    # base     = approvalPolicy.bySeverity.get(severity) or approvalPolicy.byChannel.get(channel)
    #            or approvalPolicy.byChannel["default"]
    # required = base["required"]  (severity rule wins over channel rule)
    # An active exception may reduce required by at most maxSignaturesMissing, never below 1.
    # Returns {"required": int, "roles": [...], "distinctUsers": bool,
    #          "escalationHours": int, "exceptionId": str|None, "source": "severity|channel|default|exception"}
```

```python
def quorum_state(state, doc) -> dict
    # Counts DISTINCT reviewerId among doc["approvals"] where:
    #   outcome == "approved" AND revision == doc["revision"]
    #   AND sourceVersion == state["sourceVersion"]
    #   AND fingerprint == engine.digest(doc)
    # Any signature failing those four checks is stale and contributes 0 (keep it in the list for audit).
    # Returns {"required","received","satisfied": bool,"missing": int,
    #          "staleSignatures": int, "nextEscalationAt": iso|null}
```

**Ordering rule:** `distinctUsers` must be honoured even when `required == 1` — the creator can never be a signer (I1).

### 5.3 Route changes

**`POST /api/documents/{did}/decision`** (existing route, extended):

* Request gains `"signature": true` (default) and continues to accept `"manualCoverage"`.
* Every call appends a signature record; it no longer overwrites a single `decision`.
* Response:

```json
{"ok": true,
 "decision": {"outcome":"pending|approved|changes_requested","required":2,"received":1,"satisfied":false},
 "signature": {"reviewerId":"...","at":"..."},
 "quorum": {"required":2,"received":1,"missing":1}}
```

* Status codes:
  * `200` signature recorded, quorum still unmet (`outcome: "pending"`).
  * `200` quorum met ⇒ `outcome: "approved"`.
  * `403` creator signs own document; `403` role not permitted by policy; `403` same user signing twice when `distinctUsers` is true.
  * `409 QUORUM_NOT_MET` when the caller requests `{"finalize": true}` before quorum is met.
  * `422 REVIEW_REQUIRED` for partial coverage without `manualCoverage` (unchanged).
  * `409` when the exact version is already fully approved (unchanged behaviour).
  * `409 REVIEW_ESCALATED` if the document's review request passed `escalationHours` and no manager reassigned it — the signature attempt is rejected with the action `ASSIGN_NEW_REVIEWER`.

**New routes:**

```
POST /api/documents/{did}/revoke   {"data": {"reason": ">= 8 chars"}}
  -> 200 {"ok": true, "decision": {...}}   permission: any signer, or manager
  -> clears effective approvals for the current revision (sets revokedAt/revokedBy/revokeReason),
     cascades a task with reason "approval_revoked"
  -> 422 short reason; 409 if there is no current approval

GET  /api/approval-policy            -> 200 {"policy": {...}, "usage": {"documentsUsingChannel": n}}
PUT  /api/approval-policy            {"data": {"policy": {...}}}   permission: manager
  -> 422 POLICY_INVALID for: required < 1, required > 3, unknown role, hours < 1,
     distinctUsers false when required > 1, unknown channel key
  -> bumps policy.version, logs an event

POST /api/exceptions                 {"data": {"scope": {...}, "reason": ">= 8 chars", "hours": 1..168, "maxSignaturesMissing": 1}}
  -> 200 {"ok": true, "exception": {...}}   permission: manager
POST /api/exceptions/{eid}/revoke    -> 200; permission: manager or the granter
GET  /api/exceptions?active=true     -> 200 {"exceptions": [...], "expired": n}
```

### 5.4 Export gate (must remain the strictest check)

`GET /api/documents/{did}/export` order of evaluation, with these exact outcomes:

1. No approval on the current revision → `409 APPROVAL_REQUIRED`.
2. Signature stale (revision/context/sourceVersion/fingerprint mismatch) → `409 APPROVAL_OUTDATED` (unchanged message family).
3. `revokedAt` set on the current revision → `409 APPROVAL_REVOKED` with action `REQUEST_NEW_APPROVAL`.
4. Quorum unsatisfied → `409 QUORUM_NOT_MET` with `{"required","received","missing"}` echoed in `detail`.
5. Exception used but expired → `409 EXCEPTION_EXPIRED`.
6. `readiness()` not eligible → existing `409` with the failing reasons.
7. Else `200` with a receipt whose `receipt.coverage` and `receipt.signatures` list every signer and the policy version.

The receipt must include `"policyVersion"` and `"signatures": [{"reviewerName","at","role"}]`. Wording stays "not a digital signature".

### 5.5 Escalation

* When a creator calls `POST /api/documents/{did}/submit`, stamp `doc["submittedAt"]` and compute `doc["reviewDueAt"] = submittedAt + policy.escalation.hours`.
* A lightweight, idempotent sweep runs on any read of `/api/state` or `/api/tasks` (no new daemon): if `reviewDueAt` has passed and quorum is unmet, create **one** notification for the policy's escalation role and set `doc["escalatedAt"]` (idempotent by timestamp guard). Do not change `doc.status`.
* Escalation never auto-approves anything.

### 5.6 Acceptance tests — `tests/test_round3_quorum.py`

The six-cell matrix is mandatory and is the graded proof.

| Test | Scenario | Assertions |
|---|---|---|
| `test_quorum_single_signature_approves` | channel with `required: 1` | 1 signature ⇒ `outcome "approved"`, export 200 |
| `test_quorum_two_signatures_required` | `required: 2` | after 1st signature: `outcome "pending"`, export `409 QUORUM_NOT_MET`; after 2nd (different user): `approved`, export 200 |
| `test_same_person_twice_is_not_two_signatures` | same reviewer signs twice | 2nd attempt ⇒ `403`; `received` stays 1 |
| `test_revocation_blocks_export_until_new_signatures` | approve, then revoke with reason | export `409 APPROVAL_REVOKED`; cascade task created; after re-signing twice ⇒ 200 |
| `test_expired_exception_blocks_export` | 2 signatures waived by a 1-hour exception, simulated `expiresAt` in the past | export `409 EXCEPTION_EXPIRED` |
| `test_concurrent_signatures_both_land` | two signatures issued from two clients against the same revision with `expectedRevision` | both recorded when distinct users; a stale `expectedRevision` ⇒ `409`; final `received == 2` |
| `test_policy_validation_rejects_nonsense` | `required: 0`, unknown role, `hours: 0` | `422 POLICY_INVALID` each |
| `test_creator_cannot_be_a_signer` | creator attempts a signature under every policy | `403` in all cases |
| `test_escalation_notifies_but_never_approves` | `reviewDueAt` in the past | one notification for the escalation role; `outcome` unchanged; export still blocked |
| `test_receipt_lists_all_signers_and_policy_version` | 2 signers | receipt contains both names + `policyVersion` |

### 5.7 Backwards compatibility

Existing workspaces have a single `decision` and no `approvals`. On first read after upgrade, synthesise `approvals = [decision]` with `policyVersion: 1` **only if** `decision.outcome == "approved"`. A workspace whose channel requires 2 must then show `missing: 1` and block export — this is intended, and the upgrade note must say so.

### 5.8 Q3 Definition of Done

- [ ] `approvalPolicy` and `exceptions` seeded; policy resolution matches §5.2 exactly.
- [ ] Decision route appends signatures; `decision` stays a derived summary (no breaking change for the UI).
- [ ] All 5 new routes implemented with the stated permissions and codes.
- [ ] Export gate evaluates in the exact order of §5.4.
- [ ] Receipt carries `policyVersion` + all signers.
- [ ] 10 tests above pass offline, including the 6-cell matrix.
- [ ] UI: reviewer screen shows "1 of 2 signatures", revocation dialog requires a reason, manager screen edits policy.

---

## 6. Cross-cutting delivery

### 6.1 Commit sequence (one concern per commit)

1. `feat(shared): bump 0.2.0, feature flags, error codes`
2. `feat(quality): benchmark dataset v1 + manifest` (human labels only)
3. `feat(quality): eval_quality.py + gates + CI workflow`
4. `feat(quorum): policy model, signatures, revoke, exceptions`
5. `feat(quorum): export gate ordering + receipt signers`
6. `feat(tasks): task model, cascade hooks, routes, notifications`
7. `feat(tasks): per-document storage + state pagination`
8. `docs: FEATURES_STATUS.md, README, RUN.md, upgrade note`
9. `chore: smoke.py extended journey`

### 6.2 Docs to update (all of them, honestly)

* `FEATURES_STATUS.md`: add section J with one row per feature and its test pointer.
* `README.md`: new env flags, benchmark commands, upgrade note (§5.7).
* `RUN.md`: how to run the evaluator and the CI gate locally.
* `docs/REVIEW_RESPONSE.md`: if it lists gaps, mark these three as closed with test names.
* Deck slide 10 and the submission form: only after the tests pass, and only with numbers produced by `benchmark/results.v1.json`.

### 6.3 Verification commands (run before declaring done)

```bash
pytest -q                                          # 95 existing + new tests, all pass
python scripts/eval_quality.py --offline           # exit 0
bash scripts/production.sh &                       # single-process prod build
python scripts/smoke.py http://127.0.0.1:8000      # 19/19, plus new task steps
curl -s localhost:8000/api/config | head -c 200    # version 0.2.0
```

---

## 7. Guardrails for the implementing agent

### 7.1 Forbidden (each is an automatic failure)

1. Weakening or removing a test to make it pass; lowering a gate threshold; rounding a metric up.
2. Generating benchmark `expectedFindings` from engine output.
3. Making export succeed when quorum, revocation or staleness checks fail — including any UI-only workaround.
4. Allowing the creator to sign, or counting the same user twice.
5. Disabling RLS, adding an anon read policy, or shipping the service-role key to the frontend.
6. Marking anything "built" in docs/deck/form before its test passes.
7. Renaming, merging or reordering the three improvements.
8. Adding a background daemon/thread for escalation (must be an idempotent sweep on read).
9. Introducing a network dependency into `pytest`.
10. Claiming email/Slack notifications, digital signatures, OCR or immutable storage.

### 7.2 If something is ambiguous

Prefer the behaviour that makes the **stricter** governance claim true, and record the decision in the commit message plus `FEATURES_STATUS.md` notes. Never silently widen scope.

### 7.3 Definition of Done for the whole release

- [ ] All three improvements at `✅ built + tested` in the ledger with test-name pointers.
- [ ] `pytest -q` green offline; smoke 19/19 (+ new steps) against the production build.
- [ ] `eval_quality.py --offline` exit 0 and `results.v1.json` committed.
- [ ] No invariant in §0.1 violated (grep the diff for `require(`, `cas_doc(`, `readiness(`, RLS SQL).
- [ ] Deck, form and repo all quote the **same three names** and the **same numbers** (only from `results.v1.json`).

---

## 8. Traceability (why each requirement exists)

| Source | Requirement |
|---|---|
| Form: "three major improvements… substantial work… not cosmetic" | Q1–Q3 are all schema + workflow changes; acceptance tests are behavioural, not visual. |
| Form: "judged in Round 3 on delivering exactly these three" | §1.6 frozen names; §7.1 rule 7. |
| Form: "what does NOT work yet" honesty | §6.2 ledger discipline; no metric without a command. |
| Deck slide 7 (technical depth) | Live Supabase + Gemini, and Q2 produces the accuracy numbers that slide currently lacks. |
| Deck slide 10 | Q1 value "outdated approval can never sit unhandled"; Q2 value "quality becomes a number"; Q3 value "approval fits regulated teams". |
| Existing invariants I1–I4 | Enforced by Q3 §5.4 ordering and the reuse of `readiness()` / `cas_doc()` rather than re-implementing them. |

**End of specification.**

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-29T22:43:24+05:30.

The user's current state is as follows:
Other open documents:
- c:\Users\91959\OneDrive\Desktop\all\.git\COMMIT_EDITMSG (LANGUAGE_UNSPECIFIED)
- c:\Users\91959\OneDrive\Desktop\all\RUN.md (LANGUAGE_UNSPECIFIED)
- c:\Users\91959\OneDrive\Desktop\all\docs\ROUND2_SUBMISSION.md (LANGUAGE_UNSPECIFIED)
- c:\Users\91959\OneDrive\Desktop\all\scripts\smoke.py (LANGUAGE_UNSPECIFIED)
- c:\Users\91959\OneDrive\Desktop\all\docs\DEPLOYMENT.md (LANGUAGE_UNSPECIFIED)
</ADDITIONAL_METADATA>