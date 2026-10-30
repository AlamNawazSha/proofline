# Proofline Deployment Guide

This guide details deployment of the Proofline architecture: the Python FastAPI backend on Render and the Next.js frontend on Vercel.

> [!IMPORTANT]
> **Deployment Status**: Written and deploy-ready. In adherence to submission rules, Proofline is not claimed as deployed until live production URLs are configured and validated end-to-end via `scripts/smoke.py`.

---

## 1. Backend Deployment: FastAPI on Render

Render hosts the REST API backend as a persistent Web Service.

### Configuration Settings
- **Service Type**: Web Service
- **Environment**: Python 3.11+
- **Root Directory**: `.` (Repository root)
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  uvicorn backend.main:app --host 0.0.0.0 --port $PORT
  ```
- **Health Check Path**: `/api/health`

### Environment Variables (Render Dashboard — Set in dashboard only)
| Variable | Required | Description | Example / Note |
| :--- | :--- | :--- | :--- |
| `SESSION_SECRET` | **REQUIRED** | 32-byte secret key for signed session cookies and bearer tokens (server crashes with `RuntimeError` if missing when `APP_ENV=production`) | Set in dashboard only (`openssl rand -hex 32`) |
| `APP_ENV` | **REQUIRED** | Set to `production` (enforces `Secure` cookies and requires `SESSION_SECRET`) | Set in dashboard only (`production`) |
| `CORS_ORIGIN` | Optional | Allowed frontend origin for cross-origin credentials | Set in dashboard only (`https://proofline-ruby-three.vercel.app`) |
| `OPENAI_API_KEY` | Optional | Live OpenAI API key for semantic verification (unverified in demo unless provided) | Set in dashboard only (`sk-...`) |
| `OPENAI_BASE_URL` | Optional | Custom OpenAI-compatible base URL (e.g. Gemini or Ollama endpoints) | Set in dashboard only (`https://generativelanguage.googleapis.com/v1beta/openai`) |
| `SUPABASE_URL` | Optional | Supabase project URL for hosted PostgreSQL store | Set in dashboard only (`https://xyz.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service role secret for server-side persistence | Set in dashboard only (`eyJ...`) |

---

## 2. Frontend Deployment: Next.js on Vercel

Vercel hosts the responsive Next.js application, proxying API requests to the Render backend service.

### Configuration Settings
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Environment Variables (Vercel Dashboard — Set in dashboard only)
| Variable | Required | Description | Example / Note |
| :--- | :--- | :--- | :--- |
| `API_INTERNAL_URL` | **REQUIRED** | Public HTTPS URL of the deployed Render backend | Set in dashboard only (`https://proofline-api.onrender.com`) |

*Note: `frontend/next.config.mjs` automatically rewrites all `/api/:path*` traffic to `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000'}/api/:path*`.*

---

## 3. Deployment Verification: End-to-End Smoke Test

Once live URLs are provisioned, run the automated verification script against the live base URL:

```bash
python scripts/smoke.py https://proofline-ruby-three.vercel.app
```

> [!IMPORTANT]
> **Run Smoke Tests over HTTPS Only**: In production mode (`APP_ENV=production`), session cookies are set with `Secure=True`. HTTP clients (including `requests.Session`) will withhold secure cookies when interacting over plain `http://`, resulting in a `401 Unauthorized` failure at Step 1 (`/api/state`). Always supply the `https://` endpoint when testing deployed services.

The script executes the full governance lifecycle against the target URL:
1. `POST /api/demo` — initializes isolated synthetic workspace.
2. `PUT /api/documents/{id}` — saves draft revision with non-compliant claim.
3. `POST /api/documents/{id}/review` — runs deterministic checks; verifies findings surfaced.
4. `POST /api/documents/{id}/suggestion` — retrieves and verifies approved alternative.
5. `PUT /api/documents/{id}` — applies approved revision; verifies clean re-review.
6. `POST /api/documents/{id}/submit` — transitions status to awaiting review.
7. `POST /api/documents/{id}/decision` (as creator) — **asserts 403 Forbidden** (creator cannot self-approve).
8. `POST /api/documents/{id}/decision` (as reviewer) — **asserts 200 OK** (approved by independent peer).
9. `GET /api/documents/{id}/export` — **asserts 200 OK** (receipt generated for exact approved revision).
10. `PUT /api/documents/{id}` — creator edits approved text; revision increments.
11. `GET /api/documents/{id}/export` — **asserts 409 Conflict** (export blocked due to post-approval modification).

The script exits `0` on total success or non-zero (`1`) if any invariant fails.

---

## 4. Operational Notes for Hackathon Judging

### 1. Free-Tier Cold Starts (Render)
Render's free tier spins down idle instances after 15 minutes. Cold starts take approximately 30–50 seconds to initialize the Python container.
- **Pre-judging warm up**: 5–10 minutes before judging evaluation, ping the health endpoint:
  ```bash
  curl -s https://<your-render-url>/api/health
  ```
  or open the live URL in your browser so the container is active and warm.

### 2. Ephemeral Storage & Judge Instructions
- On free-tier cloud hosting (e.g., Render free tier), the local file system is ephemeral. Any accounts created via local SQLite (`accounts.sqlite3`) will reset if the container restarts.
- **Instruct judges to click "Explore the working demo"**: The demo workflow runs in an isolated workspace seeded on demand, guaranteeing a reliable, repeatable 2-minute evaluation journey with zero login barrier.

### 3. Secret Management & Key Rotation
- **Never commit `.env` or include it in zip archives**.
- Inject `OPENAI_API_KEY`, `SESSION_SECRET`, and database secrets exclusively via the Render environment variables dashboard.
- If a populated `.env` was shared or uploaded previously, revoke and rotate the API key immediately in the provider console.
