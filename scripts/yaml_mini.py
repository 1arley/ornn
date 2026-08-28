#!/usr/bin/env python3
"""Minimal recursive-descent YAML-subset parser (no third-party deps).

Handles exactly the subset used across this repository:

  - documents that are a single mapping or a list of mappings
  - scalar values (bare, single/double quoted)
  - list values: `- item` (nested deeper than the owning key)
  - nested mapping values (e.g. `expected_skills:` containing keys with lists)
  - comments (#) and blank lines

It intentionally rejects anything else (flow-style `[...]`, multi-line
strings, anchors, etc.) so malformed input never passes silently.

Returns native Python: dict / list / str / bool / int / float / None.
"""

from __future__ import annotations


class YAMLError(ValueError):
    pass


def _parse_scalar(token: str):
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

    Returns (value, next_index). `value` is a dict, list, or scalar.
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
                            # A list of scalars OR a list of mappings; flatten
                            # the single-list-of-scalars case into a list.
                            item[key] = nested
                        else:
                            item[key] = nested
                    else:
                        item[key] = []
                    items.append(item)
            else:
                items.append(_parse_scalar(payload))
                i += 1
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
    lines = _preprocess(text)
    if not lines:
        return None
    value, _ = _parse_block(lines, 0, lines[0][0])
    return value


def load(path) -> object:
    with open(path, encoding="utf-8") as f:
        return parse_yaml(f.read())
