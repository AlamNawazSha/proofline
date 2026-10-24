# Supabase setup

**Status: written, not integration-verified (as of 24 October 2026).**

## Project configuration
| Field | Value |
|---|---|
| Project | `<your-project-ref>` (unverified in shipped repository) |
| Region | Configurable |
| Migration | `supabase/001_proofline.sql` provided |
| Objects defined | `proofline_workspaces`, `proofline_members`, RLS policies, `proofline_cas_state()` RPC, private bucket `proofline-private` |
| Auth policy required | `mailer_autoconfirm` enabled if no SMTP server is configured |
| Credentials | stored server-side in `.env` (git-ignored). Never exposed to the browser and never committed. |

## Verification status
| Check | Status | Evidence |
|---|---|---|
| Storage operations (mocked) | Verified in unit test | `tests/test_upgrades.py::test_supabase_storage_operations_mocked` |
| CAS state RPC mutation (mocked) | Verified in unit test | `tests/test_upgrades.py::test_supabase_cas_rpc_mutation` |
| Fail-closed on missing keys | Verified in unit test | `tests/test_core.py::test_supabase_does_not_fallback` |
| Live hosted sign-in & session | Written, not integration-verified | Shipped `.env` leaves Supabase credentials empty; `/api/health` reports `supabaseConfigured: false` |
| Live RLS policy enforcement | Written, not integration-verified | Requires live Supabase instance |
| Live private bucket storage upload | Written, not integration-verified | Requires live Supabase instance |
| Two-user approval separation | Verified locally | `Accounts` SQLite store + demo personas verified; hosted Supabase integration unverified |

## Configuration reference
Server environment (`.env`, or the host's panel in production):

```
APP_ENV=production
SESSION_SECRET=<random 32+ chars>
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service key, server only>
SUPABASE_STORAGE_BUCKET=proofline-private
OPENAI_API_KEY=<optional>
```

Never prefix secrets with `NEXT_PUBLIC_`. The API refuses to start in production without `SESSION_SECRET`.

## Still outstanding
- **Storage path** (`/api/extract` upload) is exercised locally; a live upload into the private bucket has not been verified since connecting. Run one PDF upload and confirm the object appears under `proofline-private/<workspace-id>/`.
- **RLS spot check**: querying `proofline_workspaces` with the anon key must return nothing or only permitted rows.
- Provider backups/retention are Supabase defaults; do not claim stronger deletion guarantees.

## Local accounts (no Supabase needed)
When Supabase is absent, the **Local dev account** tab creates PBKDF2-hashed accounts in `accounts.sqlite3` on the server. Use this for offline demos. It is labelled as not hosted in the UI and must not be presented as production authentication.
