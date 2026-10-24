# Proofline — feature status (truthful, per feature)

Legend: **✅ built + tested locally** · **◐ built, live integration unverified** · **○ not built** · **R3 planned improvement**

Status date: 24 October 2026. Test evidence: `tests/` (87 passing). No feature below is described as deployed, human-validated or production-certified.

## A. Approved brand knowledge

| Feature | Status | Evidence / notes |
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
| Approved wording library | ✅ | editor "insert source-bound wording" only lists active rules with a live quote in an active source |

## B. Submission & tracking

| Feature | Status | Notes |
|---|---|---|
| Paste text / import selectable PDF / TXT / MD | ✅ | `test_pdf_and_text_extraction_private` |
| Reject scans, unsupported types, oversize, >5 pages | ✅ | `test_scanned_empty_pdf_rejected`, `test_pdf_page_limit` |
| 3,000-word guard with no silent truncation | ✅ | `test_word_limit` |
| Declared context: channel, audience, purpose | ✅ | context participates in rules and in the approval fingerprint |
| Private per-workspace file access + delete original | ✅ | cross-workspace 404 test; derived text deletion is separate and disclosed |

## C. Review engine

| Feature | Status | Notes |
|---|---|---|
| Deterministic rule execution, findings created only when run | ✅ | initial draft has zero findings until the worker runs |
| Evidence gaps are not "false" claims | ✅ | findings show no-evidence state with explicit wording |
| Privacy preflight (credential-like strings, emails) | ✅ | high-severity finding; blocks external AI; cannot be waived as a clean pass |
| Coverage separated from approval; partial is honest | ✅ | rules-only review reports partial, requires explicit human coverage |
| Processing status (queued/reviewing/partial/failed/superseded) vs document status | ✅ | job state + separate document status |
| Review invalidated if content or sources change mid-run | ✅ | job `superseded` + failed review |
| Optional contextual AI (consent, bounded, structured, validated) | ◐ | code path complete; no key available → returns explicit "not configured", never fabricated |
| Source-quote validation of AI output | ◐ | exact-substring checks against supplied sources |
| Honest AI failure with retry | ◐ | one retry then partial; no fake results |

## D. Creator control

| Feature | Status | Notes |
|---|---|---|
| Accept/rewrite suggestions through a preview | ✅ | suggestion applies only after explicit confirmation; server recomputes |
| Suggestion regression checks (numbers, qualifiers, remaining findings) | ✅ | `test_suggestion_preview_changes_nothing` |
| Contest findings with comment | ✅ | contest marks finding contested and records the comment |
| Finding-resolution feedback (creator + reviewer) | ✅ | reasons required; feeds Rule Clarity counts |
| Reviewer-only false-positive dismissal with safeguards | ✅ | `test_missing_evidence_cannot_be_dismissed`: no-evidence/privacy/expired/source findings cannot be waived |
| Comments and revision history | ✅ | `test_comments_do_not_change_content_revision` |

## E. Approval integrity

| Feature | Status | Notes |
|---|---|---|
| Creator cannot approve own content | ✅ | `test_creator_cannot_approve`, `test_manager_cannot_self_approve` |
| Approve one exact revision + source version + fingerprint | ✅ | decision record |
| Content/context edit revokes approval and export | ✅ | `test_content_edit_revokes_export`, `test_context_change_revokes_export` |
| Source-pack update revokes old approvals | ✅ | `test_source_update_revokes_export` |
| Concurrent edits cannot silently overwrite | ✅ | `test_stale_save_is_conflict` (per-document + workspace CAS) |
| Campaign bundle requires every item currently eligible | ✅ | blocked + success tests |
| Receipts (JSON / TXT / PDF report) with honest wording | ✅ | explicitly "not a digital signature" |

## F. Visual & accessibility (bounded)

| Feature | Status | Notes |
|---|---|---|
| Approved asset library (manager), private storage | ✅ | image validation, 16 MP cap |
| Logo candidate via normalized average hash + aspect distortion | ✅ | only an exact normalized-hash match is called "candidate"; collisions disclosed |
| Manual verification against a named approved asset | ✅ | reviewer/manager only, reason required, source-version bound |
| Declared foreground/background contrast (4.5:1 or 3:1) | ✅ | WCAG formula test (21:1, 1:1) |
| Alt-text presence by declared image purpose | ✅ | informative/functional require text; decorative requires empty |
| Linked visual check participates in release eligibility | ✅ | stale visual check blocks export |
| OCR / arbitrary layout / semantic logo understanding | ○ | deliberately out of scope; stated in UI |

## G. Governance insights

| Feature | Status | Notes |
|---|---|---|
| Rule Clarity Report from actual findings and contests | ✅ | computed at render from stored findings; no synthetic percentages |
| Contract/claim consistency advisories | ✅ | configured fact groups + same-context numeric differences only |
| Rule-testing sandbox (no activation) | ✅ | `test_rule_sandbox_does_not_activate` |
| Rule-change document impact preview | ✅ | before/after finding counts, flags documents whose approval would need review |
| Finding-resolution feedback list | ✅ | stored with actor and reason |

