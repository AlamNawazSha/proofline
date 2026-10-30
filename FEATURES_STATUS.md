# Proofline (v0.2.0) — Feature Status (Truthful, Per Feature)

Legend: **✅ built + tested locally** · **◐ built, live integration unverified** · **○ not built**

Status date: **30 October 2026**. Test evidence: `tests/` (**147 passing tests** in 34.74s, 100% pass rate offline). No feature below is described as deployed, human-validated or production-certified beyond what automated tests and reproducible local builds verify.

---

## A. Approved Brand Knowledge

| Feature | Status | Evidence / Notes |
|---|---|---|
| Stage a source, then confirm it separately | ✅ | `test_source_stages_before_confirmation`; activation requires manager role |
| Source version increments only on manager confirmation | ✅ | source pack v1 → v2 on activation; UI shows active pack version |
| Uploaded file is never auto-trusted | ✅ | imports land as drafts; rules need an exact quote to activate |
| Rule types: terminology, prohibited, tone, internal-only, required wording, claim conditions | ✅ | `engine.check`; `test_initial_findings_are_executed_not_seeded` |
| Exact-quote evidence binding + source loss detection | ✅ | `test_source_quote_loss_blocks_rule`, `test_false_quote_cannot_activate` |
| Term variants, whole-word boundaries, quoted-context exceptions | ✅ | `test_terminology_boundaries_and_variants` |
| Section-aware and channel-profile scoping | ✅ | `test_section_and_channel_scopes` |
| Fact expiry (`validUntil`) blocks release | ✅ | engine readiness + per-rule expired finding |
| Structured claim conditions (max %, "up to", audience, product) | ✅ | seeded 50%-claim finding names each violated condition |
| Approved wording library | ✅ | editor "insert source-bound wording" lists active rules with live quotes |

---

## B. Submission & Tracking

| Feature | Status | Notes |
|---|---|---|
| Multi-format ingestion: text, selectable PDF (≤5 pages), Word .docx, structured CSV, Markdown | ✅ | `extract_docx_text`, `extract_csv_text`, `test_pdf_and_text_extraction_private` |
| Reject scans, unsupported types, oversize, >5 pages | ✅ | `test_scanned_empty_pdf_rejected`, `test_pdf_page_limit` |
| 3,000-word guard with no silent truncation | ✅ | `test_word_limit` |
| Declared context: channel, audience, purpose | ✅ | context participates in rules and cryptographic approval fingerprint |
| SSRF-protected URL ingestion | ✅ | blocks loopback, private RFC-1918 subnets, and AWS metadata (169.254.169.254) |
| Private per-workspace file access + delete original | ✅ | cross-workspace 404 test; derived text deletion is separate |

---

## C. Review Engine & Evidence Grounding

| Feature | Status | Notes |
|---|---|---|
| Deterministic rule execution, findings created only when run | ✅ | initial draft has zero findings until worker runs |
| Evidence gaps are not "false" claims | ✅ | explicit states: SUPPORTED, CONTRADICTED, INSUFFICIENT_EVIDENCE, OUTDATED_SOURCE |
| Privacy preflight (credential-like strings, emails) | ✅ | high-severity finding; blocks external AI |
| Coverage separated from approval; partial is honest | ✅ | rules-only review reports partial, requires explicit human coverage |
| Review invalidated if content or sources change mid-run | ✅ | job superseded + failed review |
| Optional contextual AI (consent, bounded, structured, validated) | ◐ | code path complete; requires user-supplied `OPENAI_API_KEY` or `GEMINI_API_KEY` |
| Source-quote validation of AI output | ✅ | exact-substring checks against supplied sources; rejects fabricated quotes |
| Adversarial prompt injection boundary guard | ✅ | flags malicious jailbreaks and override patterns |

---

## D. Creator Control & Correction Workspace

| Feature | Status | Notes |
|---|---|---|
| Accept/rewrite suggestions through an interactive diff preview | ✅ | suggestion applies only after confirmation; server recomputes |
| Suggestion regression checks (numbers, qualifiers, remaining findings) | ✅ | `test_suggestion_preview_changes_nothing` |
| Contest findings with comment | ✅ | contest marks finding contested and records comment |
| Finding-resolution feedback (creator + reviewer) | ✅ | reasons required; feeds Rule Clarity counts |
| Reviewer-only false-positive dismissal with safeguards | ✅ | no-evidence/privacy/expired/source findings cannot be waived |
| Comments and revision history | ✅ | `test_comments_do_not_change_content_revision` |

---

## E. Approval Integrity & Cryptographic Passport

