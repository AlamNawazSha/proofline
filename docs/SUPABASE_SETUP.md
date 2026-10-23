# Supabase setup (completed for this project)

**Status: connected and verified on 22 October 2026.**

## Connected project
| Field | Value |
|---|---|
| Project | `GEM-SENTINAL` (`ihfpdsftcgupdweufsql`) |
| Region | `ap-southeast-1` (Singapore) |
| Migration | `proofline_round2_schema` applied through the Supabase connector |
| Objects created | `proofline_workspaces`, `proofline_members`, RLS policies, `proofline_cas_state()` RPC, private bucket `proofline-private` |
| Auth policy change | `mailer_autoconfirm` enabled — **required**, because no SMTP is configured and confirmed-email sign-up could never complete |
| Credentials | stored server-side in `proofline/.env` (git-ignored). Never exposed to the browser and never committed. |

## What was verified end-to-end (real accounts, not simulated)
| Check | Result |
|---|---|
| Create account (Supabase sign-up) | 200, workspace created, role `manager` |
| Workspace persisted in Postgres | revision advanced after each mutation |
| Second account created | distinct user id — genuinely separate identity |
| Manager adds reviewer by user UUID | membership created |
| Creator attempts to approve own document | **403 blocked** |
| Reviewer switches into the creator's workspace | allowed only via membership check |
| Reviewer approves | 200 `approved` |
| Creator exports | 200 with receipt (`revision`, source pack, fingerprint) |
| Creator edits after approval | export **409 `APPROVAL_OUTDATED`**, status *Approval outdated* |

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
