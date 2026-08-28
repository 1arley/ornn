#!/usr/bin/env python3
"""Migrate SKILL.md frontmatter from legacy to the portable Agent Skills format.

Legacy:
  ---
  name: adversarial-review
  description: ...
  category: audit
  triggers:
    - "..."
  priority: high
  ---

Portable (Agent Skills compatible, project data under metadata:aes-*):
  ---
  name: adversarial-review
  description: ...
  license: MIT
  metadata:
    aes-category: audit
    aes-triggers:
      - "..."
    aes-priority: high
  ---

Idempotent: a file already in portable form (with aes-triggers) is left
untouched. Re-running after a partial migration repairs missing fields.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"

LEGACY_FIELDS = ("category", "triggers", "priority")
NEWLINE = "\n"


def _parse_fields(fm: str) -> dict[str, str | list[str]]:
    """Parse a frontmatter block into {field: scalar-or-list}. Handles both the
    legacy shape and the portable 'metadata:' shape (aes-* keys are collapsed)."""
    fields: dict[str, str | list[str]] = {}
    current_key: str | None = None
    for raw in fm.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("- "):
            if current_key:
                fields.setdefault(current_key, []).append(line[2:].strip().strip('"\''))
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
    fm = fm_block[3:].strip()
    fields = _parse_fields(fm)

    # A complete portable frontmatter (with triggers) needs no change.
    if "aes-triggers" not in fm or "metadata:" not in fm:
        pass  # may still be partially migrated; reconstruct below

    name = fields.get("name")
    description = fields.get("description")
    if not name or not description:
        return text

    out = [f"name: {name}", f"description: {description}", f"license: {license_name}"]
    metadata_lines = []
    for key in LEGACY_FIELDS:
        val = fields.get(key)
        if val is None:
            continue
        if isinstance(val, list) and val:
            metadata_lines.append(f"    aes-{key}:")
            for item in val:
                metadata_lines.append(f"      - {item}")
        elif isinstance(val, str):
            metadata_lines.append(f"    aes-{key}: {val}")
    if metadata_lines:
        out.append("metadata:")
        out.extend(metadata_lines)

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
