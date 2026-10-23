# Proofline — Round 2 working build

**Theme:** check content against *approved, confirmed* organisational knowledge; explain every issue; let the creator decide; require a different authorised human to approve one exact version; refuse export when content or sources have changed.

Team: **syedsuhailahamed.m26** · FutureStack 2026 Round 2 · Product: Proofline

---

## 1. What is running

| Piece | Path | State |
|---|---|---|
| Web app — Next.js 15, React 19, TypeScript, hand-written CSS | `frontend/` | builds; dev server on port 3000 |
| API — FastAPI | `backend/` | running on port 8000 |
| Isolated demo store — SQLite, one workspace per session | `demo.sqlite3` | working, 24-hour expiry |
| Supabase schema, RLS, CAS RPC, private bucket | `supabase/001_proofline.sql` | **applied** to project `GEM-SENTINAL` |
| Supabase Auth + Postgres workspace store | `backend/store.py::Supabase` | **connected**, two real accounts verified |
| Optional contextual AI | `backend/main.py::interpret_ai` | **written, never run live** — no key |
| Local dev accounts | `backend/store.py::Accounts` | working offline |
| Automated tests | `tests/` | **65 passed** |

The preview is a **development demo**: real backend checks, real persistence, synthetic brand data, labelled as such in the UI. It is not the judging deployment.

## 2. Accounts and sign-in

| Path | Backend | Status |
|---|---|---|
| **Create account / Sign in** (hosted) | Supabase Auth, `GEM-SENTINAL` project | **connected and verified** with two real accounts |
| **Local dev account** | PBKDF2 hashes in `accounts.sqlite3` | works with no network; labelled *not hosted* in the UI |
| **Explore the working demo** | isolated SQLite workspace, synthetic data | no signup, one workspace per visitor |

Sign-up is instant because email auto-confirm is enabled on the project (no SMTP is configured, so confirmation mail could never arrive). Every new workspace starts with a clearly labelled **EXAMPLE source** and one flawed draft so the journey is testable immediately — replace them with your own approved guidance before real use.

Multi-user verification (both real accounts, no persona switching):

```
Account A signs up → manager of workspace W
Account B signs up → manager of workspace V
A adds B's user UUID as "reviewer" in Connections & settings
B signs in → switches workspace → approves A's document
A exports (200 + receipt) → A edits → export becomes 409 APPROVAL_OUTDATED
```

Two people cannot share one login for approval: the server compares the reviewer id with the document creator id and rejects self-approval.

## 3. Run it

```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000   # terminal 1
cd frontend && npm install && npm run dev                        # terminal 2
```

Open `http://localhost:3000` → **Explore the working demo**. Tests: `python -m pytest tests -q`.

## 4. Judge journey (≈2 minutes, guided on screen)

A six-step bar stays visible and names the next action, including "switch the persona to Reviewer".

1. Demo opens with a seeded source pack, seven rules and one flawed draft.
2. **Run review** → real findings (terminology, savings claim, missing qualification, prohibited guarantee wording, internal codename).
3. **Inspect fix** → before/after, number changes, removed qualifiers, remaining findings. Apply → new revision → automatic recheck.
4. Clean the copy → review → no findings, coverage reported as *partial* with an explicit not-checked list.
5. **Request approval** → persona **Reviewer** → tick human coverage → **Approve exact version**.
6. Export PDF/text/JSON → edit the content → export is blocked and the document reads *Approval outdated*.
7. Manager persona: source confirmation and retirement, rule draft/edit/deactivate/delete with impact preview, rule laboratory, visual checks, campaign bundles, governance insights.

## 5. Feature status

Full evidence per feature: [`FEATURES_STATUS.md`](FEATURES_STATUS.md). Reviews and rejected suggestions: [`docs/REVIEW_RESPONSE.md`](docs/REVIEW_RESPONSE.md).

**Working and tested:** source staging/confirmation/retirement and versioning · seven rule types (terminology, prohibited, tone, internal-only, required wording, claim conditions, expiry) · flexible matching (spacing, hyphens, "per cent", decimals) · exact-quote evidence binding and orphan detection · privacy preflight · revisions, comments, contests, resolution feedback · creator-only editing · non-self approval with fingerprint, revision and source-version binding · stale-approval and source-change invalidation at the API, not the button · campaign bundles · visual candidates, declared contrast, alt presence, manual verification · rule sandbox and impact preview · rule-clarity counts · 24-hour demo expiry · per-session rate limiting.

