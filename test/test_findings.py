#!/usr/bin/env python3
"""Deterministic tests for finding identity, dedup, provenance and confidence."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from findings import confidence_from_evidence, consolidate, same_finding  # noqa: E402


def finding(fid: str, **overrides) -> dict:
    value = {
        "id": fid,
        "title": "duplicate charge on webhook retry",
        "severity": "HIGH",
        "claimed_confidence": "CONFIRMED",
        "affected_component": "POST /webhooks/payment",
        "invariant": "one payment event creates at most one charge",
        "mechanism": "retry processes the same event without an idempotency key",
        "state_transition": "unprocessed event -> charge created twice",
        "impact": "customer is charged twice",
        "generated_by": [],
        "investigated_by": [],
        "verified_by": [],
        "evidence": [],
    }
    value.update(overrides)
    return value


class FindingIdentityTests(unittest.TestCase):
    def test_same_bug_with_wording_variation_is_duplicate(self):
        a = finding("a")
        b = finding(
            "b",
            title="webhook replay duplicates charges",
            invariant="a payment event must create no more than one charge",
            mechanism="the same event is processed again on retry with no idempotency key",
            state_transition="event pending -> two charge records",
            impact="the user receives duplicate charges",
        )
        self.assertTrue(same_finding(a, b))

    def test_same_component_but_different_mechanism_is_not_duplicate(self):
        a = finding("a")
        b = finding(
            "b",
            invariant="only signed events are accepted",
            mechanism="signature is never verified",
            state_transition="untrusted request -> payment marked complete",
            impact="attacker forges a paid event",
        )
        self.assertFalse(same_finding(a, b))

    def test_explicit_identity_key_overrides_wording(self):
        a = finding("a", identity_key="webhook/duplicate-event")
        b = finding(
            "b", identity_key="webhook/duplicate-event",
            mechanism="very different wording",
        )
        self.assertTrue(same_finding(a, b))


class ConsolidationTests(unittest.TestCase):
    def test_duplicates_merge_evidence_and_provenance(self):
        raw = [
            finding(
                "hypothesis",
                generated_by=["adversarial-review"],
                evidence=[{
                    "type": "reasoning",
                    "description": "retry can repeat the side effect",
                }],
            ),
            finding(
                "investigation",
                investigated_by=["idempotency-audit"],
                evidence=[{
                    "type": "code",
                    "description": "handler inserts charge without event ledger lookup",
                    "source": "src/webhook.js:42",
                }],
            ),
            finding(
                "verification",
                verified_by=["error-flow-audit"],
                evidence=[{
                    "type": "test",
                    "description": "same event sent twice",
                    "result": "two charge rows created",
                }],
            ),
        ]
        result = consolidate(raw)
        self.assertEqual(result["raw_findings_count"], 3)
        self.assertEqual(result["consolidated_findings_count"], 1)
        self.assertEqual(result["duplicates_removed"], 2)
        merged = result["findings"][0]
        self.assertEqual(merged["generated_by"], ["adversarial-review"])
        self.assertEqual(merged["investigated_by"], ["idempotency-audit"])
        self.assertEqual(merged["verified_by"], ["error-flow-audit"])
        self.assertEqual(len(merged["evidence"]), 3)
        self.assertEqual(merged["confidence"], "CONFIRMED")

    def test_distinct_findings_remain_distinct(self):
        result = consolidate([
            finding("duplicate"),
            finding(
                "signature",
                invariant="only signed events are accepted",
                mechanism="signature is never verified",
                state_transition="forged request -> payment accepted",
                impact="attacker forges payment status",
            ),
        ])
        self.assertEqual(result["consolidated_findings_count"], 2)
        self.assertEqual(result["duplicates_removed"], 0)

    def test_identical_evidence_is_deduplicated(self):
        ev = {
            "type": "test", "description": "same event sent twice",
            "result": "two charges",
        }
        result = consolidate([
            finding("a", evidence=[ev]),
            finding("b", evidence=[dict(ev)]),
        ])
        self.assertEqual(len(result["findings"][0]["evidence"]), 1)

    def test_output_is_stable_under_input_order(self):
        a = finding("a", investigated_by=["idempotency-audit"])
        b = finding("b", generated_by=["adversarial-review"])
        left = consolidate([a, b])
        right = consolidate([b, a])
        self.assertEqual(left, right)


class ConfidenceTests(unittest.TestCase):
    def test_three_claims_confirmed_without_evidence_are_speculative(self):
        raw = [
            finding("a", claimed_confidence="CONFIRMED"),
            finding("b", claimed_confidence="CONFIRMED"),
            finding("c", claimed_confidence="CONFIRMED"),
        ]
        merged = consolidate(raw)["findings"][0]
        self.assertEqual(merged["confidence"], "POSSIBLE")
        # Mechanism exists, so the correct cap is POSSIBLE rather than
        # SPECULATIVE; repeated votes do not promote it.
        self.assertNotEqual(merged["confidence"], "CONFIRMED")

    def test_no_mechanism_no_evidence_is_speculative(self):
        f = finding("a", mechanism="", evidence=[])
        confidence, _ = confidence_from_evidence(f)
        self.assertEqual(confidence, "SPECULATIVE")

    def test_mechanism_with_code_is_high_confidence(self):
        f = finding("a", evidence=[{
            "type": "code",
            "description": "insert occurs without an idempotency lookup",
            "source": "src/webhook.js:42",
        }])
        confidence, _ = confidence_from_evidence(f)
        self.assertEqual(confidence, "HIGH CONFIDENCE")

    def test_mechanism_with_direct_test_is_confirmed(self):
        f = finding("a", evidence=[{
            "type": "test",
            "description": "same event posted twice",
            "result": "two charges",
        }])
        confidence, _ = confidence_from_evidence(f)
        self.assertEqual(confidence, "CONFIRMED")

    def test_direct_test_without_mechanism_is_possible(self):
        f = finding("a", mechanism="", evidence=[{
            "type": "test",
            "description": "unexpected output observed",
            "result": "two charges",
        }])
        confidence, _ = confidence_from_evidence(f)
        self.assertEqual(confidence, "POSSIBLE")

    def test_test_label_without_result_does_not_confirm(self):
        f = finding("a", evidence=[{
            "type": "test",
            "description": "I tested it",
        }])
        confidence, _ = confidence_from_evidence(f)
        self.assertEqual(confidence, "POSSIBLE")

    def test_code_label_without_source_does_not_reach_high(self):
        f = finding("a", evidence=[{
            "type": "code",
            "description": "handler lacks a check",
        }])
        confidence, _ = confidence_from_evidence(f)
        self.assertEqual(confidence, "POSSIBLE")


if __name__ == "__main__":
    unittest.main()
