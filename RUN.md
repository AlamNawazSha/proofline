# Run Proofline 2.0 Locally

Requirements: Python 3.11+, Node.js 18+.

```bash
# Terminal 1: Backend API
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Web App
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Run Automated Tests
```bash
python -m pytest tests/ -q
```
Result: **96 passing** (all baseline invariants + Proofline 2.0 cryptographic, multi-agent, and security tests).

### Production Build Validation
```bash
cd frontend
npm run build
```
Result: Next.js optimized production build succeeds with 0 errors across all routes.
