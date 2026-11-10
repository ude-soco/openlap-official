"""Typed metadata only; no operator credentials, provider or Kubernetes access."""
from contextlib import redirect_stderr, redirect_stdout
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

SOURCE = Path(__file__).resolve().parents[1] / "openlap-analyticsframework/scripts/plugin-backup-upload.py"
spec = importlib.util.spec_from_file_location("upload_report", SOURCE)
upload = importlib.util.module_from_spec(spec); spec.loader.exec_module(upload)
REPORT_SHA = "1" * 64


def receipt():
    release = "20200101T000000Z-" + "a" * 32
    return {"schemaVersion": 1, "status": "ENCRYPTED_UPLOAD_AND_READBACK_VERIFIED", "releaseId": release,
            "objectName": "release-" + release + ".tar.age", "cipherSha256": "2" * 64, "cipherSizeBytes": 11000,
            "tarSha256": "3" * 64, "tarSizeBytes": 10240, "manifestSha256": "4" * 64,
            "checkpointReportSha256": REPORT_SHA, "scope": upload.SCOPE}


class ReportTests(unittest.TestCase):
    def invoke(self, arguments, output=None):
        stdout = output or io.StringIO(); stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr): status = upload.main(arguments)
        self.assertNotIn("SYNTHETIC_PRIVATE_CLIENT_ERROR", stderr.getvalue())
        return status, stdout, stderr

    def test_frame_is_bounded_canonical_and_reconstructs_exact_receipt(self):
        original = receipt(); data = upload.frame(original, REPORT_SHA)
        self.assertLess(len(data), 4096)
        self.assertEqual(upload.parse_report(data, REPORT_SHA), original)
        envelope = json.loads(data.splitlines()[1])
        self.assertEqual(envelope["receiptSha256"], hashlib.sha256(upload.backup.json_bytes(original)).hexdigest())

    def test_malformed_truncated_duplicate_and_noncanonical_frames_fail(self):
        valid = upload.frame(receipt(), REPORT_SHA)
        cases = [b"", valid[:-1], valid[:-20], valid * 2, b"prefix\n" + valid, valid + b"suffix\n",
                 valid.replace(upload.FOOTER, upload.HEADER), valid.replace(b'"schemaVersion":1', b'"schemaVersion":true', 1),
                 valid.replace(b'"schemaVersion":1', b'"schemaVersion":1,"schemaVersion":1', 1),
                 valid.replace(b'"cipherSizeBytes":11000', b'"cipherSizeBytes":NaN'), b"x" * 4097,
                 valid.replace(b'{"receipt":', b'{ "receipt":', 1)]
        for value in cases:
            with self.subTest(value=value[:40]), self.assertRaises(Exception): upload.parse_report(value, REPORT_SHA)

    def test_only_exact_typed_upload_receipt_metadata_is_reported(self):
        variants = []
        for key, value in [("schemaVersion", True), ("status", "INCOMPLETE"), ("scope", "SYNTHETIC_PRIVATE_CLIENT_ERROR"),
                           ("cipherSizeBytes", True), ("cipherSizeBytes", 11000.0), ("cipherSizeBytes", 1),
                           ("tarSizeBytes", 10241), ("cipherSha256", "A" * 64), ("objectName", "../escape")]:
            changed = receipt(); changed[key] = value; variants.append(changed)
        changed = receipt(); changed["unexpected"] = "SYNTHETIC_PRIVATE_CLIENT_ERROR"; variants.append(changed)
        changed = receipt(); del changed["manifestSha256"]; variants.append(changed)
        for value in variants:
            with self.subTest(value=value), self.assertRaises(Exception): upload.frame(value, REPORT_SHA)
        with self.assertRaises(Exception): upload.parse_report(upload.frame(receipt(), REPORT_SHA), "0" * 64)

    def test_local_import_is_private_exclusive_and_hash_exact(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            source = root / "report"; source.write_bytes(upload.frame(receipt(), REPORT_SHA)); source.chmod(0o600)
            target = root / "receipt.json"
            arguments = ["--import-report", str(source), "--checkpoint-report-sha256", REPORT_SHA, "--output", str(target)]
            self.assertEqual(self.invoke(arguments)[0], 0)
            self.assertEqual(target.read_bytes(), upload.backup.json_bytes(receipt()))
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)
            original = target.read_bytes()
            self.assertEqual(self.invoke(arguments)[0], 1)
            self.assertEqual(target.read_bytes(), original)

    def test_import_rejects_bad_hash_extra_metadata_and_symlinks_without_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            source = root / "report"; source.write_bytes(upload.frame(receipt(), REPORT_SHA)); source.chmod(0o600)
            linked = root / "link"; linked.symlink_to(source)
            for index, (selected, digest) in enumerate([(source, "0" * 64), (linked, REPORT_SHA)]):
                target = root / (str(index) + ".json")
                self.assertEqual(self.invoke(["--import-report", str(selected), "--checkpoint-report-sha256", digest, "--output", str(target)])[0], 1)
                self.assertFalse(target.exists())

    def test_failed_core_or_late_output_never_reports_successful_job(self):
        class FailedOutput(io.StringIO):
            def __init__(self, mode): super().__init__(); self.mode = mode
            def write(self, data):
                if self.mode == "partial": super().write(data[:20]); return 20
                result = super().write(data)
                if self.mode == "write": raise BrokenPipeError("synthetic output failure")
                return result
            def flush(self):
                if self.mode == "flush": raise BrokenPipeError("synthetic flush failure")

        for mode in ["ok", "core", "partial", "write", "flush"]:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                checkpoint = root / "checkpoint"; checkpoint.mkdir()
                sources = root / "sources"; sources.mkdir()
                outputs = root / "outputs"; outputs.mkdir(); target = outputs / "new"
                config = root / "config"; config.write_bytes(b"synthetic config"); config.chmod(0o600)
                def core(arguments):
                    print("SYNTHETIC_PRIVATE_CLIENT_ERROR", file=upload.sys.stderr)
                    if mode == "core": return 1
                    target.mkdir(mode=0o700)
                    with upload.backup.private_file(target / "receipt.json") as stream: stream.write(upload.backup.json_bytes(receipt()))
                    return 0
                arguments = ["--upload-report", "--checkpoint", str(checkpoint), "--source", "fixture=" + str(sources),
                             "--recipient", "public-fixture", "--remote", "fixture:copies", "--output", str(target),
                             "--checkpoint-report-sha256", REPORT_SHA]
                with mock.patch.multiple(upload, CHECKPOINT_ROOT=checkpoint, SOURCE_ROOT=sources, OUTPUT_ROOT=outputs), \
                     mock.patch.dict(os.environ, {"PLUGIN_BACKUP_STAGED_CONFIG": str(config)}), \
                     mock.patch.object(upload.backup, "main", side_effect=core):
                    status, stdout, _ = self.invoke(arguments, FailedOutput(mode))
                self.assertEqual(status, 0 if mode == "ok" else 1)
                self.assertNotIn("SYNTHETIC_PRIVATE_CLIENT_ERROR", stdout.getvalue())
                if mode in ("ok", "write", "flush"):
                    # A complete valid frame can coexist with exit 1: terminal Job success is mandatory.
                    self.assertEqual(upload.parse_report(stdout.getvalue().encode(), REPORT_SHA), receipt())
                if mode != "core": self.assertEqual(json.loads((target / "receipt.json").read_bytes()), receipt())


if __name__ == "__main__": unittest.main()
