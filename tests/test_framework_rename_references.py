#!/usr/bin/env python3
"""Audit maintained names while preserving explicit historical/cutover identities."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = "docs/framework-rename-exceptions.json"


class FrameworkReferences(unittest.TestCase):
    def test_active_references_are_canonical(self):
        policy = json.loads((ROOT / MANIFEST).read_text())
        allowed = set(policy["historicalFiles"]) | set(policy["allowedReferences"]) | {MANIFEST}
        result = subprocess.run(
            ["git", "-C", str(ROOT), "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            capture_output=True, check=True,
        )
        unexpected = []
        for relative in set(result.stdout.decode().split("\0")) - {""}:
            path = ROOT / relative
            if not path.is_file():
                continue
            if relative.startswith(tuple(name + "/" for name in policy["patterns"])):
                unexpected.append(relative + " (old module path)")
            try:
                text = path.read_text()
            except UnicodeError:
                continue
            if relative not in allowed and any(name in text for name in policy["patterns"]):
                unexpected.append(relative)
        self.assertEqual(sorted(unexpected), [], "Unclassified old module references")

    def test_historical_records_remain_byte_identical(self):
        policy = json.loads((ROOT / MANIFEST).read_text())
        for relative, item in policy["historicalFiles"].items():
            with self.subTest(path=relative):
                self.assertEqual(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest(), item["sha256"])

    def test_exception_reasons_and_targets_are_reviewable(self):
        policy = json.loads((ROOT / MANIFEST).read_text())
        for relative, reason in policy["allowedReferences"].items():
            with self.subTest(path=relative):
                self.assertTrue((ROOT / relative).is_file())
                self.assertGreater(len(reason), 20)
                self.assertTrue(any(name in (ROOT / relative).read_text() for name in policy["patterns"]))


if __name__ == "__main__":
    unittest.main()
