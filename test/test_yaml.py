#!/usr/bin/env python3
"""Deterministic tests for the consolidated YAML parser (scripts/yaml.py).

Covers all three parsing strategies:
  1. parse_yaml — recursive descent for mappings/lists
  2. parse_yaml_list — list-of-mappings for catalog/skills.yaml
  3. parse_frontmatter — SKILL.md frontmatter
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from yaml import (  # noqa: E402
    YAMLError,
    parse_yaml,
    parse_yaml_list,
    parse_frontmatter,
)


# ===========================================================================
# parse_yaml — recursive descent
# ===========================================================================

class ParseYamlTests(unittest.TestCase):
    def test_empty_returns_none(self):
        self.assertIsNone(parse_yaml(""))

    def test_single_mapping(self):
        result = parse_yaml("name: foo\ncategory: audit\n")
        self.assertEqual(result, {"name": "foo", "category": "audit"})

    def test_list_of_mappings(self):
        result = parse_yaml("- name: a\n- name: b\n")
        self.assertEqual(result, [{"name": "a"}, {"name": "b"}])

    def test_nested_list_value(self):
        text = "triggers:\n  - login\n  - logout\n"
        result = parse_yaml(text)
        self.assertEqual(result, {"triggers": ["login", "logout"]})

    def test_nested_mapping_value(self):
        text = "metadata:\n  aes-category: audit\n  aes-priority: high\n"
        result = parse_yaml(text)
        self.assertEqual(result, {"metadata": {"aes-category": "audit", "aes-priority": "high"}})

    def test_scalar_types(self):
        text = "flag: true\ncount: 42\nratio: 1.5\nlabel: null\nname: hello\n"
        result = parse_yaml(text)
        self.assertIs(result["flag"], True)
        self.assertEqual(result["count"], 42)
        self.assertAlmostEqual(result["ratio"], 1.5)
        self.assertIsNone(result["label"])
        self.assertEqual(result["name"], "hello")

    def test_quoted_strings(self):
        text = "a: 'single'\nb: \"double\"\n"
        result = parse_yaml(text)
        self.assertEqual(result["a"], "single")
        self.assertEqual(result["b"], "double")

    def test_comments_ignored(self):
        text = "# top comment\nname: foo\n# inline comment\n"
        result = parse_yaml(text)
        self.assertEqual(result, {"name": "foo"})

    def test_blank_lines_ignored(self):
        text = "a: 1\n\nb: 2\n"
        result = parse_yaml(text)
        self.assertEqual(result, {"a": 1, "b": 2})

    def test_list_with_nested_mapping(self):
        text = (
            "- name: alpha\n"
            "  category: audit\n"
            "- name: beta\n"
            "  category: security\n"
        )
        result = parse_yaml(text)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "alpha")
        self.assertEqual(result[1]["category"], "security")

    def test_flow_style_parsed_as_string(self):
        result = parse_yaml("a: [1, 2, 3]\n")
        self.assertEqual(result["a"], "[1, 2, 3]")


# ===========================================================================
# parse_yaml_list — list-of-mappings (catalog format)
# ===========================================================================

class ParseYamlListTests(unittest.TestCase):
    def test_simple_list(self):
        text = "- name: skill-a\ncategory: audit\n- name: skill-b\ncategory: security\n"
        result = parse_yaml_list(text)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "skill-a")
        self.assertEqual(result[1]["category"], "security")

    def test_list_with_nested_list(self):
        text = (
            "- name: authz\n"
            "  triggers:\n"
            "    - permission\n"
            "    - role\n"
        )
        result = parse_yaml_list(text)
        self.assertEqual(result[0]["triggers"], ["permission", "role"])

    def test_comments_dropped(self):
        text = "# header\n- name: x\n# middle\n  category: y\n"
        result = parse_yaml_list(text)
        self.assertEqual(result[0]["name"], "x")

    def test_bare_list_item_rejected(self):
        text = "- standalone-item\n"
        with self.assertRaises(YAMLError):
            parse_yaml_list(text)

    def test_key_outside_item_rejected(self):
        text = "orphan: value\n"
        with self.assertRaises(YAMLError):
            parse_yaml_list(text)

    def test_real_catalog_entry(self):
        text = (
            "- name: race-condition-hunter\n"
            "  category: reliability\n"
            "  role: investigator\n"
            "  priority: high\n"
            "  risk_floor: medium\n"
            "  triggers:\n"
            "    - race\n"
            "    - concurrency\n"
            "  composes_with:\n"
            "    - idempotency-audit\n"
        )
        result = parse_yaml_list(text)
        self.assertEqual(len(result), 1)
        entry = result[0]
        self.assertEqual(entry["name"], "race-condition-hunter")
        self.assertEqual(entry["triggers"], ["race", "concurrency"])
        self.assertEqual(entry["composes_with"], ["idempotency-audit"])

    def test_empty_input(self):
        result = parse_yaml_list("")
        self.assertEqual(result, [])

    def test_only_comments(self):
        result = parse_yaml_list("# just a comment\n")
        self.assertEqual(result, [])


# ===========================================================================
# parse_frontmatter — SKILL.md frontmatter
# ===========================================================================

class ParseFrontmatterTests(unittest.TestCase):
    def test_basic_frontmatter(self):
        text = "---\nname: foo\ndescription: bar\n---\nbody content\n"
        meta, body = parse_frontmatter(text)
        self.assertEqual(meta["name"], "foo")
        self.assertEqual(meta["description"], "bar")
        self.assertEqual(body, "body content\n")

    def test_empty_frontmatter(self):
        text = "---\n---\nrest\n"
        meta, body = parse_frontmatter(text)
        self.assertEqual(meta, {})
        self.assertEqual(body, "rest\n")

    def test_missing_opening_delimiter(self):
        with self.assertRaises(YAMLError):
            parse_frontmatter("no delimiter\n---\n")

    def test_missing_closing_delimiter(self):
        with self.assertRaises(YAMLError):
            parse_frontmatter("---\nname: foo\n")

    def test_list_in_frontmatter(self):
        text = "---\nname: x\ntags:\n  - a\n  - b\n---\nbody\n"
        meta, body = parse_frontmatter(text)
        self.assertEqual(meta["tags"], ["a", "b"])

    def test_metadata_nested_mapping(self):
        text = (
            "---\n"
            "name: authz-audit\n"
            "description: checks authz\n"
            "metadata:\n"
            "  aes-category: security\n"
            "  aes-priority: high\n"
            "---\nbody\n"
        )
        meta, body = parse_frontmatter(text)
        self.assertEqual(meta["name"], "authz-audit")
        self.assertEqual(meta["metadata"]["aes-category"], "security")
        self.assertEqual(meta["metadata"]["aes-priority"], "high")

    def test_metadata_with_list(self):
        text = (
            "---\n"
            "name: x\n"
            "metadata:\n"
            "  aes-category: audit\n"
            "  aes-triggers:\n"
            "    - login\n"
            "    - logout\n"
            "---\nbody\n"
        )
        meta, body = parse_frontmatter(text)
        self.assertEqual(meta["metadata"]["aes-triggers"], ["login", "logout"])

    def test_comments_in_frontmatter(self):
        text = "---\n# comment\nname: foo\n---\nbody\n"
        meta, body = parse_frontmatter(text)
        self.assertEqual(meta["name"], "foo")


# ===========================================================================
# YAMLError
# ===========================================================================

class YAMLErrorTests(unittest.TestCase):
    def test_is_value_error(self):
        self.assertTrue(issubclass(YAMLError, ValueError))

    def test_can_be_caught(self):
        with self.assertRaises(YAMLError):
            raise YAMLError("bad yaml")


if __name__ == "__main__":
    unittest.main()
