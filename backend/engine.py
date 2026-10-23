"""Deterministic, source-bound checks. No model output is simulated here.

Design rules:
* A finding may only exist because a confirmed source is quoted, or because the
  system is explicitly reporting missing evidence/scope. Missing support is never
  presented as proof of falsehood.
* Optional AI findings are produced elsewhere (main.interpret_ai) and are labelled
  "AI-suggested"; deterministic rules stay authoritative.
"""

from __future__ import annotations
import copy, difflib, functools, hashlib, json, re, uuid
from datetime import datetime, timezone, date


def uid():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(doc):
    data = {k: doc.get(k) for k in ("text", "context", "visualCheckIds")}
    return hashlib.sha256(
        json.dumps(
            data, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        ).encode()
    ).hexdigest()


# ---------------------------------------------------------------- seed data
SOURCE_BODY = (
    "Pilot users saved up to 20% on annual plans. Results vary. "
    "Preferred term: affordable plan. Voice: helpful, clear and professional. "
    "Never promise guaranteed or risk-free results. "
    "Avoid hype such as world-class, unbeatable or best in the world. "
    "Unsupported superlatives such as number one require evidence. "
    "Internal launch codename: Aurora Vault."
)


def seed(name="Northstar Studio"):
    source = {
        "id": "SRC-001",
        "title": "Northstar approved brand guide",
        "body": SOURCE_BODY,
        "active": True,
        "confirmed": True,
        "version": 1,
        "createdAt": now(),
    }
    common = {
        "sourceId": "SRC-001",
        "active": True,
        "severity": "medium",
        "channel": "any",
        "section": "any",
        "allowQuoted": False,
        "pattern": "",
        "replacement": "",
    }
    rules = [
        dict(
            common,
            id="RULE-001",
            name="Preferred plan terminology",
            kind="terminology",
            pattern="cheap plan",
            variants=["cheap plans"],
            replacement="affordable plan",
            quote="Preferred term: affordable plan.",
        ),
        dict(
            common,
            id="RULE-002",
            name="Pilot savings claim",
            kind="claim",
            pattern="save, saved, saving, savings, discount, per cent, off",
            severity="high",
            replacement="Pilot users saved up to 20% on annual plans.",
            quote="Pilot users saved up to 20% on annual plans.",
            factKey="pilot.savings",
            maxValue=20,
            requireUpTo=True,
            audience="pilot users",
            product="annual plans",
        ),
        dict(
            common,
            id="RULE-003",
            name="Qualify savings results",
            kind="required",
            pattern="save, saved, savings",
            replacement="Results vary.",
            quote="Results vary.",
        ),
        dict(
            common,
            id="RULE-004",
            name="Do not disclose internal codenames",
            kind="internal",
            pattern="Aurora Vault",
            severity="high",
            quote="Internal launch codename: Aurora Vault.",
        ),
        dict(
            common,
            id="RULE-005",
            name="No guaranteed or risk-free promises",
            kind="prohibited",
            pattern="guaranteed, guarantee, risk-free, risk free",
            severity="high",
            replacement="",
            quote="Never promise guaranteed or risk-free results.",
        ),
        dict(
            common,
            id="RULE-006",
            name="Avoid hype language",
            kind="prohibited",
            pattern="world-class, world class, unbeatable, best in the world",
            severity="medium",
            replacement="",
            quote="Avoid hype such as world-class, unbeatable or best in the world.",
        ),
        dict(
            common,
            id="RULE-007",
            name="Unsupported superlatives",
            kind="prohibited",
            pattern="number one, #1, the only, industry-leading, revolutionary",
            severity="medium",
            replacement="",
            quote="Unsupported superlatives such as number one require evidence.",
        ),
    ]
    return {
        "name": name,
        "sourceVersion": 1,
        "sources": [source],
        "rules": rules,
        "documents": [],
        "events": [],
        "receipts": [],
        "feedback": [],
        "assets": [],
        "visualChecks": [],
        "campaigns": [],
        "jobs": [],
        "files": [],
        "createdAt": now(),
    }


