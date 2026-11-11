"""Synthetic orchestration/containment regressions; no account or Docker access."""
import contextlib
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import plistlib
import tempfile
import unittest
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / "openlap-analyticsframework/scripts/check-plugin-backup-recovery.py"
SPEC = importlib.util.spec_from_file_location("recovery_check", SCRIPT)
CHECK = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(CHECK)


def encoded(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="openlap-public-recovery-unit-")
        self.root = Path(self.temporary.name).resolve(); self.root.chmod(0o700)
        self.output = self.root / "run"; self.output.mkdir(mode=0o700)
        self.options = {key: "/synthetic/" + key for key in CHECK.REQUIRED}
        self.options.update(CHECK.DEFAULTS)
        self.options.update({"snapshot_label": "objects", "remote": "fixture:releases", "docker_host": "unix:///synthetic/docker.sock",
                             "checkpoint_image": "ghcr.io/ude-soco/openlap-official-plugin-checkpoint@sha256:" + "1" * 64,
                             "snapshot_image": "ghcr.io/ude-soco/openlap-official-plugin-storage-versity@sha256:" + "2" * 64,
                             "receipt_sha256": "3" * 64, "state_directory": str(self.root)})
        self.checkpoint = encoded({"archiveSha256": "4" * 64})
        self.options["checkpoint_report_sha256"] = hashlib.sha256(self.checkpoint).hexdigest()
        self.index = b"{}\n"; self.options["artifact_index_sha256"] = hashlib.sha256(self.index).hexdigest()
        self.snapshot = encoded({"artifactIndexSha256": self.options["artifact_index_sha256"],
                                 "originalCheckpointReportSha256": self.options["checkpoint_report_sha256"],
                                 "archiveSha256": "4" * 64})
        self.options["snapshot_manifest_sha256"] = hashlib.sha256(self.snapshot).hexdigest()
        self.calls = []; self.bad_index = False; self.bad_cold = False; self.stale = False
        owner = self

        class FakeDocker:
            mount = staticmethod(CHECK.Docker.mount)
            def __init__(self, options, output): pass
            def image(self, reference): return "sha256:" + "a" * 64
            def volume(self, name, helper): owner.calls.append(("volume", name)); return "synthetic-" + name
            def run(self, image, args, mounts, **kwargs):
                owner.calls.append(("image-reference", image))
                owner.calls.append(("run", args, mounts, kwargs))
                if "initialize" in args: return encoded({"status": "FRESH_RECOVERY_VOLUME_INITIALIZED"})
                if "copy" in args: return encoded({"status": "FRESH_UID1000_COPY_VERIFIED", "sourceMetadataUnchanged": True, "sourceProjectionUid": 0})
                if "credentials" in args: return encoded({"status": "DISPOSABLE_LOCAL_RECOVERY_IDENTITIES_CREATED"})
                if args[0] == "--index-plugin-artifacts":
                    result = {"readyForS3Export": True, "associationsResolved": True,
                              "artifactIndexSha256": "0" * 64 if owner.bad_index else owner.options["artifact_index_sha256"],
                              "originalCheckpointReportSha256": owner.options["checkpoint_report_sha256"]}
                    return b"OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1\n" + encoded(result) + b"OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1\n"
                if args[0] == "--restore-fresh":
                    return encoded({"status": "FRESH_LOCAL_PLUGIN_OBJECT_RESTORE_VERIFIED", "databaseIndexMatched": True,
                                    "coldReadbackVerified": not owner.bad_cold, "manifestSha256": owner.options["snapshot_manifest_sha256"],
                                    "artifactIndexSha256": owner.options["artifact_index_sha256"], "objectCount": 0,
                                    "originalCheckpointReportSha256": owner.options["checkpoint_report_sha256"], "archiveSha256": "4" * 64})
                raise AssertionError("Unexpected synthetic Docker action")
            def cleanup(self, volumes=False): owner.calls.append(("cleanup", volumes)); return True

        class FakeTransport:
            @staticmethod
            def main(args):
                target = Path(args[args.index("--output") + 1]); target.mkdir(mode=0o700)
                recovered = target / "recovered"; recovered.mkdir(mode=0o700)
                checkpoint = recovered / "checkpoint"; checkpoint.mkdir(mode=0o700)
                (recovered / "sources").mkdir(mode=0o700)
                source = recovered / "sources/objects"; source.mkdir(mode=0o700)
                for path, body in [(checkpoint / "checkpoint.json", owner.checkpoint), (checkpoint / "database.archive.gz", b"synthetic-archive"),
                                   (source / "artifact-index.json", owner.index), (source / "snapshot.json", owner.snapshot)]:
                    path.write_bytes(body); path.chmod(0o600)
                date = datetime.now(timezone.utc) - timedelta(days=10 if owner.stale else 0)
                CHECK.publish(target / "pull-receipt.json", {"status": "DOWNLOADED_DECRYPTED_FILES_VERIFIED",
                    "uploadReceiptSha256": owner.options["receipt_sha256"], "checkpointReportSha256": owner.options["checkpoint_report_sha256"],
                    "releaseId": date.strftime("%Y%m%dT%H%M%SZ") + "-" + "b" * 32})
                return 0
        self.docker = FakeDocker; self.transport = FakeTransport

    def tearDown(self): self.temporary.cleanup()

    def config_file(self, value=None):
        path = self.root / "config.json"; path.write_bytes(encoded(value or self.options)); path.chmod(0o600); return path

    def run_recovery(self):
        with mock.patch.object(CHECK, "Docker", self.docker):
            return CHECK.recover(self.options, self.output, self.transport)

    def test_valid_private_config_and_immutable_images(self):
        self.assertEqual(CHECK.config(self.config_file())["snapshot_label"], "objects")
        self.options["checkpoint_image"] = "sha256:" + "7" * 64
        self.assertEqual(CHECK.config(self.config_file())["checkpoint_image"], "sha256:" + "7" * 64)
        self.options["checkpoint_image"] = "ghcr.io/ude-soco/openlap-official-plugin-checkpoint:latest"
        with self.assertRaises(CHECK.RecoveryError): CHECK.config(self.config_file())

    def test_unknown_config_fields_and_duplicates_rejected(self):
        self.options["secret_value"] = "not-a-real-credential"
        with self.assertRaises(CHECK.RecoveryError): CHECK.config(self.config_file())
        path = self.config_file(); path.write_text('{"age":"a","age":"b"}')
        with self.assertRaises(CHECK.RecoveryError): CHECK.config(path)

    def test_world_readable_config_and_remote_docker_rejected(self):
        path = self.config_file(); path.chmod(0o644)
        with self.assertRaises(CHECK.RecoveryError): CHECK.config(path)
        self.options["docker_host"] = "tcp://remote:2375"
        with self.assertRaises(CHECK.RecoveryError): CHECK.config(self.config_file())

    def test_recovery_requires_independent_index_and_cold_readback(self):
        report, code = self.run_recovery()
        self.assertEqual(code, 0)
        self.assertTrue(report["isolatedDatabaseRestoreVerified"])
        self.assertTrue(report["freshObjectStoreColdReadbackVerified"])
        self.assertTrue(report["sourceMetadataUnchanged"])
        self.assertEqual(self.calls[-1], ("cleanup", True))
        calls = [row for row in self.calls if row[0] == "run"]
        joined = json.dumps(calls)
        self.assertNotIn(self.options["identity_file"], joined)
        self.assertNotIn(self.options["rclone_config"], joined)
        self.assertNotIn("MONGODB_PRIMARY_URI", joined)
        references = [row[1] for row in self.calls if row[0] == "image-reference"]
        self.assertIn(CHECK.HELPER_IMAGE, references)
        self.assertIn(self.options["checkpoint_image"], references)
        self.assertIn(self.options["snapshot_image"], references)
        self.assertNotIn("sha256:" + "a" * 64, references)

    def test_index_mismatch_never_starts_object_restore_or_publishes_success(self):
        self.bad_index = True
        with self.assertRaises(CHECK.RecoveryError): self.run_recovery()
        self.assertFalse(any(row[0] == "run" and row[1][0] == "--restore-fresh" for row in self.calls))
        self.assertFalse((self.output / "recovery-receipt.json").exists())
        self.assertEqual(self.calls[-1], ("cleanup", False))

    def test_cold_failure_retains_scratch_and_has_no_success_receipt(self):
        self.bad_cold = True
        with self.assertRaises(CHECK.RecoveryError): self.run_recovery()
        self.assertEqual(self.calls[-1], ("cleanup", False))
        self.assertFalse((self.output / "recovery-receipt.json").exists())

    def test_stale_backup_is_rehearsed_but_returns_nonzero(self):
        self.stale = True
        report, code = self.run_recovery()
        self.assertEqual(code, 2)
        self.assertTrue(report["isolatedDatabaseRestoreVerified"])
        self.assertFalse(report["backupFreshnessWithinPolicy"])

    def test_source_inventory_rejects_links_and_group_access(self):
        source = self.root / "source"; source.mkdir(mode=0o700)
        file = source / "file"; file.write_bytes(b"synthetic"); file.chmod(0o600)
        initial = CHECK.source_inventory(source, 1024, 10)
        link = source / "link"; link.symlink_to(file)
        with self.assertRaises(CHECK.RecoveryError): CHECK.source_inventory(source, 1024, 10)
        link.unlink(); os.link(file, link)
        with self.assertRaises(CHECK.RecoveryError): CHECK.source_inventory(source, 1024, 10)
        link.unlink(); file.chmod(0o640)
        with self.assertRaises(CHECK.RecoveryError): CHECK.source_inventory(source, 1024, 10)
        file.chmod(0o600)
        self.assertEqual(initial[0], CHECK.source_inventory(source, 1024, 10)[0])

    def test_source_inventory_bounds_actual_bytes(self):
        source = self.root / "source"; source.mkdir(mode=0o700)
        file = source / "file"; file.write_bytes(b"synthetic"); file.chmod(0o600)
        with self.assertRaises(CHECK.RecoveryError): CHECK.source_inventory(source, 3, 10)

    def test_invalid_config_diagnostics_never_echo_input(self):
        path = self.config_file({"unexpected": "synthetic-sensitive-marker"})
        output = io.StringIO()
        with contextlib.redirect_stderr(output): self.assertEqual(CHECK.main(["--config", str(path)]), 1)
        self.assertNotIn("synthetic-sensitive-marker", output.getvalue())

    def test_schedule_template_is_disabled_and_contains_no_credential_values(self):
        path = SCRIPT.parents[2] / "docs/examples/org.openlap.plugin-recovery-check.plist"
        with path.open("rb") as stream: value = plistlib.load(stream)
        self.assertIs(value["Disabled"], True)
        self.assertIs(value["RunAtLoad"], False)
        self.assertEqual(value["Umask"], 0o077)
        self.assertEqual(value["ProgramArguments"][-2], "--config")
        self.assertNotIn("EnvironmentVariables", value)


