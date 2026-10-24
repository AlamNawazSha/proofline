# Round 2 submission pack — working checklist

Deadline from the invitation: **25 Oct 2026, 10:00 AM IST**. Target submission on 24 Oct evening.
Team: **syedsuhailahamed.m26** · Product: **Proofline**

## The seven required items

| # | Item | Current state |
|---|---|---|
| 1 | Working project link | Preview runs; durable public deployment still required. Must open **without signing in** — the isolated demo satisfies that; Supabase-backed workspaces remain authenticated |
| 2 | Source repository link | Not yet published; local git history to be pushed to the team's account |
| 3 | Updated project PDF | Not yet produced; must describe what is built, not planned |
| 4 | Completed-feature list | `FEATURES_STATUS.md` is the draft; convert to PDF |
| 5 | Technology / implementation details | `README.md` §4–§7 is the draft |
| 6 | Changes from the Round 1 plan | Draft below |
| 7 | Three substantial Round 3 improvements | `docs/ROUND3.md` & `FEATURES_STATUS.md` §I: (1) evidence lifecycle re-review queue, (2) measured AI-assisted detection quality, (3) multi-reviewer approval policy. Visual/accessibility basics brought forward to R2. |

## Changes from the Round 1 plan (draft, edit before publishing)
- Round 1 proposed the governance concept and scope; Round 2 delivers a running reviewer-controlled pipeline: confirmed sources → deterministic checks → creator corrections → non-self approval → exact-version export.
- Added beyond the original plan: structured claim-condition checking, required-wording rules, suggestion regression checks, confidential-information preflight, rule-testing sandbox, rule-change impact preview, campaign bundles, bounded visual checks, and resolution feedback feeding rule clarity.
- Narrowed/deferred honestly: no OCR, no semantic logo understanding, no legal-compliance claims, no immutable audit ledger, no multi-reviewer quorum, no automated cross-document re-review queues.

## Disclosures to include
- AI services: OpenAI chat completions (optional, consent-gated, structured JSON, quote validation). **No AI key was configured during development, so no AI findings were produced or measured.** Rule findings are deterministic local Python.
- Models/libraries: Next.js, React, TypeScript, Tailwind-free hand-written CSS, Lucide icons, FastAPI, pydantic, httpx, pypdf, reportlab, Pillow, itsdangerous, SQLite (demo only), Supabase (pending integration).
- No pre-existing templates or third-party project code reused. No fabricated users, metrics, interviews or test results.
- Human contributions to record truthfully per member (Syed backend+AI, Alam auth+backend/approval, Yassir frontend/editor/review UX, Vivek QA/visuals/demo/docs) — fill in actual work performed as it happens; every member must be able to explain their code.

## Must-do before submitting
1. Deploy frontend + API; verify demo opens in a private/incognito window with no sign-in.
2. Run the seven-item links in incognito; confirm no 404 and no credential prompts.
3. Re-run `python -m pytest tests -q`; record the pass count and date (**87 passed** on 24 Oct 2026).
4. Supabase: complete `docs/SUPABASE_SETUP.md` verification table or explicitly state it is unverified (status: written, not integration-verified).
5. Confirm the officially registered team name before using it on any document.
6. Remove secrets from PDFs, screenshots and repository; confirm `.env` ignored.
7. Record any genuine external user feedback actually received; do not invent it.


---

## Plan-versus-built table (paste into the Round 2 PDF)

| Round 1 requirement | Status | Honest note |
|---|---|---|
| Approved source pack, confirmed by a manager | Built | Tested; uploads are never auto-trusted; retirement supported |
| Text + selectable-text PDF (≤5 pages) | Built | Tested; scans and >5 pages rejected |
| Tone, terminology, messaging checks | Partly | Deterministic keyword/claim rules tested; AI semantic check written but never run live |
| Unsupported claims tied to evidence | Built | Exact-quote binding; missing evidence reported as unsupported, not false |
| Explain, suggest, preserve intent | Built | Accept with regression preview, Rewrite, Contest, resolution feedback |
| Comments, approvals, history, roles | Built in demo | Real Supabase role enforcement unverified; local accounts & demo verified |
| Visual consistency (logo) | Basic | 8×8 average hash + aspect distortion; always needs human confirmation |
| Accessibility | Built (bounded) | Declared colour-pair contrast and alt-text presence only |
| Repeated / disputed rule report | Built | Counts computed from actual findings and feedback |
| Confidential material + AI disclosure | Built in code | Consent gate, credential preflight; live AI unverified |

## AI-assistance disclosure (use verbatim or edit to match reality)

> Parts of the code and documentation were produced with an AI coding assistant and reviewed, tested and corrected by the team. Syed Suhail Ahamed M owns the backend and review engine; Alam Nawaz Sha owns authentication and approval gates; Yassir Ahmed owns the frontend and editor/reviewer UX; Vivek Gowda owns QA, the demo, documentation and bounded visual checks. Design decisions and all submitted claims were confirmed by the team. No third-party project templates were reused.

## Reliability section (real numbers only)

- Backend tests: **87 passed** on 24 Oct 2026, commit recorded in `docs/TEST_REPORT.md`.
- Frontend: TypeScript check and production build pass.
- Live journey verified through the Next.js proxy against the running API.
- **Not measured:** deployed latency, cold-start time, concurrent-session timings, browser rendering. Do not insert figures for these until they are actually run.