def new_document(title, text, actor, context=None):
    doc = {
        "id": uid(),
        "title": title,
        "text": text,
        "creatorId": actor["id"],
        "creatorName": actor["name"],
        "revision": 1,
        "context": context
        or {"channel": "website", "audience": "public", "purpose": "Product launch"},
        "visualCheckIds": [],
        "history": [],
        "findings": [],
        "comments": [],
        "review": None,
        "decision": None,
        "submitted": False,
        "createdAt": now(),
        "updatedAt": now(),
    }
    doc["history"].append(snapshot(doc, actor))
    return doc


def snapshot(doc, actor):
    return {
        "revision": doc["revision"],
        "text": doc["text"],
        "context": copy.deepcopy(doc["context"]),
        "visualCheckIds": list(doc.get("visualCheckIds", [])),
        "by": actor["name"],
        "at": now(),
        "fingerprint": digest(doc),
    }


def event(state, actor, action, detail="", doc_id=None):
    state["events"].insert(
        0,
        {
            "id": uid(),
            "actor": actor["name"],
            "action": action,
            "detail": detail,
            "documentId": doc_id,
            "at": now(),
        },
    )
    state["events"] = state["events"][:500]


# --------------------------------------------------------------- matching
WORD = re.compile(r"[\w#]+")


@functools.lru_cache(maxsize=2048)
def term_pattern(phrase):
    """Whole-word match that tolerates extra spaces, hyphens and underscores.

    "cheap plan" matches "cheap-plan", "Cheap  plan", "cheap_plan".
    """
    parts = [re.escape(p) for p in re.split(r"[\s\-_]+", phrase.strip()) if p]
    if not parts:
        return None
    return r"(?<![\w-])" + r"[\s\-_]*".join(parts) + r"(?![\w-])"


def keyword_list(raw):
    return [k.strip().lower() for k in re.split(r"[,;]", raw or "") if k.strip()]


PERCENT = re.compile(
    r"(?<![\d.])(\d+(?:[.,]\d+)?)\s*(?:%|per\s*cent\b|percent\b)", re.I
)
SENTENCE_END = re.compile(r"(?<!\d)[.!?](?!\d)|\n")


def sentence_bounds(text, pos):
    """Sentence window that does not split decimals such as 99.9%."""
    starts = [m.end() for m in SENTENCE_END.finditer(text, 0, min(pos, len(text)))]
    start = starts[-1] if starts else 0
    nxt = SENTENCE_END.search(text, min(pos, len(text)))
    end = nxt.end() if nxt else len(text)
    return start, end


def evidence(state, rule):
    source = next(
        (
            s
            for s in state["sources"]
            if s["id"] == rule.get("sourceId")
            and s.get("active")
            and s.get("confirmed")
        ),
        None,
    )
    quote = rule.get("quote", "")
    return source if source and quote and quote in source["body"] else None


def section_at(text, pos):
    headings = list(re.finditer(r"(?m)^(?:#{1,3}\s+|\[)([^\]\n]+)\]?", text[: pos + 1]))
    return headings[-1].group(1).strip().lower() if headings else "body"


def applicable(rule, doc, pos=0):
    context = doc.get("context", {})
    channel = rule.get("channel", "any")
    if channel not in ("any", "", None) and channel != context.get("channel"):
        return False
    if rule.get("section", "any") not in ("any", "", None) and rule[
        "section"
    ].lower() != section_at(doc["text"], pos):
        return False
    if rule.get("allowQuoted") and doc["text"][:pos].count('"') % 2:
        return False
    return True


SENSITIVE = [
    (
        "Possible API credential",
        r"\b(?:sk-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b",
        "high",
    ),
    ("Personal email address", r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "medium"),
]


