import json
import hashlib
from datetime import datetime, timezone

SOURCE_BRAND = {
    "id": "SRC-001",
    "title": "Northstar approved brand guide",
    "body": (
        "Pilot users saved up to 20% on annual plans. Results vary. "
        "Preferred term: affordable plan. Voice: helpful, clear and professional. "
        "Never promise guaranteed or risk-free results. "
        "Avoid hype such as world-class, unbeatable or best in the world. "
        "Unsupported superlatives such as number one require evidence. "
        "Internal launch codename: Aurora Vault."
    )
}

SOURCE_CONFLICT_OLD = {
    "id": "SRC-002",
    "title": "Legacy Cloud Operations Guide v1",
    "body": "Storage allocation is 500GB per team workspace. ISO-27001 certificate valid through 2024. Pilot program savings reached 35% in early testing. Technical support response time SLA is 15 minutes."
}

SOURCE_CONFLICT_NEW = {
    "id": "SRC-003",
    "title": "Master Cloud Operations Specification v2",
    "body": "Storage allocation is 250GB per team workspace. ISO-27001 certificate was superseded and revoked in 2023. Audited pilot program savings verified at 18%. Technical support response time SLA is 1 hour."
}

items = [
    # 1-4: tone (4 items)
    {
        "id": "BM-001",
        "category": "tone",
        "text": "Our software is the most revolutionary platform on Earth and completely destroys all legacy competition.",
        "context": {"channel": "website", "audience": "public", "purpose": "Product launch"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "tone", "quote": "revolutionary"}],
        "mustNotFlag": [],
        "notes": "Team label: Unsubstantiated superlative 'revolutionary' violates brand tone guidelines requiring objective language.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-002",
        "category": "tone",
        "text": "Our enterprise cloud architecture delivers 100% guaranteed security for every customer.",
        "context": {"channel": "website", "audience": "public", "purpose": "Security overview"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "tone", "quote": "100% guaranteed"}],
        "mustNotFlag": [],
        "notes": "Team label: Absolute promise '100% guaranteed' is strictly prohibited by brand policy requiring qualified claims.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-003",
        "category": "tone",
        "text": "Experience flawless perfection with zero defects guaranteed on our platform.",
        "context": {"channel": "website", "audience": "public", "purpose": "Marketing"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "tone", "quote": "guaranteed"}],
        "mustNotFlag": [],
        "notes": "Team label: Promissory word 'guaranteed' violates brand guidelines prohibiting unconditional assurances.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-004",
        "category": "tone",
        "text": "Get an unbeatable discount with our world-class cloud infrastructure.",
        "context": {"channel": "email", "audience": "customers", "purpose": "Promotional campaign"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "tone", "quote": "unbeatable"}],
        "mustNotFlag": [],
        "notes": "Team label: Hype words 'unbeatable' and 'world-class' violate enterprise communications standard.",
        "provenance": "team_labelled"
    },

    # 5-9: unsupported_claim (5 items)
    {
        "id": "BM-005",
        "category": "unsupported_claim",
        "text": "Our system delivers 99.999% uptime for all deployments without exception.",
        "context": {"channel": "website", "audience": "public", "purpose": "SLA specification"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "unsupported_claim", "quote": "99.999%"}],
        "mustNotFlag": [],
        "notes": "Human label: Governing SLA specification does not support five-nines 99.999%.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-006",
        "category": "unsupported_claim",
        "text": "Customers consistently achieve an 80% reduction in hosting costs.",
        "context": {"channel": "website", "audience": "public", "purpose": "Case study"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "unsupported_claim", "quote": "80%"}],
        "mustNotFlag": [],
        "notes": "Human label: Approved brand standard only supports up to 20% savings.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-007",
        "category": "unsupported_claim",
        "text": "Starting at just $9 per month with unlimited compute resources.",
        "context": {"channel": "website", "audience": "public", "purpose": "Pricing page"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "unsupported_claim", "quote": "$9"}],
        "mustNotFlag": [],
        "notes": "Human label: Unverified pricing figure $9 lacks evidentiary backing.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-008",
        "category": "unsupported_claim",
        "text": "Over 50,000 global enterprises trust our solution daily.",
        "context": {"channel": "website", "audience": "public", "purpose": "Home page"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "unsupported_claim", "quote": "50,000"}],
        "mustNotFlag": [],
        "notes": "Human label: Metric 50,000 is not substantiated in approved corporate references.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-009",
        "category": "unsupported_claim",
        "text": "Customers save 75% on audit processing time with our automated platform.",
        "context": {"channel": "email", "audience": "prospects", "purpose": "Sales outreach"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "unsupported_claim", "quote": "save 75%"}],
        "mustNotFlag": [],
        "notes": "Team label: Savings claim of 75% directly violates max 20% limit specified in brand guide.",
        "provenance": "team_labelled"
    },

    # 10-13: terminology (4 items)
    {
        "id": "BM-010",
        "category": "terminology",
        "text": "Sign up today for our cheap plan with immediate cluster deployment.",
        "context": {"channel": "website", "audience": "public", "purpose": "Call to action"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "terminology", "quote": "cheap plan"}],
        "mustNotFlag": ["affordable plan"],
        "notes": "Team label: Prohibited term 'cheap plan' used instead of mandatory approved wording 'affordable plan'.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-011",
        "category": "terminology",
        "text": "Powered by our internal Aurora Vault low-latency execution engine.",
        "context": {"channel": "website", "audience": "public", "purpose": "Architecture blog"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "terminology", "quote": "Aurora Vault"}],
        "mustNotFlag": [],
        "notes": "Team label: Disclosure of confidential internal launch codename Aurora Vault is strictly forbidden.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-012",
        "category": "terminology",
        "text": "We guarantee that your team will achieve complete regulatory compliance.",
        "context": {"channel": "website", "audience": "public", "purpose": "Compliance landing page"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "terminology", "quote": "guarantee"}],
        "mustNotFlag": [],
        "notes": "Team label: Promissory word 'guarantee' violates brand policy prohibiting absolute assurances.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-013",
        "category": "terminology",
        "text": "Review our cheap plans to select the right tier for your team.",
        "context": {"channel": "website", "audience": "public", "purpose": "Docs guide"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "terminology", "quote": "cheap plans"}],
        "mustNotFlag": [],
        "notes": "Team label: Plural variant 'cheap plans' violates brand terminology boundaries; use approved term 'affordable plan'.",
        "provenance": "team_labelled"
    },

    # 14-19: valid_must_not_flag (6 items, expectedFindings: [])
    {
        "id": "BM-014",
        "category": "valid_must_not_flag",
        "text": "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.",
        "context": {"channel": "website", "audience": "public", "purpose": "Product launch"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [],
        "mustNotFlag": ["affordable plan", "saved up to 20%"],
        "notes": "Human label: Ground truth fully compliant passage verbatim from approved source pack.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-015",
        "category": "valid_must_not_flag",
        "text": "The engineering team maintains a clear and professional tone across all documentation.",
        "context": {"channel": "website", "audience": "public", "purpose": "Trust center"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [],
        "mustNotFlag": ["clear and professional"],
        "notes": "Human label: Factual brand description adhering to approved voice guidelines.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-016",
        "category": "valid_must_not_flag",
        "text": "Our helpful staff assists with enterprise onboarding and migration.",
        "context": {"channel": "website", "audience": "public", "purpose": "Pricing sheet"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [],
        "mustNotFlag": ["helpful staff"],
        "notes": "Human label: Compliant descriptive marketing copy with no prohibited terms or unbacked numbers.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-017",
        "category": "valid_must_not_flag",
        "text": "Technical documentation is structured to be clear and informative for developers.",
        "context": {"channel": "website", "audience": "public", "purpose": "Documentation"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [],
        "mustNotFlag": ["clear and informative"],
        "notes": "Human label: Professional description with zero policy violations.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-018",
        "category": "valid_must_not_flag",
        "text": "Organizations can choose an affordable plan that matches their engineering requirements.",
        "context": {"channel": "website", "audience": "public", "purpose": "Overview"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [],
        "mustNotFlag": ["affordable plan"],
        "notes": "Human label: Uses mandatory preferred phrasing 'affordable plan' without exaggeration.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-019",
        "category": "valid_must_not_flag",
        "text": "Pilot users saved up to 20% on annual plans when migrating workloads. Results vary.",
        "context": {"channel": "website", "audience": "public", "purpose": "Case study"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [],
        "mustNotFlag": ["saved up to 20%", "Results vary"],
        "notes": "Human label: Compliant savings claim including required qualifier 'Results vary'.",
        "provenance": "team_labelled"
    },

    # 20-23: ambiguous (4 items)
    {
        "id": "BM-020",
        "category": "ambiguous",
        "text": "Users may save approximately 20% depending on workload characteristics.",
        "context": {"channel": "website", "audience": "public", "purpose": "Marketing brief"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "ambiguous", "quote": "save approximately 20%"}],
        "mustNotFlag": [],
        "notes": "Human label: 'Approximately 20%' is ambiguous compared to mandated 'up to 20%' qualifier.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-021",
        "category": "ambiguous",
        "text": "Engineered for virtually continuous availability across multi-region clusters.",
        "context": {"channel": "website", "audience": "public", "purpose": "Product brochure"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "ambiguous", "quote": "virtually continuous availability"}],
        "mustNotFlag": [],
        "notes": "Human label: Vague availability claim obscures contractually committed SLA.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-022",
        "category": "ambiguous",
        "text": "Offers substantially faster query processing times compared to traditional SQL engines.",
        "context": {"channel": "website", "audience": "public", "purpose": "Technical blog"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "ambiguous", "quote": "substantially faster"}],
        "mustNotFlag": [],
        "notes": "Human label: 'Substantially faster' lacks quantifiable benchmark telemetry.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-023",
        "category": "ambiguous",
        "text": "Our low-cost plan options are tailored for modern agile organizations.",
        "context": {"channel": "website", "audience": "public", "purpose": "Campaign copy"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "ambiguous", "quote": "low-cost plan"}],
        "mustNotFlag": [],
        "notes": "Human label: 'Low-cost plan' skirts the boundary of prohibited 'cheap plan' terminology.",
        "provenance": "team_labelled"
    },

    # 24-27: conflicting_sources (4 items)
    {
        "id": "BM-024",
        "category": "conflicting_sources",
        "text": "The company holds an active ISO-27001 certificate valid through 2024.",
        "context": {"channel": "website", "audience": "public", "purpose": "Security compliance"},
        "sources": [SOURCE_CONFLICT_OLD, SOURCE_CONFLICT_NEW],
        "expectedFindings": [{"category": "conflicting_sources", "quote": "ISO-27001 certificate valid through 2024"}],
        "mustNotFlag": [],
        "notes": "Human label: Legacy guide v1 claims validity through 2024, but Master Spec v2 notes certificate was revoked in 2023.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-025",
        "category": "conflicting_sources",
        "text": "Every workspace receives a default 500GB storage quota.",
        "context": {"channel": "website", "audience": "public", "purpose": "Product specifications"},
        "sources": [SOURCE_CONFLICT_OLD, SOURCE_CONFLICT_NEW],
        "expectedFindings": [{"category": "conflicting_sources", "quote": "500GB storage quota"}],
        "mustNotFlag": [],
        "notes": "Human label: Guide v1 states 500GB while Spec v2 limits storage to 250GB.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-026",
        "category": "conflicting_sources",
        "text": "Early pilot program participants recorded savings reaching 35%.",
        "context": {"channel": "website", "audience": "public", "purpose": "Case study"},
        "sources": [SOURCE_CONFLICT_OLD, SOURCE_CONFLICT_NEW],
        "expectedFindings": [{"category": "conflicting_sources", "quote": "savings reaching 35%"}],
        "mustNotFlag": [],
        "notes": "Human label: Early pilot doc cites 35%, but audited master spec caps verified savings at 18%.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-027",
        "category": "conflicting_sources",
        "text": "Our technical support team commits to a 15-minute response time SLA.",
        "context": {"channel": "website", "audience": "public", "purpose": "Support terms"},
        "sources": [SOURCE_CONFLICT_OLD, SOURCE_CONFLICT_NEW],
        "expectedFindings": [{"category": "conflicting_sources", "quote": "15-minute response time SLA"}],
        "mustNotFlag": [],
        "notes": "Human label: Legacy doc promises 15 minutes, whereas current SLA specification commits to 1 hour.",
        "provenance": "team_labelled"
    },

    # 28-30: malformed_model (3 items)
    {
        "id": "BM-028",
        "category": "malformed_model",
        "text": "Our data pipeline guarantees automated stream processing with zero packet loss.",
        "context": {"channel": "website", "audience": "public", "purpose": "Data engineering"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "malformed_model", "quote": "zero packet loss"}],
        "mustNotFlag": [],
        "notes": "Human label: Model response contains malformed JSON syntax violating schema parser.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-029",
        "category": "malformed_model",
        "text": "Seamless single-click multi-cloud deployment is supported across all regions.",
        "context": {"channel": "website", "audience": "public", "purpose": "Deployment guide"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "malformed_model", "quote": "single-click multi-cloud deployment"}],
        "mustNotFlag": [],
        "notes": "Human label: Model hallucinates a citation passage not present in the supplied source document.",
        "provenance": "team_labelled"
    },
    {
        "id": "BM-030",
        "category": "malformed_model",
        "text": "Experience instant failover without configuration overhead.",
        "context": {"channel": "website", "audience": "public", "purpose": "High availability"},
        "sources": [SOURCE_BRAND],
        "expectedFindings": [{"category": "malformed_model", "quote": "instant failover"}],
        "mustNotFlag": [],
        "notes": "Human label: Model generates empty or non-compliant category taxonomy.",
        "provenance": "team_labelled"
    }
]

# Write dataset.v1.jsonl
dataset_path = "benchmark/dataset.v1.jsonl"
with open(dataset_path, "w", encoding="utf-8", newline="\n") as f:
    for item in items:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

# Calculate SHA256
with open(dataset_path, "rb") as f:
    sha256 = hashlib.sha256(f.read()).hexdigest()

manifest = {
    "version": 1,
    "sha256": sha256,
    "items": 30,
    "createdAt": datetime.now(timezone.utc).isoformat(),
    "provenance": "labelled by the team; inter-annotator agreement not measured",
    "annotators": [],
    "kappa": None
}

with open("benchmark/manifest.json", "w", encoding="utf-8", newline="\n") as f:
    json.dump(manifest, f, indent=2)

print(f"Dataset v1 written to {dataset_path} with SHA256: {sha256}")
