"""Check the synthetic example data and the local-only setup boundaries."""

import collections
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "complex_indicator_demo", ROOT / "analyticsframework/scripts/setup-complex-indicator-demo.py")
demo = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(demo)


class LocalDemoBoundaryTests(unittest.TestCase):
    def test_only_explicit_loopback_api_urls_are_allowed(self):
        for value in ("http://127.0.0.1:8092/api", "http://localhost:8092/api/", "http://[::1]:8092/api"):
            with self.subTest(value=value):
                self.assertTrue(demo.local_api_url(value).endswith("/api"))
        for value in ("https://openlap.de/api", "http://localhost/api", "http://localhost.example:8092/api",
                      "http://127.0.0.1:8092/api?token=secret", "http://user:password@127.0.0.1:8092/api",
                      "http://127.0.0.1:8092/other", "file:///api", "http://[broken:8092/api"):
            with self.subTest(value=value), self.assertRaises(demo.DemoError):
                demo.local_api_url(value)

    def test_secondary_database_must_be_an_explicit_demo_namespace(self):
        self.assertEqual(demo.demo_database("learninglocker_complex_demo"), "learninglocker_complex_demo")
        self.assertEqual(demo.demo_database("learninglocker_complex_demo_review"), "learninglocker_complex_demo_review")
        for value in ("learninglocker_v2", "admin", "openlap_v2", "learninglocker_complex_demo/other", "learninglocker_complex_demo_", ""):
            with self.subTest(value=value), self.assertRaises(demo.DemoError):
                demo.demo_database(value)

    def test_unlabelled_containers_are_never_executed(self):
        class Result:
            returncode = 0
            stdout = '{"running":true,"labels":{"org.openlap.demo":"another-fixture"}}'
        with patch.object(demo.subprocess, "run", return_value=Result()) as run:
            with self.assertRaisesRegex(demo.DemoError, "label"):
                demo.seed_secondary("other-project-mongo", "learninglocker_complex_demo")
            self.assertEqual(run.call_count, 1)
            self.assertEqual(run.call_args.args[0][1], "inspect")

    def test_new_credentials_are_private_and_reused_without_reset(self):
        with tempfile.TemporaryDirectory() as directory:
            receipt = Path(directory) / "receipt.json"
            path, first = demo.private_receipt(receipt, "http://127.0.0.1:8092/api", "learninglocker_complex_demo")
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertGreaterEqual(len(first["password"]), 24)
            _, second = demo.private_receipt(receipt, "http://127.0.0.1:8092/api", "learninglocker_complex_demo")
            self.assertEqual(first["password"], second["password"])
            with self.assertRaises(demo.DemoError):
                demo.private_receipt(receipt, "http://127.0.0.1:8093/api", "learninglocker_complex_demo")

    def test_receipts_cannot_follow_symlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "target"
            target.write_text("untouched")
            link = Path(directory) / "receipt.json"
            link.symlink_to(target)
            with self.assertRaises(demo.DemoError):
                demo.private_receipt(link, "http://127.0.0.1:8092/api", "learninglocker_complex_demo")
            self.assertEqual(target.read_text(), "untouched")


class SyntheticIndicatorExampleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = demo.fixture_data()

    def test_xapi_fixture_reproduces_access_and_student_counts(self):
        viewed = [row["statement"] for row in self.fixture["statements"] if row["statement"]["verb"]["id"] == demo.VIEWED]
        totals = collections.Counter(row["object"]["definition"]["name"]["en-US"] for row in viewed)
        self.assertEqual(dict(totals), demo.ACCESS)
        people = collections.defaultdict(set)
        for row in viewed:
            people[row["object"]["definition"]["name"]["en-US"]].add(row["actor"]["account"]["name"])
        for material, count in demo.STUDENTS.items():
            self.assertEqual(len(people[material]), count)

    def test_annotation_counts_and_exact_combination_cardinalities(self):
        annotated = [row["statement"] for row in self.fixture["statements"] if row["statement"]["verb"]["id"] == demo.ANNOTATED]
        totals = collections.Counter(row["object"]["definition"]["name"]["en-US"] for row in annotated)
        self.assertEqual(dict(totals), demo.ANNOTATIONS)
        self.assertEqual(len(set(demo.COMPARISON_ACCESS) | set(demo.STUDENTS)), 8)
        self.assertEqual(len(set(demo.CLUSTER_ACCESS) & set(demo.ANNOTATIONS)), 6)
        self.assertNotIn("Item 6", demo.CLUSTER_ACCESS)

    def test_seed_records_have_unique_repeatable_fixture_identities(self):
        rows = self.fixture["statements"]
        self.assertEqual(len(rows), 3352)
        self.assertEqual(len({row["_id"] for row in rows}), len(rows))
        self.assertEqual(len({row["statement"]["id"] for row in rows}), len(rows))
        self.assertEqual(self.fixture, demo.fixture_data())
        self.assertTrue(all(row["_demoFixtureId"] == demo.FIXTURE and row["lrs_id"] == demo.LRS_ID for row in rows))


if __name__ == "__main__":
    unittest.main()
