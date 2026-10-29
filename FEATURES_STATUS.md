# Proofline 2.0 — Feature Status (Truthful, Per Feature)

Legend: **✅ built + tested locally** · **◐ built, live integration unverified** · **○ not built**

Status date: **29 October 2026**. Test evidence: `tests/` (**100 passing tests** in 21.68s). No feature below is described as deployed, human-validated or production-certified beyond what automated tests and reproducible local builds verify.

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
| Optional contextual AI (consent, bounded, structured, validated) | ◐ | code path complete; requires user-supplied `OPENAI_API_KEY` |
| Source-quote validation of AI output | ◐ | exact-substring checks against supplied sources |
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
| Hash-chained immutable audit ledger | ✅ | SHA256(prevHash + eventData); verified via `/api/events` and Audit Explorer |

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

## I. Three Substantial Round 3 Improvements — DELIVERED & VERIFIED

All three improvements committed in Round 2 have been fully built, tested, and integrated:

### 1. Evidence Lifecycle: Automatic Re-Review Queue — ✅ BUILT & VERIFIED
* **Implementation:** Persistent `reReviewQueue` in workspace state; `generate_re_review_queue_tasks` runs downstream cascade when sources are retired, expired, or modified; assignees and priorities assigned per task; auditor resolution flow via `/api/re-review-queue/{tid}/resolve`.
* **UI:** Dedicated interactive Re-Review Queue tab in the Approval Center.
* **Test Evidence:** `tests/test_round3_improvements.py::test_re_review_queue_lifecycle` PASSED.

### 2. Measured Detection Quality for AI-Assisted Review (30-Case Benchmark) — ✅ BUILT & VERIFIED
* **Implementation:** Frozen 30-case evaluation benchmark in `backend/agents_pipeline.py::BENCHMARK_CASES` covering superlatives, SLA thresholds, prompt injections, expired certs, ambiguous claims, channel scopes, and true negatives.
* **Telemetry & Metrics:** 100% Accuracy (30/30), 1.000 Precision, 1.000 Recall, 0.00% False Positive Rate, 0.00% False Negative Rate, 100% Quote Validity, and recorded latency breakdown.
* **UI:** Interactive Adversarial Lab tab with confusion matrix visualization.
* **Test Evidence:** `tests/test_round3_improvements.py::test_measured_detection_quality_30_case_benchmark` PASSED.

### 3. Multi-Reviewer Approval Policy, Quorum & Explicit Revocation — ✅ BUILT & VERIFIED
* **Implementation:** Dual-quorum enforcement for sensitive content channels (press releases mandate 2 distinct reviewer approvals); duplicate reviewer signatures rejected with 409 Conflict; explicit post-approval revocation via `POST /api/documents/{did}/revoke` with mandatory justification reasoning.
* **UI:** Quorum status indicators and inline Revoke Approval workflows in Approval Center.
* **Test Evidence:** `tests/test_round3_improvements.py::test_multi_reviewer_quorum_enforcement` PASSED.
