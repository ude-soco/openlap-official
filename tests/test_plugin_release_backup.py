"""Synthetic local tests only: no account, live endpoint, profile or real credentials."""
import argparse
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest import mock

SOURCE = Path(__file__).resolve().parents[1] / "analyticsframework/scripts/plugin-release-backup.py"
spec = importlib.util.spec_from_file_location("release_backup", SOURCE)
backup = importlib.util.module_from_spec(spec); spec.loader.exec_module(backup)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def checkpoint(root):
    directory = root / "checkpoint"; directory.mkdir(mode=0o700)
    plain = b"SYNTHETIC_BACKUP_RECORD"
    archive = gzip.compress(plain)
    (directory / "database.archive.gz").write_bytes(archive)
    report = {"schemaVersion": 1, "status": backup.COMPLETE, "archiveFile": "database.archive.gz",
              "archiveSha256": sha(archive), "archiveSizeBytes": len(archive), "expandedArchiveBytes": len(plain),
              "gzipValidated": True, "sourceBeforeAfterMatched": True, "restoredMatched": True,
              "checkpointId": "fixture", "freezeEvidenceId": "fixture-drain", "database": "fixture",
              "sourceServerVersion": "4.4.30", "restoreServerVersion": "4.4.30", "fcv": "4.4", "databaseToolsVersion": "100.10.0",
              "sourceIdentityMd5": "a" * 32, "collections": [{"name": "fixture", "count": 1,
                  "identityMd5": "b" * 32, "dataMd5": "c" * 32, "optionsMd5": "d" * 32, "indexesMd5": "e" * 32}]}
    data = backup.json_bytes(report); (directory / "checkpoint.json").write_bytes(data)
    return directory, sha(data)


def options(report_sha):
    return argparse.Namespace(max_bytes=backup.MIB, max_files=100, checkpoint_report_sha256=report_sha)


