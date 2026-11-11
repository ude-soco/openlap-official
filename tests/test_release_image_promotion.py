#!/usr/bin/env python3
"""Offline promotion guards; no Docker daemon, credentials or network needed."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("promotion", ROOT / "scripts/promote-release-images.py")
P = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(P)
PLAN = json.loads(P.PLAN.read_text())
ENV = {"GITHUB_REPOSITORY": P.REPOSITORY, "GITHUB_REF": "refs/heads/main",
       "GITHUB_EVENT_NAME": "workflow_dispatch", "CONFIRMATION_VERSION": "0.0.6"}
OTHER = "sha256:" + "f" * 64


class FakeRegistry:
    def __init__(self):
        self.refs = P.checked_plan(PLAN, ENV)
        self.manifests = {source: digest for source, _, digest in self.refs}
        self.calls = []
        self.corrupt_copy = False

    def inspect(self, reference, allow_missing=False):
        self.calls.append(("inspect", reference))
        if reference not in self.manifests and not allow_missing:
            raise P.PromotionError("Missing immutable source.")
        return self.manifests.get(reference)

    def copy(self, source, target):
        self.calls.append(("copy", target))
        self.manifests[target] = OTHER if self.corrupt_copy else self.manifests[source]

    @property
    def copies(self):
        return [call for call in self.calls if call[0] == "copy"]


class PromotionTests(unittest.TestCase):
    def test_exact_pair_published_only_after_complete_preflight(self):
        registry = FakeRegistry()
        report = P.promote(PLAN, ENV, registry)
        self.assertEqual(report["status"], "REVIEWED_IMAGE_DIGESTS_PROMOTED")
        self.assertEqual(len(registry.copies), 2)
        expected = [("inspect", source) for source, _, _ in registry.refs]
        expected += [("inspect", target) for _, target, _ in registry.refs]
        self.assertEqual(registry.calls[:4], expected)
        self.assertTrue(all(image["digest"] == registry.manifests[image["target"]] for image in report["images"]))

    def test_matching_tags_are_idempotent(self):
        registry = FakeRegistry()
        for _, target, digest in registry.refs:
            registry.manifests[target] = digest
        P.promote(PLAN, ENV, registry)
        self.assertEqual(registry.copies, [])

    def test_second_destination_conflict_prevents_every_write(self):
        registry = FakeRegistry()
        registry.manifests[registry.refs[1][1]] = OTHER
        with self.assertRaisesRegex(P.PromotionError, "refusing to overwrite"):
            P.promote(PLAN, ENV, registry)
        self.assertEqual(registry.copies, [])

    def test_second_source_mismatch_prevents_every_write(self):
        registry = FakeRegistry()
        registry.manifests[registry.refs[1][0]] = OTHER
        with self.assertRaisesRegex(P.PromotionError, "source digest"):
            P.promote(PLAN, ENV, registry)
        self.assertEqual(registry.copies, [])

    def test_source_absence_is_fatal(self):
        registry = FakeRegistry()
        del registry.manifests[registry.refs[0][0]]
        with self.assertRaises(P.PromotionError):
            P.promote(PLAN, ENV, registry)
        self.assertEqual(registry.copies, [])

    def test_postcopy_digest_mismatch_stops_second_write(self):
        registry = FakeRegistry()
        registry.corrupt_copy = True
        with self.assertRaisesRegex(P.PromotionError, "Published digest differs"):
            P.promote(PLAN, ENV, registry)
        self.assertEqual(len(registry.copies), 1)

    def test_dispatch_guards_prevent_registry_access(self):
        for key, value in (("GITHUB_REPOSITORY", "someone/fork"), ("GITHUB_REF", "refs/tags/v0.0.6"),
                           ("GITHUB_EVENT_NAME", "push"), ("CONFIRMATION_VERSION", "latest")):
            with self.subTest(key=key):
                registry = FakeRegistry()
                with self.assertRaises(P.PromotionError):
                    P.promote(PLAN, dict(ENV, **{key: value}), registry)
                self.assertEqual(registry.calls, [])

    def test_plan_rejects_arbitrary_repository_service_and_digest(self):
        for field, value in (("repository", "someone/fork"), ("version", "latest")):
            plan = copy.deepcopy(PLAN)
            plan[field] = value
            with self.assertRaises(P.PromotionError):
                P.checked_plan(plan, ENV)
        for field, value in (("service", "other"), ("digest", "latest")):
            plan = copy.deepcopy(PLAN)
            plan["images"][0][field] = value
            with self.assertRaises(P.PromotionError):
                P.checked_plan(plan, ENV)

    def test_only_exact_qualified_manifest_not_found_is_absent(self):
        reference = "ghcr.io/ude-soco/openlap-official-openlap-indicatoreditor:0.0.6"
        accepted = ("ERROR: " + reference + ": not found").encode()
        for message in (b"unauthorized", b"network timeout", b"404 Not Found", b"manifest unknown",
                        b"ERROR: unrelated: not found", accepted + b"\nunauthorized", b"\xff"):
            self.assertFalse(P.explicit_missing(message, reference))
            registry = P.Registry(lambda args: subprocess.CompletedProcess(args, 1, b"", message))
            with self.assertRaises(P.PromotionError):
                registry.inspect(reference, allow_missing=True)
        registry = P.Registry(lambda args: subprocess.CompletedProcess(args, 1, b"", accepted))
        self.assertIsNone(registry.inspect(reference, allow_missing=True))
        with self.assertRaises(P.PromotionError):
            registry.inspect(reference)

    def test_invalid_manifest_and_copy_failure_fail_closed(self):
        reference = "ghcr.io/example/image:tag"
        for value in (b"{}", b"not json", json.dumps({"digest": OTHER, "mediaType": "unknown"}).encode()):
            registry = P.Registry(lambda args: subprocess.CompletedProcess(args, 0, value, b""))
            with self.assertRaises(P.PromotionError):
                registry.inspect(reference)
        registry = P.Registry(lambda args: subprocess.CompletedProcess(args, 1, b"", b"private failure"))
        with self.assertRaisesRegex(P.PromotionError, "Registry manifest copy failed"):
            registry.copy(reference, reference)

    def test_copy_preserves_source_format_and_targets_only_release_tag(self):
        calls = []
        def run(args):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, b"", b"")
        source, target, _ = P.checked_plan(PLAN, ENV)[0]
        P.Registry(run).copy(source, target)
        self.assertEqual(calls, [["docker", "buildx", "imagetools", "create", "--prefer-index=false",
                                 "--progress", "none", "--tag", target, source]])


if __name__ == "__main__":
    unittest.main()
