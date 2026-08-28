#!/usr/bin/env python3
"""Deterministic model of the pre-catalog skill-router (v1 baseline).

This captures the manual composition table and risk budget documented in the
original skill-router before router v2. It is intentionally frozen: use it only
for reproducible before/after evals (`scripts/eval.py route --router v1`).
"""
from __future__ import annotations

from router import BUDGET, ROLE_ORDER, Router, _norm

# Ordered manual routes copied from the pre-v2 SKILL.md composition table.
TABLE = [
    (("reward", "xp", "point", "streak", "achievement"),
     ["gamification-audit", "business-logic-audit", "idempotency-audit",
      "race-condition-hunter", "api-abuse-audit", "user-flow-audit"]),
    (("payment", "charge", "checkout", "refund"),
     ["business-logic-audit", "idempotency-audit", "race-condition-hunter",
      "data-integrity-audit", "error-flow-audit", "authorization-audit"]),
    (("permission", "role", "ownership", "admin", "moderator", "idor"),
     ["authorization-audit", "input-trust-audit", "business-logic-audit",
      "api-abuse-audit"]),
    (("api", "endpoint", "rate limit", "bypass ui"),
     ["api-abuse-audit", "input-trust-audit", "authorization-audit",
      "edge-case-hunter"]),
    (("concurrency", "race", "simultaneous", "double-spend"),
     ["race-condition-hunter", "idempotency-audit", "data-integrity-audit",
      "business-logic-audit"]),
    (("flow", "onboarding", "wizard", "steps", "dead end"),
     ["user-flow-audit", "state-consistency-audit", "error-flow-audit",
      "edge-case-hunter"]),
    (("error", "rollback", "retry", "timeout", "partial"),
     ["error-flow-audit", "idempotency-audit", "data-integrity-audit",
      "state-consistency-audit"]),
    (("cache", "stale", "desync", "refresh", "back button"),
     ["state-consistency-audit", "user-flow-audit", "data-integrity-audit"]),
    (("ux", "usability", "hierarchy", "empty state", "loading"),
     ["ux-review", "interaction-design", "accessibility-review",
      "reference-research"]),
    (("visual", "typography", "spacing", "ai slop"),
     ["visual-quality-review", "ux-review", "reference-research"]),
    (("animation", "transition", "motion", "reduced motion"),
     ["animation-review", "interaction-design", "accessibility-review"]),
    (("accessibility", "keyboard", "screen reader", "contrast", "wcag"),
     ["accessibility-review", "ux-review"]),
    (("business rule", "invariant", "limit", "quota"),
     ["business-logic-audit", "data-integrity-audit", "input-trust-audit"]),
    (("research", "how others", "references", "implementation"),
     ["reference-research", "market-research", "implementation-research",
      "github-reference-research"]),
]


class RouterV1:
    def __init__(self):
        self.catalog = Router()
        self.skills = self.catalog.skills

    def classify_domain(self, task: str) -> str:
        return self.catalog.classify_domain(task)

    def estimate_risk(self, task: str) -> str:
        return self.catalog.estimate_risk(task)

    def route(self, task: str, risk: str | None = None,
              category: str | None = None) -> dict:
        text = _norm(task)
        risk = risk or self.estimate_risk(task)
        dominant = category or self.classify_domain(task)
        selected: list[str] = []
        reasons: dict[str, list[str]] = {}

        for keywords, skills in TABLE:
            matched = [k for k in keywords if k in text]
            if not matched:
                continue
            for name in skills:
                if name not in selected:
                    selected.append(name)
                    reasons[name] = matched[:]

        if "audit" in text or "adversarial" in text or "attack" in text:
            if "adversarial-review" not in selected:
                selected.insert(0, "adversarial-review")
                reasons["adversarial-review"] = ["generic audit"]

        lo, hi = BUDGET.get(risk, (1, 2))
        justification = None
        if len(selected) > hi:
            justification = (
                f"v1 manual route selected {len(selected)}; truncated to budget {hi}"
            )
            selected = selected[:hi]

        selected.sort(key=lambda n: ROLE_ORDER[self.skills[n]["role"]])
        return {
            "task": task,
            "dominant_category": dominant,
            "risk": risk,
            "selected": [
                {"name": n, "role": self.skills[n]["role"],
                 "category": self.skills[n]["category"], "score": 0.0,
                 "reasons": reasons.get(n, [])}
                for n in selected
            ],
            "near_misses": [],
            "budget": {"min": lo, "max": hi, "selected": len(selected)},
            "justification": justification,
        }
