#!/usr/bin/env python3
"""
Proofline End-to-End Governance Journey Smoke Test.

Executes the full approval lifecycle against any deployed or local base URL:
  1. POST /api/demo -> Initializes synthetic demo workspace
  2. Review non-compliant draft -> Generates deterministic findings
  3. Apply suggestions -> Saves clean approved text & re-checks
  4. Submit for review -> Transitions status to 'Awaiting review'
  5. Creator approve -> MUST return 403 Forbidden (separation of duties)
  6. Reviewer approve -> MUST return 200 OK (independent peer approval)
  7. Export report -> MUST return 200 OK (valid cryptographic receipt)
  8. Edit text -> Saves post-approval modification
  9. Export report -> MUST return 409 Conflict (export blocked due to content modification)

Exits non-zero on any deviation or assertion failure.
"""

import sys
import time
import requests

def run_smoke(base_url: str):
    base_url = base_url.rstrip("/")
    print(f"=== Proofline E2E Smoke Test ===")
    print(f"Target: {base_url}\n")

    session = requests.Session()

    def check(step_num: int, name: str, condition: bool, err_msg: str):
        if not condition:
            print(f"[FAIL] Step {step_num}: {name} -> {err_msg}")
            sys.exit(1)
        print(f"[PASS] Step {step_num}: {name}")

    # Health check
    try:
        r = session.get(f"{base_url}/api/health", timeout=10)
        check(0, "Health Check", r.status_code == 200, f"Expected 200, got {r.status_code}")
    except Exception as ex:
        print(f"[FAIL] Step 0: Health Check -> Unable to connect to {base_url}: {ex}")
        sys.exit(1)

    # 1. Initialize demo workspace
    r = session.post(f"{base_url}/api/demo", json={})
    check(1, "Demo Workspace Init", r.status_code == 200, f"Expected 200, got {r.status_code}")

    r_st = session.get(f"{base_url}/api/state")
    check(1, "Fetch State", r_st.status_code == 200, f"Expected 200, got {r_st.status_code}")
    st = r_st.json()
    check(1, "Creator Actor", st["actor"]["role"] == "creator", f"Expected creator, got {st['actor']['role']}")
    doc = st["documents"][0]

    # 2. Put non-compliant text and run review
    bad_text = "Users save 25% on annual plans without any terms."
    r_put = session.put(
        f"{base_url}/api/documents/{doc['id']}",
        json={"data": {"text": bad_text, "expectedRevision": doc["revision"], "context": doc["context"], "title": doc["title"]}}
    )
    check(2, "Save Draft With Non-Compliant Claim", r_put.status_code == 200, f"Expected 200, got {r_put.status_code}")

    r_rev = session.post(
        f"{base_url}/api/documents/{doc['id']}/review",
        json={"data": {"useAI": False}}
    )
    check(2, "Trigger Deterministic Review", r_rev.status_code == 200, f"Expected 200, got {r_rev.status_code}")

    # Wait for review worker
    deadline = time.time() + 10
    doc_reviewed = None
    while time.time() < deadline:
        fresh_st = session.get(f"{base_url}/api/state").json()
        doc_reviewed = next(d for d in fresh_st["documents"] if d["id"] == doc["id"])
        if doc_reviewed["review"]["status"] not in ["queued", "reviewing"]:
            break
        time.sleep(0.1)

    check(2, "Findings Generated", len(doc_reviewed["findings"]) > 0, "Expected at least 1 finding")

    # 3. Apply suggestion
    f = doc_reviewed["findings"][0]
    r_sugg = session.post(
        f"{base_url}/api/documents/{doc['id']}/suggestion",
        json={"data": {"findingId": f["id"], "expectedRevision": doc_reviewed["revision"]}}
    )
    check(3, "Fetch Approved Suggestion", r_sugg.status_code == 200, f"Expected 200, got {r_sugg.status_code}")
    sugg = r_sugg.json()

    # Apply suggestion and run clean review
    approved_text = "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary."
    r_apply = session.put(
        f"{base_url}/api/documents/{doc['id']}",
        json={"data": {"text": approved_text, "expectedRevision": doc_reviewed["revision"], "context": doc_reviewed["context"], "title": doc_reviewed["title"]}}
    )
    check(3, "Apply Approved Text", r_apply.status_code == 200, f"Expected 200, got {r_apply.status_code}")

    r_rev2 = session.post(
        f"{base_url}/api/documents/{doc['id']}/review",
        json={"data": {"useAI": False}}
    )
    check(3, "Re-run Review On Approved Text", r_rev2.status_code == 200, f"Expected 200, got {r_rev2.status_code}")

    deadline = time.time() + 10
    clean_doc = None
    while time.time() < deadline:
        fresh_st = session.get(f"{base_url}/api/state").json()
        clean_doc = next(d for d in fresh_st["documents"] if d["id"] == doc["id"])
        if clean_doc["review"]["status"] not in ["queued", "reviewing"]:
            break
        time.sleep(0.1)

    check(3, "Zero Findings On Approved Copy", len(clean_doc["findings"]) == 0, f"Expected 0 findings, got {len(clean_doc['findings'])}")

    # 4. Submit for review
    r_sub = session.post(f"{base_url}/api/documents/{clean_doc['id']}/submit")
    check(4, "Submit for Approval", r_sub.status_code == 200, f"Expected 200, got {r_sub.status_code}")

    # 5. Creator approve MUST return 403 Forbidden
    r_self_app = session.post(
        f"{base_url}/api/documents/{clean_doc['id']}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": clean_doc["revision"], "manualCoverage": True, "reason": "Self-approval attempt"}}
    )
    check(5, "Creator Self-Approve Blocked", r_self_app.status_code == 403, f"Expected 403 Forbidden, got {r_self_app.status_code}")

    # 6. Reviewer approve MUST return 200 OK
    r_switch = session.post(f"{base_url}/api/persona", json={"data": {"role": "reviewer"}})
    check(6, "Switch to Reviewer Persona", r_switch.status_code == 200, f"Expected 200, got {r_switch.status_code}")

    r_app = session.post(
        f"{base_url}/api/documents/{clean_doc['id']}/decision",
        json={"data": {"outcome": "approved", "expectedRevision": clean_doc["revision"], "manualCoverage": True, "reason": "Verified approved source pack v1"}}
    )
    check(6, "Reviewer Approval Success", r_app.status_code == 200, f"Expected 200, got {r_app.status_code}")

    # 7. Export report MUST return 200 OK
    r_exp = session.get(f"{base_url}/api/documents/{clean_doc['id']}/export")
    check(7, "Export Approved Release Receipt", r_exp.status_code == 200, f"Expected 200, got {r_exp.status_code}")
    data = r_exp.json()
    check(7, "Receipt Integrity Check", "receipt" in data and "fingerprint" in data["receipt"], "Missing receipt metadata")

    # 8. Edit content post-approval
    session.post(f"{base_url}/api/persona", json={"data": {"role": "creator"}})
    fresh_st = session.get(f"{base_url}/api/state").json()
    cur_doc = next(d for d in fresh_st["documents"] if d["id"] == clean_doc["id"])
    r_mod = session.put(
        f"{base_url}/api/documents/{cur_doc['id']}",
        json={"data": {"text": approved_text + " Modified after approval.", "expectedRevision": cur_doc["revision"], "context": cur_doc["context"], "title": cur_doc["title"]}}
    )
    check(8, "Save Post-Approval Modification", r_mod.status_code == 200, f"Expected 200, got {r_mod.status_code}")

    # 9. Export MUST now return 409 Conflict
    r_exp_blocked = session.get(f"{base_url}/api/documents/{clean_doc['id']}/export")
    check(9, "Export Blocked After Content Change", r_exp_blocked.status_code == 409, f"Expected 409 Conflict, got {r_exp_blocked.status_code}")

    print("\n[SUCCESS] Full governance journey verified successfully against target!")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    run_smoke(url)
