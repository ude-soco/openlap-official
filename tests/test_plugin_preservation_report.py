"""Credential-free tests of the read-only preservation metadata contract."""
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / ".k8s/maintenance/plugin-preservation-report/report.py"
spec = importlib.util.spec_from_file_location("preservation_report", CODE)
report = importlib.util.module_from_spec(spec); spec.loader.exec_module(report)


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="preservation-metadata-")
        self.root = Path(self.temporary.name).resolve()
        self.checkpoint = self.root / "sample"
        self.checkpoint.mkdir(mode=0o700)

    def tearDown(self):
        for path in self.root.rglob("*"):
            if path.is_dir() and not path.is_symlink(): path.chmod(0o700)
        self.temporary.cleanup()

    def fixture(self, empty=False, count=1):
        pods = [{"name": name, "container": "web" if index < 2 else "mongo",
                 "uid": str(index + 1), "node": "example-node", "restarts": 0,
                 "image": "example.test/backend@sha256:" + ("a" if index < 2 else "b") * 64}
                for index, name in enumerate(["example-backend-a", "example-backend-b", "example-mongo"])]
        files = []
        if not empty:
            for pod in pods[:-1]:
                for index in range(count):
                    relative = "nested/fixture-" + str(index) + ".jar"
                    files.append({"pod": pod["name"], "recordedPath": "/opt/app/data/jars/" + relative,
                        "sourcePath": str(self.checkpoint / "replicas" / pod["name"] / relative),
                        "sha256": "c" * 64, "sizeBytes": 19})
        return {"namespace": "example-production", "capturedAt": "2026-01-01T12:00:00.000001+00:00",
            "kubernetesCompatibility": {"schemaVersion": 1, "clientVersion": "v1.35.10",
                "serverVersion": "v1.35.1", "supportedMinorSkew": True},
            "pods": pods, "files": files,
            "sourceInventories": [{"pod": p["name"], "root": "/opt/app/data/jars",
                                    "jarCount": 0 if empty else count} for p in pods[:-1]],
            "catalogCoverage": report.COVERAGE, "consistency": report.CONSISTENCY,
            "databaseBackup": {"path": str(self.checkpoint / "database.archive.gz"),
                               "sha256": "d" * 64, "sizeBytes": 23},
            "status": "SOURCE_REVIEW_REQUIRED" if empty else "CAPTURED"}

    def publish(self, value=None, empty=False):
        value = self.fixture(empty) if value is None else value
        name = "capture-review.json" if value["status"] == "SOURCE_REVIEW_REQUIRED" else "preservation.json"
        path = self.checkpoint / name
        path.write_text(json.dumps(value, indent=2) + "\n"); path.chmod(0o600)
        return path

    def read(self):
        return report.read_report(self.root, "sample")

    def test_captured_report_needs_no_archive_or_jar_files(self):
        path = self.publish()
        result = self.read()
        self.assertEqual(result["captureStatus"], "CAPTURED")
        self.assertEqual(result["jarCopyCount"], 2)
        self.assertEqual(result["manifestSha256"], hashlib.sha256(path.read_bytes()).hexdigest())
        self.assertEqual(result["manifestSizeBytes"], path.stat().st_size)
        for key in ["backupBytesVerified", "catalogCoverageVerified", "consistencyVerified", "restoreVerified"]:
            self.assertIs(result[key], False)
        self.assertEqual(sorted(p.name for p in self.checkpoint.iterdir()), ["preservation.json"])
        output = io.StringIO()
        with contextlib.redirect_stdout(output): report.output(result)
        lines = output.getvalue().splitlines()
        self.assertEqual([lines[0], lines[-1]], [report.HEADER, report.FOOTER])
        self.assertEqual(json.loads(lines[1]), result)

    def test_valid_source_review_report_and_read_only_input(self):
        path = self.publish(empty=True); original = path.read_bytes()
        path.chmod(0o400); self.checkpoint.chmod(0o500)
        result = self.read()
        self.assertEqual(result["captureStatus"], "SOURCE_REVIEW_REQUIRED")
        self.assertEqual(result["emptySourceRootCount"], 2)
        self.assertEqual(result["jarCopyCount"], 0)
        self.assertEqual(path.read_bytes(), original)
        self.assertEqual(path.stat().st_mode & 0o777, 0o400)
        self.assertEqual(self.checkpoint.stat().st_mode & 0o777, 0o500)

    def test_strict_schema_and_cross_references(self):
        mutations = [lambda x: x.update(extra="untrusted"),
            lambda x: x["kubernetesCompatibility"].update(schemaVersion=True),
            lambda x: x["kubernetesCompatibility"].update(serverVersion="v1.30.1"),
            lambda x: x["pods"][1].update(uid=x["pods"][0]["uid"]),
            lambda x: x["pods"][1].update(image="sha256:" + "f" * 64),
            lambda x: x["sourceInventories"][0].update(jarCount=2),
            lambda x: x["sourceInventories"][0].update(pod="other-pod"),
            lambda x: x["files"][0].update(sha256="invalid"),
            lambda x: x["files"][0].update(sizeBytes=True),
            lambda x: x["files"][0].update(pod="unknown"),
            lambda x: x["databaseBackup"].update(path="/elsewhere/database.archive.gz"),
            lambda x: x.update(catalogCoverage="verified"),
            lambda x: x.update(consistency="verified")]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                value = copy.deepcopy(self.fixture()); mutate(value)
                self.publish(value)
                with self.assertRaises((report.ReportError, ValueError)): self.read()

    def test_invalid_duplicate_truncated_and_oversized_json(self):
        path = self.publish()
        for content in [b"", b"{", b'{} {}', b'{"status":1,"status":2}',
                        b'{"status":NaN}', b'\xff', b' ' * (report.MAX_MANIFEST + 1)]:
            with self.subTest(content_length=len(content)):
                path.write_bytes(content)
                with self.assertRaises((report.ReportError, ValueError, UnicodeError)): self.read()

    def test_unsafe_paths_and_ids(self):
        self.publish()
        for checkpoint in ["", "../sample", "sample/child", "/sample", "bad\nvalue"]:
            with self.subTest(checkpoint=checkpoint):
                with self.assertRaises(report.ReportError): report.read_report(self.root, checkpoint)
        for field, path in [("recordedPath", "/opt/app/data/jars/../outside.jar"),
                            ("recordedPath", "/opt/app/data/jars/./fixture.jar"),
                            ("sourcePath", str(self.checkpoint / "outside.jar"))]:
            value = self.fixture(); value["files"][0][field] = path; self.publish(value)
            with self.assertRaises(report.ReportError): self.read()

    def test_symlink_ancestors_directory_and_manifest(self):
        path = self.publish()
        alias = self.root / "alias"; alias.symlink_to(self.checkpoint, target_is_directory=True)
        with self.assertRaises(OSError): report.read_report(self.root, "alias")
        root_alias = self.root / "root-alias"; root_alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(OSError): report.read_report(root_alias, "sample")
        destination = self.root / "elsewhere.json"; path.rename(destination); path.symlink_to(destination)
        with self.assertRaises(OSError): self.read()

    def test_hardlink_fifo_permissions_and_owner(self):
        path = self.publish(); other = self.root / "linked.json"; os.link(path, other)
        with self.assertRaises(report.ReportError): self.read()
        other.unlink()
        path.chmod(0o644)
        with self.assertRaises(report.ReportError): self.read()
        path.chmod(0o600); self.checkpoint.chmod(0o755)
        with self.assertRaises(report.ReportError): self.read()
        self.checkpoint.chmod(0o700)
        with patch.object(report.os, "getuid", return_value=os.getuid() + 1):
            with self.assertRaises(report.ReportError): self.read()
        path.unlink(); os.mkfifo(path, mode=0o600)
        with self.assertRaises(report.ReportError): self.read()

    def test_partial_and_ambiguous_reports_are_rejected(self):
        path = self.publish()
        partial = path.with_name(path.name + ".partial"); path.rename(partial)
        with self.assertRaises(report.ReportError): self.read()
        path.write_bytes(partial.read_bytes()); path.chmod(0o600)
        with self.assertRaises(report.ReportError): self.read()
        partial.unlink(); self.publish(empty=True)
        with self.assertRaises(report.ReportError): self.read()

    def test_directory_swap_is_detected(self):
        self.publish()
        original_validate = report.validate
        def swap(*args):
            result = original_validate(*args)
            self.checkpoint.rename(self.root / "previous")
            self.checkpoint.mkdir(mode=0o700)
            return result
        with patch.object(report, "validate", side_effect=swap):
            with self.assertRaises(report.ReportError): self.read()

    def test_bounded_output_rejects_large_metadata_without_truncation(self):
        self.publish(self.fixture(count=250))
        summary = self.read(); output = io.StringIO()
        with contextlib.redirect_stdout(output):
            with self.assertRaises(report.ReportError): report.output(summary)
        self.assertEqual(output.getvalue(), "")

    def test_cli_errors_and_late_output_failures_never_report_success(self):
        self.publish()
        class BrokenOutput(io.StringIO):
            def __init__(self, phase): super().__init__(); self.phase = phase
            def write(self, value):
                if self.phase == "write": raise OSError("private error sentinel")
                return super().write(value)
            def flush(self): raise OSError("private error sentinel")
        arguments = ["report.py", "--backup-root", str(self.root), "--checkpoint-id", "sample"]
        for phase in ["write", "flush"]:
            stdout = BrokenOutput(phase); stderr = io.StringIO()
            with patch.object(report.sys, "argv", arguments), contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                self.assertEqual(report.main(), 1)
            self.assertNotIn("private error sentinel", stderr.getvalue())
            self.assertEqual(stderr.getvalue(), "Preservation metadata verification or output failed. Treat this run as incomplete.\n")
        stderr = io.StringIO()
        with patch.object(report.sys, "argv", ["report.py", "--untrusted-secret-input"]), contextlib.redirect_stderr(stderr):
            self.assertEqual(report.main(), 1)
        self.assertNotIn("untrusted-secret", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
