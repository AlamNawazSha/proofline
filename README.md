# Proofline 2.0: Autonomous Evidence Intelligence, AI Compliance, and Verifiable Approval Platform

[![Tests](https://img.shields.io/badge/pytest-96%20passed-emerald)](file:///tests/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.28%20(React%2019)-blue)](file:///frontend/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688)](file:///backend/)
[![Cryptography](https://img.shields.io/badge/Ed25519-RFC%208032%20Signed-cyan)](file:///backend/crypto_passport.py)
[![Audit](https://img.shields.io/badge/Audit%20Ledger-SHA--256%20Hash--Chained-purple)](file:///backend/agents_pipeline.py)

**Live Deployed Application:** [https://proofline-ruby-three.vercel.app/](https://proofline-ruby-three.vercel.app/)  
**Core Thesis:** *"Every important content claim must be traceable to an approved source, every policy violation must be explainable, every approval must be bound to an exact document version, and every release must be independently verifiable."*

---

## 1. Executive Summary & Problem Solved

Modern enterprises face an acute governance crisis: generative AI models produce highly persuasive, subtly inaccurate claims about product specifications, uptime SLAs, medical indications, pricing, and regulatory certifications. Generic LLM "evaluators" merely generate subjective percentage scores without verifiable proof.

**Proofline 2.0** solves this with an **evidence-first, verifiable AI governance platform**:
1. **Deconstructs text into atomic testable claims** (specs, SLA thresholds, certifications, pricing, superlatives).
2. **Grounds claims against authoritative, versioned source passages** using hybrid BM25 + trust-weighted retrieval.
3. **Applies deterministic policy boundaries** (numerical thresholds, active certificate expiration dates, prohibited superlatives).
4. **Enforces four-eyes separation of duties** (authors cannot approve their own releases).
5. **Issues Ed25519 Cryptographic Release Passports** that detect any post-approval bitwise or single-character tampering.
6. **Maintains an append-only SHA-256 hash-chained compliance ledger** with public mathematical verification.

---

## 2. Two-Minute Hackathon Pitch & Judge Demo Script

### The Pitch
> *"Judges, when an enterprise releases an AI-generated compliance filing or marketing asset, they cannot rely on an LLM saying 'I am 95% confident.' If an uptime claim says 99.99% but the audited SLA is 99.9%, or an ISO certificate expired two months ago, that is a legal liability.
> 
> Proofline 2.0 is an autonomous evidence intelligence platform. It segments claims, retrieves exact source passages, runs deterministic policy rules, enforces human separation of duties, and produces an Ed25519-signed release passport. If anyone modifies even a single word after approval, the cryptographic passport immediately flags the tampering. Let me show you in 90 seconds."*

### Live Demo Walkthrough (9-Step Sequence)

1. **Dashboard & Overview (`/overview`)**:
   - Point out the 4 real-time governance metrics and the **Proofline 2.0 Governance Innovations Deck**.
   - Note the **Demo Mode** indicator with the one-click **"Reset Demo"** button.

2. **Ingest & Document Review (`/documents` & `/editor`)**:
   - Open seeded draft `DOC-DEMO-001`.
   - Click **Run Review**: The 7-stage multi-agent pipeline extracts atomic claims and surfaces 3 clear violations:
     - Violation 1: Prohibited superlative *"100% unbreachable cloud security with guaranteed zero latency"* (`RULE-002`).
     - Violation 2: Stale certification claim referencing expired certificate `ISO-2023-SEC` (`RULE-004`).
     - Violation 3: Pricing mismatch claim stating *$49/mo* when the master schedule is *$99/mo* (`RULE-005`).

3. **Evidence Graph (`/graph`)**:
   - Open the interactive **Evidence Graph**.
   - Click on node `SRC-002` (Expired ISO Certificate) to see the dependency cascade highlighting the dependent marketing claim and finding.

4. **Split Correction Workspace (`/documents` -> Redline)**:
   - Accept the suggested corrections derived strictly from active source `SRC-001`.
   - Click **Rerun Audit**: Revision 2 is generated with zero unresolved findings; coverage reaches 100%.

5. **Approval Center & Separation of Duties (`/approvals`)**:
   - As an Author (`creator`), attempt to approve the document: the server returns HTTP 403 `SELF_APPROVAL_BLOCKED`.
   - In the top-right persona switcher, switch to **Reviewer**.
   - Reviewer clicks **Approve Version**: approval is cryptographically bound to Revision 2's SHA-256 digest.

6. **Cryptographic Release Passport & Bitwise Tamper Simulator (`/verification`)**:
   - Inspect the issued **Ed25519 Cryptographic Passport**.
   - Click **"Test Original Text"**: Recomputes SHA-256 digest; status reports **VALID (Signature Verified)**.
   - Click **"Test 1-Word Tampered Text"** (alters "20% savings" to "50% savings"):
   - Instant response: **TAMPER DETECTED: Hash mismatch!** Proving approvals cannot be retroactively spoofed.

7. **Cryptographic Audit Explorer (`/audit`)**:
   - Inspect the append-only ledger with sequential block hashes:
     $$\text{Hash}_n = \text{SHA-256}(\text{Seq} \parallel \text{Action} \parallel \text{Actor} \parallel \text{PrevHash})$$
   - Click **"Verify Chain Integrity"**: recomputes from Genesis to Head with mathematical proof of zero modification.

8. **Adversarial Security Lab (`/benchmark`)**:
   - Click **"Run Adversarial Benchmark"**: Executes all 12 ground truth test cases, demonstrating 100% detection of prompt injection, citation hallucinations, and outdated sources with live Precision, Recall, and F1 calculations.

---

## 3. Verifiable Innovation Claims for Judging

| # | Innovation Claim | How It Is Proven in Code |
|---|---|---|
| **1** | **Ed25519 Cryptographic Release Passports** | `backend/crypto_passport.py` implements RFC 8032 Ed25519 signatures over canonical artifact SHA-256 hashes. Verified via `/api/receipts/{id}/verify`. |
| **2** | **Single-Character Tamper Detection** | `frontend/app/components/VerificationPassport.tsx` demonstrates bitwise integrity checking: changing a single character invalidates the mathematical passport. |
| **3** | **7-Stage Multi-Agent Verification Architecture** | `backend/agents_pipeline.py` implements specialized typed agents (Extraction, Policy Mapping, Evidence Retrieval, Independent Verification, Risk, Redline, Consistency Validator). |
| **4** | **Deterministic Compliance Policy Engine** | `backend/engine.py` evaluates exact regex patterns, numerical availability thresholds (e.g. 99.9%), and active expiration dates in deterministic Python code without LLM hallucination. |
| **5** | **Strict SSRF Quarantine** | `backend/ingestion.py` validates DNS targets and blocks RFC 1918 private IPs, loopback, and cloud metadata (`169.254.169.254`) before web ingestion. |
| **6** | **Four-Eyes Separation of Duties** | Server rejects document creator self-approval with HTTP 403 `SELF_APPROVAL_BLOCKED` in `backend/engine.py`. |
| **7** | **Dynamic Change Impact Cascade** | `backend/engine.py::calculate_change_impact()` traverses dependencies: retiring or updating a source automatically flags dependent approved releases as `REVALIDATION_REQUIRED`. |
| **8** | **SHA-256 Hash-Chained Audit Ledger** | `backend/agents_pipeline.py` links every consequential audit event via preimage chaining; verified by `/api/audit/verify`. |
| **9** | **Ground-Truth Adversarial Benchmark Suite** | `/api/benchmark/run` evaluates 12 edge cases including prompt injection traps, outdated certificates, and citation fabrication, reporting Accuracy, Precision, Recall, and F1. |
| **10** | **Natural Language Policy Synthesizer** | `/api/policies/build-nl` translates plain English governance requirements into structured deterministic regex policies and required evidence specifications. |
| **11** | **Multi-Format Ingestion Pipeline** | `backend/ingestion.py` extracts text from PDF, DOCX (direct XML parsing), CSV, TXT, Markdown, HTML, and safe URLs. |
| **12** | **Zero Silent Rewriting** | Suggested corrections are explicitly derived from cited source passages; original drafts remain unmodified until accepted by human review. |

---

## 4. Test Results & Build Status

- **Pytest Suite:** `python -m pytest tests/ -q`
  - **96 passed** in 13.46s (87 baseline tests + 9 new Proofline 2.0 security, cryptographic, and agent tests).
- **Next.js Production Build:** `npm run build`
  - **Compiled successfully** with 0 errors across all 5 static & dynamic app routes.

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
# Run all 96 unit, cryptographic, and pipeline tests
python -m pytest tests/ -q
```

---

## 6. Directory Structure

```
├── backend/
│   ├── crypto_passport.py      # Ed25519 signing, verification & tamper detection
│   ├── ingestion.py            # Multi-format ingestion (PDF, DOCX, CSV, safe URL crawl)
│   ├── agents_pipeline.py      # 7-Agent verification pipeline, Audit Ledger & Benchmark
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
│   │   │   ├── AdversarialLab.tsx        # 12-test ground truth benchmark & metrics
│   │   │   ├── PolicyStudio.tsx          # Deterministic rules editor & NL synthesizer
│   │   │   ├── AuditExplorer.tsx         # Append-only SHA-256 chained ledger viewer
│   │   │   ├── CorrectionWorkspace.tsx   # Side-by-side redline & evidence reconciler
│   │   │   ├── ApprovalCenter.tsx        # Four-eyes governance & approval inbox
│   │   │   └── IntegrationsAdmin.tsx     # Webhooks, Ed25519 key ring & RBAC matrix
│   │   ├── globals.css                   # Enterprise navy theme, badges & layout styles
│   │   └── page.tsx                      # Primary enterprise navigation shell & state
├── tests/
│   ├── test_proofline2.py      # Tests for all new Proofline 2.0 features
│   ├── test_upgrades.py        # Core invariants & API contract validation
│   ├── test_audit.py           # Audit ledger and transition tests
│   └── ...                     # Complete 96-test automated suite
├── ARCHITECTURE.md             # Detailed technical architecture specification
├── RUN.md                      # Local and production deployment runbook
├── .env.example                # Sample environment configuration
└── README.md                   # This documentation
```

---

## 7. Security Boundaries & Limitations

1. **Cryptographic Identity**: Ed25519 signatures authenticate that a release was approved by an authorized server key. It does not replace legal certification audits.
2. **Audit Hash Chaining**: SHA-256 preimage chaining exposes unauthorized modification or deletion relative to a trusted checkpoint. If an attacker has full database write access and replaces the entire database from genesis, external timestamp anchoring (e.g. RFC 3161 TSA or transparency logs) is required for immutable legal non-repudiation.
3. **AI Boundaries**: LLMs are used exclusively for claim segmentation and semantic interpretation; all mathematical thresholds, SLA matching, and approval transitions are enforced strictly in deterministic Python code.
