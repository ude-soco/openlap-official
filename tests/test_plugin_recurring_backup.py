"""Generated files only; snapshot integrity and default-denial regressions."""
import copy
import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import tempfile
from types import SimpleNamespace
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "openlap-analyticsframework/scripts"


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value


PRODUCER = load("producer_upload", "plugin-recurring-backup.py")
BACKUP = load("producer_transport", "plugin-release-backup.py")
EXPORT = load("producer_export", "plugin-recurring-export.py")


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="openlap-synthetic-producer-")
        self.root = Path(self.temporary.name).resolve(); self.root.chmod(0o700)
        (self.root / "bodies").mkdir(mode=0o700)
        for name in ("artifact-index.json", "snapshot.json"):
            (self.root / name).write_bytes(b"{}\n"); (self.root / name).chmod(0o600)
        self.payload = b"SYNTHETIC_IMMUTABLE_BODY"; self.sha = hashlib.sha256(self.payload).hexdigest()
        self.key = "plugins/analytics/" + self.sha + ".jar"
        body = self.root / "bodies/0000.jar"; body.write_bytes(self.payload); body.chmod(0o600)
        self.index = {"artifacts": [{"objectKey": self.key, "state": "READY", "sizeBytes": len(self.payload)}]}
        self.manifest = {"schemaVersion": 2, "format": "OPENLAP_PLUGIN_OBJECT_SNAPSHOT_IMMUTABLE_CUT_V1", "artifactIndexSha256": "1" * 64,
            "originalCheckpointReportSha256": "2" * 64, "archiveSha256": "3" * 64, "objectCount": 1, "totalBytes": len(self.payload),
            "databaseAssociationScope": "verified-index-only", "recoveryVerified": False, "objectSelectionPolicy": "IMMUTABLE_KEYS_AT_EXPORT_CUT",
            "physicalDeletionDisabled": True, "objects": [{"objectKey": self.key, "sha256": self.sha, "sizeBytes": len(self.payload),
                "contentType": "application/java-archive", "metadata": {"sha256": self.sha}, "bodyPath": "bodies/0000.jar", "classification": "REGISTERED"}]}

    def tearDown(self): self.temporary.cleanup()

    def validate(self, online=True):
        PRODUCER.snapshot_files(self.root, self.manifest, self.index, "2" * 64, "1" * 64, "3" * 64, BACKUP, BACKUP.Deadline(5), online=online)

    def test_complete_online_object_cut_is_verified(self): self.validate()

    def test_private_directories_allow_only_owner_access_with_optional_sgid(self):
        for mode in (0o700, 0o2700):
            with self.subTest(mode=mode), mock.patch.object(Path, "lstat", return_value=SimpleNamespace(st_uid=1000, st_mode=stat.S_IFDIR | mode, st_nlink=2)):
                self.assertEqual(EXPORT.private(self.root, directory=True), self.root)
        for mode in (0o750, 0o2750, 0o2770, 0o1700):
            with self.subTest(mode=mode), mock.patch.object(Path, "lstat", return_value=SimpleNamespace(st_uid=1000, st_mode=stat.S_IFDIR | mode, st_nlink=2)):
                with self.assertRaises(Exception): EXPORT.private(self.root, directory=True)

    def test_frozen_manifest_remains_supported_without_online_claims(self):
        self.manifest.update(schemaVersion=1, format="OPENLAP_PLUGIN_OBJECT_SNAPSHOT_V1")
        del self.manifest["objectSelectionPolicy"]; del self.manifest["physicalDeletionDisabled"]
        self.validate(online=False)
        with self.assertRaises(Exception): self.validate(online=True)

    def test_wrong_body_or_extra_source_file_cannot_be_uploaded(self):
        body = self.root / "bodies/0000.jar"; body.write_bytes(b"SYNTHETIC_CORRUPTION")
        with self.assertRaises(Exception): self.validate()
        body.write_bytes(self.payload); (self.root / "unexpected.txt").write_text("SYNTHETIC_EXTRA")
        with self.assertRaises(Exception): self.validate()

    def test_required_missing_and_purged_present_keys_fail(self):
        self.index["artifacts"][0]["state"] = "PURGED"
        with self.assertRaises(Exception): self.validate()
        self.index["artifacts"][0].update(state="READY", objectKey="plugins/analytics/" + "0" * 64 + ".jar")
        with self.assertRaises(Exception): self.validate()

    def test_flags_key_metadata_path_and_hash_bindings_are_not_optional(self):
        mutations = [lambda m: m.update(physicalDeletionDisabled=False), lambda m: m.update(recoveryVerified=True),
                     lambda m: m.update(originalCheckpointReportSha256="0" * 64), lambda m: m["objects"][0].update(bodyPath="../escape"),
                     lambda m: m["objects"][0].update(contentType="text/plain"), lambda m: m["objects"][0].update(classification="SOURCE_ORPHAN")]
        original = copy.deepcopy(self.manifest)
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                self.manifest = copy.deepcopy(original); mutate(self.manifest)
                with self.assertRaises(Exception): self.validate()

    def test_defaults_and_cross_mode_arguments_fail_before_source_access(self):
        with mock.patch.object(PRODUCER, "module", side_effect=AssertionError("no runtime modules may load")):
            self.assertEqual(PRODUCER.main([]), 1)
            self.assertEqual(PRODUCER.main(["--upload-report"]), 1)
        with mock.patch.object(EXPORT, "guard", side_effect=AssertionError("no source guard before explicit action")):
            self.assertEqual(EXPORT.main([]), 1)
            self.assertEqual(EXPORT.main(["--export"]), 1)

    def test_public_numeric_budgets_fail_closed(self):
        for value in ("0", "-1", "1.5", "9999999999999999999", "x", "1\n"):
            with self.subTest(value=value), mock.patch.dict(os.environ, {"BACKUP_MAX_BYTES": value}):
                with self.assertRaises(Exception): PRODUCER.number("BACKUP_MAX_BYTES", 16, 1024)


if __name__ == "__main__": unittest.main()
