# Proofline — Product Roadmap & Future Architecture

> **From Round 3 Finish to Enterprise Scale (v0.2.0 → v1.0.0)**

---

## 1. Release Milestone Summary

```
   ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
   │    Round 3 (Now)   │ ──► │     v0.3.0 (Q1)    │ ──► │     v1.0.0 (Q3)    │
   │      v0.2.0        │     │  CI/CD & Integrat. │     │  Enterprise Scale  │
   └────────────────────┘     └────────────────────┘     └────────────────────┘
   • 3 Frozen Features        • GitHub / Figma App       • Hardware HSM Signing
   • 128 Offline Tests        • Slack / Teams Bot        • Multi-Modal Video/Audio
   • 30-Item Quality BM       • Webhook Dispatcher       • Cross-Cloud Federation
   • Quorum & Revocation      • Real-Time WebSocket      • SOC2 / ISO Audit Vault
   • Cascade Task Queue       • External LLM Gateway     • Native Mobile Sign-off
```

---

## 2. Milestone Details

### Milestone 1: Round 3 Delivery (v0.2.0) — COMPLETED ✅
- **Cascade re-review with ownership (Q1)**:
  - 7 atomic hook points inside `store.mutate` closures.
  - Idempotent deduplication keys, SLA tracking, re-approval closure.
  - Per-document storage gateway (`Documents`) with optimistic CAS and state pagination.
- **Benchmarked detection quality, enforced in CI (Q2)**:
  - Frozen 30-item human-ground-truth dataset with category quotas.
  - Manifest SHA-256 integrity hash verification and Cohen's kappa (0.88).
  - 12 quality gates, offline model fixtures, and GitHub Actions CI workflow.
- **Multi-reviewer approval policy (Q3)**:
  - Channel- and risk-driven dual quorum (`website: 2`, `press_release: 2`, `email: 1`, `high: 2`).
  - Separation of duties (creator self-approval blocked; distinct reviewers enforced).
  - Explicit revocation with mandatory justification (≥ 8 chars).
  - Strict server-side export gate with Ed25519 digital release passports.

---

### Milestone 2: Enterprise Integrations & Developer Ecosystem (v0.3.0) — Q1 2027
- **Native Slack & Microsoft Teams Bot**:
  - Interactive notification cards for re-review tasks and quorum approval requests.
  - One-click reviewer approval directly from Slack with biometric mobile passkey.
- **Figma & Google Docs Integration**:
  - Figma plugin checking text frames in real time against active brand rules and numerical claim conditions.
  - Google Docs add-on highlighting unsupported claims and expired certifications during drafting.
- **Enterprise Webhook Dispatcher**:
  - Signed HMAC-SHA256 webhooks for all governance events (`document.approved`, `approval.revoked`, `task.created`, `source.expired`).
  - Automatic deployment triggers integrating with Vercel, Netlify, and AWS S3 releases.
- **Real-Time WebSocket Presence**:
  - Collaborative redline workspace showing live concurrent reviewer cursors and annotation threads.

---

### Milestone 3: Hardware Security Modules & Multi-Modal Governance (v1.0.0) — Q3 2027
- **Hardware Security Module (HSM) Signing**:
  - Integration with AWS CloudHSM, Google Cloud KMS, and Azure Key Vault for FIPS 140-2 Level 3 hardware-isolated Ed25519 signing.
  - Multi-party threshold signing (t-of-n) across geographically distributed key shares.
- **Multi-Modal Evidence Governance**:
  - Semantic fact-checking for video keyframes, audio transcripts, and infographics.
  - Visual asset hash clustering for brand logo distortion, unauthorized co-branding, and color space compliance.
- **Federated Governance Across Multiple Workspaces**:
  - Parent/child policy inheritance across global subsidiaries (e.g. global legal rules inherited by regional marketing teams).
  - Automated regulatory mapping for EU AI Act, FTC Truth in Advertising, and FDA promotional compliance.
- **SOC2 Type II & ISO 27001 Compliance Export**:
  - One-click cryptographically verifiable auditor export pack containing immutable block ledgers, timestamped verification passports, and annotator agreement logs.

