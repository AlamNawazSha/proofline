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

### Environment Variables
| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `SESSION_SECRET` | Recommended | Secret key for signed session cookies and bearer tokens | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Recommended | Allowed frontend origin for cross-origin credentials | `https://proofline.vercel.app` |
| `OPENAI_API_KEY` | Optional | Live OpenAI API key for semantic verification (unverified in demo) | `sk-...` |
| `SUPABASE_URL` | Optional | Supabase project URL for hosted PostgreSQL store | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service role secret for server-side persistence | `eyJ...` |

---

## 2. Frontend Deployment: Next.js on Vercel

Vercel hosts the responsive Next.js application, proxying API requests to the Render backend service.

### Configuration Settings
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Environment Variables
| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `API_INTERNAL_URL` | **Yes** | Public or internal URL of the deployed Render backend | `https://proofline-api.onrender.com` |

*Note: `frontend/next.config.mjs` automatically rewrites all `/api/:path*` traffic to `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000'}/api/:path*`.*

---

## 3. Deployment Verification: End-to-End Smoke Test

Once live URLs are provisioned, run the automated verification script against the live base URL:

```bash
python scripts/smoke.py https://proofline.vercel.app
```

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
