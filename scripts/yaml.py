#!/usr/bin/env python3
"""Minimal YAML-subset parser (no third-party deps).

Consolidates three parsing strategies used across the repository:

  1. Recursive-descent parser (parse_yaml) — handles documents that are a
     single mapping or a list of mappings with nested values. Used by
     eval.py and check_references.py for eval cases and reference catalogs.

  2. List-of-mappings parser (parse_yaml_list) — handles YAML files that
     are a top-level list of mappings with scalar or list-of-scalar values.
     Used by the router for catalog/skills.yaml and by the validator.

  3. Frontmatter parser (parse_frontmatter) — handles leading '---' YAML
     frontmatter in SKILL.md files. Returns (metadata, body).

All three share the YAMLError exception and the _parse_scalar helper.

Zero third-party dependencies — stdlib only.
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Exception
# ---------------------------------------------------------------------------

class YAMLError(ValueError):
    pass


# ---------------------------------------------------------------------------
# Scalar parsing (shared by all three parsers)
# ---------------------------------------------------------------------------

def _parse_scalar(token: str):
    """Parse a YAML scalar: booleans, null, numbers, quoted strings, bare."""
    token = token.strip()
    if token in ("true", "True"):
        return True
    if token in ("false", "False"):
        return False
    if token in ("null", "None", "~"):
        return None
    if token == "[]":
        return []
    if token == "{}":
        return {}
    if len(token) >= 2 and token[0] == token[-1] and token[0] in ("'", '"'):
        return token[1:-1]
    try:
        if "." in token or "e" in token.lower():
            return float(token)
        return int(token)
    except ValueError:
        return token


# ===========================================================================
# 1. Recursive-descent parser (from yaml_mini.py)
# ===========================================================================

def _split_key_value(body: str) -> tuple[str, str]:
    """Split 'key: value' / 'key:' / 'key: "a: b"' respecting quotes."""
    in_quote = None
    for i, ch in enumerate(body):
        if ch in ("'", '"'):
            if in_quote is None:
                in_quote = ch
            elif in_quote == ch:
                in_quote = None
        elif ch == ":" and in_quote is None:
            return body[:i].strip(), body[i + 1:].strip()
    raise YAMLError(f"not a key: value line: {body!r}")


def _preprocess(text: str) -> list[tuple[int, str]]:
    """Return [(indent, stripped_body)] for non-blank, non-comment lines."""
    out = []
    for raw in text.splitlines():
        if not raw.strip():
            continue
        stripped = raw.strip()
        if stripped.startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip())
        out.append((indent, stripped))
    return out


def _parse_block(lines: list[tuple[int, str]], start: int, indent: int):
    """Parse a block of lines at a given indent.

    Returns (value, next_index). ``value`` is a dict, list, or scalar.
    """
    if start >= len(lines):
        return None, start

    first_indent, first_body = lines[start]

    # ---- list block: lines begin with '- '
    if first_body.startswith("- "):
        items = []
        i = start
        while i < len(lines) and lines[i][0] == indent and lines[i][1].startswith("- "):
            _, body = lines[i]
            payload = body[2:].strip()
            if not payload:
                # bare '-' — start a nested block
                if i + 1 < len(lines) and lines[i + 1][0] > indent:
                    item, i = _parse_block(lines, i + 1, lines[i + 1][0])
                    items.append(item)
                else:
                    items.append(None)
                    i += 1
                continue
            if ":" in payload:
                key, val = _split_key_value(payload)
                if val:
                    item = {key: _parse_scalar(val)}
                    items.append(item)
                    i += 1
                else:
                    # key with nested value(s)
                    item = {}
                    i += 1
                    if i < len(lines) and lines[i][0] > indent:
                        nested, i = _parse_block(lines, i, lines[i][0])
                        if isinstance(nested, list) and len(nested) > 0:
                            item[key] = nested
                        else:
                            item[key] = nested
                    else:
                        item[key] = []
                    items.append(item)
            else:
                items.append(_parse_scalar(payload))
                i += 1
            # Continue collecting the mapping fields of this list item if they
            # are indented deeper than the list marker (reference catalogs).
            if i < len(lines) and lines[i][0] > indent:
                tail, i = _parse_block(lines, i, lines[i][0])
                if isinstance(items[-1], dict) and isinstance(tail, dict):
                    items[-1].update(tail)
                elif isinstance(items[-1], dict) and isinstance(tail, list):
                    items[-1] = {**items[-1], **(tail[-1] if tail and isinstance(tail[-1], dict) else {})}
        return items, i

    # ---- mapping block: lines are 'key: ...'
    if ":" in first_body:
        result: dict = {}
        i = start
        while i < len(lines) and lines[i][0] == indent and ":" in lines[i][1] \
                and not lines[i][1].startswith("- "):
            _, body = lines[i]
            key, val = _split_key_value(body)
            if val:
                result[key] = _parse_scalar(val)
                i += 1
            else:
                i += 1
                if i < len(lines) and lines[i][0] > indent:
                    nested, i = _parse_block(lines, i, lines[i][0])
                    result[key] = nested
                else:
                    result[key] = []
        return result, i

    # ---- scalar block (single line, no more siblings)
    return _parse_scalar(first_body), start + 1


def parse_yaml(text: str):
    """Parse a YAML document that is a single mapping or a list of mappings.

    Handles scalars, lists, nested mappings, comments, and blank lines.
    Rejects anything else (flow-style, multi-line strings, anchors).
    """
    lines = _preprocess(text)
    if not lines:
        return None
    value, _ = _parse_block(lines, 0, lines[0][0])
    return value


def load(path) -> object:
    """Load and parse a YAML file."""
    with open(path, encoding="utf-8") as f:
        return parse_yaml(f.read())


# ===========================================================================
# 2. List-of-mappings parser (from validate.py)
# ===========================================================================

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
    list_field: str | None = None
    list_indent: int | None = None

    for line in lines:
        indent = len(line) - len(line.lstrip())
        body = line.strip()

        is_list_marker = body == "-" or body.startswith("- ")
        marker_payload = body[2:].strip() if body.startswith("- ") else ""

        nested_item = (
            is_list_marker
            and list_field is not None
            and (list_indent is None or indent > list_indent)
        )

        if nested_item:
            if marker_payload and ":" in marker_payload:
                raise YAMLError(
                    f"Mapping list items not supported: {body!r}"
                )
            if marker_payload:
                current[list_field].append(_parse_scalar(marker_payload))
            continue

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


# ===========================================================================
# 3. Frontmatter parser (from validate.py)
# ===========================================================================

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