class ValidationTests(unittest.TestCase):
    def test_checkpoint_requires_original_report_hash_before_parsing(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); directory, digest = checkpoint(root)
            with mock.patch.object(backup, "parse_json") as parser, self.assertRaises(backup.BackupError):
                backup.validate_checkpoint(directory, "0" * 64, backup.MIB, backup.Deadline(5))
            parser.assert_not_called()
            backup.validate_checkpoint(directory, digest, backup.MIB, backup.Deadline(5))

    def test_checkpoint_rejects_unfinished_flags_sizes_hashes_and_gzip(self):
        changes = [("status", "PARTIAL"), ("gzipValidated", False), ("sourceBeforeAfterMatched", 1),
                   ("restoredMatched", False), ("archiveSizeBytes", True), ("archiveSizeBytes", 1),
                   ("archiveSha256", "a" * 64), ("expandedArchiveBytes", 1), ("checkpointId", ""),
                   ("database", "admin"), ("fcv", "5.0"), ("sourceIdentityMd5", "bad"), ("collections", [])]
        for key, value in changes:
            with self.subTest(key=key, value=value), tempfile.TemporaryDirectory() as temporary:
                directory, _ = checkpoint(Path(temporary).resolve())
                report = json.loads((directory / "checkpoint.json").read_bytes()); report[key] = value
                data = backup.json_bytes(report); (directory / "checkpoint.json").write_bytes(data)
                with self.assertRaises(backup.BackupError):
                    backup.validate_checkpoint(directory, sha(data), backup.MIB, backup.Deadline(5))
        with tempfile.TemporaryDirectory() as temporary:
            directory, _ = checkpoint(Path(temporary).resolve())
            archive = (directory / "database.archive.gz").read_bytes()[:-3]
            (directory / "database.archive.gz").write_bytes(archive)
            report = json.loads((directory / "checkpoint.json").read_bytes())
            report.update(archiveSha256=sha(archive), archiveSizeBytes=len(archive))
            data = backup.json_bytes(report); (directory / "checkpoint.json").write_bytes(data)
            with self.assertRaises((EOFError, OSError, backup.BackupError)):
                backup.validate_checkpoint(directory, sha(data), backup.MIB, backup.Deadline(5))

    def test_json_duplicate_keys_and_nonstandard_numbers_fail(self):
        for data in [b'{"a":1,"a":2}', b'{"a":NaN}', b'{"a":Infinity}']:
            with self.subTest(data=data), self.assertRaises(backup.BackupError): backup.parse_json(data)

    def test_paths_and_remote_connection_strings_are_rejected(self):
        for value in ["/absolute", "../escape", "a/../b", "a//b", "a/./b", ".", "a\\b", "a\nb"]:
            with self.subTest(value=value), self.assertRaises(backup.BackupError): backup.member_path(value)
        for value in [":webdav,url=https://invalid:", "remote,pass=secret:path", "remote:", "remote:/absolute", "remote:a/../b", "remote:a//b"]:
            with self.subTest(value=value), self.assertRaises(backup.BackupError): backup.remote_path(value)
        self.assertEqual(backup.remote_path("fixture:release-backups"), "fixture:release-backups")
        self.assertEqual(backup.remote_path("fixture:Release copies"), "fixture:Release copies")

    def test_sources_reject_symlinks_special_files_and_repository_metadata(self):
        for kind in ["file", "directory", "fifo", "git"]:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve(); source = root / "source"; source.mkdir()
                if kind == "file": (source / "link").symlink_to(SOURCE)
                elif kind == "directory": (source / "link").symlink_to(root, target_is_directory=True)
                elif kind == "fifo": os.mkfifo(source / "pipe")
                else: (source / ".git").write_text("synthetic repository marker")
                with self.assertRaises(backup.BackupError): backup.scan({"sources/fixture": source}, 10, backup.Deadline(5))

    @unittest.skipIf(os.geteuid() == 0, "Permission fixture needs a non-root user")
    def test_unreadable_directory_is_not_silently_empty(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary).resolve(); nested = source / "nested"; nested.mkdir(); nested.chmod(0)
            try:
                with self.assertRaises(backup.BackupError): backup.scan({"sources/fixture": source}, 10, backup.Deadline(5))
            finally: nested.chmod(0o700)

    def test_source_drift_and_file_byte_budgets_fail_before_encryption(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); directory, digest = checkpoint(root)
            source = root / "source"; source.mkdir(); file = source / "fixture.jar"; file.write_bytes(b"original")
            original = backup.digest_file
            def changed(path, maximum, deadline):
                result = original(path, maximum, deadline)
                if path == file: file.write_bytes(b"modified")
                return result
            report = json.loads((directory / "checkpoint.json").read_bytes())
            with mock.patch.object(backup, "digest_file", side_effect=changed), self.assertRaises(backup.BackupError):
                backup.make_tar(root / "partial.tar", directory, report, {"fixture": source}, options(digest), "fixture", backup.Deadline(5))
            with self.assertRaises(backup.BackupError): backup.scan({"sources/fixture": source}, 0, backup.Deadline(5))
            with self.assertRaises(backup.BackupError): backup.digest_file(file, 1, backup.Deadline(5))

    def test_source_membership_drift_is_detected_after_tar_creation(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); directory, digest = checkpoint(root)
            source = root / "source"; source.mkdir(); (source / "fixture.jar").write_bytes(b"original")
            original = backup.scan; calls = []
            def changed(*args):
                calls.append(True)
                if len(calls) == 2: (source / "new.jar").write_bytes(b"new source")
                return original(*args)
            report = json.loads((directory / "checkpoint.json").read_bytes())
            with mock.patch.object(backup, "scan", side_effect=changed), self.assertRaises(backup.BackupError):
                backup.make_tar(root / "partial.tar", directory, report, {"fixture": source}, options(digest), "fixture", backup.Deadline(5))
            self.assertEqual(len(calls), 2)

    def test_credential_paths_are_only_stat_checked_and_must_be_private_direct_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); config = root / "config"; config.write_bytes(b"SYNTHETIC_CONFIG_SECRET"); config.chmod(0o600)
            executable = root / "client"; executable.write_text("synthetic"); executable.chmod(0o700)
            selected = argparse.Namespace(age=executable, rclone=executable, rclone_config=config)
            with mock.patch.object(backup, "read_file", side_effect=AssertionError("Python must not read config bytes")):
                backup.Tools(selected, root, backup.Deadline(5))
            config.chmod(0o644)
            with self.assertRaises(backup.BackupError): backup.Tools(selected, root, backup.Deadline(5))
            config.chmod(0o600); link = root / "link"; link.symlink_to(config)
            for path in [link, root]:
                with self.subTest(path=path.name), self.assertRaises(backup.BackupError): backup.physical(path, private=True)

    def test_report_publication_rolls_back_only_a_new_completed_receipt(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); receipt = root / "receipt.json"; partial = root / "receipt.json.partial"
            real_unlink = Path.unlink; observed = []
            def failed(path, *args, **kwargs):
                if path == partial:
                    self.assertTrue(os.path.samefile(path, receipt)); observed.append(True)
                    raise OSError("synthetic post-link failure")
                return real_unlink(path, *args, **kwargs)
            with redirect_stdout(io.StringIO()), mock.patch.object(Path, "unlink", failed), self.assertRaises(OSError):
                backup.publish_receipt(receipt, {"status": "fixture"})
            self.assertEqual(observed, [True]); self.assertFalse(receipt.exists()); self.assertTrue(partial.exists())
        with tempfile.TemporaryDirectory() as temporary:
            receipt = Path(temporary).resolve() / "receipt.json"; receipt.write_bytes(b"retained")
            with redirect_stdout(io.StringIO()), self.assertRaises(FileExistsError):
                backup.publish_receipt(receipt, {"status": "fixture"})
            self.assertEqual(receipt.read_bytes(), b"retained")

    def test_subprocesses_have_no_ambient_credentials_and_bounded_private_errors(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); config = root / "config"; config.write_text("synthetic configuration"); config.chmod(0o600)
            executable = root / "fixture-client"
            executable.write_text("#!" + sys.executable + "\nimport os,sys\nassert 'RCLONE_CONFIG_PASS' not in os.environ\nassert 'AWS_ACCESS_KEY_ID' not in os.environ\nsys.stderr.write('SYNTHETIC_CLIENT_SECRET')\nsys.stdout.buffer.write(b'x'*100)\nsys.exit(1)\n")
            executable.chmod(0o700)
            selected = argparse.Namespace(age=executable, rclone=executable, rclone_config=config)
            with mock.patch.dict(os.environ, {"RCLONE_CONFIG_PASS": "synthetic", "AWS_ACCESS_KEY_ID": "synthetic"}):
                tools = backup.Tools(selected, root, backup.Deadline(5))
                with self.assertRaises(backup.BackupError) as error: tools.run([executable], "Fixture", maximum=10)
            self.assertNotIn("SYNTHETIC_CLIENT_SECRET", str(error.exception))
            self.assertNotIn(str(config), str(error.exception))
            executable.write_text("#!" + sys.executable + "\nimport time\ntime.sleep(30)\n")
            with self.assertRaises((backup.BackupError, subprocess.TimeoutExpired)):
                backup.Tools(selected, root, backup.Deadline(0.05)).run([executable], "Fixture")

    def test_unsafe_tar_headers_traversal_duplicates_and_trailers_fail(self):
        for kind in ["traversal", "symlink", "hardlink", "fifo", "directory", "pax", "duplicate", "trailer", "unlisted"]:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve(); directory, digest = checkpoint(root)
                names = {backup.REPORT: (directory / "checkpoint.json").read_bytes(), backup.ARCHIVE: (directory / "database.archive.gz").read_bytes()}
                manifest = {"schemaVersion": 1, "releaseId": "fixture", "checkpointReportSha256": digest,
                            "files": [{"path": name, "sha256": sha(data), "sizeBytes": len(data)} for name, data in names.items()]}
                manifest_bytes = backup.json_bytes(manifest); target = root / "malformed.tar"
                with tarfile.open(target, "w", format=tarfile.PAX_FORMAT if kind == "pax" else tarfile.USTAR_FORMAT) as archive:
                    for name, data in {**names, backup.MANIFEST: manifest_bytes}.items():
                        info = tarfile.TarInfo(name); info.size = len(data); archive.addfile(info, io.BytesIO(data))
                    if kind != "trailer":
                        info = tarfile.TarInfo("../escape" if kind == "traversal" else backup.REPORT if kind == "duplicate" else "sources/fixture/extra")
                        if kind == "pax": info.pax_headers = {"comment": "synthetic"}
                        types = {"symlink": tarfile.SYMTYPE, "hardlink": tarfile.LNKTYPE, "fifo": tarfile.FIFOTYPE, "directory": tarfile.DIRTYPE}
                        info.type = types.get(kind, tarfile.REGTYPE); info.linkname = "../escape" if kind in types else ""
                        archive.addfile(info, io.BytesIO(b""))
                if kind == "trailer":
                    with target.open("ab") as stream: stream.write(b"untrusted trailing bytes")
                receipt = {"manifestSha256": sha(manifest_bytes), "releaseId": "fixture"}
                with self.assertRaises((backup.BackupError, OSError)):
                    backup.unpack(target, root / "recovered", receipt, options(digest), backup.Deadline(5))
                self.assertFalse((root / "escape").exists())


