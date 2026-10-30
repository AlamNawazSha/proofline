# Proofline 2.0 — Comprehensive Testing & Verification Report

> **Complete Execution Record for Round 3 Final Submission**  
> Test Execution Date: 30 October 2026 · Target Release: `0.2.0` · Python: 3.12/3.13 · Pytest: 9.1.1

---

## 1. Test Suite Summary

Proofline 2.0 maintains a 100% offline-executable, non-flaky test suite covering core domain logic, cryptographic verification, multi-reviewer quorum policies, detection quality gates, and cascade re-review task queues.

| Test Module | Description | Test Count | Result | Execution Time |
|---|---|---:|---|---:|
| `tests/test_round3_tasks.py` | Q1 Cascade re-review, task lifecycle, reassignment, CAS storage, pagination | 11 | PASSED | 12.22s |
| `tests/test_round3_quality.py` | Q2 Benchmarked quality, dataset SHA-256 manifest, gates, quote validity | 7 | PASSED | 0.23s |
| `tests/test_round3_quorum.py` | Q3 Multi-reviewer quorum, separation of duties, revocation, export gates | 10 | PASSED | 5.08s |
| `tests/test_round3_improvements.py` | Integration tests for the three Round 3 improvements | 3 | PASSED | 2.11s |
| `tests/test_proofline2.py` | Ed25519 passport verification, audit ledger chaining, SSRF, NLP builder | 9 | PASSED | 1.78s |
| `tests/test_upgrades.py` | Invariants I1–I9, boundary validation, bearer tokens, optimistic CAS | 45 | PASSED | 6.84s |
| `tests/test_core.py` | Core authoring, review engine, suggestion diffs, WCAG contrast | 43 | PASSED | 6.48s |
| **TOTAL** | **Full Repository Verification Suite** | **128** | **ALL PASSED** | **34.74s** |

---

## 2. Command Executions & Output Evidence

### 2.1 Mandatory Test Suite (`pytest -q`)
```bash
python -m pytest -q
```
**Output:**
```
........................................................................ [ 56%]
........................................................                 [100%]
128 passed in 34.74s
```

### 2.2 Quality Benchmark Evaluator (`scripts/eval_quality.py --offline`)
```bash
python scripts/eval_quality.py --offline
```
**Output:**
```
Benchmark run complete: overall=pass
  [PASS] rules.precision: 1.0 (threshold: 0.95)
  [PASS] rules.recall: 1.0 (threshold: 0.9)
  [PASS] rules.quoteValidity: 1.0 (threshold: 1.0)
  [PASS] ai.precision: 1.0 (threshold: 0.8)
  [PASS] ai.recall: 0.9583 (threshold: 0.75)
  [PASS] ai.fpr: 0.0 (threshold: 0.15)
  [PASS] ai.quoteValidity: 1.0 (threshold: 1.0)
  [PASS] ai.failureRate: 0.0333 (threshold: 0.05)
  [PASS] regression.rules.precision: 1.0 (threshold: 1.0)
  [PASS] regression.ai.precision: 1.0 (threshold: 1.0)
  [PASS] regression.rules.recall: 1.0 (threshold: 1.0)
  [PASS] regression.ai.recall: 0.9583 (threshold: 0.9583)
```

### 2.3 End-to-End Governance Smoke Test (`scripts/smoke.py`)
```bash
python scripts/smoke.py http://127.0.0.1:8000
```
**Output:**
```
=== Proofline E2E Smoke Test ===
Target: http://127.0.0.1:8000

[PASS] Step 0: Health Check
[PASS] Step 1: Demo Workspace Init
[PASS] Step 1: Fetch State
[PASS] Step 1: Creator Actor
[PASS] Step 2: Save Draft With Non-Compliant Claim
[PASS] Step 2: Trigger Deterministic Review
[PASS] Step 2: Findings Generated
[PASS] Step 3: Fetch Approved Suggestion
[PASS] Step 3: Apply Approved Text
[PASS] Step 3: Re-run Review On Approved Text
[PASS] Step 3: Zero Findings On Approved Copy
[PASS] Step 4: Submit for Approval
[PASS] Step 5: Creator Self-Approve Blocked (403 Forbidden)
[PASS] Step 6: Switch to Reviewer Persona
[PASS] Step 6: Reviewer 1 Approval Success
[PASS] Step 6: Switch to Reviewer 2 Persona
[PASS] Step 6: Reviewer 2 Approval (Quorum Satisfied)
[PASS] Step 7: Export Approved Release Receipt (Ed25519 Verified)
[PASS] Step 7: Receipt Integrity Check
[PASS] Step 8: Save Post-Approval Modification
[PASS] Step 9: Export Blocked After Content Change (409 Conflict)
[PASS] Step 10: Switch to Manager Persona
[PASS] Step 10: Deactivate Rule to Trigger Cascade
[PASS] Step 10: Re-Review Tasks Appear in Queue
[PASS] Step 10: Re-Approval 1 Recorded
[PASS] Step 10: Re-Approval 2 Recorded (Quorum Completed)
[PASS] Step 10: Task Closes on Re-Approval (closedByReapproval: True)

[SUCCESS] Full governance journey verified successfully against target!
```

