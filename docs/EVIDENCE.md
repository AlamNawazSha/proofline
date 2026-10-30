# Proofline — Verification & Command Execution Evidence

**Target Release:** `0.2.0`  
**Execution Date:** 31 October 2026 (01:29 IST)  
**Git Commit Baseline:** `2e86dd8c1e843f5546973e2116035f293bfaec98`  
**Git Branch:** `master`  
**Platform:** Windows 11 / Python 3.13.4 & 3.12 / Node.js 20.x

---

## 1. Automated Test Suite Execution

Command executed:
```bash
python -m pytest tests -q
```

Real pasted output:
```text
........................................................................ [ 48%]
........................................................................ [ 97%]
...                                                                      [100%]
147 passed in 22.07s
```

### Test Suite Breakdown (100% Offline Pass Rate across 10 Suites)
- `tests/test_round3_tasks.py` (11 tests): Q1 Cascade re-review, lifecycle mutation hooks, task deduplication, re-approval closure, manager assignment, state pagination.
- `tests/test_round3_quality.py` (8 tests): Q2 Benchmarked detection quality, dataset SHA verification, quote validity, regression gate drop block, evaluator exit 1 on regression.
- `tests/test_round3_quorum.py` (10 tests): Q3 Multi-reviewer approval policy, quorum counts, distinct signers, revocation, expired exception block.
- `tests/test_quorum_matrix.py` (10 tests): Q3 Table-driven matrix tests asserting every cell (single, double, duplicate, creator-as-signer, revocation, concurrent CAS, escalation deadline, policy version invalidation).
- `tests/test_crypto_rotation.py` (4 tests): Key rotation lifecycle, public key export endpoint, unverifiable key rotated status, tamper detection.
- `tests/test_numeric_probes.py` (4 tests): Number boundaries, versions, times, dates, phone numbers, preventing false positives while flagging real ungrounded claims.
- `tests/test_round3_improvements.py` (4 tests): Integration tests for the three Round 3 improvements.
- `tests/test_proofline2.py` (9 tests): Ed25519 cryptographic passport signature and tamper detection, risk intelligence matrix, audit ledger hash chain verification, SSRF protection against private IP ranges.
- `tests/test_upgrades.py` (51 tests): Invariants I1–I9, boundary validation, bearer tokens, optimistic CAS.
- `tests/test_core.py` (36 tests): Core governance journeys, separation of duties, source staging, rule deactivation on source loss, visual asset aspect ratio & 8×8 hash matching, WCAG contrast formula.

**Total: 147 passed, 0 failed, 0 skipped.**

---

## 2. Quality Evaluation Benchmark (Offline Mode)

Command executed:
```bash
python scripts/eval_quality.py --offline --out benchmark/results.json --csv benchmark/results.v1.csv
```

Real pasted output:
```text
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

**Quality Status:** 12 of 12 quality gates passed.
- Dataset SHA-256: `c5908dfc8ce6616fb01baf8de6bb0c48828ff28601f8383c1feafdb8a08dffdc` (30 items).
- Provenance: Labelled by the team; inter-annotator agreement not measured pending dual annotation.
- AI layer: Offline fixture replay (authored replies, not a live model measurement).

---

## 3. CI Regression Gate Enforcement Verification

Simulated a 0.01 precision elevation threshold (`threshold: 1.01`) in `benchmark/gates.json`:

Command executed:
```bash
python scripts/eval_quality.py --offline
```

Real pasted output:
```text
Benchmark run complete: overall=fail
  [FAIL] rules.precision: 1.0 (threshold: 1.01)
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
Quality gate check failed.
```
Exit code: `1` (Blocks CI build). Reverted immediately.

---

## 4. Q1 Scale Proof (5,000 Documents Seeding & Cascade Re-Review)

Command executed:
```bash
python scripts/scale_proof.py
```

Real pasted output:
```text
=== Proofline Scale Proof (5,000 Documents) ===
Target rule for cascade: 'Preferred plan terminology' (ID: RULE-001)
Seeding 5,000 documents (200 affected, 4,800 unaffected)...
[PASS] 5,000 documents seeded in 63.7 ms (Total in workspace: 5001)
[PASS] GET /api/state?documents=page (Page 1, 50 items, nextCursor=50): 228.23 ms
[PASS] Cascade re-review execution over 200 documents: 80.72 ms
[PASS] GET /api/tasks?status=open (200 tasks): 60.74 ms
[PASS] Strict Isolation: 0 tasks created for unaffected documents (4,800 unaffected verified)

=== Real Measured Summary ===
Total documents: 5,000
Affected documents: 200
Paged read latency: 228.23 ms
Cascade re-review latency (200 docs): 80.72 ms
Task queue listing latency: 60.74 ms
Scale proof completed successfully.
```

---

## 5. Repository Cleanliness & Git Tracked Files Audit

Command executed:
```powershell
git ls-files | Select-String -Pattern "\.env|\.sqlite|private_files|scratch|node_modules|\.next"
```

Real pasted output:
```text
.env.example
frontend/.env.example
```

**Cleanliness Status:** Zero secrets, SQLite databases, private signing keys, scratch files, or build artifacts tracked.
Packaging script `scripts/package_for_submission.sh` uses `git archive` to produce a completely clean submission zip.

---

## 6. Frontend Production Build Verification

Command executed:
```bash
npm --prefix frontend run build
```

Real pasted output:
```text
> proofline@0.1.0 build
> next build

   ▲ Next.js 15.5.28

   Creating an optimized production build ...
 ✓ Compiled successfully in 3.8s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/5) ...
   Generating static pages (1/5) 
   Generating static pages (2/5) 
   Generating static pages (3/5) 
 ✓ Generating static pages (5/5)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    50.2 kB         153 kB
├ ○ /_not-found                            994 B         104 kB
├ ƒ /api/[...path]                         126 B         103 kB
└ ƒ /api/health                            126 B         103 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-b1e2483a7e02feee.js       46.6 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          1.97 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

---

## 7. Submission Package Archive & Zero-Leak Verification

Command executed:
```bash
python scripts/package_for_submission.py
```

Real pasted output:
```text
Creating submission archive: proofline-v0.2.0-submission.zip from git HEAD...
Validating archive contents...
Archive validated: 115 files packaged, 0 forbidden files found.
```

Archive audit results:
- Zero `.env` files (only `.env.example` tracked)
- Zero SQLite files (`*.db`, `*.sqlite`, `*.sqlite3`)
- Zero `node_modules` or `.next` artifacts
- Zero `private_files/` or secret keys (`*.pem`, `*.key`)
- Output: `proofline-v0.2.0-submission.zip` containing strictly verified git tree

