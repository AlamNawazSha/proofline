# Proofline 2.0: Autonomous Evidence Intelligence, AI Compliance, and Verifiable Approval Platform

[![Tests](https://img.shields.io/badge/pytest-100%20passed-emerald)](file:///tests/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.28%20(React%2019)-blue)](file:///frontend/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688)](file:///backend/)
[![Cryptography](https://img.shields.io/badge/Ed25519-RFC%208032%20Signed-cyan)](file:///backend/crypto_passport.py)
[![Audit](https://img.shields.io/badge/Audit%20Ledger-SHA--256%20Hash--Chained-purple)](file:///backend/agents_pipeline.py)
[![Round 3](https://img.shields.io/badge/Round%203-Finish%20Delivered-gold)](file:///docs/ROUND3_SUBMISSION.md)

**Live Deployed Application:** [https://proofline-ruby-three.vercel.app/](https://proofline-ruby-three.vercel.app/)  
**Round 3 Submission Document:** [`docs/ROUND3_SUBMISSION.md`](file:///docs/ROUND3_SUBMISSION.md)  
**Round 3 Official Product PDF:** [`docs/Proofline_2.0_Final_Product_Submission.pdf`](file:///docs/Proofline_2.0_Final_Product_Submission.pdf)  
**Core Thesis:** *"Every important content claim must be traceable to an approved source, every policy violation must be explainable, every approval must be bound to an exact document version, and every release must be independently verifiable."*

---

## 1. Executive Summary & Problem Solved

Modern enterprises face an acute governance crisis: generative AI models produce highly persuasive, subtly inaccurate claims about product specifications, uptime SLAs, medical indications, pricing, and regulatory certifications. Generic LLM "evaluators" merely generate subjective percentage scores without verifiable proof.

**Proofline 2.0** solves this with an **evidence-first, verifiable AI governance platform**:
1. **Deconstructs text into atomic testable claims** (specs, SLA thresholds, certifications, pricing, superlatives).
2. **Grounds claims against authoritative, versioned source passages** using hybrid BM25 + trust-weighted retrieval.
3. **Applies deterministic policy boundaries** (numerical thresholds, active certificate expiration dates, prohibited superlatives).
4. **Enforces four-eyes separation of duties & dual-reviewer quorum** (authors cannot approve their own releases; high-risk copy mandates 2 distinct sign-offs).
5. **Issues Ed25519 Cryptographic Release Passports** that detect any post-approval bitwise or single-character tampering.
6. **Maintains an automatic evidence lifecycle re-review queue** and an append-only SHA-256 hash-chained compliance ledger.

---

## 2. Round 3 Flagship Improvements Delivered

Measured directly against the three improvements committed at Round 2 (`docs/ROUND2_SUBMISSION.md` / `docs/ROUND3.md`):

1. **Evidence Lifecycle: Automatic Re-Review Queue:**
   - Detects when governing evidence, sources, or rules change, expire, or conflict.
   - Automatically computes downstream cascade impacts (`analyze_change_impact`) across all documents and creates persistent reviewer tasks (`TASK-xxxxxxxx`).
   - Integrated into source retirement (`/api/sources/{sid}/retire`) with auditor resolution justification workflows (`/api/re-review-queue/{tid}/resolve`).
   - UI tab in Approval Center with priority indicators and resolution drawers. Verified in `tests/test_round3_improvements.py::test_re_review_queue_lifecycle`.

2. **Measured Detection Quality for AI-Assisted Review (30-Case Benchmark):**
   - Frozen 30-case evaluation benchmark in `backend/agents_pipeline.py::BENCHMARK_CASES` across superlatives, numerical SLAs, prompt injections, expired certificates, ambiguous claims, channel scopes, and true negatives.
   - Live evaluation runner reports **100% Accuracy (30/30)**, **1.000 Precision**, **1.000 Recall**, **0.00% FPR**, **0.00% FNR**, **100% Quote Validity**, and per-case sub-millisecond latency.
   - Interactive Adversarial Lab tab with confusion matrix visualization. Verified in `tests/test_round3_improvements.py::test_measured_detection_quality_30_case_benchmark`.

3. **Multi-Reviewer Approval Policy, Quorum & Explicit Revocation:**
   - Dual-quorum enforcement for sensitive content channels (press releases mandate 2 distinct reviewer approvals).
   - Author self-approval (`403 Forbidden`) and duplicate approvals by the same reviewer (`409 Conflict`) are blocked.
   - Explicit approval revocation (`POST /api/documents/{did}/revoke`) with mandatory justification reasoning, instantly blocking release export. Verified in `tests/test_round3_improvements.py::test_multi_reviewer_quorum_enforcement`.

---

## 3. Two-Minute Hackathon Pitch & Judge Demo Script

### The Pitch
> *"Judges, when an enterprise releases an AI-generated compliance filing or marketing asset, they cannot rely on an LLM saying 'I am 95% confident.' If an uptime claim says 99.99% but the audited SLA is 99.9%, or an ISO certificate expired two months ago, that is a legal liability.
> 
> Proofline 2.0 is an autonomous evidence intelligence platform. It segments claims, retrieves exact source passages, runs deterministic policy rules, enforces human separation of duties and dual-quorum approvals, and produces an Ed25519-signed release passport. If anyone modifies even a single word after approval, the cryptographic passport immediately flags the tampering. Let me show you in 90 seconds."*

### Live Demo Walkthrough (9-Step Sequence)

1. **Dashboard & Overview (`/overview`)**:
   - Point out real-time governance metrics and the **Proofline 2.0 Innovations Deck**.
   - Note the **Demo Mode** indicator with the one-click **"Reset Demo"** button.

2. **Ingest & Document Review (`/documents` & `/editor`)**:
   - Open seeded draft `DOC-DEMO-001`.
   - Click **Run Review**: The pipeline surfaces 3 clear violations:
     - Violation 1: Prohibited superlative *"100% unbreachable cloud security with guaranteed zero latency"* (`RULE-002`).
     - Violation 2: Stale certification claim referencing expired certificate `ISO-2023-SEC` (`RULE-004`).
     - Violation 3: Pricing mismatch claim stating *$49/mo* when master schedule is *$99/mo* (`RULE-005`).

3. **Evidence Graph (`/graph`)**:
   - Open the interactive **Evidence Graph**.
   - Inspect dependencies linking sources, rules, findings, and documents.

4. **Split Correction Workspace (`/documents` -> Redline)**:
   - Accept the suggested corrections derived strictly from active source `SRC-001`.
   - Click **Rerun Audit**: Revision 2 is generated with zero unresolved findings; coverage reaches 100%.

5. **Approval Center & Quorum (`/approvals`)**:
   - As an Author (`creator`), attempt to approve: server returns HTTP 403 `SELF_APPROVAL_BLOCKED`.
   - In persona switcher, switch to **Reviewer**. Reviewer approves Revision 2.
   - If marked for Public Press Release, dual-quorum enforces a second reviewer signature before release.
   - View the **Re-Review Queue** tab for automated tasks triggered by evidence retirement.

6. **Cryptographic Release Passport & Bitwise Tamper Simulator (`/verification`)**:
   - Inspect the issued **Ed25519 Cryptographic Passport**.
   - Click **"Test Original Text"**: status reports **VALID (Signature Verified)**.
   - Click **"Test 1-Word Tampered Text"**: instant response: **TAMPER DETECTED: Hash mismatch!**

7. **Cryptographic Audit Explorer (`/audit`)**:
   - Inspect the append-only ledger with sequential block hashes: $\text{Hash}_n = \text{SHA-256}(\text{Seq} \parallel \text{Action} \parallel \text{Actor} \parallel \text{PrevHash})$.
   - Click **"Verify Chain Integrity"**: recomputes from Genesis to Head with mathematical proof of zero tampering.

8. **Adversarial Security Lab (`/benchmark`)**:
   - Click **"Run Adversarial Benchmark"**: Executes all 30 ground truth test cases, demonstrating 100% precision, 100% recall, and zero false positives.

---

## 4. Test Results & Build Status

- **Pytest Suite:** `python -m pytest tests/ -v`
  - **100 passed in 21.68s** (100% clean test execution across `test_core.py`, `test_upgrades.py`, `test_proofline2.py`, and `test_round3_improvements.py`).
- **Next.js Production Build:** `npm --prefix frontend run build`
  - **Compiled clean in 6.8s** with 0 errors across all 5 static & dynamic app routes.
- **End-to-End Governance Smoke Test:** `python scripts/smoke.py`
  - **All 9 steps verified**: Demo Init -> Review -> Suggestion -> Submit -> Author Block (403) -> Reviewer Approve (200) -> Export (200) -> Edit (200) -> Export Blocked (409).

---

## 5. Quick Start (Run Locally)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Setup (Terminal 1)
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Start FastAPI authority service on port 8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Run Automated Tests
```bash
# Run all 100 unit, cryptographic, and pipeline tests
python -m pytest tests/ -v

# Run the 9-step governance smoke test
python scripts/smoke.py http://127.0.0.1:8000
```

---

## 6. Directory Structure

```
├── backend/
│   ├── crypto_passport.py      # Ed25519 signing, verification & single-char tamper detection
│   ├── ingestion.py            # Multi-format ingestion (PDF, DOCX, CSV, safe URL crawl)
│   ├── agents_pipeline.py      # 7-Agent verification pipeline, 30-case benchmark & re-review queue
│   ├── engine.py               # Deterministic rule engine, Evidence Graph & Impact Cascade
│   ├── main.py                 # FastAPI REST API endpoints & route handlers
│   ├── store.py                # Isolated SQLite session store & persistence layer
│   └── requirements.txt        # Backend dependencies
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── EvidenceGraph.tsx         # Interactive provenance graph with zoom & pan
│   │   │   ├── RiskIntelligence.tsx      # 5x5 impact/likelihood heat map & drift monitor
│   │   │   ├── VerificationPassport.tsx  # Ed25519 passport card & bitwise tamper demo
│   │   │   ├── AdversarialLab.tsx        # 30-test frozen benchmark runner & confusion matrix
│   │   │   ├── PolicyStudio.tsx          # Deterministic rules editor, sandbox & NL synthesizer
│   │   │   ├── AuditExplorer.tsx         # Append-only SHA-256 chained ledger viewer
│   │   │   ├── CorrectionWorkspace.tsx   # Side-by-side redline & evidence reconciler
│   │   │   ├── ApprovalCenter.tsx        # Four-eyes governance, quorum & re-review queue
│   │   │   └── IntegrationsAdmin.tsx     # Webhooks, Ed25519 key ring & RBAC matrix
│   │   ├── globals.css                   # Enterprise navy theme, badges & layout styles
│   │   └── page.tsx                      # Primary enterprise navigation shell & state
├── tests/
│   ├── test_round3_improvements.py # Tests for the three flagship Round 3 improvements
│   ├── test_proofline2.py          # Security, cryptographic passport, graph & agents tests
│   ├── test_upgrades.py            # Invariants, boundary checks, bearer tokens & CAS mutations
│   └── test_core.py                # Core journeys, separation of duties & WCAG contrast
├── docs/
│   ├── ROUND3_SUBMISSION.md        # Official Round 3 submission deck & technical audit report
│   ├── Proofline_2.0_Final_Product_Submission.pdf # Official generated product PDF
│   └── ARCHITECTURE.md             # Detailed technical architecture specification
├── scripts/
│   ├── smoke.py                    # 9-step end-to-end governance smoke test
│   └── generate_product_pdf.py     # ReportLab script to build the official submission PDF
├── pyproject.toml                  # Pytest configuration with pythonpath
└── README.md                       # This documentation
```

---

## 7. Security Boundaries & Limitations

1. **Cryptographic Identity**: Ed25519 signatures authenticate that a release was approved by an authorized server key. It does not replace legal certification audits.
2. **Audit Hash Chaining**: SHA-256 preimage chaining exposes unauthorized modification or deletion relative to a trusted checkpoint.
3. **AI Boundaries**: LLMs are used exclusively for claim segmentation and semantic interpretation; all mathematical thresholds, SLA matching, and approval transitions are enforced strictly in deterministic Python code.
