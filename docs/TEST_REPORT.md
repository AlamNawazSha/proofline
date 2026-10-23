# Test report

| Field | Value |
|---|---|
| Date | 2026-10-22 10:12 UTC |
| Commit | `31539c2` (upgrade commit) |
| Python | 3.13.16 |
| Command | `python -m pytest tests -q` |
| Result | **62 passed, 7 warnings in 20.57s** |
| Frontend checks | `npx tsc --noEmit` pass · `npm run build` pass |
| Environment | Local sandbox. SQLite demo store. No Supabase project, no OpenAI key. |

## What this proves / does not prove

**Proves:** deterministic behaviour of the review engine, approval and export gating, role and workspace isolation, input limits, error contracts, AI response validation (with a mocked HTTP layer), and demo cleanup — all against the real backend routes.

**Does not prove:** live Supabase authentication/RLS/storage, live OpenAI behaviour (mocked only), browser rendering, or the deployed environment. Supabase is written but unexecuted; the AI path is unexercised against the provider.

## Tests (62)

- `test_initial_findings_are_executed_not_seeded`
- `test_happy_journey_and_receipt`
- `test_creator_cannot_approve`
- `test_manager_cannot_self_approve`
- `test_partial_requires_human_semantics`
- `test_content_edit_revokes_export`
- `test_source_update_revokes_export`
- `test_context_change_revokes_export`
- `test_stale_save_is_conflict`
- `test_wrong_role_cannot_publish_sources`
- `test_missing_evidence_cannot_be_dismissed`
- `test_suggestion_preview_changes_nothing`
- `test_comments_do_not_change_content_revision`
- `test_cross_workspace_documents_denied`
- `test_unsigned_requests_denied`
- `test_api_consent_required`
- `test_no_key_returns_no_fake_ai`
- `test_false_quote_cannot_activate`
- `test_source_stages_before_confirmation`
- `test_rule_sandbox_does_not_activate`
- `test_pdf_and_text_extraction_private`
- `test_scanned_empty_pdf_rejected`
- `test_pdf_page_limit`
- `test_assets_visual_manual_check_and_link`
- `test_visual_failures_do_not_become_passes`
- `test_campaign_blocks_unapproved_documents`
- `test_campaign_current_version_manifest`
- `test_delete_derived_content`
- `test_word_limit`
- `test_contrast_formula`
- `test_hash_covers_context_and_linked_visuals`
- `test_terminology_boundaries_and_variants`
- `test_section_and_channel_scopes`
- `test_source_quote_loss_blocks_rule`
- `test_conflicting_fact_values_surface`
- `test_supabase_does_not_fallback`
- `test_decimal_percentage_is_not_split`
- `test_privacy_label_is_not_reused_for_claims`
- `test_hyphen_space_and_underscore_variants_match[Our cheap-plan costs less.]`
- `test_hyphen_space_and_underscore_variants_match[Our Cheap  plan costs less.]`
- `test_hyphen_space_and_underscore_variants_match[our cheap_plan costs less]`
- `test_per_cent_is_a_percentage`
- `test_hype_guarantee_and_superlative_rules_fire`
- `test_unrelated_percentage_does_not_claim_savings`
- `test_clean_copy_stays_clean`
- `test_blocked_export_returns_machine_readable_code`
- `test_stale_save_returns_conflict_code`
- `test_wrong_role_and_foreign_ids_have_codes`
- `test_approval_blocked_before_submission`
- `test_second_approval_with_stale_revision_is_rejected`
- `test_editing_active_rule_deactivates_and_versions`
- `test_deactivated_rule_needs_quote_to_return`
- `test_deactivate_blocks_export_and_delete_requires_inactive`
- `test_retiring_source_orphans_its_rules`
- `test_ai_valid_finding_is_labelled_and_quoted`
- `test_ai_invented_quote_is_rejected`
- `test_ai_malformed_response_is_partial_not_fake`
- `test_ai_blocked_when_credentials_present`
- `test_review_coverage_is_reported`
- `test_purge_removes_only_old_demos`
- `test_rate_limit_is_per_session`
- `test_visual_link_becomes_stale_after_asset_change`

## Manual checks performed

- Full journey against the running server through the Next.js proxy (`/api` rewrite): demo → review → correction → approval → export → edit → blocked export.
- Live probe of the new rules: problematic sample returns 6 findings; `99.9%` returns a single `Unapproved numerical claim`; rule lifecycle and source retirement return the documented codes.
- CSS contrast and font-size audit re-run after the accessibility pass (see `docs/REVIEW_RESPONSE.md` §4).

## Not performed (and not claimed)

- Browser/screenshot QA: this sandbox lacks the system libraries Playwright needs (`libnspr4`), so no screenshots are included.
- Load tests, cold-start tests, unaided user testing, live AI evaluation.