### 2.4 Frontend Production Build (`npm run build`)
```bash
npm --prefix frontend run build
```
**Output:**
```
   ▲ Next.js 15.5.28
   Creating an optimized production build ...
 ✓ Compiled successfully in 2.1s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (5/5)
   Finalizing page optimization ...
Route (app)                                 Size  First Load JS
┌ ○ /                                    49.5 kB         152 kB
├ ○ /_not-found                            994 B         104 kB
├ ƒ /api/[...path]                         126 B         103 kB
└ ƒ /api/health                            126 B         103 kB
+ First Load JS shared by all             103 kB
```

---

## 3. Normative Acceptance Test Details

### 3.1 Q1 Cascade Re-Review Tests (`tests/test_round3_tasks.py`)
1. `test_cascade_creates_one_task_per_affected_document`: 5 affected docs + 1 unaffected doc; activating source pack v2 creates exactly 5 open tasks assigned to original authors.
2. `test_cascade_is_idempotent`: Firing the same trigger repeatedly produces zero duplicate open tasks.
3. `test_unaffected_document_is_never_queued`: Documents with 0 findings holding no approvals are never enqueued.
4. `test_task_closes_on_reapproval`: Reviewer approval on re-reviewed revision closes task with `closedByReapproval: True`.
5. `test_task_close_requires_reason`: Closing task with `< 8 chars` reason fails with HTTP 422; valid reason succeeds.
6. `test_task_assign_requires_manager`: Reassignment by author fails with HTTP 403; manager succeeds and creates notification.
7. `test_task_escalation_sets_flag_not_status`: Escalation sets `escalatedAt` timestamp; task remains `status: "open"`.
8. `test_rule_deactivation_cascades`: Deactivating rule creates re-review tasks for all governed documents.
9. `test_tasks_are_workspace_scoped`: Tasks in Workspace A are never leaked to Workspace B.
10. `test_document_storage_roundtrip`: Per-document `Documents` gateway writes, reads, deletes, and raises HTTP 409 on optimistic lock mismatch.
11. `test_state_pagination_default`: Workspace with 60 documents returns 50 documents on default call + cursor 50.

### 3.2 Q2 Benchmarked Quality Tests (`tests/test_round3_quality.py`)
1. `test_dataset_has_thirty_items_and_valid_schema`: Validates 30 items and all 7 category quotas.
2. `test_dataset_sha_matches_manifest`: Validates dataset SHA-256 against manifest `213862facd9243dd...`.
3. `test_no_item_is_derived_from_engine_output`: Asserts human ground truth independence from model predictions.
4. `test_metrics_match_reference_counts`: Asserts TP, FP, FN, TN, precision, recall formulas.
5. `test_gate_fails_on_quote_hallucination`: Asserts gate failure if any hallucinated quote is produced.
6. `test_regression_gate_blocks_two_point_drop`: Asserts regression failure if metric drops > 0.02.
7. `test_eval_runs_offline_without_provider`: Asserts evaluator executes completely offline without external network calls.

### 3.3 Q3 Multi-Reviewer Approval Tests (`tests/test_round3_quorum.py`)
1. `test_quorum_single_signature_approves`: Channels requiring 1 signature approve and allow export.
2. `test_quorum_two_signatures_required`: Channels requiring 2 signatures remain in `quorum_pending` until second distinct signature lands.
3. `test_same_person_twice_is_not_two_signatures`: Duplicate approval by same reviewer rejected with HTTP 403/409.
4. `test_revocation_blocks_export_until_new_signatures`: Revocation sets `outcome: "revoked"`, invalidates approval, and blocks export with HTTP 409 `APPROVAL_REVOKED`.
5. `test_expired_exception_blocks_export`: Expired manager exception blocks export with HTTP 409 `EXCEPTION_EXPIRED`.
6. `test_concurrent_signatures_both_land`: Concurrent reviewer approvals merge atomically via CAS.
7. `test_policy_validation_rejects_nonsense`: Out-of-bounds required counts (< 1 or > 3) or unknown roles rejected with HTTP 422.
8. `test_creator_cannot_be_a_signer`: Creator attempting to sign fails with HTTP 403 `Self-approval is prohibited`.
9. `test_escalation_notifies_but_never_approves`: Escalation sends notification but never bypasses reviewer approval.
10. `test_receipt_lists_all_signers_and_policy_version`: Exported Ed25519 receipt contains full signature list and policy version.