def sensitive(text):
    return [
        (name, m, sev) for name, pat, sev in SENSITIVE for m in re.finditer(pat, text)
    ]


# ----------------------------------------------------------------- checks
def check(state, doc):
    text = doc["text"]
    findings = []
    active = [r for r in state["rules"] if r.get("active")]

    def add(
        rule,
        start,
        end,
        explanation,
        suggestion="",
        severity=None,
        category=None,
        name=None,
        mandatory=True,
    ):
        source = evidence(state, rule) if rule else None
        findings.append(
            {
                "id": uid(),
                "ruleId": rule["id"] if rule else "SYSTEM",
                "ruleName": name or (rule["name"] if rule else "System check"),
                "category": category or (rule["kind"] if rule else "privacy"),
                "severity": severity
                or (rule.get("severity", "medium") if rule else "high"),
                "start": start,
                "end": end,
                "text": text[start:end],
                "explanation": explanation,
                "suggestion": suggestion,
                "sourceId": source["id"] if source else None,
                "sourceTitle": source["title"] if source else None,
                "quote": rule.get("quote") if source else None,
                "sourceLocation": source["body"].find(rule["quote"])
                if source
                else None,
                "evidenceState": "quoted" if source else "no_evidence",
                "provenance": "Rule-based",
                "status": "open",
                "mandatory": mandatory,
                "createdAt": now(),
            }
        )

    def channel_ok(rule):
        ch = rule.get("channel", "any")
        return ch in ("any", "", None) or ch == doc.get("context", {}).get("channel")

    for r in active:
        if not channel_ok(r):
            continue
        kind = r["kind"]
        if not evidence(state, r):
            add(
                r,
                0,
                0,
                "This rule has no current confirmed source and exact quote. A manager must repair it before it can be relied on.",
                severity="high",
                category="source",
            )
            continue
        if r.get("validUntil"):
            try:
                if date.fromisoformat(r["validUntil"]) < date.today():
                    add(
                        r,
                        0,
                        0,
                        "The approved fact behind this rule has expired. Ask a manager to confirm a current source.",
                        severity="high",
                        category="expired",
                    )
                    continue
            except ValueError:
                add(
                    r,
                    0,
                    0,
                    "Invalid source expiry date; a manager must correct it.",
                    severity="high",
                    category="source",
                )
                continue

        if kind in ("terminology", "prohibited", "tone", "internal"):
            phrases = keyword_list(r.get("pattern")) + [
                _ for _ in (r.get("variants") or [])
            ]
            for phrase in [p for p in phrases if p.strip()]:
                pattern = term_pattern(phrase)
                if not pattern:
                    continue
                for m in re.finditer(pattern, text, re.I):
                    if not applicable(r, doc, m.start()):
                        continue
                    if kind == "internal":
                        detail = "This wording is marked internal-only in the approved source."
                    elif kind == "prohibited":
                        detail = (
                            f"The approved source explicitly discourages this wording."
                        )
                    else:
                        detail = "Use the confirmed wording, or ask the reviewer to clarify this exception."
                    add(
                        r,
                        m.start(),
                        m.end(),
                        f"“{m.group()}” conflicts with “{r['name']}”. {detail}",
                        r.get("replacement", ""),
                    )
        elif kind == "required":
            triggers = [t for t in keyword_list(r.get("pattern")) if t]
            required = (r.get("replacement") or "").strip()
            if not triggers or not required:
                continue
            lowered = text.lower()
            if any(
                re.search(term_pattern(t) or re.escape(t), lowered, re.I)
                for t in triggers
            ):
                if required.lower() not in lowered:
                    first = next(
                        (
                            m
                            for t in triggers
                            for m in re.finditer(
                                term_pattern(t) or re.escape(t), text, re.I
                            )
                        ),
                        None,
                    )
                    if first and applicable(r, doc, first.start()):
                        add(
                            r,
                            len(text),
                            len(text),
                            f"This content triggers required wording: “{required}”. The qualification is missing.",
                            " " + required,
                        )
        elif kind == "claim":
            keywords = [k for k in keyword_list(r.get("pattern")) if k] or [
                "save",
                "saved",
                "savings",
                "% off",
            ]
            for m in PERCENT.finditer(text):
                start, end = sentence_bounds(text, m.start())
                segment = text[start:end]
                if not any(k in segment.lower() for k in keywords):
                    continue
                if not applicable(r, doc, m.start()):
                    continue
                problems = []
                value = float(m.group(1).replace(",", "."))
                if value > float(r.get("maxValue", 100)):
                    problems.append("the amount exceeds the approved maximum")
                if r.get("requireUpTo") and not re.search(r"\bup to\b", segment, re.I):
                    problems.append("the “up to” condition is missing")
                if re.search(
                    r"\b(guaranteed|always|every customer|all customers|everyone)\b",
                    segment,
                    re.I,
                ):
                    problems.append(
                        "the wording introduces a broader or guaranteed outcome"
                    )
                for field, label in (
                    ("audience", "audience"),
                    ("product", "product scope"),
                ):
                    if r.get(field) and r[field].lower() not in segment.lower():
                        problems.append(f"the approved {label} “{r[field]}” is missing")
                if problems:
                    add(
                        r,
                        start,
                        end,
                        "Check this claim: " + "; ".join(problems) + ".",
                        r.get("replacement") or r.get("quote", ""),
                        category="claim",
                    )

    # Percentages with no configured fact are an evidence gap, not a verdict.
    for m in PERCENT.finditer(text):
        start, end = sentence_bounds(text, m.start())
        covered = any(
            r["kind"] == "claim"
            and applicable(r, doc, m.start())
            and evidence(state, r)
            and any(
                k in text[start:end].lower()
                for k in (keyword_list(r.get("pattern")) or ["save"])
            )
            for r in active
        )
        if not covered:
            add(
                None,
                m.start(),
                m.end(),
                "No approved fact is configured for this numerical claim. Supply approved evidence or rewrite it. "
                "An unapproved number is not automatically false — it is unsupported.",
                severity="high",
                category="claim",
                name="Unapproved numerical claim",
            )

    for label, m, sev in sensitive(text):
        add(
            None,
            m.start(),
            m.end(),
            f"{label} detected. Inspect it before release or before sending content to an external AI service.",
            severity=sev,
            category="privacy",
            name="Sensitive-information preflight",
        )

    seen, out = set(), []
    for f in findings:
        key = (f["ruleId"], f["start"], f["end"], f["category"])
        if key not in seen:
            seen.add(key)
            out.append(f)
    out.sort(key=lambda f: (f["start"], f["end"]))
    return out


