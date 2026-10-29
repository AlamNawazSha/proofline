#!/usr/bin/env python3
"""
Generate the Official Round 3 Product Submission PDF for Proofline 2.0.
Uses ReportLab 4.5.1 to build a publication-grade PDF document.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf(output_path: str):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    navy = colors.HexColor("#0f172a")
    cyan = colors.HexColor("#0284c7")
    slate_dark = colors.HexColor("#334155")
    slate_light = colors.HexColor("#f8fafc")
    border_color = colors.HexColor("#cbd5e1")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=navy,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=cyan,
        spaceAfter=15,
    )

    h1_style = ParagraphStyle(
        "H1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=navy,
        spaceBefore=14,
        spaceAfter=8,
    )

    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=cyan,
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=slate_dark,
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "Bullet",
        parent=body_style,
        leftIndent=15,
        bulletIndent=5,
        spaceAfter=4,
    )

    code_style = ParagraphStyle(
        "CodeBlock",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=8,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=slate_dark,
    )

    story = []

    # Title & Header
    story.append(Paragraph("PROOFLINE 2.0", title_style))
    story.append(
        Paragraph(
            "Evidence-First AI Governance, Verifiable Quorum & Cryptographic Approval Platform<br/>"
            "<b>Round 3 Final Product Submission Document</b>",
            subtitle_style,
        )
    )
    story.append(HRFlowable(width="100%", thickness=1.5, color=cyan, spaceAfter=12))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>Item / Metric</b>", table_header_style),
            Paragraph("<b>Submission Details</b>", table_header_style),
        ],
        [
            Paragraph("<b>Live Target Link</b>", table_cell_style),
            Paragraph("https://proofline-ruby-three.vercel.app/", table_cell_style),
        ],
        [
            Paragraph("<b>Source Code Repository</b>", table_cell_style),
            Paragraph("https://github.com/AlamNawazSha/proofline", table_cell_style),
        ],
        [
            Paragraph("<b>Team Identifier</b>", table_cell_style),
            Paragraph("syedsuhailahamed.m26", table_cell_style),
        ],
        [
            Paragraph("<b>Submission Round</b>", table_cell_style),
            Paragraph("Round 3 — The Finish (Final Deliverable)", table_cell_style),
        ],
        [
            Paragraph("<b>Automated Test Suite</b>", table_cell_style),
            Paragraph("<b>100 passed in 21.68s</b> (100% clean test execution across 4 test suites)", table_cell_style),
        ],
        [
            Paragraph("<b>Frontend Production Build</b>", table_cell_style),
            Paragraph("Next.js 15.5.28, React 19, TypeScript — 0 errors, compiled in 6.8s", table_cell_style),
        ],
        [
            Paragraph("<b>Core Technology Stack</b>", table_cell_style),
            Paragraph("FastAPI, Python 3.13, Ed25519 Cryptography, PyPDF, SQLite WAL / Supabase Adapter, Next.js 15", table_cell_style),
        ],
    ]
    t_meta = Table(meta_data, colWidths=[150, 380])
    t_meta.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), navy),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("BOX", (0, 0), (-1, -1), 1, border_color),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, slate_light]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(t_meta)
    story.append(Spacer(1, 14))

    # Section 1: The Three Improvements Delivered
    story.append(Paragraph("1. The Three Improvements Delivered (Round 2 Commitments)", h1_style))
    story.append(
        Paragraph(
            "In <code>docs/ROUND2_SUBMISSION.md</code> and <code>docs/ROUND3.md</code>, Proofline explicitly named three substantial improvements. All three have been fully built, verified, and integrated into both the backend API and frontend UI:",
            body_style,
        )
    )

    story.append(Paragraph("Improvement 1: Evidence Lifecycle — Automatic Re-Review Queue", h2_style))
    story.append(Paragraph("• <b>Baseline in Round 2:</b> Managers saw an ephemeral preview of affected documents; manual inspection was required.", bullet_style))
    story.append(Paragraph("• <b>Delivered in Round 3:</b> Persistent <code>reReviewQueue</code> state with automatic cascade analysis. Retiring an active source, editing a confirmed rule, or detecting expired sources automatically crawls downstream dependencies, flags affected documents, and queues assigned reviewer tasks.", bullet_style))
    story.append(Paragraph("• <b>Auditor Resolution Workflow:</b> Dedicated API endpoints (<code>/api/re-review-queue</code> and <code>/api/re-review-queue/{tid}/resolve</code>) require an explicit justification note before clearing tasks.", bullet_style))
    story.append(Paragraph("• <b>UI Integration:</b> Dedicated interactive Re-Review Queue tab in the Approval Center with status badges, assignee labels, and inline resolution drawers.", bullet_style))
    story.append(Paragraph("• <b>Verification Proof:</b> Verified in <code>tests/test_round3_improvements.py::test_re_review_queue_lifecycle</code>.", bullet_style))

    story.append(Paragraph("Improvement 2: Measured Detection Quality for AI Review (30-Item Benchmark)", h2_style))
    story.append(Paragraph("• <b>Baseline in Round 2:</b> Deterministic rules were tested, but no frozen evaluation benchmark or published accuracy metrics existed.", bullet_style))
    story.append(Paragraph("• <b>Delivered in Round 3:</b> Frozen 30-case evaluation benchmark (<code>BENCHMARK_CASES</code>) covering tone superlatives, unsupported SLA/price claims, prompt injections, expired certificates, ambiguous claims, channel scopes, and true negatives.", bullet_style))
    story.append(Paragraph("• <b>Measured Metrics:</b> 100% Accuracy (30/30), 1.000 Precision, 1.000 Recall, 0.00% False Positive Rate, 0.00% False Negative Rate, 100% Quote Validity, and sub-millisecond per-case latency breakdown.", bullet_style))
    story.append(Paragraph("• <b>UI Integration:</b> Interactive Adversarial Lab tab enabling live benchmark execution, confusion matrix visualization, and real-time adversarial text testing.", bullet_style))
    story.append(Paragraph("• <b>Verification Proof:</b> Verified in <code>tests/test_round3_improvements.py::test_measured_detection_quality_30_case_benchmark</code>.", bullet_style))

    story.append(Paragraph("Improvement 3: Multi-Reviewer Approval Policy, Quorum & Revocation", h2_style))
    story.append(Paragraph("• <b>Baseline in Round 2:</b> Single reviewer approval; no dual quorum for sensitive copy, and no explicit revocation.", bullet_style))
    story.append(Paragraph("• <b>Delivered in Round 3:</b> Channel-driven quorum enforcement (public press releases and high-risk documents mandate 2 distinct reviewer signatures). Duplicate reviewer approvals and author self-approval are blocked (403/409).", bullet_style))
    story.append(Paragraph("• <b>Explicit Revocation:</b> <code>POST /api/documents/{did}/revoke</code> allows reviewers to revoke an approved release with mandatory justification logging, instantly blocking release export.", bullet_style))
    story.append(Paragraph("• <b>UI Integration:</b> Live Quorum status badges (1 of 2 Verified Signatures) and inline Revoke Approval workflows with justification prompts in the Approval Center.", bullet_style))
    story.append(Paragraph("• <b>Verification Proof:</b> Verified in <code>tests/test_round3_improvements.py::test_multi_reviewer_quorum_enforcement</code>.", bullet_style))

    story.append(Spacer(1, 10))

    # Section 2: Complete List of Features
    story.append(Paragraph("2. Complete Inventory of Features and User Journeys", h1_style))
    feature_table_data = [
        [Paragraph("<b>Governance Module</b>", table_header_style), Paragraph("<b>Key Implemented Capabilities</b>", table_header_style)],
        [
            Paragraph("<b>Content Library & Creator</b>", table_cell_style),
            Paragraph("Multi-format ingestion (.txt, .md, .pdf ≤5 pages, .docx, .csv), SSRF-protected URL ingestion, 7 deterministic rule classes, explicit evidence state badges (SUPPORTED, CONTRADICTED, OUTDATED_SOURCE, INSUFFICIENT_EVIDENCE).", table_cell_style),
        ],
        [
            Paragraph("<b>Policy Studio</b>", table_cell_style),
            Paragraph("Lifecycle rule management, quote-verified activation, Natural Language Policy Builder (/api/policies/build-nl), and isolated deterministic policy sandbox (/api/rules/sandbox).", table_cell_style),
        ],
        [
            Paragraph("<b>Human Approval Center</b>", table_cell_style),
            Paragraph("Separation of duties (author self-approval blocked with 403), dual-reviewer quorum on high-risk copy, automatic re-review queue for expired/modified evidence, and explicit approval revocation.", table_cell_style),
        ],
        [
            Paragraph("<b>Correction Workspace</b>", table_cell_style),
            Paragraph("Interactive diff suggestions with number-preservation checks, evidence-backed compliant rewrites, and author contest rebuttal workflows.", table_cell_style),
        ],
        [
            Paragraph("<b>Adversarial Lab</b>", table_cell_style),
            Paragraph("Frozen 30-item evaluation benchmark, confusion matrix metrics (precision, recall, FPR, FNR), latency breakdown, and live adversarial prompt injection testing.", table_cell_style),
        ],
        [
            Paragraph("<b>Audit Explorer & Cryptography</b>", table_cell_style),
            Paragraph("Ed25519 digitally signed release receipts, single-character tamper detection, hash-chained audit ledger (SHA256(prev + current)), and full CSV/JSON ledger exports.", table_cell_style),
        ],
    ]
    t_feat = Table(feature_table_data, colWidths=[150, 380])
    t_feat.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), navy),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("BOX", (0, 0), (-1, -1), 1, border_color),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, slate_light]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(t_feat)

    story.append(PageBreak())

    # Section 3: Technical Architecture & Invariants
    story.append(Paragraph("3. Technical Architecture and Cryptographic Invariants", h1_style))
    story.append(
        Paragraph(
            "Proofline operates on a zero-trust, evidence-grounded architecture where compliance is verified deterministically by code rather than hallucinated by generative models.",
            body_style,
        )
    )

    story.append(Paragraph("Core Cryptographic Invariant:", h2_style))
    story.append(
        Paragraph(
            "Every release receipt is bound to an asymmetric Ed25519 digital signature over a canonical sorted SHA-256 fingerprint:<br/>"
            "<code>Digest = SHA256(CanonicalJSON({ 'context': doc.context, 'text': doc.text, 'visualCheckIds': doc.visualCheckIds }))</code><br/>"
            "If any single character of document text, declared distribution channel, target audience, or linked visual asset changes after approval, candidate fingerprint computation fails with <b>CONTENT_INTEGRITY_COMPROMISED</b>, blocking release export with HTTP 409 Conflict.",
            code_style,
        )
    )

    story.append(Paragraph("Separation of Duties & Quorum Invariants:", h2_style))
    story.append(Paragraph("• <b>Author Self-Approval Block:</b> <code>creator(doc) != approver(doc)</code>. Enforced on server-side mutate transactions.", bullet_style))
    story.append(Paragraph("• <b>Dual Quorum Invariant:</b> High-risk channels mandate <code>|approvers| >= 2</code> with unique reviewer identities.", bullet_style))
    story.append(Paragraph("• <b>Fail-Closed Evidence:</b> Active rules quoting retired or expired sources automatically add high-severity source findings to documents, blocking release readiness.", bullet_style))

    story.append(Spacer(1, 10))

    # Section 4: Testing Details
    story.append(Paragraph("4. Testing Details & Quality Assurance", h1_style))
    story.append(
        Paragraph(
            "Proofline's test suite achieves 100% clean automated execution across 100 distinct unit, integration, and security tests:",
            body_style,
        )
    )

    test_table_data = [
        [Paragraph("<b>Test Suite File</b>", table_header_style), Paragraph("<b>Tests</b>", table_header_style), Paragraph("<b>Key Capabilities Verified</b>", table_header_style)],
        [
            Paragraph("tests/test_core.py", table_cell_style),
            Paragraph("36 passed", table_cell_style),
            Paragraph("Separation of duties, happy journey, source staging, rule deactivation on quote loss, visual asset 8×8 hash matching, WCAG contrast formula, terminology boundaries.", table_cell_style),
        ],
        [
            Paragraph("tests/test_upgrades.py", table_cell_style),
            Paragraph("51 passed", table_cell_style),
            Paragraph("Decimal percentages, guarantee synonyms, prompt injection immunity, bearer token authentication, Supabase CAS RPC, SQLite WAL pragmas, rate limiting.", table_cell_style),
        ],
        [
            Paragraph("tests/test_proofline2.py", table_cell_style),
            Paragraph("9 passed", table_cell_style),
            Paragraph("Ed25519 passport signatures, risk intelligence matrix, impact cascade, adversarial benchmark runner, hash-chain audit ledger, SSRF protection, NL policy builder.", table_cell_style),
        ],
        [
            Paragraph("tests/test_round3_improvements.py", table_cell_style),
            Paragraph("4 passed", table_cell_style),
            Paragraph("Improvement 1 (re-review queue lifecycle), Improvement 2 (frozen 30-case benchmark metrics), Improvement 3 (dual-reviewer quorum & revocation), single-char tamper detection.", table_cell_style),
        ],
        [
            Paragraph("<b>TOTAL</b>", table_cell_style),
            Paragraph("<b>100 passed</b>", table_cell_style),
            Paragraph("<b>Execution Time: 21.68s</b> (Python 3.13 / pytest 9.1.1)", table_cell_style),
        ],
    ]
    t_test = Table(test_table_data, colWidths=[150, 70, 310])
    t_test.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), navy),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("BOX", (0, 0), (-1, -1), 1, border_color),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, slate_light]),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(t_test)

    story.append(Spacer(1, 10))

    # Section 5: Statement of What is Left Undone (Intellectual Honesty)
    story.append(Paragraph("5. Statement of What is Left Undone (Intellectual Honesty)", h1_style))
    story.append(
        Paragraph(
            "To uphold rigorous intellectual honesty and transparency for Round 3 judging:",
            body_style,
        )
    )
    story.append(Paragraph("1. <b>Live External LLM API Provider:</b> Contextual AI review, prompt injection filtering, and NL policy builders are implemented and tested with mocks. Live OpenAI API execution requires a user-provided <code>OPENAI_API_KEY</code>. Without a key, Proofline fails safely and transparently without generating fabricated AI results.", bullet_style))
    story.append(Paragraph("2. <b>Enterprise SAML 2.0 / SSO:</b> Multi-role PBKDF2 authentication with workspace isolation is fully operational. SAML / Okta directory synchronization is architected for Phase 1 of the enterprise roadmap.", bullet_style))
    story.append(Paragraph("3. <b>Distributed Background Tasks (Celery/Redis):</b> Re-review queue generation currently executes synchronously during atomic state mutations. Enterprise-scale asynchronous worker queues are planned for Phase 2.", bullet_style))

    story.append(Spacer(1, 10))

    # Section 6: Product Roadmap
    story.append(Paragraph("6. Product Roadmap and Future Development Plan", h1_style))
    story.append(Paragraph("• <b>Phase 1 (Months 1–3): Enterprise Readiness:</b> SAML 2.0 / Okta SCIM directory sync, continuous regulatory RSS feed ingestion (FDA, SEC, EU AI Act), and Git-style campaign document branching.", bullet_style))
    story.append(Paragraph("• <b>Phase 2 (Months 4–6): Autonomous Compliance Scaling:</b> Multi-tenant vector RAG (hybrid BM25 + pgvector) for >100k page corpora, Google Docs/Figma compliance linting sidecar, and AWS CloudHSM signing.", bullet_style))
    story.append(Paragraph("• <b>Phase 3 (Months 7–12): Continuous Assurance:</b> SOC-2 Type II continuous evidence attestations and full-page computer vision for multi-modal brochure layout and typography compliance.", bullet_style))

    doc.build(story)
    print(f"[SUCCESS] Generated official submission PDF at: {output_path}")

if __name__ == "__main__":
    generate_pdf("docs/Proofline_2.0_Final_Product_Submission.pdf")

