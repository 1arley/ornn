#!/usr/bin/env python3
"""Validate the ornn-forge repository against its own contracts.

Checks:
  1. Every skills/**/SKILL.md has valid frontmatter (name, description, category,
     triggers, priority) and all 9 mandated body sections in order.
  2. name matches the directory; category is valid; priority is low|medium|high.
  3. Every references/*.yaml parses, and each entry has the 7 required fields with
     valid type/authority enums and matching category.
  4. Cross-reference integrity: every skill name referenced in
     skills/meta/skill-router/SKILL.md resolves to an existing SKILL.md.

Exit code 0 if all pass, 1 otherwise. Prints a summary.

No third-party dependencies — uses only the standard library.
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import date
from pathlib import Path

from yaml import YAMLError, parse_frontmatter, parse_yaml_list  # noqa: E402

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

SKILLS_DIR = ROOT / "skills"
REFERENCES_DIR = ROOT / "references"
PATTERNS_DIR = ROOT / "patterns"
RECIPES_DIR = ROOT / "recipes"
COLLECTIONS_DIR = ROOT / "collections"
COMMANDS_DIR = ROOT / "commands"
INTEGRATIONS_DIR = ROOT / "integrations"
DETECTORS_DIR = ROOT / "detectors"
EVAL_CASES_DIR = ROOT / "evals" / "cases"
CATALOG = ROOT / "catalog" / "skills.yaml"
ROUTER = SKILLS_DIR / "meta" / "skill-router" / "SKILL.md"

VALID_CATEGORIES = {
    "audit", "security", "reliability", "product",
    "frontend", "research", "meta",
}
VALID_PRIORITIES = {"low", "medium", "high"}
VALID_ROLES = {
    "generator", "investigator", "verifier", "reviewer", "researcher", "router",
}
# Risk levels follow the skill budget scale from plan.md § 7.1.
VALID_RISK_FLOORS = {"trivial", "medium", "high", "critical"}
VALID_LIFECYCLES = {"experimental", "stable", "deprecated"}

VALID_REF_TYPES = {
    "methodology", "heuristic", "inspiration", "implementation", "discovery",
}
VALID_AUTHORITIES = {"established", "community", "vendor", "curated"}
VALID_REF_STATUS = {"active", "degraded", "archived"}
REF_FRESHNESS_DAYS = 180

# All skill names defined by plan.md (the known universe). The router may reference
# skills from later milestones before they are implemented; references to names in
# this set that are not yet on disk are WARNINGS, not errors. A reference to a name
# in NEITHER this set NOR on disk is a real error (typo / unknown skill).
PLAN_SKILLS = {
    # audit (core + deferred dead-end-flow-audit)
    "adversarial-review", "user-flow-audit", "business-logic-audit",
    "edge-case-hunter", "state-consistency-audit", "error-flow-audit",
    "dead-end-flow-audit",
    # security
    "authorization-audit", "api-abuse-audit", "input-trust-audit",
    # reliability
    "race-condition-hunter", "idempotency-audit", "data-integrity-audit",
    # product
    "gamification-audit",
    # frontend
    "ux-review", "visual-quality-review", "interaction-design",
    "animation-review", "accessibility-review", "react-doctor-audit",
    "design-library-research",
    # research
    "reference-research", "github-reference-research", "market-research",
    "implementation-research",
    # meta
    "skill-router", "research-router",
}

REQUIRED_FRONTMATTER = ["name", "description", "category", "triggers", "priority"]

# The 9 mandated body sections, in order (docs/skill-authoring.md).
REQUIRED_SECTIONS = [
    "Objective",
    "When to Use",
    "Mental Model",
    "Investigation Procedure",
    "Questions to Ask",
    "Attack Patterns",
    "Evidence Requirements",
    "False Positives",
    "Output Format",
]

REQUIRED_REF_FIELDS = [
    "name", "url", "type", "category",
    "authority", "use_when", "avoid_when", "search_queries",
]

# ---------------------------------------------------------------------------
# Minimal YAML subset parser
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# YAML parsing — delegated to yaml.py (single source of truth)
# ---------------------------------------------------------------------------

# parse_yaml_list and parse_frontmatter are imported from yaml.py at the
# top of this file.  The minimal YAML subset parser that was here has been
# consolidated into scripts/yaml.py.


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------


def find_skills() -> list[Path]:
    if not SKILLS_DIR.is_dir():
        return []
    return sorted(SKILLS_DIR.rglob("SKILL.md"))


def check_skill(path: Path) -> list[str]:
    """Return a list of error strings for this SKILL.md (empty = ok)."""
    errors: list[str] = []
    rel = path.relative_to(ROOT)
    text = path.read_text(encoding="utf-8")

    try:
        meta, body = parse_frontmatter(text)
    except YAMLError as e:
        return [f"{rel}: frontmatter invalid: {e}"]

    # The source frontmatter is the portable Agent Skills form:
    #   name, description, license (top-level standard fields) + a `metadata:`
    #   namespace carrying the project-specific routing data (aes-*).
    #
    # We accept the two shapes side-by-side during the migration, but only the
    # portable shape satisfies the Agent Skills compatibility gate.
    metadata = meta.get("metadata")
    portable = isinstance(metadata, dict) and metadata.get("aes-category")

    if portable:
        project = metadata
        aes = lambda key: project.get("aes-" + key)  # noqa: E731
    else:
        project = meta
        aes = lambda key: meta.get(key)  # noqa: E731

    for field in ("name", "description", "license"):
        if field not in meta:
            errors.append(f"{rel}: missing frontmatter field '{field}'")

    if not portable:
        errors.append(
            f"{rel}: frontmatter is not Agent Skills portable; use the "
            "metadata.aes-* namespace"
        )
    else:
        for field in ("aes-category", "aes-priority"):
            if field not in metadata:
                errors.append(f"{rel}: metadata missing '{field}'")

    name_value = str(meta.get("name", ""))
    if name_value and not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", name_value):
        errors.append(f"{rel}: invalid Agent Skills name {name_value!r}")
    if len(name_value) > 64:
        errors.append(f"{rel}: Agent Skills name exceeds 64 characters")
    description = str(meta.get("description", ""))
    if description and len(description) > 1024:
        errors.append(f"{rel}: description exceeds 1024 characters")

    proprietary_top_level = {"category", "triggers", "priority"} & set(meta)
    if proprietary_top_level:
        errors.append(
            f"{rel}: proprietary top-level fields are not portable: "
            + ", ".join(sorted(proprietary_top_level))
        )

    # name == directory name (the skill dir, two levels up from SKILL.md)
    skill_dir = path.parent.name
    if "name" in meta and meta["name"] != skill_dir:
        errors.append(
            f"{rel}: frontmatter name {meta['name']!r} != directory {skill_dir!r}"
        )

    category = aes("category")
    if category is not None and category not in VALID_CATEGORIES:
        errors.append(
            f"{rel}: invalid category {category!r} "
            f"(valid: {sorted(VALID_CATEGORIES)})"
        )

    priority = aes("priority")
    if priority is not None and priority not in VALID_PRIORITIES:
        errors.append(
            f"{rel}: invalid priority {priority!r} "
            f"(valid: {sorted(VALID_PRIORITIES)})"
        )

    triggers = aes("triggers")
    if triggers is not None:
        if portable:
            errors.append(
                f"{rel}: 'metadata.aes-triggers' duplicates catalog/skills.yaml; "
                "keep routing lists only in the catalog"
            )
        elif not isinstance(triggers, list):
            errors.append(f"{rel}: 'triggers' must be a list")

    # 9 sections, in order, as '## Heading' (allow trailing text after the heading).
    headings = re.findall(r"^##\s+(.+?)\s*$", body, flags=re.MULTILINE)
    heading_names = [h.strip() for h in headings]
    # The first '## Objective' etc. must appear in order. Allow extra '##' sections
    # after, but the 9 required ones must be present in order.
    idx = 0
    for required in REQUIRED_SECTIONS:
        # find the next heading equal to the required one at or after idx
        found = False
        for j in range(idx, len(heading_names)):
            if heading_names[j] == required:
                idx = j + 1
                found = True
                break
        if not found:
            errors.append(
                f"{rel}: missing or out-of-order section '## {required}'"
            )

    return errors, portable


def check_agent_skills_compatibility(path: Path, portable: bool) -> list[str]:
    """Return warnings for Agent Skills portability issues."""
    warnings: list[str] = []
    if not portable:
        rel = path.relative_to(ROOT)
        warnings.append(
            f"{rel}: frontmatter uses legacy format (not Agent Skills portable). "
            f"Migrate to 'metadata: {{aes-*}}' namespace for ecosystem compatibility."
        )
    return warnings


def check_references() -> tuple[list[str], list[str]]:
    """Return (errors, warnings) for reference catalog checks."""
    errors: list[str] = []
    warnings: list[str] = []
    if not REFERENCES_DIR.is_dir():
        return ([f"{REFERENCES_DIR.relative_to(ROOT)}: references/ directory missing"], [])

    for yml in sorted(REFERENCES_DIR.glob("*.yaml")):
        rel = yml.relative_to(ROOT)
        expected_category = yml.stem  # frontend.yaml → "frontend"
        text = yml.read_text(encoding="utf-8")
        try:
            entries = parse_yaml_list(text)
        except YAMLError as e:
            errors.append(f"{rel}: YAML parse error: {e}")
            continue

        if not entries:
            errors.append(f"{rel}: no entries (empty catalog)")
            continue

        for n, entry in enumerate(entries, 1):
            for field in REQUIRED_REF_FIELDS:
                if field not in entry:
                    errors.append(f"{rel}: entry #{n} missing field '{field}'")

            if "type" in entry and entry["type"] not in VALID_REF_TYPES:
                errors.append(
                    f"{rel}: entry #{n} invalid type {entry['type']!r} "
                    f"(valid: {sorted(VALID_REF_TYPES)})"
                )
            if "authority" in entry and entry["authority"] not in VALID_AUTHORITIES:
                errors.append(
                    f"{rel}: entry #{n} invalid authority {entry['authority']!r} "
                    f"(valid: {sorted(VALID_AUTHORITIES)})"
                )
            if "status" in entry and entry["status"] not in VALID_REF_STATUS:
                errors.append(
                    f"{rel}: entry #{n} invalid status {entry['status']!r} "
                    f"(valid: {sorted(VALID_REF_STATUS)})"
                )
            if "last_verified" not in entry:
                errors.append(f"{rel}: entry #{n} missing 'last_verified'")
            elif entry["last_verified"]:
                try:
                    verified = date.fromisoformat(str(entry["last_verified"]))
                except ValueError:
                    errors.append(
                        f"{rel}: entry #{n} invalid last_verified "
                        f"{entry['last_verified']!r}"
                    )
                else:
                    if (date.today() - verified).days > REF_FRESHNESS_DAYS:
                        warnings.append(
                            f"{rel}: entry #{n} {entry.get('name')} last verified "
                            f"> {REF_FRESHNESS_DAYS} days ago"
                        )
            if "category" in entry and entry["category"] != expected_category:
                errors.append(
                    f"{rel}: entry #{n} category {entry['category']!r} != "
                    f"file category {expected_category!r}"
                )
            if "url" in entry:
                url = str(entry["url"])
                if not re.match(r"^https?://", url):
                    errors.append(f"{rel}: entry #{n} url not absolute: {url!r}")
            for list_field in ("use_when", "avoid_when", "search_queries"):
                if list_field in entry:
                    val = entry[list_field]
                    if not isinstance(val, list) or len(val) == 0:
                        errors.append(
                            f"{rel}: entry #{n} '{list_field}' must be a non-empty list"
                        )

    return errors, warnings


def collect_skill_names() -> set[str]:
    names = set()
    for path in find_skills():
        names.add(path.parent.name)
    return names


def collect_skill_ids() -> set[str]:
    return {
        str(path.parent.relative_to(SKILLS_DIR)).replace(os.sep, "/")
        for path in find_skills()
    }


def check_library_content() -> list[str]:
    """Validate portable patterns, recipes, collections, commands and integrations."""
    from yaml import parse_yaml

    errors: list[str] = []
    version_catalog = ROOT / "catalog" / "library.json"
    if not version_catalog.is_file():
        errors.append("catalog/library.json missing")
    else:
        try:
            version_data = json.loads(version_catalog.read_text(encoding="utf-8"))
            if not re.match(r"^\d+\.\d+\.\d+$", str(version_data.get("sourceVersion", ""))):
                errors.append("catalog/library.json: sourceVersion must be semantic x.y.z")
        except json.JSONDecodeError as exc:
            errors.append(f"catalog/library.json invalid JSON: {exc}")
    skill_ids = collect_skill_ids()
    specs = [
        ("pattern", PATTERNS_DIR, "pattern.yaml",
         {"schema_version", "version", "name", "description", "problem",
          "interaction", "states", "motion", "accessibility", "references",
          "trade_offs"}),
        ("recipe", RECIPES_DIR, None,
         {"schema_version", "version", "name", "description", "skills",
          "references", "recommended_order", "execution"}),
        ("collection", COLLECTIONS_DIR, "collection.yaml",
         {"schema_version", "version", "name", "description", "skills"}),
        ("command", COMMANDS_DIR, None,
         {"schema_version", "version", "name", "description"}),
    ]
    discovered: dict[str, list[dict]] = {}
    for kind, directory, filename, required in specs:
        if not directory.is_dir():
            errors.append(f"{directory.relative_to(ROOT)}: directory missing")
            continue
        paths = sorted(directory.rglob(filename or "*.yaml"))
        if not paths:
            errors.append(f"{directory.relative_to(ROOT)}: no {kind} definitions")
        discovered[kind] = []
        for path in paths:
            rel = path.relative_to(ROOT)
            try:
                doc = parse_yaml(path.read_text(encoding="utf-8"))
            except YAMLError as exc:
                errors.append(f"{rel}: YAML parse error: {exc}")
                continue
            if not isinstance(doc, dict):
                errors.append(f"{rel}: must be a mapping")
                continue
            discovered[kind].append(doc)
            missing = required - set(doc)
            if missing:
                errors.append(f"{rel}: missing fields: {', '.join(sorted(missing))}")
            if str(doc.get("version", "")).count(".") != 2:
                errors.append(f"{rel}: version must be semantic x.y.z")
            if kind in {"recipe", "collection"}:
                values = doc.get("skills", [])
                if not isinstance(values, list) or not values:
                    errors.append(f"{rel}: skills must be a non-empty list")
                else:
                    unknown = set(map(str, values)) - skill_ids
                    if unknown:
                        errors.append(f"{rel}: unknown skill ids: {', '.join(sorted(unknown))}")
            if kind == "recipe" and doc.get("execution") != "external-agent":
                errors.append(f"{rel}: recipes must declare execution: external-agent")

    names = {kind: {str(doc.get("name")) for doc in docs}
             for kind, docs in discovered.items()}
    for path in sorted(COMMANDS_DIR.glob("*.yaml")):
        try:
            doc = parse_yaml(path.read_text(encoding="utf-8"))
        except YAMLError:
            continue
        for field, kind in (("skills", "skill"), ("recipes", "recipe"),
                            ("collections", "collection"), ("patterns", "pattern")):
            values = doc.get(field, []) if isinstance(doc, dict) else []
            if values and not isinstance(values, list):
                errors.append(f"{path.relative_to(ROOT)}: {field} must be a list")
            if field == "skills":
                unknown = set(map(str, values or [])) - skill_ids
            else:
                # Command identifiers may use domain/name while canonical YAML name
                # is intentionally shorter; validate by filesystem suffix too.
                root = {"recipe": RECIPES_DIR, "collection": COLLECTIONS_DIR,
                        "pattern": PATTERNS_DIR}[kind]
                unknown = {str(value) for value in values or [] if not any(
                    candidate.exists() for candidate in (
                        root / f"{value}.yaml", root / str(value) / f"{kind}.yaml",
                        root / str(value) / ("collection.yaml" if kind == "collection" else "pattern.yaml"),
                    )
                ) and str(value).split("/")[-1] not in names.get(kind, set())}
            if unknown:
                errors.append(f"{path.relative_to(ROOT)}: unknown {field}: {', '.join(sorted(unknown))}")

    for integration in ("generic", "claude", "opencode", "codex", "cursor"):
        descriptor = INTEGRATIONS_DIR / integration / "integration.json"
        if not descriptor.is_file():
            errors.append(f"{descriptor.relative_to(ROOT)} missing")
            continue
        try:
            data = json.loads(descriptor.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"{descriptor.relative_to(ROOT)} invalid JSON: {exc}")
            continue
        for field in ("schemaVersion", "version", "name", "adapter", "format"):
            if field not in data:
                errors.append(f"{descriptor.relative_to(ROOT)} missing '{field}'")

    rules = DETECTORS_DIR / "frontend" / "rules.json"
    runner = DETECTORS_DIR / "run.js"
    if not rules.is_file() or not runner.is_file():
        errors.append("detectors: rules.json and run.js are required")
    else:
        try:
            rule_doc = json.loads(rules.read_text(encoding="utf-8"))
            ids = [rule.get("id") for rule in rule_doc.get("rules", [])]
            if not ids or len(ids) != len(set(ids)):
                errors.append("detectors/frontend/rules.json: rules need unique ids")
        except json.JSONDecodeError as exc:
            errors.append(f"detectors/frontend/rules.json invalid JSON: {exc}")
    return errors


# ---------------------------------------------------------------------------
# Catalog checks (catalog/skills.yaml is the single source of truth)
# ---------------------------------------------------------------------------

CATALOG_FIELDS = {
    "name", "category", "role", "priority", "risk_floor", "triggers",
    "requires_signals", "composes_with", "overlaps_with", "reasoning_cost",
    "research_cost", "lifecycle",
}
CATALOG_LIST_FIELDS = {
    "triggers", "requires_signals", "composes_with", "overlaps_with",
}
CATALOG_RELATION_FIELDS = {"composes_with", "overlaps_with"}


def check_catalog() -> list[str]:
    """Validate catalog/skills.yaml against the filesystem and its own schema.

    Detects drift in both directions: every skill on disk must be cataloged and
    every catalog entry must resolve to a SKILL.md on disk.
    """
    errors: list[str] = []
    if not CATALOG.is_file():
        return ["catalog/skills.yaml missing — single source of truth required"]

    try:
        entries = parse_yaml_list(CATALOG.read_text(encoding="utf-8"))
    except YAMLError as e:
        return [f"catalog/skills.yaml: YAML parse error: {e}"]

    if not entries:
        return ["catalog/skills.yaml: no entries (empty catalog)"]

    existing = collect_skill_names()
    names: list[str] = []
    skill_paths = {path.parent.name: path for path in find_skills()}

    for n, entry in enumerate(entries, 1):
        prefix = f"catalog/skills.yaml entry #{n}"

        # --- required scalar fields ---
        for field in ("name", "category", "role", "priority", "risk_floor",
                      "reasoning_cost", "research_cost"):
            if field not in entry:
                errors.append(f"{prefix} missing field '{field}'")

        if "name" in entry:
            name = str(entry["name"])
            names.append(name)
            if name not in existing:
                errors.append(
                    f"{prefix} catalogs '{name}' but no SKILL.md exists on disk"
                )
            else:
                try:
                    frontmatter, _ = parse_frontmatter(
                        skill_paths[name].read_text(encoding="utf-8")
                    )
                    skill_meta = frontmatter.get("metadata", {})
                    expected_category = entry.get("category")
                    expected_priority = entry.get("priority")
                    if skill_meta.get("aes-category") != expected_category:
                        errors.append(
                            f"{prefix} category {expected_category!r} != "
                            f"{name} frontmatter aes-category "
                            f"{skill_meta.get('aes-category')!r}"
                        )
                    if skill_meta.get("aes-priority") != expected_priority:
                        errors.append(
                            f"{prefix} priority {expected_priority!r} != "
                            f"{name} frontmatter aes-priority "
                            f"{skill_meta.get('aes-priority')!r}"
                        )
                except YAMLError as e:
                    errors.append(f"{prefix} cannot parse {name} frontmatter: {e}")

        if "category" in entry and entry["category"] not in VALID_CATEGORIES:
            errors.append(
                f"{prefix} invalid category {entry['category']!r} "
                f"(valid: {sorted(VALID_CATEGORIES)})"
            )
        if "role" in entry and entry["role"] not in VALID_ROLES:
            errors.append(
                f"{prefix} invalid role {entry['role']!r} "
                f"(valid: {sorted(VALID_ROLES)})"
            )
        if "priority" in entry and entry["priority"] not in VALID_PRIORITIES:
            errors.append(
                f"{prefix} invalid priority {entry['priority']!r} "
                f"(valid: {sorted(VALID_PRIORITIES)})"
            )
        if "risk_floor" in entry and entry["risk_floor"] not in VALID_RISK_FLOORS:
            errors.append(
                f"{prefix} invalid risk_floor {entry['risk_floor']!r} "
                f"(valid: {sorted(VALID_RISK_FLOORS)})"
            )
        if "lifecycle" in entry and entry["lifecycle"] not in VALID_LIFECYCLES:
            errors.append(
                f"{prefix} invalid lifecycle {entry['lifecycle']!r} "
                f"(valid: {sorted(VALID_LIFECYCLES)})"
            )
        if "reasoning_cost" in entry and entry["reasoning_cost"] not in VALID_PRIORITIES:
            errors.append(
                f"{prefix} invalid reasoning_cost {entry['reasoning_cost']!r} "
                f"(valid: {sorted(VALID_PRIORITIES)})"
            )
        if "research_cost" in entry and entry["research_cost"] not in VALID_PRIORITIES:
            errors.append(
                f"{prefix} invalid research_cost {entry['research_cost']!r} "
                f"(valid: {sorted(VALID_PRIORITIES)})"
            )

        # --- unknown fields are drift the router cannot interpret ---
        unknown = set(entry) - CATALOG_FIELDS
        if unknown:
            errors.append(f"{prefix} unknown field(s): {sorted(unknown)}")

        # --- list fields ---
        for field in CATALOG_LIST_FIELDS:
            if field not in entry:
                continue
            val = entry[field]
            if not isinstance(val, list):
                errors.append(f"{prefix} '{field}' must be a list")
                continue
            if field in ("triggers", "requires_signals"):
                # Trigger phrases / signal names, not skill names — no resolution.
                if len(val) == 0:
                    errors.append(f"{prefix} '{field}' must be a non-empty list")
                continue
            # composes_with / overlaps_with reference other skills by name.
            for item in val:
                if item not in existing:
                    errors.append(
                        f"{prefix} '{field}' references '{item}' — no such skill "
                        f"on disk"
                    )

    # Every skill on disk must be cataloged (drift in the other direction).
    missing_from_catalog = existing - set(names)
    if missing_from_catalog:
        errors.append(
            "skills on disk missing from catalog: "
            + ", ".join(sorted(missing_from_catalog))
        )

    # name must be unique
    dup_names = sorted({n for n in names if names.count(n) > 1})
    if dup_names:
        errors.append(f"catalog/skills.yaml duplicate names: {dup_names}")

    # Self-reference detection. Composition is intentionally symmetric (it is an
    # undirected "works well together" graph, not a directed dependency), so
    # mutual references are allowed; only a skill listing itself is impossible.
    for entry in entries:
        name = str(entry.get("name", ""))
        for field in CATALOG_RELATION_FIELDS:
            for other in entry.get(field, []):
                if other == name:
                    errors.append(
                        f"catalog/skills.yaml: '{name}' {field} references itself"
                    )

    return errors


def check_router_integrity() -> tuple[list[str], list[str]]:
    """Check skill references in skill-router/SKILL.md.

    Returns (errors, warnings). A reference to a name that is neither on disk nor in
    PLAN_SKILLS is an error (typo / unknown skill). A reference to a name in PLAN_SKILLS
    but not yet implemented is a warning (later-milestone skill).
    """
    errors: list[str] = []
    warnings: list[str] = []
    if not ROUTER.is_file():
        return errors, warnings  # router not built yet; skip
    existing = collect_skill_names()
    text = ROUTER.read_text(encoding="utf-8")
    pattern = re.compile(r"\b([a-z]+-[a-z]+(?:-[a-z]+)*)\b")
    candidates = set(pattern.findall(text))
    known_suffixes = ("-audit", "-hunter", "-review", "-research", "-router",
                      "-design")
    for cand in candidates:
        # Only consider structural references: inside a code block, or a table cell.
        structural = False
        for block in re.findall(r"```.*?```", text, flags=re.DOTALL):
            if cand in block:
                structural = True
                break
        if re.search(rf"\|\s*{re.escape(cand)}\s*\|", text):
            structural = True
        if not structural:
            continue
        if not cand.endswith(known_suffixes):
            continue
        if cand in existing:
            continue
        if cand in PLAN_SKILLS:
            warnings.append(
                f"skill-router references '{cand}' — planned but not yet "
                f"implemented (later milestone)"
            )
        else:
            errors.append(
                f"skill-router references unknown skill '{cand}' "
                f"(not in plan.md and not found under skills/*/)"
            )
    return errors, warnings


# ---------------------------------------------------------------------------
# Eval-case checks
# ---------------------------------------------------------------------------

VALID_EVAL_CATEGORIES = {
    "routing", "audit", "security", "reliability", "product",
    "frontend", "research", "mixed",
}
VALID_EVAL_RISKS = {"trivial", "medium", "high", "critical"}
MIN_BEHAVIORAL_CASES = {
    "audit": 5,
    "security": 5,
    "reliability": 5,
    "product": 4,
    "frontend": 5,
    "research": 3,
    "mixed": 3,
}


def check_eval_cases() -> list[str]:
    """Validate eval case contracts and skill references."""
    errors: list[str] = []
    if not EVAL_CASES_DIR.is_dir():
        return ["evals/cases: eval case directory missing"]

    # Import the shared recursive subset parser only here to keep validate.py
    # runnable directly without package setup.
    from yaml import parse_yaml

    skill_names = collect_skill_names()
    seen_ids: dict[str, Path] = {}
    category_counts = {category: 0 for category in VALID_EVAL_CATEGORIES}
    negative_counts = {category: 0 for category in VALID_EVAL_CATEGORIES}
    paths = sorted(EVAL_CASES_DIR.rglob("*.yaml"))
    if not paths:
        return ["evals/cases: no eval cases found"]

    for path in paths:
        rel = path.relative_to(ROOT)
        try:
            case = parse_yaml(path.read_text(encoding="utf-8"))
        except YAMLError as e:
            errors.append(f"{rel}: YAML parse error: {e}")
            continue
        if not isinstance(case, dict):
            errors.append(f"{rel}: case must be a mapping")
            continue

        for field in ("id", "title", "task", "category", "expected_skills"):
            if field not in case:
                errors.append(f"{rel}: missing field '{field}'")

        case_id = case.get("id")
        if case_id:
            if not re.match(r"^[a-z0-9-]+$", str(case_id)):
                errors.append(f"{rel}: invalid id {case_id!r}")
            if case_id in seen_ids:
                errors.append(
                    f"{rel}: duplicate id {case_id!r} (also in "
                    f"{seen_ids[case_id].relative_to(ROOT)})"
                )
            else:
                seen_ids[str(case_id)] = path

        category = case.get("category")
        if category not in VALID_EVAL_CATEGORIES:
            errors.append(f"{rel}: invalid category {category!r}")
        else:
            category_counts[category] += 1
            if case.get("negative") is True:
                negative_counts[category] += 1
        risk = case.get("risk")
        if risk is not None and risk not in VALID_EVAL_RISKS:
            errors.append(f"{rel}: invalid risk {risk!r}")

        expected = case.get("expected_skills")
        if not isinstance(expected, dict):
            errors.append(f"{rel}: expected_skills must be a mapping")
            continue
        if "required" not in expected:
            errors.append(f"{rel}: expected_skills missing 'required'")

        buckets: dict[str, set[str]] = {}
        for field in ("required", "useful", "forbidden"):
            value = expected.get(field, []) or []
            if not isinstance(value, list):
                errors.append(f"{rel}: expected_skills.{field} must be a list")
                continue
            names = {str(x) for x in value}
            buckets[field] = names
            unknown = names - skill_names
            if unknown:
                errors.append(
                    f"{rel}: expected_skills.{field} references unknown skills: "
                    + ", ".join(sorted(unknown))
                )

        for left, right in (("required", "useful"), ("required", "forbidden"),
                            ("useful", "forbidden")):
            overlap = buckets.get(left, set()) & buckets.get(right, set())
            if overlap:
                errors.append(
                    f"{rel}: skills cannot be both {left} and {right}: "
                    + ", ".join(sorted(overlap))
                )

        if case.get("negative") is True and (case.get("expected_findings") or []):
            errors.append(
                f"{rel}: negative case must not declare expected_findings"
            )
        if category != "routing" and "negative" not in case:
            errors.append(f"{rel}: behavioral case must declare 'negative'")

    for category, minimum in MIN_BEHAVIORAL_CASES.items():
        actual = category_counts.get(category, 0)
        if actual < minimum:
            errors.append(
                f"evals/cases/{category}: {actual} case(s), minimum is {minimum}"
            )
        if negative_counts.get(category, 0) == 0:
            errors.append(
                f"evals/cases/{category}: requires at least one negative case"
            )

    return errors


def check_finding_fixtures() -> list[str]:
    """Verify versioned finding fixtures reproduce their expected outputs."""
    errors: list[str] = []
    fixtures = ROOT / "evals" / "fixtures"
    expected_dir = ROOT / "evals" / "expected"
    specs = [
        ("findings-dedup-input.json", "findings-dedup-output.json"),
        ("findings-confidence-input.json", "findings-confidence-output.json"),
    ]
    try:
        from findings import consolidate
    except ImportError as e:
        return [f"scripts/findings.py import failed: {e}"]

    for input_name, output_name in specs:
        input_path = fixtures / input_name
        output_path = expected_dir / output_name
        for path in (input_path, output_path):
            if not path.is_file():
                errors.append(f"{path.relative_to(ROOT)} missing")
        if not input_path.is_file() or not output_path.is_file():
            continue
        try:
            raw = json.loads(input_path.read_text(encoding="utf-8"))
            expected = json.loads(output_path.read_text(encoding="utf-8"))
            actual = consolidate(raw["findings"])
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            errors.append(f"{input_path.relative_to(ROOT)} invalid: {e}")
            continue
        if actual != expected:
            errors.append(
                f"{output_path.relative_to(ROOT)} drifted; regenerate with "
                f"scripts/findings.py"
            )
    return errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    skills = find_skills()
    if not skills:
        errors.append("No skills/**/SKILL.md files found")
    for path in skills:
        errs, portable = check_skill(path)
        errors.extend(errs)
        warnings.extend(check_agent_skills_compatibility(path, portable))

    ref_errors, ref_warnings = check_references()
    errors.extend(ref_errors)
    warnings.extend(ref_warnings)
    errors.extend(check_catalog())
    errors.extend(check_library_content())
    errors.extend(check_eval_cases())
    errors.extend(check_finding_fixtures())
    e, w = check_router_integrity()
    errors.extend(e)
    warnings.extend(w)

    # Summary
    print(f"Skills found:      {len(skills)}")
    ref_count = 0
    if REFERENCES_DIR.is_dir():
        ref_count = len(list(REFERENCES_DIR.glob("*.yaml")))
    print(f"Reference catalogs: {ref_count}")
    print(f"Errors:             {len(errors)}")
    print(f"Warnings:           {len(warnings)}")
    print()

    if warnings:
        for msg in warnings:
            print(f"  ⚠ {msg}")
        print()

    if errors:
        for e in errors:
            print(f"  ✗ {e}")
        return 1

    if warnings:
        print("✓ All contracts satisfied (with planned-skill warnings above).")
    else:
        print("✓ All contracts satisfied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