def open_findings(doc):
    return [
        f
        for f in doc.get("findings", [])
        if f["status"] not in ("false_positive", "resolved")
    ]


def readiness(state, doc):
    reasons = []
    r, d = doc.get("review"), doc.get("decision")
    if any(c["kind"] == "source" for c in conflicts(state, [])):
        reasons.append(
            "Active structured facts conflict, so a manager must clarify the sources."
        )
    for rule in state["rules"]:
        if rule.get("active") and rule.get("validUntil"):
            try:
                if date.fromisoformat(rule["validUntil"]) < date.today():
                    reasons.append(
                        "An active approved fact has expired; confirm current sources."
                    )
            except ValueError:
                reasons.append("An active fact has an invalid validity date.")
    if not any(s.get("active") and s.get("confirmed") for s in state["sources"]):
        reasons.append("No confirmed active sources.")
    if not r:
        reasons.append("Run a review first.")
    else:
        if (
            r["revision"] != doc["revision"]
            or r["sourceVersion"] != state["sourceVersion"]
        ):
            reasons.append("The review belongs to older content or older sources.")
        if r["status"] not in ("complete", "partial"):
            reasons.append("The review is not finished.")
        if r["status"] == "partial" and not (d and d.get("manualCoverage")):
            reasons.append(
                "The review is partial; explicit human coverage is required."
            )
    if open_findings(doc):
        reasons.append(f"{len(open_findings(doc))} unresolved finding(s).")
    if not d or d.get("outcome") != "approved":
        reasons.append("An authorised reviewer has not approved this version.")
    elif (
        d["revision"] != doc["revision"]
        or d["sourceVersion"] != state["sourceVersion"]
        or d["fingerprint"] != digest(doc)
    ):
        reasons.append(
            "The approval is outdated: content, context or sources changed after approval."
        )
    elif d["reviewerId"] == doc["creatorId"]:
        reasons.append("Self-approval is not allowed.")
    for vid in doc.get("visualCheckIds", []):
        v = next((v for v in state["visualChecks"] if v["id"] == vid), None)
        if (
            not v
            or not v.get("passed")
            or v.get("sourceVersion") != state["sourceVersion"]
        ):
            reasons.append(
                "A linked visual check needs correction or human verification against a current asset."
            )
    return {
        "eligible": not reasons,
        "reasons": reasons,
        "fingerprint": digest(doc),
        "sourceVersion": state["sourceVersion"],
    }


