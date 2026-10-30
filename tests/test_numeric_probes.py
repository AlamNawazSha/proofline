import pytest
from backend import engine as e


def test_enumeration_steps_do_not_flag_unsupported_claim():
    """Enumerations like 'steps 1, 2 and 3' must not trigger false positive numeric findings."""
    spans = e.extract_numeric_claim_spans("Follow steps 1, 2 and 3 carefully before proceeding.")
    assert spans == []

    spans_single = e.extract_numeric_claim_spans("Complete step 1 and step 2.")
    assert spans_single == []

    spans_phases = e.extract_numeric_claim_spans("Phases 1, 2 and 3 are planned for Q1.")
    assert spans_phases == []


def test_structural_numbers_are_ignored():
    """Sections, versions, standards, times, ordinals and phone numbers must not trigger claims."""
    cases = [
        "Refer to Section 4 and chapters 1 to 3 for details.",
        "Deployed with version 2.0 and framework v1.5.2.",
        "Certified compliance with ISO 9001, SOC 2, and RFC 2616 standards.",
        "The conference begins at 5:00 PM on July 4th.",
        "Contact support at 1-800-555-0199 or (555) 123-4567.",
        "We are celebrating our 21st anniversary this year.",
    ]
    for text in cases:
        spans = e.extract_numeric_claim_spans(text)
        assert spans == [], f"Expected no claims for '{text}', got {spans}"


def test_real_numeric_claims_are_flagged():
    """True factual claims with counts/metrics must still be flagged if ungrounded."""
    text = "Our studio employs 5 designers and 12 engineers across 4 offices."
    spans = e.extract_numeric_claim_spans(text)
    assert len(spans) == 3
    raw_claims = [s[2] for s in spans]
    assert "5 designers" in raw_claims
    assert "12 engineers" in raw_claims
    assert "4 offices" in raw_claims


def test_engine_check_does_not_flag_steps_false_positive():
    """Full engine check does not report unsupported claim findings for steps enumeration."""
    state = e.seed()
    doc = e.new_document("doc-test", "Follow steps 1, 2 and 3 to configure the client properly.", {"id": "u1", "name": "Author"})
    findings = e.check(state, doc)
    claim_findings = [f for f in findings if f.get("category") == "claim" and "No supporting evidence" in f.get("explanation", "")]
    assert len(claim_findings) == 0, f"Expected 0 false positive claims, got: {claim_findings}"

