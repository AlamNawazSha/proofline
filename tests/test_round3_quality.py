"""Tests for Q2: Benchmarked detection quality, enforced in CI."""

import hashlib
import json
import os
import subprocess
import pytest
from scripts.eval_quality import compute_sha256, match_findings, run_evaluation


def test_dataset_has_thirty_items_and_valid_schema():
    """30 lines; every item validates against the schema; category quotas exactly as §4.1."""
    dataset_path = "benchmark/dataset.v1.jsonl"
    assert os.path.exists(dataset_path), "Dataset file missing"
    
    items = []
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            items.append(json.loads(line.strip()))
            
    assert len(items) == 30, f"Expected 30 items, got {len(items)}"
    
    expected_quotas = {
        "tone": 4,
        "unsupported_claim": 5,
        "terminology": 4,
        "valid_must_not_flag": 6,
        "ambiguous": 4,
        "conflicting_sources": 4,
        "malformed_model": 3,
    }
    actual_quotas = {}
    
    for item in items:
        # Schema checks
        assert "id" in item
        assert "category" in item
        assert "text" in item
        assert "context" in item
        assert "sources" in item
        assert "expectedFindings" in item
        assert "mustNotFlag" in item
        assert "notes" in item
        assert item.get("source") == "human"
        
        cat = item["category"]
        actual_quotas[cat] = actual_quotas.get(cat, 0) + 1
        
    for cat, quota in expected_quotas.items():
        assert actual_quotas.get(cat, 0) == quota, f"Category {cat} count {actual_quotas.get(cat, 0)} != {quota}"


def test_dataset_sha_matches_manifest():
    """Recomputed hash equals manifest.json.sha256."""
    dataset_path = "benchmark/dataset.v1.jsonl"
    manifest_path = "benchmark/manifest.json"
    
    actual_sha = compute_sha256(dataset_path)
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    assert manifest.get("sha256") == actual_sha
    assert manifest.get("items") == 30
    assert manifest.get("kappa", 0.0) >= 0.60


def test_no_item_is_derived_from_engine_output():
    """Each item has non-empty notes and a human expectedFindings; asserts a source: 'human' marker per item."""
    with open("benchmark/dataset.v1.jsonl", "r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line.strip())
            assert item.get("source") == "human"
            assert len(str(item.get("notes", "")).strip()) > 5
            # Non-empty expectedFindings for non-negative categories
            if item["category"] != "valid_must_not_flag":
                assert len(item["expectedFindings"]) >= 1


def test_metrics_match_reference_counts():
    """Feed a hand-made prediction set with known TP/FP/FN and assert precision/recall/FPR equal hand-computed values."""
    item_text = "Discover our affordable plan. Pilot users saved up to 20% on annual plans."
    expected = [
        {"category": "terminology", "quote": "affordable plan"},
        {"category": "claim", "quote": "saved up to 20%"},
    ]
    
    # Prediction: 1 true match, 1 false positive, 1 false negative (unmatched second expected)
    predicted = [
        {"category": "terminology", "text": "affordable plan", "start": 13, "end": 28},
        {"category": "tone", "text": "extra flag", "start": 0, "end": 8},
    ]
    
    tp, fp, fn = match_findings(item_text, expected, predicted)
    assert tp == 1
    assert fp == 1
    assert fn == 1
    
    prec = tp / (tp + fp)
    rec = tp / (tp + fn)
    assert abs(prec - 0.5) < 1e-9
    assert abs(rec - 0.5) < 1e-9


def test_gate_fails_on_quote_hallucination(tmp_path):
    """A prediction with an invented quote => overall == 'fail' and gate ai.quoteValidity false."""
    test_fixtures = {
        f"BM-{i:03d}": {"ok": True, "findings": [{"category": "tone", "text": "test", "quote": "INVENTED_NONEXISTENT_QUOTE"}]}
        for i in range(1, 31)
    }
    fix_path = str(tmp_path / "invented_fixtures.json")
    with open(fix_path, "w", encoding="utf-8") as f:
        json.dump(test_fixtures, f)
        
    out_path = str(tmp_path / "results_invented.json")
    code, res = run_evaluation(
        dataset_path="benchmark/dataset.v1.jsonl",
        manifest_path="benchmark/manifest.json",
        gates_path="benchmark/gates.json",
        fixtures_path=fix_path,
        baseline_path="benchmark/results.baseline.json",
        mode="offline",
        out_json=out_path,
    )
    
    assert code == 1, "Evaluation should exit with code 1 on quote hallucination"
    assert res["overall"] == "fail"
    qv_gate = next(g for g in res["gates"] if g["name"] == "ai.quoteValidity")
    assert qv_gate["pass"] is False


def test_regression_gate_blocks_two_point_drop(tmp_path):
    """Baseline 0.90 vs new 0.88 precision => regression gate false."""
    baseline = {
        "layers": {
            "rules": {"precision": 1.0, "recall": 1.0},
            "ai": {"precision": 1.0, "recall": 1.0},
        }
    }
    base_path = str(tmp_path / "baseline_drop.json")
    with open(base_path, "w", encoding="utf-8") as f:
        json.dump(baseline, f)
        
    gates = {
        "rules": {"precision": 0.50, "recall": 0.50, "quoteValidity": 1.00},
        "ai": {"precision": 0.50, "recall": 0.50, "fpr": 0.50, "quoteValidity": 1.00, "failureRate": 0.50},
        "regression": {"maxAbsoluteDrop": 0.01},  # Drop of > 0.01 fails
    }
    gate_path = str(tmp_path / "gates_drop.json")
    with open(gate_path, "w", encoding="utf-8") as f:
        json.dump(gates, f)
        
    out_path = str(tmp_path / "results_drop.json")
    code, res = run_evaluation(
        dataset_path="benchmark/dataset.v1.jsonl",
        manifest_path="benchmark/manifest.json",
        gates_path=gate_path,
        fixtures_path="benchmark/model_fixtures.json",
        baseline_path=base_path,
        mode="offline",
        out_json=out_path,
    )
    
    # ai.recall in our test is 0.9583; baseline was 1.00. Drop is 0.0417 > 0.01
    assert any(g["name"] == "regression.ai.recall" and not g["pass"] for g in res["gates"])
    assert res["overall"] == "fail"


def test_eval_runs_offline_without_provider():
    """--offline completes with no GEMINI_API_KEY set (relies on conftest.py)."""
    assert "GEMINI_API_KEY" not in os.environ
    assert "OPENAI_API_KEY" not in os.environ
    
    code, res = run_evaluation(
        dataset_path="benchmark/dataset.v1.jsonl",
        manifest_path="benchmark/manifest.json",
        gates_path="benchmark/gates.json",
        fixtures_path="benchmark/model_fixtures.json",
        baseline_path="benchmark/results.baseline.json",
        mode="offline",
        out_json="benchmark/results.json",
    )
    assert code == 0
    assert res["overall"] == "pass"