class DockerContainmentTests(unittest.TestCase):
    def test_verified_multicall_executable_keeps_invocation_name(self):
        with tempfile.TemporaryDirectory(prefix="openlap-public-multicall-") as temporary:
            root = Path(temporary).resolve(); binary = root / "docker-tools"
            binary.write_text("#!/bin/sh\nexit 0\n"); binary.chmod(0o700)
            alias = root / "docker"; alias.symlink_to(binary)
            output = root / "run"; output.mkdir(mode=0o700)
            docker = CHECK.Docker({"docker": str(alias), "docker_host": "unix:///synthetic/docker.sock"}, output)
            self.assertEqual(docker.command[0], str(alias))
            self.assertNotEqual(docker.command[0], str(binary))

    def test_run_is_offline_unprivileged_and_tracks_unique_identity(self):
        docker = CHECK.Docker.__new__(CHECK.Docker)
        docker.token = "openlap-recovery-check-" + "a" * 32; docker.containers = []; docker.journal = lambda: None
        calls = []
        docker.call = lambda args, **kw: (calls.append(args) or (0, b"{}\n"))
        docker.run("sha256:" + "1" * 64, ["--index-plugin-artifacts"], [])
        command = calls[0]
        for flag in ("--network=none", "--pull=never", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges"):
            self.assertIn(flag, command)
        self.assertNotIn("--privileged", command)
        self.assertEqual(len(docker.containers), 1)

    def test_cleanup_refuses_resources_without_run_label(self):
        docker = CHECK.Docker.__new__(CHECK.Docker)
        docker.token = "synthetic-run"; docker.containers = ["another-container"]; docker.volumes = ["another-volume"]
        calls = []
        docker.call = lambda args, **kw: (calls.append(args) or (0, b'{"org.openlap.recovery-run":"another-run"}'))
        self.assertFalse(docker.cleanup(volumes=True))
        self.assertFalse(any("rm" in args for args in calls))


if __name__ == "__main__": unittest.main()
