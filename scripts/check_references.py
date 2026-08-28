#!/usr/bin/env python3
"""Offline reference-catalog health checks (plan.md § 13).

The online HTTP check is intentionally separated from PR CI: PR CI only
validates schema and duplication (via scripts/validate.py). This script adds
the lifecycle layer and the optional online check that runs on a weekly
schedule (see .github/workflows/reference-health.yml).

Checks:
  - duplicate URLs across catalogs (offline)
  - freshness warning: last_verified older than 180 days (offline)
  - HTTP status / permanent redirect / domain change (online, --online)

Never removes a reference automatically when a URL is temporarily unavailable:
a timeout/404 is reported as `degraded`, never deleted. Output is JSON.

Zero third-party dependencies; the online check uses urllib only.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REFERENCES_DIR = ROOT / "references"

FRESHNESS_DAYS = 180
STATUS = {"active", "degraded", "archived"}


def _norm_text(value) -> str:
    """Normalize a scalar or list of scalars for guidance comparison."""
    if isinstance(value, list):
        return "|".join(str(x).strip().lower() for x in value)
    return str(value or "").strip().lower()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reference catalog lifecycle and health checks")
    parser.add_argument("--online", action="store_true",
                        help="also perform HTTP checks (network access)")
    parser.add_argument("--json", action="store_true",
                        help="emit JSON instead of human summary")
    parser.add_argument("--out", help="write JSON report to a file")
    args = parser.parse_args()

    from yaml_mini import parse_yaml, YAMLError

    entries = []
    errors = []
    for path in sorted(REFERENCES_DIR.glob("*.yaml")):
        try:
            catalog = parse_yaml(path.read_text(encoding="utf-8"))
        except YAMLError as e:
            errors.append(f"{path.name}: YAML error: {e}")
            continue
        if not isinstance(catalog, list):
            errors.append(f"{path.name}: not a list")
            continue
        for entry in catalog:
            if not isinstance(entry, dict) or "url" not in entry:
                errors.append(f"{path.name}: entry missing url")
                continue
            entry["_catalog"] = path.stem
            entries.append(entry)

    warnings = []
    url_to_entry = {}
    duplicates = []
    for entry in entries:
        url = str(entry["url"])
        if url in url_to_entry:
            prior = url_to_entry[url]
            # Same URL reused across catalogs with domain-specific guidance is
            # legitimate; a bare repeat with identical guidance is drift.
            distinct_guidance = (
                _norm_text(prior.get("use_when")) != _norm_text(entry.get("use_when"))
                or _norm_text(prior.get("avoid_when")) != _norm_text(entry.get("avoid_when"))
            )
            duplicates.append({
                "url": url,
                "catalogs": [prior["_catalog"], entry["_catalog"]],
                "names": [prior.get("name"), entry.get("name")],
                "legitimate": distinct_guidance,
                "reason": "domain-specific guidance" if distinct_guidance
                          else "identical guidance repeated",
            })
        else:
            url_to_entry[url] = entry

        status = entry.get("status", "active")
        if status not in STATUS:
            errors.append(f"{entry.get('name')}: invalid status {status!r}")
        last_verified = entry.get("last_verified")
        if last_verified:
            try:
                verified = date.fromisoformat(str(last_verified))
            except ValueError:
                errors.append(f"{entry.get('name')}: invalid last_verified {last_verified!r}")
            else:
                if (date.today() - verified).days > FRESHNESS_DAYS:
                    warnings.append({
                        "entry": entry.get("name"),
                        "issue": "stale",
                        "last_verified": str(last_verified),
                        "days_ago": (date.today() - verified).days,
                    })

    online_results = {}
    if args.online:
        timeout = 15
        for entry in entries:
            url = str(entry["url"])
            result = {"status": "active", "redirect": None, "note": None}
            try:
                req = urllib.request.Request(url, method="HEAD",
                                             headers={"User-Agent": "aes-reference-health/1.0"})
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    code = resp.getcode()
                    if code >= 400:
                        result["status"] = "degraded"
                        result["note"] = f"HTTP {code}"
                    if resp.url and resp.url.rstrip("/") != url.rstrip("/"):
                        result["redirect"] = resp.url
            except urllib.error.HTTPError as e:
                result["status"] = "degraded"
                result["note"] = f"HTTP {e.code}"
            except Exception as e:  # noqa: BLE001 - any network failure degrades
                result["status"] = "degraded"
                result["note"] = f"unreachable: {type(e).__name__}"
            online_results[url] = result

    report = {
        "generated_at": date.today().isoformat(),
        "entries_checked": len(entries),
        "duplicate_urls": duplicates,
        "warnings": warnings,
        "errors": errors,
        "online": online_results if args.online else {"note": "run with --online for HTTP checks"},
        "policy": {
            "degraded_entries_kept": True,
            "note": "Temporary unavailability degrades status; references are never removed automatically.",
        },
    }

    if args.out:
        Path(args.out).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n",
                                  encoding="utf-8")
        print(f"saved: {args.out}")

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"entries checked: {len(entries)}")
        print(f"duplicate urls:  {len(duplicates)}")
        print(f"stale sources:   {len(warnings)}")
        print(f"errors:          {len(errors)}")
        if args.online:
            degraded = sum(1 for r in online_results.values() if r["status"] == "degraded")
            print(f"degraded urls:   {degraded}")
        for d in duplicates:
            print(f"  ! duplicate: {d['url']} in {', '.join(d['catalogs'])}")
        for w in warnings:
            print(f"  ! stale: {w['entry']} last verified {w['days_ago']} days ago")
        for e in errors:
            print(f"  ✗ {e}")

    illegitimate = [d for d in duplicates if not d.get("legitimate")]
    return 1 if (errors or illegitimate) else 0


if __name__ == "__main__":
    sys.exit(main())
