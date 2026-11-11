"""Strict online-report transport fixtures; generated files and native local alias only."""
from contextlib import redirect_stderr, redirect_stdout
import copy
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("online_release_backup", ROOT / "openlap-analyticsframework/scripts/plugin-release-backup.py")
BACKUP = importlib.util.module_from_spec(spec); spec.loader.exec_module(BACKUP)


def sha(body): return hashlib.sha256(body).hexdigest()


def collection(name):
    return {"name": name, "count": 1, "identityMd5": "1" * 32, "dataMd5": "2" * 32,
            "optionsMd5": "3" * 32, "indexesMd5": "4" * 32}


def checkpoint(root):
    directory = root / "checkpoint"; directory.mkdir(mode=0o700)
    plain = b"SYNTHETIC_ONLINE_REPORT_TRANSPORT_RECORD"; archive = gzip.compress(plain)
    (directory / "database.archive.gz").write_bytes(archive)
    rows = [collection("fixture")]
    report = {"schemaVersion": 2, "status": BACKUP.ONLINE_COMPLETE, "captureMode": "INSTANCE_WIDE_OPLOG",
              "checkpointId": "online-fixture", "database": "fixture", "sourceServerVersion": "4.4.30", "restoreServerVersion": "4.4.30",
              "fcv": "4.4", "databaseToolsVersion": "100.10.0", "archiveFile": "database.archive.gz",
              "archiveSha256": sha(archive), "archiveSizeBytes": len(archive), "expandedArchiveBytes": len(plain),
              "gzipValidated": True, "oplogReplayVerified": True, "sourceMetadataMatched": True, "sourceIdentityMd5": "5" * 32,
              "sourceReplicaSet": {"name": "fixture-rs", "identityMd5": "6" * 32},
              "sourceOplogBefore": {"seconds": 100, "increment": 1}, "sourceOplogAfter": {"seconds": 100, "increment": 2},
              "captureStartedAt": "2026-01-01T02:00:00.000Z", "captureCompletedAt": "2026-01-01T02:00:01.000Z",
              "oplogRangeValidation": "NATIVE_MONGODUMP_COMPLETE_RANGE", "fingerprintAuthority": "ISOLATED_FULL_OPLOG_REPLAY",
              "databases": [{"name": "admin", "collections": [collection("system.version")]}, {"name": "fixture", "collections": copy.deepcopy(rows)}],
              "collections": rows, "scope": BACKUP.ONLINE_SCOPE}
    return directory, report


def write_report(directory, report):
    data = BACKUP.json_bytes(report); (directory / "checkpoint.json").write_bytes(data); return sha(data)


