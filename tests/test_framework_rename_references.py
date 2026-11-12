#!/usr/bin/env python3
"""Audit maintained names while preserving explicit historical/cutover identities."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = "docs/framework-rename-exceptions.json"


class FrameworkReferences(unittest.TestCase):
    def test_module_entry_point_names_agree(self):
        pom = ET.parse(ROOT / "analyticsframework/pom.xml").getroot()
        ns = {"m": "http://maven.apache.org/POM/4.0.0"}
        self.assertEqual(pom.find("m:artifactId", ns).text, "analyticsframework")
        launch_text = (ROOT / "analyticsframework/.vscode/launch.json").read_text()
        # This launch file uses full-line JSONC comments; keep URI strings intact.
        launch = json.loads("\n".join(line for line in launch_text.splitlines()
                                      if not line.lstrip().startswith("//")))
        configuration = launch["configurations"][0]
        self.assertEqual(configuration["projectName"], "analyticsframework")
        self.assertEqual(configuration["mainClass"], "com.openlap.AnalyticsFramework")
        package = json.loads((ROOT / "indicatorframework/package.json").read_text())
        lock = json.loads((ROOT / "indicatorframework/package-lock.json").read_text())
        self.assertEqual(package["name"], "indicatorframework")
        self.assertEqual(lock["name"], package["name"])
        self.assertEqual(lock["packages"][""]["name"], package["name"])
        self.assertEqual(package["dependencies"][package["name"]], "file:")
        self.assertTrue(lock["packages"]["node_modules/indicatorframework"]["link"])

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
