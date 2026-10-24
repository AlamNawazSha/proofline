# Proofline Architecture

## Overview
Proofline enforces cryptographic and source-bound governance over marketing and product copy before release. It binds every approval to the exact content text, declared context, and approved-source pack version, voiding the approval automatically the moment any of the three changes.

```
[ Browser / API Client ]
       │
       ▼ HTTP / JSON
[ backend/main.py ]  ◄── Session Auth: `_raw_session()`, `session()`
       │             ◄── Role Guard: `require()`, creator/reviewer separation
       │
       ├──► [ backend/engine.py ]
       │        ├── Deterministic Rule Engine: `check()`
       │        ├── Guarantee Synonyms & Numeric Claim Detection
       │        ├── Cryptographic Integrity: `digest()` (SHA-256)
       │        └── Readiness Evaluator: `readiness()`
       │
       └──► [ backend/store.py ]
                ├── Atomic CAS Transactions: `Local.mutate()` / `Supabase.mutate()`
                └── Document Revision Concurrency Check
```

---

## 1. Request Flow
1. **Transport & Entry**: All incoming API requests arrive at the FastAPI application (`backend/main.py::app`).
2. **Session Authentication**:
   - `backend/main.py::_raw_session(request)` checks the `Authorization: Bearer <token>` header first (enabling distinct persona sessions across concurrent browser tabs on the same origin), falling back to the signed `proofline` session cookie.
   - `backend/main.py::session(request)` verifies the cryptographic signature with `itsdangerous.URLSafeSerializer` and unpacks workspace ID (`wid`), mode (`demo`, `local`, `supabase`), and actor persona (`id`, `name`, `role`).
3. **Middleware**:
   - `backend/main.py::headers(request, call_next)` enforces sliding-window per-client rate limits and sets security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
4. **Endpoint Dispatch**: Handlers process domain operations:
   - Content authoring: `backend/main.py::update_document()`
   - Governance checks: `backend/main.py::run_review()`
   - Suggestion generation: `backend/main.py::create_suggestion()`
   - Approval recording: `backend/main.py::decision()`
   - Cryptographic export: `backend/main.py::export()`
5. **Rule Execution**: Request handlers invoke `backend/engine.py` for deterministic checks against approved sources and brand rules.
6. **Persistence**: Handlers persist updated workspaces through `backend/store.py`.

---

## 2. Where the Fingerprint is Computed
- **Function**: `backend/engine.py::digest(text, context, rules, sources)`
- **Mechanism**:
  - Builds a canonical dictionary containing:
    - Exact draft `text`
    - Declared `context` dictionary (channel, audience, purpose)
    - Active `rules` (sorted by ID)
    - Active and confirmed `sources` (sorted by ID, text body, and confirmation flag)
  - Encodes to sorted UTF-8 JSON (`json.dumps(payload, sort_keys=True).encode("utf-8")`).
  - Computes standard SHA-256 hex digest (`hashlib.sha256(...).hexdigest()`).
- **Enforcement Points**:
  - `backend/engine.py::new_revision()` binds the fingerprint to each content revision.
  - `backend/main.py::decision()` seals the approval receipt with the exact content and source pack fingerprint.
  - `backend/main.py::verify_fingerprint()` recomputes and compares the live buffer fingerprint against stored approval receipts.
  - `backend/main.py::export()` verifies live SHA-256 digest equality before returning release bundles.

---

## 3. Where the CAS (Compare-And-Swap) Check Happens
Concurrency and race conditions are guarded at two distinct levels:

1. **Workspace Storage CAS**:
   - **Local SQLite Store**: `backend/store.py::Local.mutate(wid, func)`
     - Operates inside an immediate SQLite transaction (`with self._tx():`).
     - Reads current workspace payload and integer revision.
     - Invokes `func(data)` to calculate the state change.
     - Executes an atomic update:
       `UPDATE workspaces SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?`
     - If rows matched is 0, raises `Conflict("Concurrent workspace modification")`.
   - **Supabase Store**: `backend/store.py::Supabase.mutate(wid, func)`
     - Reads current row with `revision`.
     - Executes conditional query: `.update({...}).eq("id", wid).eq("revision", current_rev)`.
     - Raises `Conflict` if updated row count is 0.
2. **Document Revision CAS**:
   - `backend/main.py::update_document()`, `backend/main.py::decision()`, and `backend/main.py::feedback()`
   - Checks `expectedRevision == doc["revision"]`. If mismatched, immediately raises `HTTPException(409, "Document was modified by another action")`.

---

## 4. Where Roles are Enforced
Role verification and strict separation of duties are enforced on the backend server:

1. **Endpoint Role Permissibility**:
   - **Function**: `backend/main.py::require(request, *roles)`
   - Checks caller role against permitted roles. Raises `HTTPException(403, f"Role {actor['role']} not permitted")` on violations.
   - For example: source modifications and workspace settings require `manager` (`require(request, "manager")`).
2. **Four-Eyes Separation of Duties (Creator vs. Reviewer)**:
   - **Document Approval**: `backend/main.py::decision(did, p, request)`
     - Evaluates `if doc["creatorId"] == actor["id"]:`
     - Raises `HTTPException(403, "The creator cannot approve their own document")`.
     - Only an independent reviewer or manager can approve content.
   - **False-Positive Findings Dismissal**: `backend/main.py::feedback(did, p, request)`
     - Evaluates `if doc["creatorId"] == actor["id"]:`
     - Raises `HTTPException(403, "The creator cannot dismiss their own finding as a false positive")`.
   - **Document Authoring**: `backend/main.py::update_document(did, p, request)`
     - Evaluates `if doc["creatorId"] != actor["id"]:`
     - Raises `HTTPException(403, "Only the creator can edit this draft")`.
3. **Session Role Boundaries**:
   - Session tokens are signed server-side. While the demo workspace provides persona helpers (`/api/persona` and `/api/demo/reviewer-session`), real accounts authenticate against Supabase Auth (`backend/store.py::Supabase.authenticate`) or local development accounts where user roles are immutable and enforced by server records.
