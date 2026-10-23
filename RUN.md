# Run Proofline locally

Requirements: Python 3.11+, Node.js 20+.

```bash
# 1. API
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 2. Web app (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and click **Explore the working demo**.

Tests: `python -m pytest tests/ -q`  → 36 passing.

Optional real integrations: copy `.env.example` to `.env` and fill in Supabase values (see `docs/SUPABASE_SETUP.md`) and an OpenAI key. Never commit `.env`.
