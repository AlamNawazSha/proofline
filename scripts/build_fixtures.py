import json

fixtures = {}

# Items 1-4: tone
fixtures["BM-001"] = {
    "ok": True,
    "findings": [
        {
            "category": "tone",
            "text": "revolutionary",
            "start": 29,
            "end": 42,
            "explanation": "Unsupported superlative 'revolutionary' requires evidence.",
            "sourceId": "SRC-001",
            "quote": "Unsupported superlatives such as number one require evidence.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-002"] = {
    "ok": True,
    "findings": [
        {
            "category": "tone",
            "text": "100%",
            "start": 50,
            "end": 54,
            "explanation": "Never promise 100% or guaranteed outcomes.",
            "sourceId": "SRC-001",
            "quote": "Never promise guaranteed or risk-free results.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-003"] = {
    "ok": True,
    "findings": [
        {
            "category": "tone",
            "text": "guaranteed",
            "start": 44,
            "end": 54,
            "explanation": "Never promise guaranteed or risk-free results.",
            "sourceId": "SRC-001",
            "quote": "Never promise guaranteed or risk-free results.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-004"] = {
    "ok": True,
    "findings": [
        {
            "category": "tone",
            "text": "unbeatable",
            "start": 7,
            "end": 17,
            "explanation": "Avoid hype such as world-class, unbeatable or best in the world.",
            "sourceId": "SRC-001",
            "quote": "Avoid hype such as world-class, unbeatable or best in the world.",
            "status": "flagged"
        }
    ]
}

# Items 5-9: unsupported_claim
fixtures["BM-005"] = {
    "ok": True,
    "findings": [
        {
            "category": "unsupported_claim",
            "text": "99.999%",
            "start": 20,
            "end": 27,
            "explanation": "Uptime claim of 99.999% exceeds verified SLA specification.",
            "sourceId": "SRC-001",
            "quote": "Pilot users saved up to 20% on annual plans. Results vary.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-006"] = {
    "ok": True,
    "findings": [
        {
            "category": "unsupported_claim",
            "text": "80%",
            "start": 32,
            "end": 35,
            "explanation": "Cost reduction claim of 80% exceeds approved pilot maximum.",
            "sourceId": "SRC-001",
            "quote": "Pilot users saved up to 20% on annual plans. Results vary.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-007"] = {
    "ok": True,
    "findings": [
        {
            "category": "unsupported_claim",
            "text": "$9",
            "start": 17,
            "end": 19,
            "explanation": "Unverified pricing figure $9 does not match master schedule.",
            "sourceId": "SRC-001",
            "quote": "Pilot users saved up to 20% on annual plans. Results vary.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-008"] = {
    "ok": True,
    "findings": [
        {
            "category": "unsupported_claim",
            "text": "50,000",
            "start": 5,
            "end": 11,
            "explanation": "Metric 50,000 lacks evidentiary support in brand pack.",
            "sourceId": "SRC-001",
            "quote": "Pilot users saved up to 20% on annual plans. Results vary.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-009"] = {
    "ok": True,
    "findings": [
        {
            "category": "unsupported_claim",
            "text": "Save 15 hours",
            "start": 0,
            "end": 13,
            "explanation": "15 hours savings claim is not substantiated in approved sources.",
            "sourceId": "SRC-001",
            "quote": "Pilot users saved up to 20% on annual plans. Results vary.",
            "status": "flagged"
        }
    ]
}

# Items 10-13: terminology
fixtures["BM-010"] = {
    "ok": True,
    "findings": [
        {
            "category": "terminology",
            "text": "cheap plan",
            "start": 19,
            "end": 29,
            "explanation": "Use of prohibited term 'cheap plan'; replace with 'affordable plan'.",
            "sourceId": "SRC-001",
            "quote": "Preferred term: affordable plan. Voice: helpful, clear and professional.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-011"] = {
    "ok": True,
    "findings": [
        {
            "category": "terminology",
            "text": "Aurora Vault",
            "start": 27,
            "end": 39,
            "explanation": "Confidential codename Aurora Vault must not be disclosed.",
            "sourceId": "SRC-001",
            "quote": "Internal launch codename: Aurora Vault.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-012"] = {
    "ok": True,
    "findings": [
        {
            "category": "terminology",
            "text": "guarantee",
            "start": 3,
            "end": 12,
            "explanation": "Never promise guaranteed or risk-free results.",
            "sourceId": "SRC-001",
            "quote": "Never promise guaranteed or risk-free results.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-013"] = {
    "ok": True,
    "findings": [
        {
            "category": "terminology",
            "text": "cheap plans",
            "start": 11,
            "end": 22,
            "explanation": "Variant 'cheap plans' violates brand terminology boundaries.",
            "sourceId": "SRC-001",
            "quote": "Preferred term: affordable plan. Voice: helpful, clear and professional.",
            "status": "flagged"
        }
    ]
}

# Items 14-19: valid_must_not_flag (clean true negatives)
fixtures["BM-014"] = {"ok": True, "findings": []}
fixtures["BM-015"] = {"ok": True, "findings": []}
fixtures["BM-016"] = {"ok": True, "findings": []}
fixtures["BM-017"] = {"ok": True, "findings": []}
fixtures["BM-018"] = {"ok": True, "findings": []}
fixtures["BM-019"] = {"ok": True, "findings": []}

# Items 20-23: ambiguous
fixtures["BM-020"] = {
    "ok": True,
    "findings": [
        {
            "category": "ambiguous",
            "text": "save approximately 20%",
            "start": 10,
            "end": 32,
            "explanation": "Ambiguous qualifier 'approximately 20%' does not match required 'up to 20%'.",
            "sourceId": "SRC-001",
            "quote": "Pilot users saved up to 20% on annual plans. Results vary.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-021"] = {
    "ok": True,
    "findings": [
        {
            "category": "ambiguous",
            "text": "virtually continuous availability",
            "start": 15,
            "end": 48,
            "explanation": "Vague availability statement lacks precise committed SLA threshold.",
            "sourceId": "SRC-001",
            "quote": "Avoid hype such as world-class, unbeatable or best in the world.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-022"] = {
    "ok": True,
    "findings": [
        {
            "category": "ambiguous",
            "text": "substantially faster",
            "start": 7,
            "end": 27,
            "explanation": "Comparative claim 'substantially faster' lacks benchmark baseline.",
            "sourceId": "SRC-001",
            "quote": "Unsupported superlatives such as number one require evidence.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-023"] = {
    "ok": True,
    "findings": [
        {
            "category": "ambiguous",
            "text": "low-cost plan",
            "start": 4,
            "end": 17,
            "explanation": "Ambiguous phrasing low-cost plan risks confusion with unapproved cheap plan.",
            "sourceId": "SRC-001",
            "quote": "Preferred term: affordable plan. Voice: helpful, clear and professional.",
            "status": "flagged"
        }
    ]
}

# Items 24-27: conflicting_sources
fixtures["BM-024"] = {
    "ok": True,
    "findings": [
        {
            "category": "conflicting_sources",
            "text": "ISO-27001 certificate valid through 2024",
            "start": 22,
            "end": 62,
            "explanation": "Contradicted by Master Spec v2 stating certificate was revoked in 2023.",
            "sourceId": "SRC-003",
            "quote": "ISO-27001 certificate was superseded and revoked in 2023.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-025"] = {
    "ok": True,
    "findings": [
        {
            "category": "conflicting_sources",
            "text": "500GB storage quota",
            "start": 29,
            "end": 48,
            "explanation": "Source conflict: Guide v1 states 500GB whereas Spec v2 allocates 250GB.",
            "sourceId": "SRC-003",
            "quote": "Storage allocation is 250GB per team workspace.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-026"] = {
    "ok": True,
    "findings": [
        {
            "category": "conflicting_sources",
            "text": "savings reaching 35%",
            "start": 35,
            "end": 55,
            "explanation": "Conflicting source data: verified master spec caps savings at 18%.",
            "sourceId": "SRC-003",
            "quote": "Audited pilot program savings verified at 18%.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-027"] = {
    "ok": True,
    "findings": [
        {
            "category": "conflicting_sources",
            "text": "15-minute response time SLA",
            "start": 36,
            "end": 63,
            "explanation": "Support SLA conflict between legacy 15m and active 1 hour specification.",
            "sourceId": "SRC-003",
            "quote": "Technical support response time SLA is 1 hour.",
            "status": "flagged"
        }
    ]
}

# Items 28-30: malformed_model
fixtures["BM-028"] = {
    "ok": False,
    "error": "malformed_json_response: SyntaxError near line 1 col 4",
    "findings": []
}
fixtures["BM-029"] = {
    "ok": True,
    "findings": [
        {
            "category": "malformed_model",
            "text": "single-click multi-cloud deployment",
            "start": 9,
            "end": 44,
            "explanation": "Model analysis complete.",
            "sourceId": "SRC-001",
            "quote": "Avoid hype such as world-class, unbeatable or best in the world.",
            "status": "flagged"
        }
    ]
}
fixtures["BM-030"] = {
    "ok": True,
    "findings": [
        {
            "category": "malformed_model",
            "text": "instant failover",
            "start": 11,
            "end": 27,
            "explanation": "Model analysis complete.",
            "sourceId": "SRC-001",
            "quote": "Never promise guaranteed or risk-free results.",
            "status": "flagged"
        }
    ]
}

with open("benchmark/model_fixtures.json", "w", encoding="utf-8", newline="\n") as f:
    json.dump(fixtures, f, indent=2)

print("Generated benchmark/model_fixtures.json with 30 fixtures")
