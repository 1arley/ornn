#!/usr/bin/env python3
"""Deterministic eval harness for the Agent Engineering Skills project.

Subcommands:
  eval.py route [--json] [--out evals/results/...]
      Runs the deterministic catalog-driven router against every routing case
      in evals/cases/**/routing/*.yaml and computes routing metrics
      (plan.md § 5.3): routing_precision, routing_recall,
      critical_skill_recall, over_routing_rate, average_skills_selected,
      unnecessary_skill_count, missing_required_skill_count.

  eval.py findings --input findings.json
      Recomputes consolidated-finding metrics from a findings report produced
      by an external agent run (plan.md § 5.4). This part is gated on external
      model execution: the harness, schema and metric computation are fully
      implemented; feeding it real findings requires running an agent against
      the fixtures (see evals/README.md). `--input -` reads stdin.

  eval.py baseline [--label baseline]
      Records the current routing results as a baseline JSON
      (evals/baselines/<label>.json) for regression comparison.

  eval.py diff --base baseline.json [--cur results.json]
      Compares routing metrics between two result sets and exits non-zero when
      a gate regresses (plan.md § 5.3 / § 5.4).

Gates enforced by `diff` / CI (plan.md § 5.3):
  - critical_skill_recall == 100% on critical cases
  - routing_precision >= 90%
  - routing_recall >= 90%
  - trivial tasks select <= 1 skill

Zero third-party dependencies. Deterministic: same input, same output.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from yaml_mini import parse_yaml, YAMLError  # noqa: E402

EVALS_DIR = ROOT / "evals"
CASES_DIR = EVALS_DIR / "cases"
BASELINES_DIR = EVALS_DIR / "baselines"
RESULTS_DIR = EVALS_DIR / "results"

# Gates from plan.md § 5.3 (initial thresholds).
GATE = {
    "critical_skill_recall": 1.0,
    "routing_precision": 0.90,
    "routing_recall": 0.90,
    "trivial_max_selected": 1,
}

BUDGET = {
    "trivial": (0, 1),
    "medium": (1, 2),
    "high": (2, 4),
    "critical": (3, 6),
}


# ---------------------------------------------------------------------------
# Case loading
# ---------------------------------------------------------------------------

def load_cases(kinds: list[str] | None = None) -> list[dict]:
    """Load all eval case YAML files (optionally filtered by directory kind)."""
    cases: list[dict] = []
    for path in sorted(CASES_DIR.rglob("*.yaml")):
        if "cases" not in str(path):
            continue
        try:
            case = parse_yaml(path.read_text(encoding="utf-8"))
        except YAMLError as e:
            raise SystemExit(f"eval case {path.relative_to(ROOT)}: YAML error: {e}")
        if not isinstance(case, dict) or "id" not in case:
            raise SystemExit(f"eval case {path.relative_to(ROOT)}: missing 'id'")
        case["_path"] = str(path.relative_to(ROOT))
        cases.append(case)
    if kinds:
        cases = [c for c in cases if c.get("category") in kinds]
    return cases


def load_routing_cases() -> list[dict]:
    return [c for c in load_cases() if c.get("category") == "routing"]


# ---------------------------------------------------------------------------
# Routing metrics
# ---------------------------------------------------------------------------

def evaluate_router(router) -> dict:
    """Run the router over all routing cases; return a metrics document."""
    cases = load_routing_cases()
    per_case = []
    agg = {
        "required_found": 0, "required_missing": 0,
        "relevant_selected": 0, "selected_total": 0,
        "unnecessary": 0, "forbidden": 0,
        "trivial_cases": 0, "trivial_overbudget": 0,
        "critical_required": 0, "critical_found": 0,
        "critical_cases": 0, "critical_recall_cases": 0,
        "risk_matches": 0,
    }

    for case in cases:
        risk = case.get("risk", "medium")
        # The agent sees both the task and its context; route the same full
        # prompt rather than discarding the facts that justify expected skills.
        context = case.get("context", []) or []
        full_prompt = case["task"] + "\n" + "\n".join(str(x) for x in context)
        inferred_risk = router.estimate_risk(full_prompt)
        routed = router.route(full_prompt, risk=risk)
        selected = [s["name"] for s in routed["selected"]]
        sel = set(selected)
        required = set(case.get("expected_skills", {}).get("required", []) or [])
        useful = set(case.get("expected_skills", {}).get("useful", []) or [])
        forbidden = set(case.get("expected_skills", {}).get("forbidden", []) or [])
        budget_hi = BUDGET.get(risk, (1, 2))[1]

        # Precision treats both required and useful selections as relevant.
        # Recall is deliberately strict: only required skills count.
        required_found = len(sel & required)
        required_missing = len(required - sel)
        relevant_selected = len(sel & (required | useful))
        unnecessary = len(sel - required - useful)
        forbid = len(sel & forbidden)
        overbudget = len(sel) > budget_hi

        agg["required_found"] += required_found
        agg["required_missing"] += required_missing
        agg["relevant_selected"] += relevant_selected
        agg["selected_total"] += len(sel)
        agg["unnecessary"] += unnecessary
        agg["forbidden"] += forbid
        if inferred_risk == risk:
            agg["risk_matches"] += 1

        if risk == "trivial":
            agg["trivial_cases"] += 1
            if len(sel) > GATE["trivial_max_selected"]:
                agg["trivial_overbudget"] += 1

        if risk in ("critical", "high"):
            agg["critical_required"] += len(required)
            agg["critical_found"] += required_found
            agg["critical_cases"] += 1
            if required_found == len(required) and len(required) > 0:
                agg["critical_recall_cases"] += 1

        per_case.append({
            "id": case["id"],
            "risk": risk,
            "inferred_risk": inferred_risk,
            "risk_match": inferred_risk == risk,
            "selected": sorted(sel),
            "required": sorted(required),
            "useful": sorted(useful),
            "forbidden": sorted(forbidden),
            # Keep tp/fp/fn aliases for compact human output and backwards
            # compatibility with the initial result shape.
            "tp": required_found,
            "fp": unnecessary,
            "fn": required_missing,
            "relevant_selected": relevant_selected,
            "forbidden_selected": sorted(sel & forbidden),
            "over_budget": overbudget,
            "budget_max": budget_hi,
        })

    n = len(cases)
    required_total = agg["required_found"] + agg["required_missing"]

    metrics = {
        "cases_total": n,
        "routing_precision": (
            agg["relevant_selected"] / agg["selected_total"]
            if agg["selected_total"] else 1.0
        ),
        "routing_recall": (
            agg["required_found"] / required_total if required_total else 1.0
        ),
        "critical_skill_recall": (
            agg["critical_found"] / agg["critical_required"]
            if agg["critical_required"] else 1.0
        ),
        "critical_recall_case_rate": (
            agg["critical_recall_cases"] / agg["critical_cases"]
            if agg["critical_cases"] else 1.0
        ),
        "over_routing_rate": (
            sum(1 for c in per_case
                if c["forbidden_selected"] or c["over_budget"] or c["fp"] > 0)
            / n if n else 0.0
        ),
        "over_routing_cases": sum(
            1 for c in per_case
            if c["forbidden_selected"] or c["over_budget"] or c["fp"] > 0
        ),
        "average_skills_selected": (
            agg["selected_total"] / n if n else 0.0
        ),
        "unnecessary_skill_count": agg["unnecessary"],
        "missing_required_skill_count": agg["required_missing"],
        "forbidden_selected_count": agg["forbidden"],
        "trivial_overbudget_cases": agg["trivial_overbudget"],
        "risk_classification_accuracy": (
            agg["risk_matches"] / n if n else 1.0
        ),
        "gates": {
            "critical_skill_recall": GATE["critical_skill_recall"],
            "routing_precision": GATE["routing_precision"],
            "routing_recall": GATE["routing_recall"],
            "trivial_max_selected": GATE["trivial_max_selected"],
        },
    }
    return {"metrics": metrics, "per_case": per_case}


# ---------------------------------------------------------------------------
# Findings metrics (gated on external agent runs)
# ---------------------------------------------------------------------------

def evaluate_findings(report: dict) -> dict:
    """Compute finding-quality metrics from a consolidated findings report.

    Expected shape (see evals/README.md / templates):
      {
        "findings": [
          {
            "id": "f1",
            "confidence": "CONFIRMED|HIGH CONFIDENCE|POSSIBLE|SPECULATIVE",
            "mechanism": true|false,
            "evidence": [...],
            "skills": ["skill-a", "skill-b"],
            "duplicate_of": null | "f2"
          }, ...
        ]
      }

    Metrics (plan.md § 5.4): finding_precision, finding_recall,
    critical_finding_recall, duplicate_finding_rate,
    unsupported_confirmation_rate, confidence_calibration.
    """
    findings = report.get("findings", [])
    expected = report.get("expected_findings", [])

    ids = {f["id"] for f in findings}
    expected_ids = {e.get("id") for e in expected} if expected else set()

    # expected_findings entries may carry {id, critical}
    critical_expected = [e for e in expected if e.get("critical")] if expected else []

    found_expected = [f for f in findings if f["id"] in expected_ids]
    fp = [f for f in findings if f["id"] not in expected_ids]

    # unsupported confirmation: CONFIRMED without a mechanism
    unsupported = [
        f for f in findings
        if f.get("confidence") == "CONFIRMED" and not f.get("mechanism")
    ]

    # duplicates: findings collapsed into a duplicate_of (dedup happened) vs raw
    raw_count = report.get("raw_findings_count", len(findings))
    dup_saved = max(0, raw_count - len(findings))
    duplicate_rate = dup_saved / raw_count if raw_count else 0.0

    # calibration: fraction of findings whose confidence is justified by evidence
    calibrated = 0
    for f in findings:
        conf = f.get("confidence")
        has_evidence = bool(f.get("evidence"))
        if conf == "CONFIRMED" and f.get("mechanism") and has_evidence:
            calibrated += 1
        elif conf == "HIGH CONFIDENCE" and has_evidence:
            calibrated += 1
        elif conf in ("POSSIBLE", "SPECULATIVE"):
            calibrated += 1
    calibration = calibrated / len(findings) if findings else 1.0

    return {
        "finding_precision": (
            len(found_expected) / len(findings) if findings else 1.0
        ),
        "finding_recall": (
            len(found_expected) / len(expected_ids) if expected_ids else 1.0
        ),
        "critical_finding_recall": (
            sum(1 for e in critical_expected if e["id"] in ids)
            / len(critical_expected) if critical_expected else 1.0
        ),
        "duplicate_finding_rate": duplicate_rate,
        "unsupported_confirmation_rate": (
            len(unsupported) / len(findings) if findings else 0.0
        ),
        "confidence_calibration": calibration,
        "false_positive_findings": len(fp),
        "unsupported_count": len(unsupported),
        "duplicates_removed": dup_saved,
    }


# ---------------------------------------------------------------------------
# Baseline & diff
# ---------------------------------------------------------------------------

def save_result(data: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")


def diff_metrics(base: dict, cur: dict) -> tuple[list[str], bool]:
    """Return (problems, passed). Compare cur against base gates & baselines."""
    problems: list[str] = []
    b = base["metrics"]
    c = cur["metrics"]

    for k, gate in b.get("gates", {}).items():
        if k == "trivial_max_selected":
            continue
        if c.get(k, 0) < gate:
            problems.append(
                f"gate failed: {k}={c.get(k):.2f} < required {gate}"
            )
    if c.get("trivial_overbudget_cases", 0) > 0:
        problems.append(
            f"gate failed: trivial cases exceed budget "
            f"({c['trivial_overbudget_cases']} case(s))"
        )

    for k in ("routing_precision", "routing_recall", "critical_skill_recall"):
        if k in b and k in c and c[k] < b[k] - 1e-9:
            problems.append(
                f"regression: {k}={c[k]:.2f} < baseline {b[k]:.2f}"
            )
    if c.get("average_skills_selected", 0) > b.get("average_skills_selected", 0) + 0.1:
        problems.append(
            f"regression: average_skills_selected={c['average_skills_selected']:.2f} "
            f"> baseline {b['average_skills_selected']:.2f}"
        )
    return problems, not problems


def make_router(version: str):
    if version == "v1":
        from router_v1 import RouterV1
        return RouterV1()
    from router import Router
    return Router()


def routing_gate_failures(result: dict) -> list[str]:
    m = result["metrics"]
    failures: list[str] = []
    for key in ("routing_precision", "routing_recall", "critical_skill_recall"):
        gate = GATE[key]
        if m[key] < gate:
            failures.append(f"{key}={m[key]:.3f} < gate {gate:.3f}")
    if m["trivial_overbudget_cases"] > 0:
        failures.append(
            f"trivial_overbudget_cases={m['trivial_overbudget_cases']} > 0")
    return failures


def cmd_route(args) -> int:
    router = make_router(args.router)
    result = evaluate_router(router)
    result["_runner"] = {
        "framework": "eval.py route",
        "mode": "deterministic",
        "router": args.router,
    }

    if args.out:
        save_result(result, ROOT / args.out)
        print(f"saved: {args.out}")

    if not args.json:
        m = result["metrics"]
        print(f"Cases:                     {m['cases_total']}")
        print(f"Routing precision:         {m['routing_precision']:.3f}")
        print(f"Routing recall:            {m['routing_recall']:.3f}")
        print(f"Critical skill recall:     {m['critical_skill_recall']:.3f}")
        print(f"Critical recall case rate: {m['critical_recall_case_rate']:.3f}")
        print(f"Over-routing cases:        {m['over_routing_cases']}")
        print(f"Average skills selected:   {m['average_skills_selected']:.2f}")
        print(f"Unnecessary skills:        {m['unnecessary_skill_count']}")
        print(f"Missing required:          {m['missing_required_skill_count']}")
        print(f"Forbidden selected:        {m['forbidden_selected_count']}")
        print()
        for c in result["per_case"]:
            flags = []
            if c["forbidden_selected"]:
                flags.append(f"FORBIDDEN:{','.join(c['forbidden_selected'])}")
            if c["over_budget"]:
                flags.append("OVERBUDGET")
            if c["fn"]:
                flags.append(f"MISSING:{','.join(set(c['required']) - set(c['selected']))}")
            print(f"  {c['id']:32s} sel={len(c['selected'])} "
                  f"tp={c['tp']} fp={c['fp']} fn={c['fn']} "
                  f"{(' '.join(flags)) if flags else 'ok'}")
    else:
        print(json.dumps(result["metrics"], indent=2, ensure_ascii=False))

    if args.check:
        failures = routing_gate_failures(result)
        if failures:
            for failure in failures:
                print(f"  ✗ gate failed: {failure}", file=sys.stderr)
            return 1
        if not args.json:
            print("\n✓ all routing gates passed")
    return 0


def cmd_findings(args) -> int:
    if args.input == "-":
        report = json.load(sys.stdin)
    else:
        report = json.loads(Path(args.input).read_text(encoding="utf-8"))
    result = evaluate_findings(report)
    result["_gated"] = {
        "note": "This metric depends on an external agent run against the "
                "fixtures (evals/fixtures/*). The harness, schema and metric "
                "computation are complete; the findings JSON must be produced "
                "by an agent (see evals/README.md)."
    }
    if args.out:
        save_result(result, ROOT / args.out)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


def cmd_baseline(args) -> int:
    router = make_router(args.router)
    result = evaluate_router(router)
    path = BASELINES_DIR / f"{args.label}.json"
    save_result(result, path)
    m = result["metrics"]
    print(f"baseline saved: {path.relative_to(ROOT)}")
    print(f"  routing_precision={m['routing_precision']:.3f}  "
          f"routing_recall={m['routing_recall']:.3f}  "
          f"critical_skill_recall={m['critical_skill_recall']:.3f}")
    return 0


def cmd_diff(args) -> int:
    base = json.loads(Path(args.base).read_text(encoding="utf-8"))
    if args.cur:
        cur = json.loads(Path(args.cur).read_text(encoding="utf-8"))
    else:
        from router import Router
        cur = evaluate_router(Router())
    problems, passed = diff_metrics(base, cur)
    for p in problems:
        print(f"  ✗ {p}")
    if passed:
        print("✓ no routing regression against baseline")
    return 0 if passed else 1


def main() -> int:
    parser = argparse.ArgumentParser(prog="eval.py")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_route = sub.add_parser("route", help="deterministic routing eval")
    p_route.add_argument("--json", action="store_true")
    p_route.add_argument("--router", choices=["v1", "v2"], default="v2",
                         help="router implementation to evaluate (default: v2)")
    p_route.add_argument("--check", action="store_true",
                         help="exit non-zero when routing gates fail")
    p_route.add_argument("--out", help="save result JSON (repo-relative)")
    p_route.set_defaults(func=cmd_route)

    p_find = sub.add_parser("findings", help="findings metrics (external-gated)")
    p_find.add_argument("--input", required=True,
                        help="findings JSON, or '-' for stdin")
    p_find.add_argument("--out", help="save result JSON (repo-relative)")
    p_find.set_defaults(func=cmd_findings)

    p_base = sub.add_parser("baseline", help="record routing baseline")
    p_base.add_argument("--label", default="baseline",
                        help="baseline filename (default: baseline)")
    p_base.add_argument("--router", choices=["v1", "v2"], default="v1",
                        help="router implementation to record (default: v1)")
    p_base.set_defaults(func=cmd_baseline)

    p_diff = sub.add_parser("diff", help="compare against baseline")
    p_diff.add_argument("--base", required=True, help="baseline JSON path")
    p_diff.add_argument("--cur", help="current results JSON (default: live)")
    p_diff.set_defaults(func=cmd_diff)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