## H. Platform, privacy, operations

| Feature | Status | Notes |
|---|---|---|
| Real accounts, membership roles, Supabase RLS | ◐ | SQL + code written; Supabase connector not connected; not integration-tested |
| Private Storage bucket and per-workspace file isolation | ◐ | signed/key-based server access; unverified live |
| Service key never in browser; no fallback to local DB | ✅ (code) / ◐ (live) | fail-closed `503` test |
| Delete draft + derived review data | ✅ | minimal receipt metadata retained, disclosed |
| Rate limiting, security headers, no-store | ✅ | in-process limiter (single instance) |
| Isolated per-visitor demo | ✅ | separate workspace/session; no cross-workspace access |
| Durable public deployment | ○ | preview only; requires deployment accounts |
| Repository publishing / git history | ○ | to be created with the team's authorised account |

## I. Three substantial Round 3 improvements (must remain genuinely unfinished)

1. **Evidence lifecycle: automatic re-review queue** — a persistent re-review queue across all documents when an approved source or rule changes, expires, or conflicts, creating per-document tasks, assignees, creator notifications, and tracking until closed. (Round 2 today only previews impact and invalidates approvals on edit/source change; re-opening documents is manual.)
2. **Measured detection quality for AI-assisted review** — a frozen 30-item evaluation benchmark (tone, unsupported claims, terminology, valid claims that must not be flagged, ambiguous text, conflicting sources, malformed model responses) with two independent annotators, reporting published precision, recall, false-positive rate, quote validity, latency, and failure rate, broken down between deterministic rules and AI findings. (Round 2 today has never run AI against a live provider; detection quality is unmeasured.)
3. **Multi-reviewer approval policy** — channel- and severity-driven quorum (e.g., high-risk copy requires two distinct authorised reviewers), explicit approval revocation with reason logging, escalation after unanswered deadlines, and time-bounded exception policies. (Round 2 today enforces exactly one authorised non-self reviewer per revision.)

Visual and accessibility basics (contrast checks, alt-text presence, and bounded logo hash comparison) were brought forward into Round 2, leaving the three improvements above strictly unbuilt.

---

# Upgrade pass — 22 October 2026 (verified against code)

Legend unchanged: ✅ built + tested · ◐ built, live integration unverified · ○ not built.

| Upgrade | Status | Evidence |
|---|---|---|
| Guarantee / hype / superlative rules (RULE-005–007) with exact source quotes | ✅ | `test_hype_guarantee_and_superlative_rules_fire` |
| Decimal-safe sentence windows (`99.9%` no longer split) | ✅ | `test_decimal_percentage_is_not_split` |
| Percentage detection incl. "per cent"; claim rules keyword-gated | ✅ | `test_per_cent_is_a_percentage`, `test_unrelated_percentage_does_not_claim_savings` |
| Flexible matching: double spaces, hyphens, underscores | ✅ | parametrised `test_hyphen_space_and_underscore_variants_match` |
| Per-finding naming (privacy label no longer reused for claim gaps) | ✅ | `test_privacy_label_is_not_reused_for_claims` |
| Rule edit / deactivate / delete; active rules deactivate on edit | ✅ | `test_editing_active_rule_deactivates_and_versions`, `test_deactivate_blocks_export_and_delete_requires_inactive` |
| Source retirement with orphaned-rule reporting | ✅ | `test_retiring_source_orphans_its_rules` |
| Structured error contract `{detail, code, action}` | ✅ | `test_blocked_export_returns_machine_readable_code`, `test_stale_save_returns_conflict_code` |
| Repeat approval of the same exact version rejected | ✅ | `test_second_approval_with_stale_revision_is_rejected` |
| Review coverage record (rules executed, triggered, not-checked) | ✅ | `test_review_coverage_is_reported` |
| AI response validation: valid, invented quote, malformed, credential block | ◐ (mocked only) | `test_ai_*` — no live provider call |
| Per-session rate limiting (was per IP) | ✅ | `test_rate_limit_is_per_session` |
| 24-hour demo expiry | ✅ | `test_purge_removes_only_old_demos` |
| Visual link staleness after asset change blocks export | ✅ | `test_visual_link_becomes_stale_after_asset_change` |
| Persistent six-step judge guide with persona prompt | ✅ (compiles) | `StepBar` in `frontend/app/page.tsx`; not browser-verified |
| Plain-language error hints in the UI | ✅ (compiles) | `ACTION_HINT` map; not browser-verified |
| Lost demo session auto-recovers | ✅ (compiles) | `recover()` on `401`; not browser-verified |
| Sample content loaders + "what was checked" panel + Rewrite action | ✅ (compiles) | editor and new-content form; not browser-verified |
| Rule/source management UI incl. impact preview before activation | ✅ (compiles) | Sources screen; not browser-verified |
| Own-UI accessibility: text ≥4.5:1, minimum 12px | ✅ measured | `docs/REVIEW_RESPONSE.md` §4 — zero failures remaining |