def document_status(state, doc):
    d = doc.get("decision")
    if d and (
        d["revision"] != doc["revision"] or d["sourceVersion"] != state["sourceVersion"]
    ):
        return "Approval outdated" if d["outcome"] == "approved" else "Needs re-review"
    if d and d["outcome"] == "approved":
        return (
            "Approved"
            if readiness(state, doc)["eligible"]
            else "Approval needs attention"
        )
    if d and d["outcome"] == "changes_requested":
        return "Needs changes"
    if doc.get("submitted"):
        return "Awaiting review"
    if doc.get("review"):
        return "Needs changes" if open_findings(doc) else "Ready for reviewer"
    return "Draft"


def regression(before, after):
    def numbers(s):
        return re.findall(r"\d+(?:[.,]\d+)?\s*(?:%|per\s*cent)?", s)

    qualifiers = ["up to", "may", "pilot", "new customers", "annual", "results vary"]
    return {
        "numbersBefore": numbers(before),
        "numbersAfter": numbers(after),
        "removedQualifiers": [
            q for q in qualifiers if q in before.lower() and q not in after.lower()
        ],
        "diff": list(
            difflib.unified_diff(
                before.splitlines(),
                after.splitlines(),
                fromfile="Before",
                tofile="After",
                lineterm="",
            )
        ),
    }


def conflicts(state, documents=None):
    issues, groups = [], {}
    for r in state["rules"]:
        if r.get("active") and r.get("factKey"):
            groups.setdefault((r["factKey"], r.get("channel", "any")), []).append(r)
    for (key, scope), rules in groups.items():
        values = {
            str((r.get("maxValue"), r.get("audience"), r.get("product"))) for r in rules
        }
        if len(values) > 1:
            issues.append(
                {
                    "kind": "source",
                    "title": "Conflicting configured facts",
                    "detail": f"{key} has different values in the same configured channel. A manager must clarify which value applies.",
                    "ruleIds": [r["id"] for r in rules],
                }
            )
    docs = documents if documents is not None else state["documents"]
    scoped = {}
    for d in docs:
        c = d.get("context", {})
        key = (c.get("channel"), c.get("audience"), c.get("purpose"))
        for m in PERCENT.finditer(d["text"]):
            scoped.setdefault(key, []).append((d["title"], m.group(0).strip()))
    for key, items in scoped.items():
        if len({v for _, v in items}) > 1 and len({n for n, _ in items}) > 1:
            issues.append(
                {
                    "kind": "document",
                    "title": "Different numerical claims in matching declared contexts",
                    "detail": "; ".join(f"{n}: {v}" for n, v in items)
                    + ". Advisory only: confirm these statements refer to the same fact.",
                }
            )
    return issues
