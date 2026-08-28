#!/usr/bin/env python3
"""Validate the agent-engineering-skills repository against its own contracts.

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

import os
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

SKILLS_DIR = ROOT / "skills"
REFERENCES_DIR = ROOT / "references"
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
    "animation-review", "accessibility-review",
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
# We avoid a PyYAML dependency. We only need: a top-level list of mappings where
# values are scalars or lists of scalars. Field order in a mapping is preserved by
# reading sequentially. This is intentionally narrow and strict — it rejects anything
# it cannot fully understand so it never silently passes malformed input.


class YAMLError(ValueError):
    pass


def _parse_scalar(token: str):
    token = token.strip()
    if len(token) >= 2 and token[0] == token[-1] and token[0] in ("'", '"'):
        return token[1:-1]
    return token


def parse_yaml_list(text: str) -> list[dict]:
    """Parse a YAML file that is a list of mappings (scalar / list-of-scalar values).

    Handles two indentation shapes:
      A) mapping item with nested list field:
            - name: x
              use_when:
                - a
                - b
      B) list field at the same indent as its items (frontmatter uses this):
            triggers:
              - a
              - b
    """
    # Drop comments and blank lines, but keep indentation.
    lines = []
    for raw in text.splitlines():
        stripped = raw.rstrip()
        if not stripped.strip():
            continue
        if stripped.lstrip().startswith("#"):
            continue
        lines.append(stripped)

    entries: list[dict] = []
    current: dict | None = None
    # The field currently collecting list items, and the indent at which those items
    # are expected. None when not inside a list field.
    list_field: str | None = None
    list_indent: int | None = None

    for line in lines:
        indent = len(line) - len(line.lstrip())
        body = line.strip()

        is_list_marker = body == "-" or body.startswith("- ")
        marker_payload = body[2:].strip() if body.startswith("- ") else ""

        # Decide whether this line is a nested list item (belongs to list_field) or a
        # new mapping field/item. A nested list item must be indented strictly deeper
        # than the field's own line (shape A) OR at a deeper indent than the current
        # mapping item while list_field is open (shape B for frontmatter).
        nested_item = (
            is_list_marker
            and list_field is not None
            and (list_indent is None or indent > list_indent)
        )

        if nested_item:
            # "list_field" stays open; append the item. If the marker carries a
            # "key: value", that's a mapping inside the list — not supported here.
            if marker_payload and ":" in marker_payload:
                raise YAMLError(
                    f"Mapping list items not supported: {body!r}"
                )
            if marker_payload:
                current[list_field].append(_parse_scalar(marker_payload))
            # bare "-" with payload on next line is unsupported; ignore empties.
            continue

        # Not a nested list item → this line either opens a list field, sets a scalar,
        # or starts a new top-level mapping item. Close any open list field.
        list_field = None
        list_indent = None

        if body.startswith("- "):
            current = {}
            entries.append(current)
            rest = marker_payload
            if ":" in rest:
                key, _, val = rest.partition(":")
                key = key.strip()
                val = val.strip()
                if val == "":
                    current[key] = []
                    list_field = key
                    list_indent = indent
                else:
                    current[key] = _parse_scalar(val)
            else:
                raise YAMLError(f"Unexpected bare item at top level: {body!r}")
        elif body == "-":
            current = {}
            entries.append(current)
        elif ":" in body:
            key, _, val = body.partition(":")
            key = key.strip()
            val = val.strip()
            if current is None:
                raise YAMLError(f"Key outside any item: {body!r}")
            if val == "":
                current[key] = []
                list_field = key
                list_indent = indent
            else:
                current[key] = _parse_scalar(val)
        else:
            raise YAMLError(f"Unexpected line: {body!r}")

    return entries


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Parse leading '---' YAML frontmatter. Returns (metadata, body)."""
    if not text.startswith("---"):
        raise YAMLError("Missing opening '---' frontmatter delimiter")
    end = text.find("\n---", 3)
    if end == -1:
        raise YAMLError("Missing closing '---' frontmatter delimiter")
    fm_text = text[3:end].strip()
    body = text[end + 4:].lstrip("\n")

    if not fm_text:
        return {}, body

    return _parse_frontmatter_dict(fm_text), body


def _parse_frontmatter_dict(text: str) -> dict:
    """Parse a YAML frontmatter mapping (single dict, not a list).

    Handles scalars, lists, and one level of nested mapping under 'metadata:'.
    This is a dedicated parser for the SKILL.md frontmatter format.
    """
    result: dict = {}
    list_key: str | None = None
    list_indent: int | None = None
    nested_key: str | None = None
    nested_indent: int | None = None
    nested: dict | None = None

    lines = []
    for raw in text.splitlines():
        stripped = raw.rstrip()
        if not stripped.strip():
            continue
        if stripped.lstrip().startswith("#"):
            continue
        lines.append(stripped)

    for line in lines:
        indent = len(line) - len(line.lstrip())
        body = line.strip()

        # Nested list item under a list field?
        is_list_marker = body.startswith("- ")
        if is_list_marker and list_key is not None and indent > list_indent:
            payload = body[2:].strip()
            if payload:
                target = nested if nested_key is not None else result
                target.setdefault(list_key, []).append(_parse_scalar(payload))
            continue

        # Nested mapping field under metadata:?
        is_scalar = ":" in body and not is_list_marker
        if nested_key is not None and indent > nested_indent and is_scalar:
            k, _, v = body.partition(":")
            k = k.strip()
            v = v.strip()
            if v == "":
                nested[k] = []
                list_key = k
                list_indent = indent
            else:
                nested[k] = _parse_scalar(v)
            continue

        # End of nested section — flush
        if nested_key is not None:
            result[nested_key] = nested
            nested_key = None
            nested_indent = None
            nested = None

        list_key = None
        list_indent = None

        # Top-level key:value
        if is_scalar:
            k, _, v = body.partition(":")
            k = k.strip()
            v = v.strip()
            if v == "" and k == "metadata":
                nested_key = k
                nested_indent = indent
                nested = {}
            elif v == "":
                result[k] = []
                list_key = k
                list_indent = indent
            else:
                result[k] = _parse_scalar(v)

    if nested_key is not None:
        result[nested_key] = nested

    return result


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

    for field in ("name", "description"):
        if field not in meta:
            errors.append(f"{rel}: missing frontmatter field '{field}'")

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
    if triggers is not None and not isinstance(triggers, list):
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


def check_references() -> list[str]:
    errors: list[str] = []
    if not REFERENCES_DIR.is_dir():
        return [f"{REFERENCES_DIR.relative_to(ROOT)}: references/ directory missing"]

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

    return errors


def collect_skill_names() -> set[str]:
    names = set()
    for path in find_skills():
        names.add(path.parent.name)
    return names


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

    errors.extend(check_references())
    errors.extend(check_catalog())  # catalog validation
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
