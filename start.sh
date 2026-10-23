#!/usr/bin/env bash
# Start Proofline: API on 8000, web app on 3000.
# Safe to re-run: it replaces its own previous processes and never touches other services.
set -euo pipefail
cd "$(dirname "$0")"

for port in 8000 3000; do
  pids=$(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $NF}' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u || true)
  if [ -n "${pids:-}" ]; then kill $pids 2>/dev/null || true; sleep 1; fi
done

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/proofline-api.log 2>&1 &
echo "api  : http://localhost:8000  (log: /tmp/proofline-api.log)"

(cd frontend && npm run dev > /tmp/proofline-web.log 2>&1 &)
echo "web  : http://localhost:3000  (log: /tmp/proofline-web.log)"

for i in $(seq 1 40); do
  if curl -sf -m 2 http://127.0.0.1:8000/api/health >/dev/null 2>&1 && curl -sf -m 2 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    echo "ready: both services responding"; exit 0
  fi
  sleep 1
done
echo "warning: services did not both respond in time; check the logs above"; exit 1