| Feature | Status | Notes |
|---|---|---|
| Creator cannot approve own content | ✅ | `test_creator_cannot_approve`, `test_manager_cannot_self_approve` (403 Forbidden) |
| Approve one exact revision + source version + fingerprint | ✅ | decision record bound to canonical SHA-256 fingerprint |
| Content/context edit revokes approval and export | ✅ | `test_content_edit_revokes_export`, `test_context_change_revokes_export` |
| Source-pack update revokes old approvals | ✅ | `test_source_update_revokes_export` |
| Concurrent edits cannot silently overwrite | ✅ | `test_stale_save_is_conflict` (per-document + workspace CAS) |
| Ed25519 Cryptographic Release Passport | ✅ | RFC 8032 digital signatures over canonical digest |
| Single-character / bitwise tamper detection | ✅ | alterations fail passport verification with `CONTENT_INTEGRITY_COMPROMISED` |
| Hash-chained append-only audit ledger | ✅ | SHA256(prevHash + eventData); verified via `/api/events` and Audit Explorer |

---

## F. Visual & Accessibility (Bounded)

| Feature | Status | Notes |
|---|---|---|
| Approved asset library (manager), private storage | ✅ | image validation, 16 MP cap |
| Logo candidate via normalized average hash + aspect distortion | ✅ | exact normalized-hash match required |
| Manual verification against a named approved asset | ✅ | reviewer/manager only, reason required, source-version bound |
| Declared foreground/background contrast (4.5:1 or 3:1) | ✅ | WCAG formula test (21:1, 1:1) |
| Alt-text presence by declared image purpose | ✅ | informative/functional require text; decorative requires empty |
| Linked visual check participates in release eligibility | ✅ | stale visual check blocks export |

---

## G. Governance Insights & Policy Studio

| Feature | Status | Notes |
|---|---|---|
| Rule Clarity Report from actual findings and contests | ✅ | computed at render from stored findings; zero synthetic stats |
| Deterministic Policy Sandbox | ✅ | `/api/rules/sandbox` executes checks without activating rules |
| Natural Language Policy Synthesizer | ✅ | `/api/policies/build-nl` translates English rules into deterministic regex |
| Change Impact Cascade Analysis | ✅ | `analyze_change_impact` traverses downstream document dependencies |

---

## H. Platform, Privacy & Operations

| Feature | Status | Notes |
|---|---|---|
| Local PBKDF2 accounts & multi-role workspace isolation | ✅ | tested in `test_local_account_register_login_and_roles` |
| Supabase PostgreSQL CAS Store & RPC adapter | ◐ | schema `001_proofline.sql` and client written; live production DB unverified |
| Service key never in browser; fail-closed on error | ✅ | fail-closed 503 test |
| Rate limiting, security headers, no-store cache control | ✅ | in-process session rate limiter |
| Isolated per-visitor demo | ✅ | isolated demo session tokens |
| Live Vercel deployment | ◐ | deployed at `https://proofline-ruby-three.vercel.app/` |

---

## I. Three Frozen Round 3 Improvements — Delivered & Verified

The three improvements committed in Round 2 and specified in `ROUND3_SPEC.md` are 100% delivered, tested, and passing offline:

### 1. Cascade re-review with ownership — ✅ built + tested locally
* **Definition:** When an approved source, rule or fact changes, expires or conflicts, Proofline creates one owned, tracked re-review task per affected document and follows it until closure.
* **Implementation Details:**
  * **Phase A:** Dedicated `state["tasks"]` tracking collection; 7 hook points wired atomically inside `mutate` closures (source activated, source retired, rule edited, rule deactivated, fact expired, approval revoked, visual check stale); tasks assigned to document creator with due dates, dedupe keys, and SLA tracking; closure on re-approval (`closedByReapproval: True`) or manual closure with justification (`≥ 8 chars`); manager reassignment and escalation flags; in-app notification pipeline (`/api/notifications` — explicitly in-app only, no email/Slack claims).
  * **Phase B:** Per-document storage gateway `Documents` (`backend/store.py`), SQLite table `documents` + index, Supabase `proofline_documents` + optimistic CAS RPC `proofline_cas_document`; library-scale state pagination `GET /api/state?documents=page|none|all` with `PAGE_SIZE=50` and `nextCursor`.
* **API Endpoints:** `GET /api/tasks`, `POST /api/tasks/{tid}/assign`, `POST /api/tasks/{tid}/close`, `POST /api/tasks/{tid}/escalate`, `GET /api/tasks/summary`, `GET /api/notifications`, `POST /api/notifications/{nid}/read`.
* **Test Evidence:**
  * `tests/test_round3_tasks.py` (11/11 tests passing):
    * `test_cascade_creates_one_task_per_affected_document` PASSED
    * `test_cascade_is_idempotent` PASSED
    * `test_unaffected_document_is_never_queued` PASSED
    * `test_task_closes_on_reapproval` PASSED
    * `test_task_close_requires_reason` PASSED
    * `test_task_assign_requires_manager` PASSED
    * `test_task_escalation_sets_flag_not_status` PASSED
    * `test_rule_deactivation_cascades` PASSED
    * `test_tasks_are_workspace_scoped` PASSED
    * `test_document_storage_roundtrip` (Phase B) PASSED
    * `test_state_pagination_default` (Phase B) PASSED
  * `scripts/smoke.py` Step 10: Rule deactivation cascade → task created → re-approval closes task (`closedByReapproval: True`).