@unittest.skipUnless(os.environ.get("PLUGIN_BACKUP_AGE_BIN") and os.environ.get("PLUGIN_BACKUP_RCLONE_BIN"),
                     "Set explicit verified age/rclone binary paths for the local integration fixtures")
class RealToolTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="plugin-backup-fixture-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve(); self.root.chmod(0o700)
        self.age = Path(os.environ["PLUGIN_BACKUP_AGE_BIN"]); self.rclone = Path(os.environ["PLUGIN_BACKUP_RCLONE_BIN"])
        keygen = self.age.with_name("age-keygen")
        self.identity = self.root / "identity"
        result = subprocess.run([str(keygen), "-o", str(self.identity)], check=True, capture_output=True, timeout=10)
        self.recipient = result.stderr.decode().strip().split()[-1]
        self.directory, self.report_sha = checkpoint(self.root)
        self.source = self.root / "reviewed-sources"; self.source.mkdir(mode=0o700)
        (self.source / "fixture.jar").write_bytes(b"SYNTHETIC_PLUGIN_BYTES")
        self.remote = self.root / "remote"; self.remote.mkdir(mode=0o700)
        self.config = self.root / "rclone.conf"
        self.config.write_text("[fixture]\ntype = alias\nremote = " + str(self.remote) + "\n"); self.config.chmod(0o600)

    def invoke(self, action, output, extra):
        stdout = io.StringIO(); stderr = io.StringIO()
        args = [action, "--age", str(self.age), "--rclone", str(self.rclone), "--rclone-config", str(self.config),
                "--remote", "fixture:releases", "--output", str(output), "--checkpoint-report-sha256", self.report_sha,
                "--max-bytes", str(backup.MIB), "--max-files", "100", "--timeout-seconds", "30", *extra]
        with redirect_stdout(stdout), redirect_stderr(stderr): status = backup.main(args)
        self.assertEqual(stdout.getvalue(), "")
        self.assertNotIn("SYNTHETIC_BACKUP_RECORD", stdout.getvalue() + stderr.getvalue())
        self.assertNotIn("SYNTHETIC_PLUGIN_BYTES", stdout.getvalue() + stderr.getvalue())
        return status

    def upload(self):
        output = self.root / "upload"
        status = self.invoke("push", output, ["--checkpoint", str(self.directory), "--source", "artifacts=" + str(self.source), "--recipient", self.recipient])
        self.assertEqual(status, 0)
        return output, json.loads((output / "receipt.json").read_bytes())

    def pull_args(self, uploaded):
        receipt = uploaded / "receipt.json"
        return ["--receipt", str(receipt), "--receipt-sha256", sha(receipt.read_bytes()), "--identity-file", str(self.identity)]

    def test_real_age_rclone_roundtrip_retains_private_local_and_remote_copies(self):
        uploaded, receipt = self.upload(); recovered = self.root / "download"
        self.assertEqual(self.invoke("pull", recovered, self.pull_args(uploaded)), 0)
        self.assertEqual((recovered / "recovered/sources/artifacts/fixture.jar").read_bytes(), (self.source / "fixture.jar").read_bytes())
        self.assertEqual((recovered / "recovered/checkpoint/checkpoint.json").read_bytes(), (self.directory / "checkpoint.json").read_bytes())
        self.assertEqual((uploaded / receipt["objectName"]).read_bytes(), (self.remote / "releases" / receipt["objectName"]).read_bytes())
        self.assertNotIn(b"SYNTHETIC_PLUGIN_BYTES", (uploaded / receipt["objectName"]).read_bytes())
        self.assertEqual(json.loads((recovered / "pull-receipt.json").read_bytes())["status"], "DOWNLOADED_DECRYPTED_FILES_VERIFIED")
        for directory in [uploaded, recovered]:
            for path in [directory, *directory.rglob("*")]:
                self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o700 if path.is_dir() else 0o600)
        self.assertEqual(self.invoke("pull", recovered, self.pull_args(uploaded)), 1)

    def test_corrupt_remote_or_wrong_trusted_receipt_never_publishes_pull_success(self):
        uploaded, receipt = self.upload()
        (self.remote / "releases" / receipt["objectName"]).write_bytes(b"altered remote ciphertext")
        output = self.root / "corrupt-download"
        self.assertEqual(self.invoke("pull", output, self.pull_args(uploaded)), 1)
        self.assertFalse((output / "pull-receipt.json").exists())
        arguments = self.pull_args(uploaded); arguments[3] = "0" * 64
        output = self.root / "untrusted-receipt"
        self.assertEqual(self.invoke("pull", output, arguments), 1)
        self.assertFalse((output / "pull-receipt.json").exists())

    def test_existing_remote_object_is_not_overwritten(self):
        stamp = datetime(2020, 1, 1, tzinfo=timezone.utc)
        name = "release-20200101T000000Z-" + "a" * 32 + ".tar.age"
        (self.remote / "releases").mkdir(); existing = self.remote / "releases" / name; existing.write_bytes(b"retained")
        with mock.patch.object(backup, "datetime") as clock, mock.patch.object(backup.secrets, "token_hex", return_value="a" * 32):
            clock.now.return_value = stamp
            output = self.root / "collision"
            self.assertEqual(self.invoke("push", output, ["--checkpoint", str(self.directory), "--source", "artifacts=" + str(self.source), "--recipient", self.recipient]), 1)
        self.assertEqual(existing.read_bytes(), b"retained"); self.assertFalse((output / "receipt.json").exists())

    def test_wrong_identity_never_publishes_decrypted_success(self):
        uploaded, _ = self.upload()
        wrong = self.root / "wrong-identity"
        subprocess.run([str(self.age.with_name("age-keygen")), "-o", str(wrong)], check=True, capture_output=True, timeout=10)
        arguments = self.pull_args(uploaded); arguments[-1] = str(wrong)
        output = self.root / "wrong-key-download"
        self.assertEqual(self.invoke("pull", output, arguments), 1)
        self.assertFalse((output / "pull-receipt.json").exists())


if __name__ == "__main__":
    unittest.main()
