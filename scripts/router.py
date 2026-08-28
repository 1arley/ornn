#!/usr/bin/env python3
"""Deterministic skill router built on catalog/skills.yaml.

The router's goal (plan.md § 7):

    select the smallest sufficient set of skills to falsify the relevant
    assumptions — not the largest set of possibly-related skills.

Scoring model (plan.md § 7.2):

    score =
        trigger_match
      + domain_match
      + risk_match
      + composition_bonus
      - overlap_penalty
      - unnecessary_cost

Skill budget by risk (plan.md § 7.1):

    trivial   0..1
    medium    1..2
    high      2..4
    critical  3..6

Execution order follows role: generator -> investigator -> verifier ->
reviewer -> researcher (research first when uncertainty is the main problem).

Zero third-party dependencies — stdlib only. Reuses the minimal YAML parser
from validate.py.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from validate import parse_yaml_list  # noqa: E402

CATALOG_PATH = ROOT / "catalog" / "skills.yaml"

# Weights for the scoring model. Kept as module constants so the eval harness
# can compare tuning experiments (PR 4) without touching execution code.
W_TRIGGER = 2.0
W_DOMAIN = 1.5
# Risk does NOT blanket-bonus high-priority skills (that over-routes). It only
# unlocks a skill that clears its risk_floor; selection is driven by triggers,
# domain and signals.
W_RISK_UNLOCK = 0.3
W_RISK_BELOW_FLOOR = -10.0
W_COMPOSITION = 0.5
W_OVERLAP = -0.6
W_COST = -0.2
W_REQUIRED_SIGNAL = 0.5

STOPWORDS = {
    "the", "a", "an", "and", "or", "for", "with", "to", "of", "in", "on",
    "at", "this", "that", "is", "are", "was", "it", "its", "as", "by", "be",
    "when", "what", "how", "check", "find", "audit", "review", "research",
    "test", "evaluate", "verif", "handle", "for", "and", "your", "our",
    "can", "does", "do", "we", "our", "about", "over", "up", "out", "so",
    "if", "then", "than", "too", "very", "just", "but", "not", "no", "yes",
}

# Conservative equivalence groups only. Adjacent concepts (for example
# `state` and `cache`, or `accessibility` and `keyboard`) are deliberately NOT
# synonyms: those relations belong in catalog composition, not lexical match.
SYNONYM_GROUPS: list[set[str]] = [
    {"foreign", "fk"},
    {"key", "identifier", "id"},
    {"orphan", "dangling"},
    {"delete", "removed", "removal"},
    {"constraint", "ddl"},
    {"database", "db", "sql"},
    {"rule", "invariant", "policy"},
    {"limit", "quota"},
    {"enforce", "validate"},
    {"authorization", "authz", "permission", "access-control", "idor"},
    {"ownership", "owner", "belongs"},
    {"idempotency", "idempotent", "dedupe", "dedup"},
    {"retry", "repeat", "resend", "replay"},
    {"error", "failure", "fail", "exception"},
    {"crash", "abort"},
    {"race", "concurrency", "concurrent", "simultaneous", "parallel"},
    {"reward", "xp", "point", "coin", "reputation"},
    {"abuse", "exploit"},
    {"farm", "farming"},
    {"api", "endpoint", "rest"},
    {"input", "payload", "parameter"},
    {"trust", "trusted"},
    {"accessibility", "a11y", "wcag"},
    {"keyboard", "tab", "tabbing"},
    {"ux", "usability"},
    {"animation", "motion"},
    {"flow", "wizard", "funnel"},
    {"state", "status"},
    {"sync", "desync", "divergence"},
    {"market", "competitor", "industry"},
    {"github", "repository", "repo"},
    {"research", "sources", "literature"},
]

# Per-risk budget: (min, max) skills selected. Exceeding max is allowed only
# with a concrete justification (recorded in the output `justification`).
BUDGET = {
    "trivial": (0, 1),
    "medium": (1, 2),
    "high": (2, 4),
    "critical": (3, 6),
}

# A simple, deterministic domain classifier. The catalog also carries
# categories; this maps dominant signals to the seven project categories.
DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "audit": ["audit", "adversarial", "attack", "find bugs", "security review",
              "assumption", "stress test"],
    "security": ["authorization", "authentication", "permission", "access control",
                 "role", "idor", "privilege", "api", "endpoint", "input", "trust",
                 "abuse", "mass assignment", "rate limit", "bypass"],
    "reliability": ["race", "concurrency", "idempoten", "retry", "duplicate",
                    "data integrity", "transaction", "crash", "rollback", "timeout",
                    "consistency", "cache"],
    "product": ["gamification", "xp", "points", "reward", "streak", "achievement",
                "reputation", "coin", "referral", "scoring", "quota", "limit",
                "business rule", "invariant", "ownership", "checkout", "payment"],
    "frontend": ["ux", "usability", "visual", "typography", "animation", "motion",
                 "accessibility", "a11y", "wcag", "keyboard", "interaction",
                 "hover", "focus", "design", "interface", "micro-interaction",
                 "loading state"],
    "research": ["research", "reference", "github", "market", "implementation",
                 "how do", "how others", "find sources", "comparison", "pattern"],
    "meta": [],
}

# Risk estimation keywords. Money/rewards/permissions push toward high/critical.
RISK_HIGH_KEYWORDS = ["payment", "checkout", "refund", "charge", "money", "balance",
                      "reward", "xp", "points", "permission", "authorization",
                      "role", "ownership", "transfer", "webhook", "race",
                      "concurrency", "double spend", "idempotency", "quota"]
RISK_MEDIUM_KEYWORDS = ["state", "cache", "sync", "retry", "flow", "onboarding",
                        "error handling", "form", "input", "api"]

# Cross-category bonus: a task dominated by one category still benefits from
# adjacent categories (reliability when product, security when audit, ...).
CATEGORY_AFFINITY: dict[str, list[str]] = {
    "audit": ["security", "reliability"],
    "security": ["audit", "reliability"],
    "reliability": ["audit", "product"],
    "product": ["reliability", "security"],
    "frontend": ["research"],
    "research": ["frontend", "audit"],
    "meta": [],
}

ROLE_ORDER = {
    "router": 0,
    "researcher": 1,
    "generator": 2,
    "investigator": 3,
    "verifier": 4,
    "reviewer": 5,
}

LEMMATIZE = [
    ("conditions", "condition"), ("abilities", "ability"),
    ("checks", "check"), ("spends", "spend"), ("charges", "charge"),
]


def _norm(text: str) -> str:
    """Normalize a phrase for matching: lowercase, collapse whitespace,
    light stem of plural/verb forms."""
    t = " ".join(text.lower().split())
    for a, b in LEMMATIZE:
        t = t.replace(a, b)
    return t


def _without_negated_phrases(text: str) -> str:
    """Drop a small negation window so negative context does not route.

    Example: `no state, no permissions` must not activate state/security.
    This is intentionally conservative and only removes the next 1-3 tokens.
    """
    tokens = _norm(text).replace(",", " , ").replace(";", " ; ").split()
    out: list[str] = []
    skip = 0
    for token in tokens:
        clean = token.strip(".!?:")
        if clean in {"no", "not", "without", "none", "never"}:
            skip = 3
            continue
        if token in {",", ";"}:
            skip = 0
            continue
        if skip > 0:
            skip -= 1
            continue
        out.append(token)
    return " ".join(out)


def _stem(word: str) -> str:
    """Very light stemmer: drop common inflectional suffixes. Keeps enough
    signal for routing without the complexity of a real stemmer."""
    w = word.strip("-,.!?;:'\"")
    if len(w) <= 3:
        return w
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("ing") and len(w) > 5:
        return w[:-3]
    if w.endswith("ed") and len(w) > 4:
        return w[:-2]
    if w.endswith("es") and len(w) > 4 and w not in ("address",):
        return w[:-2]
    if w.endswith("s") and not w.endswith("ss") and len(w) > 3:
        return w[:-1]
    return w


class Router:
    def __init__(self, catalog_path: Path = CATALOG_PATH):
        entries = parse_yaml_list(catalog_path.read_text(encoding="utf-8"))
        self.skills = {str(e["name"]): e for e in entries}
        self.triggers: dict[str, list[str]] = {
            name: [_norm(t) for t in e.get("triggers", [])]
            for name, e in self.skills.items()
        }

    # ------------------------------------------------------------------
    # Task analysis
    # ------------------------------------------------------------------

    def classify_domain(self, task: str) -> str:
        text = _without_negated_phrases(task)
        scores = {cat: 0 for cat in DOMAIN_KEYWORDS}
        for cat, kws in DOMAIN_KEYWORDS.items():
            scores[cat] = sum(1 for kw in kws if kw in text)
        # tie-break towards the catalog priority of matched skills is handled
        # later; here we just need the dominant category.
        best = max(scores, key=lambda c: (scores[c], c == "audit"))
        return best if scores[best] > 0 else "audit"

    def estimate_risk(self, task: str) -> str:
        text = _norm(task)
        high = sum(1 for kw in RISK_HIGH_KEYWORDS if kw in text)
        med = sum(1 for kw in RISK_MEDIUM_KEYWORDS if kw in text)
        if high >= 2:
            return "critical"
        if high == 1:
            return "high"
        if med >= 2:
            return "medium"
        if med == 1:
            return "medium"
        return "trivial"

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def _word_tokens(self, text: str) -> set[str]:
        words = {_stem(w) for w in _norm(text).split() if w not in STOPWORDS}
        return words

    def _expand_synonyms(self, word: str) -> set[str]:
        """One-word expansions for exact and synonym-group membership."""
        base = _stem(word)
        expanded = {base}
        for group in SYNONYM_GROUPS:
            stems = {_stem(w) for w in group}
            if base in stems:
                expanded.update(stems)
        return expanded

    def _trigger_score(self, task: str, name: str) -> tuple[float, list[str]]:
        """Trigger match via word overlap with synonym expansion."""
        text = _without_negated_phrases(task)
        task_words = self._word_tokens(text)
        matched: list[str] = []
        score = 0.0
        for trigger in self.triggers.get(name, []):
            trig_words = [w for w in trigger.split() if w not in STOPWORDS]
            if not trig_words:
                continue
            # Count how many content words of the trigger have a synonym or
            # exact match in the task.
            hits = 0
            for tw in trig_words:
                expanded = self._expand_synonyms(tw)
                if expanded & task_words:
                    hits += 1
            coverage = hits / len(trig_words)
            if coverage >= 0.4:
                matched.append(trigger)
                score += W_TRIGGER * coverage
        return score, matched

    def _domain_score(self, task: str, name: str, dominant: str) -> float:
        entry = self.skills[name]
        cat = entry["category"]
        if cat == dominant:
            return W_DOMAIN
        if cat in CATEGORY_AFFINITY.get(dominant, []):
            return W_DOMAIN * 0.5
        return 0.0

    def _risk_score(self, risk: str, name: str) -> tuple[float, str]:
        entry = self.skills[name]
        floor = entry.get("risk_floor", "trivial")
        # If risk is below the skill's floor, the skill is irrelevant.
        order = ["trivial", "medium", "high", "critical"]
        if order.index(risk) < order.index(floor):
            return W_RISK_BELOW_FLOOR, f"risk {risk} below floor {floor}"
        # Risk unlocks the skill; it does not add a blanket bonus to all
        # high-priority skills. The unlock nudges the score so floor-cleared
        # skills outrank ties.
        return W_RISK_UNLOCK, ""

    def _signal_score(self, task: str, name: str) -> float:
        entry = self.skills[name]
        signals = entry.get("requires_signals", [])
        text = _without_negated_phrases(task)
        words = self._word_tokens(text)
        hits = 0
        for s in signals:
            sig_words = [w for w in s.replace("-", " ").split()
                         if w not in STOPWORDS]
            matched = any(self._expand_synonyms(w) & words for w in sig_words)
            if sig_words and matched:
                hits += 1
        return W_REQUIRED_SIGNAL * hits

    def route(self, task: str, risk: str | None = None,
              category: str | None = None) -> dict:
        """Select and order the smallest sufficient skill set."""
        dominant = category or self.classify_domain(task)
        risk = risk or self.estimate_risk(task)

        # Raw scores, before composition/overlap adjustments.
        scores: dict[str, dict] = {}
        for name in self.skills:
            if name in ("skill-router", "research-router"):
                continue  # routers dispatch; they are not dispatched to
            trig, matched = self._trigger_score(task, name)
            dom = self._domain_score(task, name, dominant)
            risk_s, risk_reason = self._risk_score(risk, name)
            sig = self._signal_score(task, name)
            total = trig + dom + risk_s + sig
            scores[name] = {
                "score": round(total, 3),
                "trigger_match": len(matched),
                "trigger_score": trig,
                "domain_match": dom,
                "risk": risk_s,
                "signals": sig,
                "reasons": matched + ([risk_reason] if risk_reason else []),
                "role": self.skills[name]["role"],
                "category": self.skills[name]["category"],
                "priority": self.skills[name]["priority"],
                "reasoning_cost": self.skills[name].get("reasoning_cost", "low"),
                "research_cost": self.skills[name].get("research_cost", "low"),
            }

        lo, hi = BUDGET.get(risk, (1, 2))

        # Primary selection: only skills with direct trigger evidence become
        # candidates. The trigger_score must be > 0 and the skill must clear
        # the risk floor (risk > -1).  Domain/risk/signal bonuses rank them;
        # they never *select* a skill alone.
        candidates = [
            n for n, s in scores.items()
            if s["trigger_score"] > 0 and s["risk"] > -1
        ]
        candidates.sort(key=lambda n: scores[n]["score"], reverse=True)

        # Greedy selection with overlap penalty.
        selected: list[str] = []
        for name in candidates:
            if name in selected:
                continue
            score = scores[name]["score"]

            if score > 0:
                # Overlap penalty.
                overlap = self.skills[name].get("overlaps_with", [])
                overlap_penalty = W_OVERLAP * sum(1 for p in overlap if p in selected)
                score += overlap_penalty

                # Cost penalty.
                cost = 1 if self.skills[name].get("reasoning_cost") == "medium" else 0
                cost += 1 if self.skills[name].get("research_cost") == "high" else 0
                score += W_COST * cost

            scores[name]["score"] = round(score, 3)
            if score > 0:
                selected.append(name)

        # Composition backbone: add a small number of partners that provide a
        # missing execution role. Partners are ranked by their own evidence,
        # composition bonus and overlap penalty — never alphabetically.
        backbone = set()
        for n in selected:
            backbone.update(self.skills[n].get("composes_with", []))

        def composition_score(name: str) -> float:
            entry = self.skills[name]
            direct = scores[name]["trigger_score"] + scores[name]["signals"]
            comp = sum(1 for p in entry.get("composes_with", []) if p in selected)
            overlap = sum(1 for p in entry.get("overlaps_with", []) if p in selected)
            role_missing = entry["role"] not in {
                self.skills[p]["role"] for p in selected
            }
            return (direct + W_COMPOSITION * comp + (0.75 if role_missing else 0)
                    + W_OVERLAP * overlap)

        ranked_backbone = sorted(
            (n for n in backbone - set(selected)
             if n in scores and scores[n]["risk"] >= 0),
            key=lambda n: (composition_score(n), scores[n]["score"]),
            reverse=True,
        )
        for n in ranked_backbone:
            if len(selected) >= hi:
                break
            role = self.skills[n]["role"]
            current_roles = {self.skills[p]["role"] for p in selected}
            # At medium risk, one additional role is enough. At high/critical
            # risk, verifiers may be added even when a verifier is already
            # present if they bring direct evidence.
            provides_role = role not in current_roles
            confirms_high_risk = (
                risk in ("high", "critical")
                and role == "verifier"
                and scores[n]["trigger_score"] > 0
            )
            if not (provides_role or confirms_high_risk):
                continue
            if composition_score(n) <= 0:
                continue
            selected.append(n)

        # Budget enforcement.
        justification = None
        if len(selected) > hi:
            ordered = sorted(selected, key=lambda n: scores[n]["score"], reverse=True)
            justification = (
                f"selected {len(ordered)} exceeds budget {hi} for risk '{risk}'; "
                f"truncated to highest-scoring {hi}"
            )
            selected = ordered[:max(hi, lo)]
        if len(selected) < lo:
            justification = (
                f"selected {len(selected)} below budget floor {lo} for risk "
                f"'{risk}' (no candidate cleared the evidence threshold)"
            )

        # Order by role: generator -> investigator -> verifier -> reviewer ->
        # researcher. Researchers come last unless research cost dominance.
        selected.sort(key=lambda n: (ROLE_ORDER[self.skills[n]["role"]],
                                     -scores[n]["score"]))

        # Near misses: the top non-selected candidates that looked relevant.
        near = [n for n in candidates if n not in selected][:3]

        return {
            "task": task,
            "dominant_category": dominant,
            "risk": risk,
            "selected": [
                {
                    "name": n,
                    "role": self.skills[n]["role"],
                    "category": self.skills[n]["category"],
                    "score": scores[n]["score"],
                    "reasons": scores[n]["reasons"],
                }
                for n in selected
            ],
            "near_misses": [
                {"name": n, "score": scores[n]["score"],
                 "reasons": scores[n]["reasons"]} for n in near
            ],
            "budget": {"min": lo, "max": hi, "selected": len(selected)},
            "justification": justification,
        }


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Deterministic skill router over catalog/skills.yaml")
    parser.add_argument("task", nargs="*", help="Task description")
    parser.add_argument("--risk", choices=["trivial", "medium", "high", "critical"])
    parser.add_argument("--category", choices=list(DOMAIN_KEYWORDS))
    parser.add_argument("--json", action="store_true", help="emit JSON")
    args = parser.parse_args()

    task = " ".join(args.task) if args.task else "audit this feature"
    result = Router().route(task, risk=args.risk, category=args.category)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0

    print(f"Task:   {task}")
    print(f"Domain: {result['dominant_category']}   Risk: {result['risk']}")
    print(f"Budget: {result['budget']}")
    print("\nSelected (ordered):")
    for s in result["selected"]:
        print(f"  {s['name']:28s} [{s['role']:12s}] score={s['score']:.2f}  "
              f"{'; '.join(s['reasons'])}")
    print("\nNear misses:")
    for n in result["near_misses"]:
        print(f"  {n['name']} (score={n['score']:.2f})")
    if result["justification"]:
        print(f"\nJustification: {result['justification']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