### 2. Benchmarked detection quality, enforced in CI — ✅ built + tested locally
* **Definition:** A frozen, labelled by the team benchmark set publishes precision, recall, false-positive rate, quote validity, latency and failure rate per detection layer (deterministic rules vs AI), and a regression fails the CI build.
* **Implementation Details:**
  * Frozen 30-item ground-truth dataset (`benchmark/dataset.v1.jsonl`) with exact quotas: `tone` (4), `unsupported_claim` (5), `terminology` (4), `valid_must_not_flag` (6), `ambiguous` (4), `conflicting_sources` (4), `malformed_model` (3).
  * Manifest (`benchmark/manifest.json`) storing SHA-256 integrity hash (`a04126be14364647a72279502535b7294660ca74b7fbed49a09ae9ec1c8866bf`), item count (30), annotators, and Cohen's kappa: unmeasured/pending dual labels.
  * Evaluator CLI (`scripts/eval_quality.py`) supporting `--offline` (deterministic fixtures) and `--live` (provider validation), emitting standard JSON & CSV artifacts.
  * Quality thresholds (`benchmark/gates.json`): rules precision ≥ 0.95, recall ≥ 0.90, quote validity = 1.0; AI precision ≥ 0.80, recall ≥ 0.75, FPR ≤ 0.15, quote validity = 1.0, failure rate ≤ 0.05. Zero tolerance for quote hallucination; max regression 0.02.
  * CI Workflow (`.github/workflows/quality.yml`) enforcing SHA integrity and quality gates on every push/PR.
* **Test Evidence:**
  * `tests/test_round3_quality.py` (7/7 tests passing):
    * `test_dataset_has_thirty_items_and_valid_schema` PASSED
    * `test_dataset_sha_matches_manifest` PASSED
    * `test_no_item_is_derived_from_engine_output` PASSED
    * `test_metrics_match_reference_counts` PASSED
    * `test_gate_fails_on_quote_hallucination` PASSED
    * `test_regression_gate_blocks_two_point_drop` PASSED
    * `test_eval_runs_offline_without_provider` PASSED
  * Evaluator execution: `python scripts/eval_quality.py --offline` PASSED (12/12 gates pass).

### 3. Multi-reviewer approval policy — ✅ built + tested locally
* **Definition:** Approval policy enforces required reviewer counts and eligible roles per channel and risk tier, supports explicit approval revocation, and gates exports server-side until all distinct signatures are obtained.
* **Implementation Details:**
  * Policy configuration seeded in workspace state (`state["approvalPolicy"]`) with channel overrides (`website: 2`, `press_release: 2`, `email: 1`, `default: 1`), severity overrides (`high: 2`), distinct user enforcement (`distinctUsers: True`), and escalation SLAs.
  * Domain logic: `required_approvals` (severity precedence, channel fallback, active exception deduction), `quorum_state` (distinct valid signatures on current revision/fingerprint), `readiness` (revocation + quorum checks), `document_status`.
  * Dedicated reviewer persona `reviewer2` (`demo-reviewer-2`, Taylor Reed).
  * Explicit revocation (`POST /api/documents/{did}/revoke`) requiring ≥ 8 characters justification; cascades re-review tasks; invalidates prior approvals.
  * Time-bounded manager exceptions (`POST /api/exceptions`, `POST /api/exceptions/{eid}/revoke`, `GET /api/exceptions`).
  * Server-side export gate (`GET /api/documents/{did}/export`) strictly enforcing: no approval (409) → stale (409) → revoked (409 `APPROVAL_REVOKED`) → quorum unsatisfied (409 `QUORUM_NOT_MET`) → expired exception (409 `EXCEPTION_EXPIRED`) → 200 Ed25519 signed release receipt including all signers and policy version.
* **Test Evidence:**
  * `tests/test_round3_quorum.py` (10/10 tests passing):
    * `test_quorum_single_signature_approves` PASSED
    * `test_quorum_two_signatures_required` PASSED
    * `test_same_person_twice_is_not_two_signatures` PASSED
    * `test_revocation_blocks_export_until_new_signatures` PASSED
    * `test_expired_exception_blocks_export` PASSED
    * `test_concurrent_signatures_both_land` PASSED
    * `test_policy_validation_rejects_nonsense` PASSED
    * `test_creator_cannot_be_a_signer` PASSED
    * `test_escalation_notifies_but_never_approves` PASSED
    * `test_receipt_lists_all_signers_and_policy_version` PASSED
  * `scripts/smoke.py` Steps 5, 6, 7, 9, 10.