class OnlineReportTests(unittest.TestCase):
    def validate(self, directory, report):
        return BACKUP.validate_checkpoint(directory, write_report(directory, report), BACKUP.MIB, BACKUP.Deadline(5))

    def test_strict_online_report_and_full_archive_integrity(self):
        with tempfile.TemporaryDirectory(prefix="openlap-online-transport-") as temporary:
            directory, report = checkpoint(Path(temporary).resolve())
            self.assertEqual(self.validate(directory, report), report)

    def test_frozen_fields_and_partial_online_claims_are_rejected(self):
        mutations = [("schemaVersion", True), ("status", "DUMP_AND_ISOLATED_RESTORE_VERIFIED"), ("captureMode", "FROZEN"),
                     ("freezeEvidenceId", "invented-pause"), ("sourceBeforeAfterMatched", True), ("restoredMatched", True),
                     ("oplogReplayVerified", False), ("sourceMetadataMatched", 1), ("gzipValidated", False),
                     ("oplogRangeValidation", "ASSUMED"), ("fingerprintAuthority", "SOURCE_HASH_ONLY"),
                     ("restoreServerVersion", "4.4.29"), ("scope", "all-systems-backed-up")]
        for key, value in mutations:
            with self.subTest(key=key), tempfile.TemporaryDirectory() as temporary:
                directory, report = checkpoint(Path(temporary).resolve()); report[key] = value
                with self.assertRaises(Exception): self.validate(directory, report)

    def test_full_instance_rows_cannot_hide_or_misstate_selected_projection(self):
        for action in ("missing", "mismatch", "duplicate", "unsorted", "local", "system-app", "extra-row-key", "extra-database-key"):
            with self.subTest(action=action), tempfile.TemporaryDirectory() as temporary:
                directory, report = checkpoint(Path(temporary).resolve())
                if action == "missing": report["databases"] = report["databases"][:1]
                elif action == "mismatch": report["databases"][1]["collections"][0]["dataMd5"] = "0" * 32
                elif action == "duplicate": report["databases"].append(copy.deepcopy(report["databases"][-1]))
                elif action == "unsorted": report["databases"].reverse()
                elif action == "local": report["databases"].append({"name": "local", "collections": [collection("fixture")]})
                elif action == "system-app": report["databases"][1]["collections"][0]["name"] = "system.users"
                elif action == "extra-row-key": report["databases"][1]["collections"][0]["unverified"] = True
                elif action == "extra-database-key": report["databases"][1]["unverified"] = True
                with self.assertRaises(Exception): self.validate(directory, report)

    def test_oplog_bounds_replica_identity_and_utc_chronology_are_strict(self):
        mutations = [lambda r: r["sourceOplogAfter"].update(increment=0),
                     lambda r: r["sourceOplogBefore"].update(seconds=True),
                     lambda r: r["sourceOplogAfter"].update(seconds=4294967296),
                     lambda r: r["sourceOplogBefore"].update(unexpected=True),
                     lambda r: r["sourceReplicaSet"].update(name="../other"),
                     lambda r: r["sourceReplicaSet"].update(identityMd5="wrong"),
                     lambda r: r.update(captureStartedAt="2026-02-30T00:00:00.000Z"),
                     lambda r: r.update(captureStartedAt="2026-01-01T03:00:00.000Z"),
                     lambda r: r.update(captureStartedAt="2026-01-01T02:00:00Z")]
        for index, mutate in enumerate(mutations):
            with self.subTest(index=index), tempfile.TemporaryDirectory() as temporary:
                directory, report = checkpoint(Path(temporary).resolve()); mutate(report)
                with self.assertRaises(Exception): self.validate(directory, report)

    def test_report_is_authenticated_before_schema_dispatch_and_raw_size_is_bounded(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory, report = checkpoint(Path(temporary).resolve()); write_report(directory, report)
            with self.assertRaises(BACKUP.BackupError): BACKUP.validate_checkpoint(directory, "0" * 64, BACKUP.MIB, BACKUP.Deadline(5))
            body = BACKUP.json_bytes(report) + b" " * 262144; (directory / "checkpoint.json").write_bytes(body)
            with self.assertRaises(BACKUP.BackupError): BACKUP.validate_checkpoint(directory, sha(body), BACKUP.MIB, BACKUP.Deadline(5))

    def test_archive_size_hash_and_gzip_remain_verified(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory, report = checkpoint(Path(temporary).resolve())
            archive = (directory / "database.archive.gz").read_bytes()[:-3]; (directory / "database.archive.gz").write_bytes(archive)
            report.update(archiveSha256=sha(archive), archiveSizeBytes=len(archive))
            with self.assertRaises(Exception): self.validate(directory, report)


@unittest.skipUnless(os.environ.get("PLUGIN_BACKUP_AGE_BIN") and os.environ.get("PLUGIN_BACKUP_RCLONE_BIN"), "Explicit verified native clients required")
class NativeOnlineTransportTests(unittest.TestCase):
    def test_real_encrypted_online_report_roundtrip_uses_only_generated_local_alias(self):
        age = Path(os.environ["PLUGIN_BACKUP_AGE_BIN"]).resolve(); rclone = Path(os.environ["PLUGIN_BACKUP_RCLONE_BIN"]).resolve()
        keygen = age.with_name("age-keygen")
        with tempfile.TemporaryDirectory(prefix="openlap-online-native-") as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            directory, report = checkpoint(root); report_sha = write_report(directory, report)
            remote = root / "remote"; remote.mkdir(mode=0o700)
            profile = root / "rclone.conf"; profile.write_text("[fixture]\ntype = alias\nremote = " + str(remote) + "\n"); profile.chmod(0o600)
            identity = root / "identity.txt"
            result = subprocess.run([str(keygen), "-o", str(identity)], capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0)
            recipient = subprocess.check_output([str(keygen), "-y", str(identity)], text=True).strip()
            source = root / "objects"; source.mkdir(mode=0o700); (source / "synthetic.txt").write_bytes(b"GENERATED_ONLINE_TRANSPORT_ONLY")
            common = ["--age", str(age), "--rclone", str(rclone), "--rclone-config", str(profile), "--remote", "fixture:releases",
                      "--checkpoint-report-sha256", report_sha, "--max-bytes", "1048576", "--max-files", "100", "--timeout-seconds", "30"]
            uploaded = root / "upload"; retrieved = root / "retrieved"
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(BACKUP.main(["push", *common, "--checkpoint", str(directory), "--source", "objects=" + str(source),
                                              "--recipient", recipient, "--output", str(uploaded)]), 0)
                receipt = uploaded / "receipt.json"; receipt_sha = sha(receipt.read_bytes())
                self.assertEqual(BACKUP.main(["pull", *common, "--receipt", str(receipt), "--receipt-sha256", receipt_sha,
                                              "--identity-file", str(identity), "--output", str(retrieved)]), 0)
            self.assertEqual((retrieved / "recovered/checkpoint/checkpoint.json").read_bytes(), (directory / "checkpoint.json").read_bytes())
            self.assertEqual(json.loads((retrieved / "pull-receipt.json").read_bytes())["status"], "DOWNLOADED_DECRYPTED_FILES_VERIFIED")


if __name__ == "__main__": unittest.main()
