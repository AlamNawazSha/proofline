# Proofline 2.0 Architecture & Technical Specification

> **Autonomous Evidence Intelligence, AI Compliance, and Verifiable Approval Platform**

Proofline 2.0 is an enterprise governance platform that replaces subjective AI confidence scores with **traceable evidence graphs, deterministic policy evaluation, version-bound approvals, and Ed25519 cryptographic release passports**.

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client / Presentation Layer                       │
│  Next.js 15.5 App Router · React 19 · Enterprise Dark Mode · Tailwind Tokens│
│                                                                             │
│  [Overview]  [Evidence Workspace]  [Document Reviews]  [Evidence Graph]     │
│  [Policy Studio]  [Approval Center]  [Verification Center]  [Risk Heatmap]  │
│  [Audit Explorer]  [Adversarial Lab]  [Integrations]  [Administration]      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON RPC
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    FastAPI Enterprise Backend Gateway                       │
│  - RBAC & Persona Context (Author / Reviewer / Approver / Manager / Auditor)│
│  - Four-Eyes Separation of Duties Enforcement                               │
│  - Session Management & Tamper-Evident Middleware                           │
└──────────────┬───────────────────────┬───────────────────────┬──────────────┘
               │                       │                       │
┌──────────────▼──────────┐ ┌──────────▼──────────┐ ┌──────────▼──────────────┐
│ Ingestion & SSRF Guard  │ │ Multi-Agent Engine  │ │ Deterministic Policy    │
│ - PDF, DOCX, TXT, CSV   │ │ Agent A: Extraction │ │ - Regex Engine          │
│ - Controlled Web Crawl  │ │ Agent B: Mapping    │ │ - Numerical Thresholds  │
│ - Private IP Quarantine │ │ Agent C: Retrieval  │ │ - Active Cert Validator │
│ - Content Fingerprinter │ │ Agent D: Verifier   │ │ - Terminology Checker   │
│   (Canonical SHA-256)   │ │ Agent E: Risk Model │ │ - NL Policy Synthesizer │
│                         │ │ Agent F: Redline    │ │                         │
│                         │ │ Agent G: Consistency│ │                         │
└──────────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────────┘
               │                       │                       │
┌──────────────▼───────────────────────▼───────────────────────▼──────────────┐
│                       Cryptographic Security Core                           │
│                                                                             │
│  [Ed25519 Release Passport]           [SHA-256 Hash-Chained Audit Ledger]   │
│  - RFC 8032 Asymmetric Signatures      - Append-Only Event Preimages         │
│  - Server-Side Private Key Isolation   - Hash(n) = SHA256(Seq+Action+Prev)   │
│  - Public Verification Endpoint        - Bitwise Replay & Deletion Guard     │
│  - Sub-String Bitwise Tamper Simulator - Cryptographic Checkpoint Anchor     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Seven-Stage Multi-Agent Claim Verification Pipeline

Proofline 2.0 avoids monolithic single-prompt LLM hallucinations by decomposing verification into 7 specialized, typed agents:

| Stage | Agent Name | Input | Responsibility | Failure/Quarantine Mode |
|---|---|---|---|---|
| **A** | **Claim Extraction Agent** | Raw Document Text | Segments text into atomic, testable claims (specs, SLA, certs, pricing, superlatives). | Fails if unparsable; returns raw strings without making approval decisions. |
| **B** | **Policy Mapping Agent** | Extracted Claims | Matches claims against active enabled governance rules (`RULE-001` .. `RULE-009`). | Flags unmatched claims as unclassified. |
| **C** | **Evidence Retrieval Agent** | Claim Keywords & Context | Hybrid retrieval over authorized source passages using BM25 and source trust weights. | Flags insufficient or outdated sources. |
| **D** | **Independent Verification Agent** | Claim + Exact Passages | Evaluates semantic agreement. Categorizes finding into: `SUPPORTED`, `CONTRADICTED`, `UNVERIFIED`, `INSUFFICIENT_EVIDENCE`, `OUTDATED_SOURCE`, or `CONFLICTING_SOURCES`. | Inconclusive findings escalate to mandatory human review. |
| **E** | **Risk Assessment Agent** | Verification State + Rule Severity | Calculates non-linear business risk score ($0-100$) based on impact and likelihood matrix. | Never equates model confidence with regulatory safety. |
| **F** | **Report & Correction Agent** | Violations + Cited Passages | Synthesizes compliant redline suggestions strictly derived from active verified source passages. | Preserves original text; forbids silent rewriting. |
| **G** | **Final Consistency Validator** | Complete Review Run | Validates schemas, citation bounds, expiration dates, and prompt injection traps. | Rejects malformed JSON and enforces human review signoff. |

