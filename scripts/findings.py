#!/usr/bin/env python3
"""Normalize, deduplicate and recalibrate findings.

Identity follows plan.md § 8.1:
  affected_component + invariant + mechanism + state_transition + impact

Final confidence is recomputed from consolidated evidence, never selected as
`max(claimed_confidence)`. Provenance is preserved as:
  generated_by, investigated_by, verified_by, evidence

Input/output are JSON. Zero third-party dependencies.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

CONFIDENCE = ("SPECULATIVE", "POSSIBLE", "HIGH CONFIDENCE", "CONFIRMED")
SEVERITY_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}

# Evidence that demonstrates observed behavior, not just plausible code shape.
DIRECT_EVIDENCE_TYPES = {
    "reproduction", "test", "log", "request-response", "database-query",
    "measurement", "accessibility-tree", "manual-test",
}
# Evidence that can strongly establish mechanism without full reproduction.
STRONG_EVIDENCE_TYPES = {
    "code", "schema", "configuration", "specification", "trace",
}

STOPWORDS = {
    "a", "an", "and", "as", "at", "be", "by", "for", "from", "in", "is",
    "it", "of", "on", "or", "that", "the", "this", "to", "with", "without",
    "can", "may", "could", "will", "when", "after", "before", "into",
    "must", "most", "more", "than", "no", "again", "receives",
}

TOKEN_EQUIVALENTS = {
    "users": "user", "customer": "user", "customers": "user",
    "requests": "request", "retries": "retry",
    "duplicates": "duplicate", "duplicated": "duplicate", "duplication": "duplicate",
    "twice": "duplicate", "two": "duplicate",
    "concurrent": "concurrency", "simultaneous": "concurrency",
    "unauthorized": "authorization", "authz": "authorization",
    "removed": "remove", "removal": "remove", "deleted": "delete",
    "rewards": "reward", "points": "point", "charges": "charge",
    "charged": "charge", "creates": "create", "created": "create",
    "processes": "process", "processed": "process",
    "unprocessed": "pending", "records": "record",
    "writes": "write", "written": "write", "reads": "read",
    "fails": "failure", "failed": "failure", "errors": "error",
    "confirmed": "confirm", "reproduced": "reproduction",
}


def _normalize_text(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).lower()
    text = re.sub(r"[`'\"_*]", "", text)
    text = re.sub(r"[^a-z0-9./:_-]+", " ", text)
    return " ".join(text.split())


def _tokens(value: object) -> set[str]:
    words = re.split(r"[\s/.:_-]+", _normalize_text(value))
    out = set()
    for word in words:
        if not word or word in STOPWORDS:
            continue
        out.add(TOKEN_EQUIVALENTS.get(word, word))
    return out


def _similarity(a: object, b: object) -> float:
    left, right = _tokens(a), _tokens(b)
    if not left and not right:
        return 1.0
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def _component_match(a: object, b: object) -> bool:
    left, right = _normalize_text(a), _normalize_text(b)
    if left == right:
        return True
    # Components often differ only by path decoration or HTTP verb.
    return _similarity(left, right) >= 0.75


def same_finding(a: dict, b: dict) -> bool:
    """Conservative semantic identity check.

    An explicit `identity_key` wins. Otherwise component must match and at
    least three of the four semantic dimensions must be sufficiently similar.
    Mechanism and invariant cannot both be absent.
    """
    key_a = a.get("identity_key")
    key_b = b.get("identity_key")
    if key_a and key_b:
        return _normalize_text(key_a) == _normalize_text(key_b)
    if not _component_match(a.get("affected_component"), b.get("affected_component")):
        return False
    if not (a.get("invariant") or a.get("mechanism")):
        return False
    if not (b.get("invariant") or b.get("mechanism")):
        return False

    thresholds = {
        "invariant": 0.55,
        "mechanism": 0.55,
        "state_transition": 0.50,
        "impact": 0.45,
    }
    matches = sum(
        1 for field, threshold in thresholds.items()
        if _similarity(a.get(field), b.get(field)) >= threshold
    )
    # Mechanism is the strongest disambiguator: require mechanism similarity or
    # all other dimensions to match.
    mechanism_match = _similarity(a.get("mechanism"), b.get("mechanism")) >= 0.55
    return matches >= 3 and (mechanism_match or matches == 4)


def _normalize_evidence(evidence: object) -> dict:
    if isinstance(evidence, str):
        return {
            "type": "reasoning",
            "description": evidence,
            "source": "",
            "result": "",
        }
    if not isinstance(evidence, dict):
        return {
            "type": "reasoning", "description": str(evidence),
            "source": "", "result": "",
        }
    return {
        "type": _normalize_text(evidence.get("type") or "reasoning"),
        "description": str(evidence.get("description") or "").strip(),
        "source": str(evidence.get("source") or "").strip(),
        "result": str(evidence.get("result") or "").strip(),
    }


def _evidence_key(evidence: dict) -> tuple[str, str, str, str]:
    return (
        evidence["type"],
        _normalize_text(evidence["description"]),
        _normalize_text(evidence["source"]),
        _normalize_text(evidence["result"]),
    )


def confidence_from_evidence(finding: dict) -> tuple[str, list[str]]:
    """Return (confidence, reasons) based on mechanism + consolidated evidence."""
    mechanism = _normalize_text(finding.get("mechanism"))
    evidence = [_normalize_evidence(e) for e in finding.get("evidence", [])]
    # A label is not evidence. Direct evidence needs what was done and what was
    # observed; structural evidence needs a concrete source location.
    direct = [e for e in evidence if e["type"] in DIRECT_EVIDENCE_TYPES
              and e["description"] and e["result"]]
    strong = [e for e in evidence if e["type"] in STRONG_EVIDENCE_TYPES
              and e["description"] and e["source"]]
    reasons: list[str] = []

    if mechanism and direct:
        reasons.append("mechanism described")
        reasons.append("direct evidence present: " + ", ".join(sorted({e['type'] for e in direct})))
        return "CONFIRMED", reasons
    if mechanism and strong:
        reasons.append("mechanism described")
        reasons.append("strong structural evidence present, but no direct reproduction")
        return "HIGH CONFIDENCE", reasons
    if mechanism or direct or strong:
        if mechanism:
            reasons.append("mechanism described but evidence is not strong/direct")
        else:
            reasons.append("evidence exists but exact mechanism is missing")
        return "POSSIBLE", reasons
    reasons.append("no exact mechanism and no sufficient evidence")
    return "SPECULATIVE", reasons


def _best_text(group: list[dict], field: str) -> str:
    values = [str(f.get(field) or "").strip() for f in group if f.get(field)]
    if not values:
        return ""
    # Prefer the most informative string; stable lexical tie-break.
    return sorted(values, key=lambda v: (len(_tokens(v)), len(v), v), reverse=True)[0]


def _merge_group(group: list[dict]) -> dict:
    evidence_map: dict[tuple, dict] = {}
    generated_by: set[str] = set()
    investigated_by: set[str] = set()
    verified_by: set[str] = set()
    raw_ids: list[str] = []
    claimed: set[str] = set()

    for finding in group:
        raw_ids.append(str(finding.get("id") or ""))
        claimed_value = str(finding.get("claimed_confidence") or "").upper()
        if claimed_value:
            claimed.add(claimed_value)
        for skill in finding.get("generated_by", []) or []:
            generated_by.add(str(skill))
        for skill in finding.get("investigated_by", []) or []:
            investigated_by.add(str(skill))
        for skill in finding.get("verified_by", []) or []:
            verified_by.add(str(skill))
        # Backward-compatible `skills` defaults to investigator provenance.
        for skill in finding.get("skills", []) or []:
            investigated_by.add(str(skill))
        for item in finding.get("evidence", []) or []:
            normalized = _normalize_evidence(item)
            evidence_map[_evidence_key(normalized)] = normalized

    component = _best_text(group, "affected_component")
    invariant = _best_text(group, "invariant")
    mechanism = _best_text(group, "mechanism")
    transition = _best_text(group, "state_transition")
    impact = _best_text(group, "impact")
    identity_material = "|".join(
        _normalize_text(x) for x in
        (component, invariant, mechanism, transition, impact)
    )
    identity = "finding-" + hashlib.sha256(identity_material.encode()).hexdigest()[:12]

    severity = max(
        (str(f.get("severity") or "LOW").upper() for f in group),
        key=lambda s: SEVERITY_ORDER.get(s, -1),
        default="LOW",
    )
    merged = {
        "id": identity,
        "title": _best_text(group, "title") or identity,
        "severity": severity,
        "affected_component": component,
        "invariant": invariant,
        "mechanism": mechanism,
        "state_transition": transition,
        "impact": impact,
        "generated_by": sorted(generated_by),
        "investigated_by": sorted(investigated_by),
        "verified_by": sorted(verified_by),
        "evidence": sorted(evidence_map.values(), key=_evidence_key),
        "raw_finding_ids": sorted(x for x in raw_ids if x),
        "claimed_confidences": sorted(claimed),
    }
    confidence, reasons = confidence_from_evidence(merged)
    merged["confidence"] = confidence
    merged["confidence_reasons"] = reasons
    return merged


def consolidate(raw_findings: list[dict]) -> dict:
    """Consolidate raw findings with transitive grouping and provenance."""
    groups: list[list[dict]] = []
    for finding in raw_findings:
        if not isinstance(finding, dict):
            raise ValueError("every raw finding must be an object")
        matching = [i for i, group in enumerate(groups)
                    if any(same_finding(finding, prior) for prior in group)]
        if not matching:
            groups.append([finding])
            continue
        first = matching[0]
        groups[first].append(finding)
        # Transitive merge: if the new finding bridges groups, consolidate them.
        for index in reversed(matching[1:]):
            groups[first].extend(groups.pop(index))

    findings = [_merge_group(group) for group in groups]
    findings.sort(key=lambda f: (
        -SEVERITY_ORDER.get(f["severity"], -1),
        -CONFIDENCE.index(f["confidence"]),
        f["id"],
    ))
    return {
        "raw_findings_count": len(raw_findings),
        "consolidated_findings_count": len(findings),
        "duplicates_removed": len(raw_findings) - len(findings),
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Deduplicate findings and recompute confidence from evidence")
    parser.add_argument("--input", required=True, help="raw findings JSON or '-'")
    parser.add_argument("--output", help="write consolidated JSON to path")
    args = parser.parse_args()

    if args.input == "-":
        data = json.load(sys.stdin)
    else:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    raw = data.get("findings", data) if isinstance(data, dict) else data
    if not isinstance(raw, list):
        raise SystemExit("input must be a JSON list or {\"findings\": [...]} object")
    result = consolidate(raw)
    encoded = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        Path(args.output).write_text(encoded, encoding="utf-8")
    else:
        sys.stdout.write(encoded)
    return 0


if __name__ == "__main__":
    sys.exit(main())
