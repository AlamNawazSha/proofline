# Three substantial Round 3 improvements

Each item states what Round 2 already does, what Round 3 adds, how it is proven, and why it is genuinely unfinished. Nothing here is claimed as built.

## 1. Evidence lifecycle: automatic re-review queue

- **Round 2 today:** a manager sees a *preview* of which documents would change when a rule is activated, and every source/rule change bumps the source version and invalidates approvals. The manager must re-open each document themselves.
- **Round 3 adds:** a persistent queue. When a rule changes, expires or conflicts, the system finds every affected document, creates a re-review task per document, assigns a reviewer, notifies the creator and tracks the queue until closed.
- **Acceptance test:** one rule change with 5 affected documents produces exactly 5 queued tasks with correct assignees; closing each task clears it; an unaffected document is never queued.
- **Evaluation:** a controlled set of 20 source-change scenarios; report the number of affected documents correctly identified, with the denominator published.
- **Why not now:** it needs a task/notification model, assignment rules and background scheduling — a schema change, not a screen.

## 2. Measured detection quality for AI-assisted review

- **Round 2 today:** deterministic keyword/claim rules work and are tested; the AI adapter validates structure and quotes but **has never run against a live provider**, so no quality number exists.
- **Round 3 adds:** a frozen 30-item evaluation set (tone, unsupported claims, terminology, valid claims that must not be flagged, ambiguous text, conflicting sources, malformed responses), two independent annotators reconciling disagreements, and published precision, recall, false-positive rate, evidence-reference validity, latency and failure rate — kept separate for rule-based and AI findings.
- **Acceptance test:** the evaluation script runs against the deployed build and emits a table; a change to the prompt or model must re-run it and cannot merge with a regression beyond a stated threshold.
- **Why not now:** without provider access the only honest number is zero data points.

## 3. Multi-reviewer approval policy

- **Round 2 today:** exactly one authorised non-self reviewer approves one exact revision; any content, context, source or visual change invalidates it.
- **Round 3 adds:** policy per channel or severity (for example, high-severity content needs two distinct reviewers), approval revocation with reason, escalation when a review is unanswered past a deadline, and exceptions with a recorded scope, authoriser and expiry date.
- **Acceptance test:** a matrix covering one-reviewer, two-reviewer, same-person-twice, revoked, expired-exception and concurrent-approval cases must produce the expected decision in every cell; a quorum cannot be satisfied by one person or one stale approval.
- **Why not now:** it requires an approval-policy model and quorum transaction, and would change the export invariant that Round 2's tests currently pin.

## Deliberately dropped from earlier drafts

SSO and generic load testing were removed: they are not substantive product improvements for this brief and would read as padding. Visual and accessibility basics (contrast checks, alt-text presence, and bounded logo hash comparison) were brought forward into Round 2, leaving the three improvements above strictly unbuilt.
