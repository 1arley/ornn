#!/usr/bin/env python3
"""Migrate legacy SKILL.md frontmatter to portable Agent Skills form.

Legacy routing lists are intentionally NOT copied: catalog/skills.yaml is the
single source of truth for triggers and relationships. Only scalar project
metadata stays in the source frontmatter under the `aes-` namespace.

Legacy:
  name, description, category, triggers, priority

Portable:
  name, description, license, metadata:{aes-category, aes-priority}

No skill body text is modified. Idempotent.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"
NEWLINE = "\n"


def _parse_fields(fm: str) -> dict[str, str | list[str]]:
    fields: dict[str, str | list[str]] = {}
    current_key: str | None = None
    for raw in fm.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line == "metadata:":
            continue
        if line.startswith("- "):
            if current_key:
                fields.setdefault(current_key, []).append(
                    line[2:].strip().strip('"\''))
            continue
        if ":" in line:
            key, _, val = line.partition(":")
            key = key.strip().strip('"\'')
            val = val.strip().strip('"\'')
            if key.startswith("aes-"):
                key = key[len("aes-"):]
            current_key = None
            if val:
                fields[key] = val
            else:
                fields[key] = []
                current_key = key
    return fields


def migrate(text: str, license_name: str = "MIT") -> str:
    if not text.startswith("---"):
        return text
    parts = text.split("\n---", 1)
    if len(parts) < 2:
        return text
    fm_block, body = parts
    fields = _parse_fields(fm_block[3:].strip())
    name = fields.get("name")
    description = fields.get("description")
    if not name or not description:
        return text

    out = [
        f"name: {name}",
        f"description: {description}",
        f"license: {license_name}",
        "metadata:",
    ]
    if fields.get("category"):
        out.append(f"    aes-category: {fields['category']}")
    if fields.get("priority"):
        out.append(f"    aes-priority: {fields['priority']}")

    return "---" + NEWLINE + NEWLINE.join(out) + NEWLINE + "---" + body


def main() -> int:
    changed = 0
    for path in sorted(SKILLS_DIR.rglob("SKILL.md")):
        original = path.read_text(encoding="utf-8")
        migrated = migrate(original)
        if migrated != original:
            path.write_text(migrated, encoding="utf-8")
            changed += 1
            print(f"migrated: {path.relative_to(ROOT)}")
    print(f"Done: {changed} file(s) rewritten.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
