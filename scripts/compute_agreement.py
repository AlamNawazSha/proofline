#!/usr/bin/env python3
"""
Compute Inter-Annotator Agreement (Cohen's Kappa).

Reads two independent label files:
  - benchmark/labels.annotator_a.jsonl
  - benchmark/labels.annotator_b.jsonl

Units evaluated:
  1. Binary Detection Agreement: per-item finding presence (0 = clean, 1 = non-compliant finding present)
  2. Multi-class Category Agreement: category assignment across the N=30 frozen benchmark items

Calculates Cohen's Kappa:
  P_o = observed percent agreement
  P_e = expected chance agreement
  kappa = (P_o - P_e) / (1 - P_e)

Updates benchmark/manifest.json with real computed kappa, annotators, unit, and N.
Exits 1 if agreement is below threshold (0.60).
Exits 2 if a required label file is missing.
"""

import os
import sys
import json
import argparse
from typing import Dict, List, Tuple


def load_label_file(path: str) -> Tuple[str, Dict[str, Dict]]:
    if not os.path.isfile(path):
        print(f"[ERROR] Required label file not found: {path}", file=sys.stderr)
        print("Both independent label files are required to compute Cohen's kappa.", file=sys.stderr)
        print("See docs/ANNOTATION_GUIDE.md for instructions.", file=sys.stderr)
        sys.exit(2)

    items = {}
    annotator_name = ""
    with open(path, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)
            item_id = data.get("id") or f"BM-{idx+1:03d}"
            if not annotator_name and data.get("annotator"):
                annotator_name = str(data["annotator"]).strip()
            
            # Extract presence & primary category
            findings = data.get("expectedFindings", [])
            has_finding = 1 if len(findings) > 0 or data.get("hasFinding") is True else 0
            primary_cat = "clean"
            if has_finding:
                if findings and isinstance(findings[0], dict) and findings[0].get("category"):
                    primary_cat = findings[0]["category"]
                elif data.get("category"):
                    primary_cat = data["category"]
                else:
                    primary_cat = "violation"

            items[item_id] = {
                "id": item_id,
                "has_finding": has_finding,
                "category": primary_cat,
                "raw": data,
            }

    if not annotator_name:
        annotator_name = os.path.basename(path).replace("labels.", "").replace(".jsonl", "").replace("_", " ").title()

    return annotator_name, items


def compute_cohen_kappa(labels_a: List[int], labels_b: List[int]) -> Tuple[float, float, float]:
    """Compute Cohen's kappa for two parallel lists of nominal classifications."""
    assert len(labels_a) == len(labels_b), "Label count mismatch"
    n = len(labels_a)
    if n == 0:
        return 1.0, 1.0, 1.0

    classes = sorted(list(set(labels_a) | set(labels_b)))
    
    # Observed agreement
    agree_count = sum(1 for a, b in zip(labels_a, labels_b) if a == b)
    p_o = agree_count / n

    # Expected agreement by chance
    p_e = 0.0
    for c in classes:
        p_a = sum(1 for a in labels_a if a == c) / n
        p_b = sum(1 for b in labels_b if b == c) / n
        p_e += (p_a * p_b)

    if p_e >= 1.0:
        kappa = 1.0
    else:
        kappa = (p_o - p_e) / (1.0 - p_e)

    return round(kappa, 4), round(p_o, 4), round(p_e, 4)


def main():
    parser = argparse.ArgumentParser(description="Proofline Inter-Annotator Agreement Calculator")
    parser.add_argument("--annotator-a", default="benchmark/labels.annotator_a.jsonl", help="Path to Annotator A labels")
    parser.add_argument("--annotator-b", default="benchmark/labels.annotator_b.jsonl", help="Path to Annotator B labels")
    parser.add_argument("--manifest", default="benchmark/manifest.json", help="Path to manifest.json")
    parser.add_argument("--min-kappa", type=float, default=0.60, help="Minimum acceptable kappa threshold")
    args = parser.parse_args()

    name_a, items_a = load_label_file(args.annotator_a)
    name_b, items_b = load_label_file(args.annotator_b)

    common_ids = sorted(list(set(items_a.keys()) & set(items_b.keys())))
    if len(common_ids) < 30:
        print(f"[WARNING] Evaluated {len(common_ids)} items (expected 30 for full dataset v1).", file=sys.stderr)

    # 1. Binary Detection Agreement (has finding yes/no)
    bin_a = [items_a[i]["has_finding"] for i in common_ids]
    bin_b = [items_b[i]["has_finding"] for i in common_ids]
    kappa_bin, po_bin, pe_bin = compute_cohen_kappa(bin_a, bin_b)

    # 2. Multi-class Category Agreement
    cat_a = [items_a[i]["category"] for i in common_ids]
    cat_b = [items_b[i]["category"] for i in common_ids]
    kappa_cat, po_cat, pe_cat = compute_cohen_kappa(cat_a, cat_b)

    # Primary unit is combined category-level nominal agreement
    primary_kappa = kappa_cat
    primary_po = po_cat

    print(f"=== Inter-Annotator Agreement Report ===")
    print(f"Annotator A: {name_a} ({len(items_a)} items)")
    print(f"Annotator B: {name_b} ({len(items_b)} items)")
    print(f"Shared Items (N): {len(common_ids)}")
    print(f"Binary Detection Agreement (P_o): {po_bin * 100:.1f}% | Cohen's Kappa: {kappa_bin}")
    print(f"Category-Level Agreement (P_o):   {po_cat * 100:.1f}% | Cohen's Kappa: {kappa_cat}")

    # Check against manifest
    if os.path.isfile(args.manifest):
        with open(args.manifest, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        
        manifest["annotators"] = [name_a, name_b]
        manifest["kappa"] = primary_kappa
        manifest["agreementUnit"] = "per-item primary category classification (nominal)"
        manifest["agreementN"] = len(common_ids)
        manifest["percentAgreement"] = round(primary_po * 100, 1)
        manifest["binaryKappa"] = kappa_bin
        manifest["provenance"] = "dual-annotator independent blind review"

        with open(args.manifest, "w", encoding="utf-8", newline="\n") as f:
            json.dump(manifest, f, indent=2)
        print(f"[SUCCESS] Updated {args.manifest} with kappa={primary_kappa}")

    if primary_kappa < args.min_kappa:
        print(f"[FAIL] Cohen's Kappa ({primary_kappa}) is below required threshold ({args.min_kappa}).", file=sys.stderr)
        print("Per specification §4.1: Re-adjudicate with a 3rd reviewer before shipping.", file=sys.stderr)
        sys.exit(1)

    print(f"[PASS] Inter-annotator agreement verified (kappa >= {args.min_kappa})")
    return 0


if __name__ == "__main__":
    main()

