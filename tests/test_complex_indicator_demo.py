"""Check the synthetic example data and the local-only setup boundaries."""

import collections
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import quote


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

    def test_owned_container_uses_only_the_selected_demo_database(self):
        class Result:
            returncode = 0
            def __init__(self, stdout):
                self.stdout = stdout
        metadata = Result('{"running":true,"labels":{"org.openlap.demo":"complex-indicators-v1"}}')
        acknowledgement = Result('{"fixture":"openlap-complex-indicators-v1","statements":3352}')
        with patch.object(demo.subprocess, "run", side_effect=[metadata, acknowledgement]) as run:
            result = demo.seed_secondary("owned-demo-mongo", "learninglocker_complex_demo")
            self.assertEqual(result["statements"], 3352)
            self.assertEqual(run.call_args.args[0], ["docker", "exec", "-i", "owned-demo-mongo", "mongosh", "--quiet", "learninglocker_complex_demo", "--file", "/dev/stdin"])

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
        self.assertRegex(demo.LRS_ID, r"^[0-9a-f]{24}$")
        self.assertTrue(all(len(row["_id"]) == 24 for row in rows))


class GeneratedScriptParsingTests(unittest.TestCase):
    def test_html_parser_accepts_spaced_mixed_case_end_tags_and_quoted_angles(self):
        script = "const label = 'original \\u003c/script\\u003e text';"
        markup = '<SCRIPT data-note="a>b">' + script + '</ScRiPt \t>'
        self.assertEqual(demo.inline_scripts(quote(markup)), [script])

    def test_external_scripts_comments_and_similarly_named_elements_are_excluded(self):
        markup = ('<!-- <script>comment()</script> --><scripture>text</scripture>'
                  '<script src="https://example.test/chart.js">external()</script>'
                  '<script src="">emptySource()</script><script>inline()</script >')
        self.assertEqual(demo.inline_scripts(markup), ['inline()'])

    def test_syntax_probe_compiles_each_parsed_inline_script_only(self):
        class Result:
            returncode = 0
        markup = '<script src="external.js"></script><script>first()</script ><script>second()</script>'
        with patch.object(demo.subprocess, 'run', return_value=Result()) as run:
            demo.check_chart_syntax(markup)
            self.assertEqual([call.kwargs['input'] for call in run.call_args_list], ['first()', 'second()'])
        with self.assertRaisesRegex(demo.DemoError, 'no inline renderer'):
            demo.check_chart_syntax('<script src="external.js"></script>')

    def test_text_and_scatter_probes_share_the_parsed_script_body(self):
        script = 'c3.generate({});'
        markup = '<script data-note="a>b">' + script + '</SCRIPT >'
        class Result:
            returncode = 0
            stdout = json.dumps({'series': [{'name': 'Cluster 1', 'x': [1], 'y': [11]}], 'colors': demo.PALETTE})
        with patch.object(demo.subprocess, 'run', return_value=Result()) as run:
            demo.check_c3_text_roundtrip(markup, ['Original label'], 'Original title')
            self.assertEqual(json.loads(run.call_args.kwargs['input'])['script'], script)
            demo.check_c3_scatter_points(markup, [(1, 11)], 1, ['Cluster 1'])
            self.assertEqual(json.loads(run.call_args.kwargs['input']), script)

    def test_configuration_probes_reject_multiple_inline_renderers_before_execution(self):
        markup = '<script>first()</script ><script>second()</script>'
        with patch.object(demo.subprocess, 'run') as run:
            with self.assertRaisesRegex(demo.DemoError, 'one inline C3 renderer'):
                demo.check_c3_text_roundtrip(markup, [], '')
            with self.assertRaisesRegex(demo.DemoError, 'one C3 scatter renderer'):
                demo.check_c3_scatter_points(markup, [], 0, [])
            run.assert_not_called()