**Written, not integration-verified:** Supabase auth/RLS/storage · OpenAI contextual review.

**Deliberately not claimed:** OCR, PDF layout fidelity, semantic logo understanding, legal compliance, signed/immutable audit history, complete accessibility audit, multi-reviewer quorum.

## 6. Architecture and key decisions

```
Browser → Next.js (UI, /api rewrite) → FastAPI (authority) → workspace store
                                                              ├── SQLite (isolated demo)
                                                              └── Supabase (real workspaces, fail-closed)
```

- **The server is the authority.** `engine.readiness()` decides approval and export eligibility; the UI only displays it. Direct API calls with stale content are rejected (`tests/test_upgrades.py`).
- **Rules stay authoritative over AI.** AI findings are labelled and validated; they can never approve, waive or override a deterministic failure.
- **Fail closed.** Missing/unreachable Supabase → `503`, never a silent local fallback. No AI key → review is `partial`, never padded with invented findings.
- **Exact-version approval.** SHA-256 over text + context + linked visual checks, compared at export time. It identifies *what* was approved; it is not a signature.
- **Concurrency:** per-document `expectedRevision` plus workspace compare-and-swap (`BEGIN IMMEDIATE` in SQLite, `proofline_cas_state` RPC in Postgres).
- **Errors are contracts:** `{detail, code, action}` so the UI can explain *and* suggest the fix.

## 7. Security and privacy

Signed `HttpOnly` session cookie (1 h, `SameSite=Lax`, `Secure` in production) · role checks on every mutation · workspace scoping on every document/file lookup (404 across tenants) · service-role key server-side only, `.env` ignored · request limiting per session · `no-store` on API responses · upload limits (PDF ≤5 pages/5 MB selectable text, text ≤3,000 words, images ≤5 MB/16 MP, validated by content) · AI needs explicit per-review consent, sends at most five approved passages, and is blocked when a credential pattern is detected · demo personas are labelled simulations and never prove real authentication.

Not claimed: provider-side retention or backups, regional guarantees, penetration testing.

## 8. Deployment

- Frontend: Vercel, root `frontend/`, `API_INTERNAL_URL=https://<api-host>`.
- API: Render, `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`, single worker (in-process review worker, limiter and demo store), `APP_ENV=production`, `SESSION_SECRET`, Supabase keys, optional `OPENAI_API_KEY`.
- Database: Supabase + `supabase/001_proofline.sql`, private bucket `proofline-private`.
- Judging must use the isolated demo; real workspaces stay behind Supabase Auth.

Checklists: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) · [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md)

## 9. Testing and reliability

`python -m pytest tests -q` → **62 passed**. 36 original tests plus 26 upgrade tests covering checker correctness (decimals, hyphens, per-cent, hype, keyword gating), structured error codes, rule/source lifecycle, repeat approvals, mocked AI validation (valid, invented quote, malformed, credential block), coverage reporting, demo purge, session rate limiting and visual-link staleness.

Frontend: `npx tsc --noEmit` and `npm run build` pass. `ruff format` applied to Python; Prettier to the app shell. CI workflow at `.github/workflows/ci.yml`.

Details and limits: [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## 10. Changes from Round 1 and Round 3 plans

[`docs/CHANGES_FROM_ROUND1.md`](docs/CHANGES_FROM_ROUND1.md) · [`docs/ROUND3.md`](docs/ROUND3.md) (three measurable improvements with acceptance tests and evaluation denominators).

## 11. Team contributions and AI assistance

| Member | Area |
|---|---|
| Syed Suhail Ahamed M | Backend, review engine, AI adapter, evidence model |
| Alam Nawaz Sha | Authentication, workspace permissions, approval and export gates |
| Yassir Ahmed | Frontend, editor and creator/reviewer UX |
| Vivek Gowda | QA, demo, documentation, bounded visual checks |

Each member must be able to explain the code in their area. **Contributions above are the agreed areas of responsibility; per-person work should be confirmed and recorded as it is performed.**

Parts of the code and documentation were produced with an AI coding assistant and reviewed, tested and corrected by the team; the team owns the result and every claim in the submission.

## 12. Known gaps before submission

1. Supabase auth and workspace persistence verified; **storage upload to the private bucket** and an RLS spot-check are still outstanding.
2. No AI key → contextual review unexercised; no quality metrics.
3. No browser screenshot QA in this sandbox (Playwright needs `libnspr4`).
4. No unaided-user usability data yet.
5. Durable public deployment, repository publishing and the seven submission documents are still outstanding.
