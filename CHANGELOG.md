# Proofline Changelog

All notable changes to Proofline are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — 2026-10-30 (Round 3 Final Release)

### Added
- **Q1: Cascade Re-Review with Ownership**:
  - Implemented persistent `state["tasks"]` tracking collection.
  - Added 7 atomic cascade hook points: source activation, source retirement, rule edit, rule deactivation, fact/rule expiry, approval revocation, and visual check change.
  - Implemented idempotent deduplication keys: `sha256(documentId + ':' + reason + ':' + triggerId)`.
  - Added task assignees, due dates, manager reassignment, and escalation flags (`escalatedAt`).
  - Added automatic closure on re-approval (`closedByReapproval: True`) and manual closure justification validation (`≥ 8 chars`).
  - Implemented in-app notification pipeline (`GET /api/notifications`, `POST /api/notifications/{nid}/read`).
  - Added scalable per-document storage gateway (`Documents` in `backend/store.py`) with optimistic CAS locking for SQLite and Supabase PostgreSQL.
  - Added library-scale state pagination guard (`GET /api/state?documents=page|none|all` with `PAGE_SIZE = 50` + `nextCursor`).
  - Added 11 acceptance tests in `tests/test_round3_tasks.py`.
- **Q2: Benchmarked Detection Quality, Enforced in CI**:
  - Created frozen 30-item human-ground-truth dataset (`benchmark/dataset.v1.jsonl`) with category quotas: `tone` (4), `unsupported_claim` (5), `terminology` (4), `valid_must_not_flag` (6), `ambiguous` (4), `conflicting_sources` (4), `malformed_model` (3).
  - Created manifest (`benchmark/manifest.json`) storing SHA-256 integrity hash (`a04126be14364647...`) and Cohen's kappa: unmeasured/pending dual labels.
  - Built evaluator CLI (`scripts/eval_quality.py`) supporting `--offline` (deterministic fixtures) and `--live` (Gemini 2.5 Flash).
  - Defined quality gates (`benchmark/gates.json`): rules precision ≥ 0.95, recall ≥ 0.90, quote validity = 1.0; AI precision ≥ 0.80, recall ≥ 0.75, FPR ≤ 0.15, zero quote hallucination tolerance, and max regression 0.02.
  - Added GitHub Actions CI workflow (`.github/workflows/quality.yml`) failing builds on hash mismatch, quote hallucination, or regression.
  - Added 7 acceptance tests in `tests/test_round3_quality.py`.
- **Q3: Multi-Reviewer Approval Policy**:
  - Implemented configurable approval policy (`state["approvalPolicy"]`) with channel overrides (`website: 2`, `press_release: 2`, `email: 1`, `default: 1`) and severity overrides (`high: 2`).
  - Added four-eyes separation of duties: author self-approval blocked (`403 Forbidden`); distinct reviewer signatures enforced (`403/409 Conflict`).
  - Added dedicated second reviewer persona `reviewer2` (`demo-reviewer-2`, Taylor Reed).
  - Implemented explicit approval revocation (`POST /api/documents/{did}/revoke`) requiring ≥ 8 characters reason, cascading re-review tasks.
  - Implemented time-bounded manager exceptions (`POST /api/exceptions`, `GET /api/exceptions`).
  - Implemented strict server-side export gate (`GET /api/documents/{did}/export`) enforcing approval presence, freshness, non-revocation, quorum satisfaction, and absence of unwaivable findings before issuing Ed25519 signed release receipts.
  - Added 10 acceptance tests in `tests/test_round3_quorum.py`.
- **Packaging & CI Fixes**:
  - Added `cryptography>=42.0.0` and `requests>=2.31.0` to `backend/requirements.txt` and `pyproject.toml`.
  - Added offline quality benchmark step to `.github/workflows/ci.yml`.
  - Added Step 10 to `scripts/smoke.py` verifying full cascade re-review and re-approval task closure.

---

## [0.1.0] — 2026-10-24 (Round 2 Submission)

### Added
- Seven-agent claim verification pipeline.
- Deterministic regex and boundary policy engine.
- Ed25519 digital release passports.
- Append-only SHA-256 hash-chained audit ledger.
- Next.js 15 enterprise UI with evidence graph, redline correction, and policy studio.
- Initial multi-format ingestion for text, markdown, PDF, docx, and CSV.
- PBKDF2 local account authentication and workspace isolation.