class SavedDemoApiContractTests(unittest.TestCase):
    def test_scatter_qualification_rejects_the_last_point_per_cluster_bug(self):
        expected = [(1, 11), (2, 12), (3, 21), (4, 22), (5, 31), (6, 32)]
        good = [{"x": [1, 2], "y": [11, 12]}, {"x": [3, 4], "y": [21, 22]}, {"x": [5, 6], "y": [31, 32]}]
        demo.assert_scatter_series(good, expected, 3, demo.PALETTE)
        truncated = [{"x": [2], "y": [12]}, {"x": [4], "y": [22]}, {"x": [6], "y": [32]}]
        with self.assertRaises(demo.DemoError):
            demo.assert_scatter_series(truncated, expected, 3, demo.PALETTE)
        with self.assertRaises(demo.DemoError):
            demo.assert_scatter_series(good, expected, 3, ["#008ffb"])

    def test_scatter_groups_must_match_the_analysis_assignments(self):
        series = [{"name": "Cluster 1", "x": [1], "y": [11]}, {"name": "Cluster 2", "x": [2], "y": [22]}]
        desired = {"Cluster 1": [(1, 11)], "Cluster 2": [(2, 22)]}
        demo.assert_scatter_series(series, [(1, 11), (2, 22)], 2, demo.PALETTE, desired)
        swapped = {"Cluster 2": [(1, 11)], "Cluster 1": [(2, 22)]}
        with self.assertRaises(demo.DemoError):
            demo.assert_scatter_series(series, [(1, 11), (2, 22)], 2, demo.PALETTE, swapped)

    def test_duplicate_method_names_use_declared_contract_and_stable_id(self):
        class Api:
            def data(self, method, path):
                if "/inputs/" in path:
                    return [{"id": key, "type": "Numeric"} for key in ("attribute_1", "attribute_2")]
                if "/outputs/" in path:
                    return [{"id": "attribute_1", "type": "Numeric"}, {"id": "attribute_2", "type": "Numeric"}, {"id": "cluster_name", "type": "Text"}]
                return [{"id": key, "dataType": "INTEGER"} for key in ("cluster_count", "kmean_seed", "kmean_iterations")]
        chosen, count = demo.select_cluster_method(Api(), [
            {"id": "method-b", "name": demo.CLUSTER_METHOD}, {"id": "method-a", "name": demo.CLUSTER_METHOD}])
        self.assertEqual(chosen["id"], "method-a")
        self.assertEqual(count, 2)

    def test_existing_standard_indicator_name_response_is_reused_without_mutation(self):
        saved = {"demoFixtureId": demo.FIXTURE, "name": "Example"}
        class Api:
            def data(self, method, path):
                if path.startswith("/v1/indicators/my?"):
                    return {"content": [{"id": "existing", "indicatorName": "Example"}], "last": True}
                return {"configuration": json.dumps(saved)}
            def call(self, *args):
                raise AssertionError("An existing demo must not be recreated or updated")
        with tempfile.TemporaryDirectory() as directory:
            receipt = Path(directory) / "receipt.json"
            record = {"indicators": {}}
            self.assertEqual(demo.ensure_indicator(Api(), "/v1/indicators/basic",
                {"name": "Example", "configuration": json.dumps(saved)}, record, receipt), "existing")

    def test_edited_demo_configuration_is_never_overwritten(self):
        class Api:
            def data(self, method, path):
                if path.startswith("/v1/indicators/my?"):
                    return {"content": [{"id": "existing", "indicatorName": "Example"}], "last": True}
                return {"configuration": json.dumps({"demoFixtureId": demo.FIXTURE, "name": "changed"})}
            def call(self, *args):
                raise AssertionError("An edited demo must not be mutated")
        with tempfile.TemporaryDirectory() as directory, self.assertRaisesRegex(demo.DemoError, "edited"):
            demo.ensure_indicator(Api(), "/v1/indicators/basic",
                {"name": "Example", "configuration": json.dumps({"demoFixtureId": demo.FIXTURE, "name": "original"})},
                {"indicators": {}}, Path(directory) / "receipt.json")


if __name__ == "__main__":
    unittest.main()
