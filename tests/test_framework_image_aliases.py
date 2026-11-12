#!/usr/bin/env python3
"""Execute CI alias publication with a fake Docker CLI; no daemon or network."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = (ROOT / ".github/workflows/build.yml").read_text()
STEP = WORKFLOW.split("    - name: Publish temporary legacy edge aliases\n", 1)[1].split("\n    - name:", 1)[0]
SHELL = "\n".join(line[8:] for line in STEP.split("      run: |\n", 1)[1].splitlines())
IMAGE = "sha256:" + "1" * 64
DIGEST = "sha256:" + "2" * 64
DOCKER = r'''
import json, os, sys
from pathlib import Path
args = sys.argv[1:]
with Path(os.environ["FAKE_LOG"]).open("a") as stream:
    stream.write(json.dumps(args) + "\n")
if args[:2] == ["image", "inspect"]:
    print("sha256:" + "9" * 64 if args[2] == os.environ.get("MISMATCH_REFERENCE") else os.environ["FAKE_IMAGE"])
elif args[:2] in (["image", "tag"], ["image", "push"]):
    pass
elif args[:3] == ["buildx", "imagetools", "inspect"]:
    if os.environ.get("INVALID_DIGEST"):
        print("not-a-digest")
    elif os.environ.get("CORRUPT_ALIAS") and "openlap-official-openlap-" in args[3]:
        print("sha256:" + "3" * 64)
    else:
        print(os.environ["FAKE_DIGEST"])
else:
    raise SystemExit("Unexpected Docker command")
'''


class ImageAliasTests(unittest.TestCase):
    def run_alias(self, service, **overrides):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            docker = directory / "docker"
            docker.write_text("#!" + sys.executable + "\n" + DOCKER)
            docker.chmod(0o700)
            log = directory / "commands.jsonl"
            environment = {"PATH": str(directory) + os.pathsep + os.defpath, "SERVICE": service,
                           "TESTED_IMAGE_ID": IMAGE, "CANONICAL_IMAGE_NAME": "ghcr.io/ude-soco/openlap-official-" + service,
                           "FAKE_IMAGE": IMAGE, "FAKE_DIGEST": DIGEST, "FAKE_LOG": str(log), **overrides}
            result = subprocess.run(["/bin/sh", "-eu", "-c", SHELL], env=environment,
                                    capture_output=True, text=True, timeout=10)
            calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            return result.returncode, calls

    def test_only_official_main_pushes_can_enable_temporary_aliases(self):
        condition = STEP.split("      if: ", 1)[1].splitlines()[0]
        for guard in ("inputs.push", "inputs.verify_plugin_runtime", "inputs.publish_legacy_edge_aliases",
                      "github.event_name == 'push'", "github.ref == 'refs/heads/main'",
                      "github.repository == 'ude-soco/openlap-official'"):
            self.assertIn(guard, condition)
        self.assertIn("publish_legacy_edge_aliases: true", (ROOT / ".github/workflows/ci.yml").read_text())
        self.assertIn("group: image-${{ github.repository }}-${{ matrix.service }}-${{ github.ref }}", WORKFLOW)

    def test_both_aliases_push_only_edge_from_the_same_local_image(self):
        for service, old in (("analyticsframework", "openlap-analyticsframework"),
                             ("indicatorframework", "openlap-indicatoreditor")):
            with self.subTest(service=service):
                status, calls = self.run_alias(service)
                self.assertEqual(status, 0)
                legacy = "ghcr.io/ude-soco/openlap-official-" + old + ":edge"
                writes = [call for call in calls if call[:2] in (["image", "tag"], ["image", "push"])]
                self.assertEqual(writes, [["image", "tag", IMAGE, legacy], ["image", "push", legacy]])
                self.assertFalse(any(call[:2] == ["image", "build"] or "latest" in argument
                                     for call in calls for argument in call))
                self.assertEqual(calls[-2][3], "ghcr.io/ude-soco/openlap-official-" + service + ":edge")
                self.assertEqual(calls[-1][3], legacy)

    def test_invalid_service_or_destination_never_tags_or_pushes(self):
        for service, changes in (("unexpected", {}), ("analyticsframework", {
                "CANONICAL_IMAGE_NAME": "ghcr.io/someone/another-project"})):
            status, calls = self.run_alias(service, **changes)
            self.assertNotEqual(status, 0)
            self.assertFalse(any(call[:2] in (["image", "tag"], ["image", "push"]) for call in calls))

    def test_changed_tested_or_canonical_image_prevents_publication(self):
        for reference in (IMAGE, "ghcr.io/ude-soco/openlap-official-analyticsframework:edge"):
            with self.subTest(reference=reference):
                status, calls = self.run_alias("analyticsframework", MISMATCH_REFERENCE=reference)
                self.assertNotEqual(status, 0)
                self.assertFalse(any(call[:2] in (["image", "tag"], ["image", "push"]) for call in calls))

    def test_changed_local_alias_prevents_push(self):
        status, calls = self.run_alias("analyticsframework", MISMATCH_REFERENCE="ghcr.io/ude-soco/openlap-official-openlap-analyticsframework:edge")
        self.assertNotEqual(status, 0)
        self.assertFalse(any(call[:2] == ["image", "push"] for call in calls))

    def test_incomplete_or_invalid_image_identity_prevents_all_docker_access(self):
        for identity in ("", "latest", "sha256:123", "sha256:" + "g" * 64):
            with self.subTest(identity=identity):
                status, calls = self.run_alias("analyticsframework", TESTED_IMAGE_ID=identity)
                self.assertNotEqual(status, 0)
                self.assertEqual(calls, [])

    def test_mismatched_or_invalid_remote_digests_fail_verification(self):
        for changes in ({"CORRUPT_ALIAS": "1"}, {"INVALID_DIGEST": "1"}):
            with self.subTest(changes=changes):
                status, _ = self.run_alias("analyticsframework", **changes)
                self.assertNotEqual(status, 0)


if __name__ == "__main__":
    unittest.main()