---

## 3. Cryptographic Release Passports & Verification

### 3.1 Ed25519 Signature Architecture
Every approved document release produces an immutable JSON **Cryptographic Passport**:
1. **Canonical Digest**: The document text is normalized (whitespace, linebreaks) and hashed using SHA-256:
   $$\text{ArtifactHash} = \text{SHA-256}(\text{Canonical}(T))$$
2. **Passport Metadata Binding**: The payload binds `artifactId`, `revision`, `artifactHash`, `policySetVersion`, `sourceVersion`, `reviewerId`, and `timestamp`.
3. **Ed25519 Signing**: The server key ring signs the binary UTF-8 representation using RFC 8032 Ed25519. The private key never leaves server memory.
4. **Offline Public Verification**: Any third party, regulator, or customer can verify the receipt using the public key and independent recomputation of the file hash.

### 3.2 Single-Character Tamper Detection
If an adversary or unauthorized pipeline alters even one character (e.g. changing `"20% savings"` to `"50% savings"`):
- $\text{ArtifactHash}_{\text{modified}} \ne \text{ArtifactHash}_{\text{receipt}}$
- The verification endpoint immediately returns:
  ```json
  {
    "valid": false,
    "tampered": true,
    "error": "CONTENT_HASH_MISMATCH: Calculated SHA-256 does not match receipt signed hash."
  }
  ```

---

## 4. SHA-256 Hash-Chained Audit Explorer

To prevent retroactive deletion or modification of audit trails by database administrators:
- Each event $E_n$ is cryptographically chained to $E_{n-1}$:
  $$\text{Preimage} = n \parallel \text{Timestamp} \parallel \text{Actor} \parallel \text{Action} \parallel \text{Resource} \parallel \text{PrevHash}$$
  $$\text{Hash}_n = \text{SHA-256}(\text{Preimage})$$
- The `/api/audit/verify` endpoint walks the entire chain from genesis ($n=1$, $\text{PrevHash}=\text{"0"}\times 64$) to head.
- Any altered timestamp, actor, action, or deleted record invalidates the entire subsequent chain.

---

## 5. SSRF Defense & Untrusted Ingestion Protocol

When ingesting external URLs or uploaded files:
1. **DNS Resolution & IP Validation**:
   - Resolves target domain name to IP addresses.
   - Strictly blocks:
     - Loopback (`127.0.0.0/8`, `::1`)
     - RFC 1918 Private Ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
     - Link-Local / Cloud Metadata Endpoints (`169.254.169.254`, `169.254.0.0/16`)
     - Carrier-Grade NAT (`100.64.0.0/10`)
2. **Redirect Validation**:
   - Enforces `follow_redirects=False` initially; checks each redirect hop against IP filter.
3. **Document Parser Isolation**:
   - PDF, DOCX (XML), CSV, and HTML are parsed with strict text-extraction limits (max 15MB, max 500,000 characters).
   - Ingested content is flagged as `untrusted` until reviewed and formally activated by a Workspace Manager.

---

## 6. Threat Model & Security Boundaries

| Threat Scenario | Mitigation Strategy | Architectural Layer |
|---|---|---|
| **Prompt Injection in Document** | Ingested text is treated strictly as data; heuristic injection boundary detector quarantines meta-instructions (`"Ignore all previous rules"`). | Layer 1 / Ingestion |
| **Self-Approval (Author Bias)** | Server strictly rejects `creatorId == approverId` with HTTP 403 `SELF_APPROVAL_BLOCKED`. | Layer 4 / RBAC |
| **Stale / Expired Certification** | Policy `RULE-004` & `RULE-006` cross-references certificate validity dates against server time. | Layer 3 / Policy Engine |
| **Retroactive Audit Alteration** | SHA-256 cryptographic hash-chaining exposes missing, reordered, or edited records. | Layer 6 / Audit Ledger |
| **Post-Approval Silent Modification** | Re-evaluation invalidates previous receipts; hash comparison immediately flags modification. | Layer 5 / Passport Engine |
