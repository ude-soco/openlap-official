"""Credential-free preservation regressions. Never load a real Kubernetes context."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".k8s/maintenance/plugin-preservation-code/capture.py"
spec = importlib.util.spec_from_file_location("plugin_capture", SOURCE)
capture = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = capture
spec.loader.exec_module(capture)
client_spec = importlib.util.spec_from_file_location("preservation_client", SOURCE.with_name("client.py"))
client = importlib.util.module_from_spec(client_spec)
client_spec.loader.exec_module(client)
DIGEST = "sha256:" + "a" * 64


def version_response(server="v1.31.9", client="v1.31.14"):
    def info(version):
        parts = version[1:].split(".")
        return {"major": parts[0], "minor": parts[1], "gitVersion": version}
    return json.dumps({"clientVersion": info(client), "serverVersion": info(server)}).encode()


def inventory_frame(*paths):
    return b"\0".join([capture.INVENTORY_HEADER, *paths, capture.INVENTORY_FOOTER]) + b"\0"


class SourceFixture:
    jar_args = staticmethod(capture.Kubernetes.jar_args)

    def __init__(self):
        self.data = {"a.jar": b"first binary", "sub dir/b.jar": b"second binary"}
        self.changed = False
        self.truncated = False
        self.restarted = False
        self.calls = 0

    def pod(self, name, container):
        self.calls += 1
        return capture.Pod(name, container, "uid-" + name, "node", DIGEST,
                           1 if self.restarted and self.calls > 3 else 0)

    def compatibility(self):
        return capture.compatibility_report(version_response())

    def inventory(self, _pod, _root):
        return sorted(self.data)

    def stream(self, stage, args, target=None, maximum=256 * 1024 * 1024):
        if stage == "database backup":
            content = gzip.compress(b"synthetic Mongo archive")
            if self.truncated:
                content = content[:-5]
        else:
            name = args[-1].removeprefix("/plugins/")
            content = self.data[name]
            if self.changed and stage == "JAR source verification":
                content = b"other bytes!"
        capture.require(len(content) <= maximum, "Capture exceeds limit.")
        if target:
            target.write(content)
        return hashlib.sha256(content).hexdigest(), len(content)


class CaptureTests(unittest.TestCase):
    def run_capture(self, source, output, **options):
        return capture.capture(source, "fixture", [("replica-a", "web"), ("replica-b", "web")],
                               ("database", "mongo"), "/plugins", "openlap", DIGEST, output, **options)

    def run_inventory(self, root, prefix=""):
        return subprocess.run(["/bin/sh", "-ceu", prefix + capture.LIST_JARS, "preserve", str(root)],
                              env={"PATH": "/no-external-programs"}, capture_output=True, timeout=10)

    def test_version_skew_uses_actual_versions_and_inclusive_minor_boundaries(self):
        for server, client_version, supported in [("v1.30.99", "v1.31.14", True),
                ("v1.31.0", "v1.31.14", True), ("v1.32.0", "v1.31.14", True),
                ("v1.29.9", "v1.31.14", False), ("v1.33.0", "v1.31.14", False),
                ("v2.31.1", "v1.31.14", False), ("v1.35.0", "v1.35.2", True),
                ("v1.32.6+k3s1", "v1.31.14", True), ("v1.31.8-eks-a1b2", "v1.31.14", True)]:
            with self.subTest(server=server, client=client_version):
                report = capture.compatibility_report(version_response(server, client_version))
                self.assertEqual(report, {"schemaVersion": 1, "clientVersion": client_version,
                                         "serverVersion": server, "supportedMinorSkew": supported})
        data = json.loads(version_response()); data["serverVersion"]["minor"] += "+"
        data["serverVersion"]["untrusted"] = "DO-NOT-EMIT"
        self.assertTrue(capture.compatibility_report(json.dumps(data).encode())["supportedMinorSkew"])
        self.assertNotIn("DO-NOT-EMIT", json.dumps(capture.compatibility_report(json.dumps(data).encode())))

    def test_invalid_version_responses_fail_closed_and_redact_fields(self):
        invalid = [b"", b"{", b"null", b"[]", b"\xff", b"{}", version_response()[:-1],
                   b'{"clientVersion":null,"clientVersion":{}}', b'{"x":NaN}', b" " * 16385]
        original = json.loads(version_response())
        for field in ["clientVersion", "serverVersion"]:
            for value in [None, [], "private-fixture", {}, {"gitVersion": "v1.31.4"},
                          {"major": "1", "minor": "31", "gitVersion": "v1.32.4"},
                          {"major": 1, "minor": "31", "gitVersion": "v1.31.4"},
                          {"major": "1", "minor": "31", "gitVersion": "v1.31.4\nprivate-fixture"},
                          {"major": "1", "minor": "31", "gitVersion": "v1.31.4+"}]:
                document = dict(original); document[field] = value
                invalid.append(json.dumps(document).encode())
        for data in invalid:
            with self.subTest(data=data[:80]), self.assertRaises(capture.CaptureError) as error:
                capture.compatibility_report(data)
            self.assertNotIn("private-fixture", str(error.exception))

    def test_compatibility_only_needs_no_capture_inputs_or_namespace(self):
        for in_cluster in [False, True]:
            for supported in [False, True]:
                report = capture.compatibility_report(version_response("v1.31.9" if supported else "v1.33.9"))
                arguments = ["capture.py", "--compatibility-only"] + (["--in-cluster"] if in_cluster else ["--context", "fixture"])
                with self.subTest(in_cluster=in_cluster, supported=supported), mock.patch.dict(os.environ, {}, clear=True), \
                     mock.patch.object(sys, "argv", arguments), mock.patch.object(capture, "Kubernetes") as kube, \
                     mock.patch.object(capture, "capture") as operation, mock.patch.object(capture, "cluster_connection", return_value=["--kubeconfig=synthetic"]), \
                     mock.patch.object(sys, "stdout", new_callable=io.StringIO) as output:
                    kube.return_value.compatibility.return_value = report
                    self.assertEqual(capture.main(), 0 if supported else 1)
                    self.assertIsNone(kube.call_args.args[0])
                    self.assertEqual(kube.return_value.method_calls, [mock.call.compatibility()])
                    operation.assert_not_called()
                    self.assertEqual(output.getvalue(), json.dumps(report, sort_keys=True, separators=(",", ":")) + "\n")

    def test_unsupported_or_invalid_compatibility_blocks_capture_before_source_access(self):
        for invalid in [False, True]:
            with self.subTest(invalid=invalid), tempfile.TemporaryDirectory() as tmp:
                source = mock.Mock()
                if invalid:
                    source.compatibility.side_effect = capture.CaptureError("Invalid Kubernetes version response.")
                else:
                    source.compatibility.return_value = capture.compatibility_report(version_response("v1.33.0"))
                output = Path(tmp) / "new"
                with self.assertRaises(capture.CaptureError):
                    self.run_capture(source, output)
                self.assertEqual(source.method_calls, [mock.call.compatibility()])
                self.assertFalse(output.exists())

    def test_compatibility_output_failure_is_non_success(self):
        for failure in ["write", "flush"]:
            output = mock.Mock()
            getattr(output, failure).side_effect = BrokenPipeError("private-fixture")
            with self.subTest(failure=failure), mock.patch.dict(os.environ, {}, clear=True), \
                 mock.patch.object(sys, "argv", ["capture.py", "--context", "fixture", "--compatibility-only"]), \
                 mock.patch.object(capture.Kubernetes, "compatibility", return_value=capture.compatibility_report(version_response())), \
                 mock.patch.object(sys, "stdout", output), mock.patch.object(sys, "stderr", new_callable=io.StringIO) as errors:
                self.assertEqual(capture.main(), 1)
                self.assertNotIn("private-fixture", errors.getvalue())

    def test_real_version_subprocess_is_bounded_and_redacts_raw_errors(self):
        with tempfile.TemporaryDirectory() as tmp:
            kube = capture.Kubernetes(None, [], Path(tmp) / "cache")
            cases = [("import sys;sys.stdout.write('x'*16385)", "storage limit"),
                     ("import sys;sys.stderr.write('(Forbidden) private-fixture');sys.exit(1)", "permission denied")]
            for script, message in cases:
                kube.command = [sys.executable, "-c", script]
                with self.subTest(script=script), self.assertRaisesRegex(capture.CaptureError, message) as error:
                    kube.compatibility()
                self.assertNotIn("private-fixture", str(error.exception))
            kube.command = [sys.executable, "-c", "import time; time.sleep(5)"]
            with self.assertRaisesRegex(capture.CaptureError, "connection timeout"):
                kube.stream("client/server compatibility", [], maximum=16384, request_timeout=1, process_timeout=0.05)

    def test_documented_cli_launchers_still_run(self):
        result = subprocess.run([sys.executable, "-B", str(ROOT / ".k8s/maintenance/plugin-preservation/capture.py"), "--help"],
                                capture_output=True, timeout=10)
        self.assertEqual(result.returncode, 0)
        self.assertIn(b"--compatibility-only", result.stdout)

    @unittest.skipUnless(shutil.which("kubectl"), "A real client is required for default-loader manifest checks")
    def test_default_loader_renders_shared_code_without_capture_privileges(self):
        for name, expected_kinds in [("plugin-preservation", ["ConfigMap", "ServiceAccount", "Role", "RoleBinding", "PersistentVolumeClaim", "Job", "NetworkPolicy"]),
                                     ("plugin-preservation-compatibility", ["ConfigMap", "ServiceAccount", "Job", "NetworkPolicy"])]:
            with self.subTest(component=name):
                result = subprocess.run(["kubectl", "kustomize", str(ROOT / ".k8s/maintenance" / name)],
                                        capture_output=True, check=True, timeout=15)
                rendered = result.stdout.decode()
                kinds = [line[6:] for line in rendered.splitlines() if line.startswith("kind: ")]
                self.assertCountEqual(kinds, expected_kinds)
                self.assertIn("clientVersion", rendered)
                if name.endswith("compatibility"):
                    job = next(part for part in rendered.split("\n---\n") if "\nkind: Job\n" in part)
                    for forbidden in ["persistentVolumeClaim:", "fsGroup:", "fsGroupChangePolicy:",
                                      "mountPath: /backup", "DATABASE_POD", "BACKEND_PODS"]:
                        self.assertNotIn(forbidden, job)
                    self.assertIn("        - --compatibility-only", job)

    def test_complete_checkpoint_verifies_both_replicas_and_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "new"
            report = self.run_capture(SourceFixture(), output)
            self.assertEqual(len(report["files"]), 4)
            self.assertEqual(json.loads((output / "preservation.json").read_text()), report)
            self.assertEqual(output.stat().st_mode & 0o777, 0o700)
            for item in report["files"]:
                path = Path(item["sourcePath"])
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), item["sha256"])
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertEqual((output / "preservation.json").stat().st_mode & 0o777, 0o600)
            self.assertFalse(list(output.rglob("*.partial")))

    def test_source_change_never_publishes_success(self):
        source = SourceFixture(); source.changed = True
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "new"
            with self.assertRaises(capture.CaptureError):
                self.run_capture(source, output)
            self.assertFalse((output / "preservation.json").exists())

    def test_truncated_archive_never_publishes_success(self):
        source = SourceFixture(); source.truncated = True
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "new"
            with self.assertRaises(EOFError):
                self.run_capture(source, output)
            self.assertFalse((output / "preservation.json").exists())

    def test_restart_prevents_success(self):
        source = SourceFixture(); source.restarted = True
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "new"
            with self.assertRaisesRegex(capture.CaptureError, "restart count"):
                self.run_capture(source, output)
            self.assertFalse((output / "preservation.json").exists())

    def test_checkpoint_and_partial_files_are_never_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "existing"; output.mkdir()
            marker = output / "keep"; marker.write_bytes(b"retained")
            with self.assertRaisesRegex(capture.CaptureError, "already exists"):
                self.run_capture(SourceFixture(), output)
            self.assertEqual(marker.read_bytes(), b"retained")
            target = Path(tmp) / "jar"; partial = Path(tmp) / "jar.partial"
            partial.write_bytes(b"partial retained")
            with self.assertRaises(FileExistsError):
                capture.write_copy(SourceFixture(), target, "JAR copy", ["/plugins/a.jar"], 100)
            self.assertEqual(partial.read_bytes(), b"partial retained")

    def test_storage_limit_prevents_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "new"
            with self.assertRaises(capture.CaptureError):
                self.run_capture(SourceFixture(), output, maximum=5)
            self.assertFalse((output / "preservation.json").exists())

    def test_shell_inventory_needs_no_external_commands(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            names = ["a.jar", "UPPER.JAR", "MiXeD.JaR", "space dir/b '$()`.jar", ".hidden/c.jar",
                     ".single.jar", "..double.jar", "...triple.jar", "..hidden/d.jar", "...hidden/e.jar"]
            for name in names + ["empty/not-a-jar"]:
                path = root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b"x")
            result = self.run_inventory(root)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(capture.paths_from_listing(result.stdout), sorted(names))
            self.assertEqual(sorted(p for p in root.rglob("*") if p.name.lower().endswith(".jar")),
                             sorted(root / p for p in capture.paths_from_listing(result.stdout)))

    def test_shell_empty_inventory_requires_completion_framing(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = self.run_inventory(Path(tmp).resolve())
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout, inventory_frame())
            self.assertEqual(capture.paths_from_listing(result.stdout), [])

    @unittest.skipIf(os.geteuid() == 0, "Directory access checks require an unprivileged fixture user")
    def test_inaccessible_root_and_nested_directories_fail_inventory(self):
        for nested in [False, True]:
            for mode in [0o111, 0o444, 0o000]:
                with self.subTest(nested=nested, mode=oct(mode)), tempfile.TemporaryDirectory() as tmp:
                    root = Path(tmp).resolve(); directory = root / "nested" if nested else root
                    directory.mkdir(exist_ok=True)
                    jar = directory / "present.jar"; jar.write_bytes(b"synthetic JAR")
                    directory.chmod(mode)
                    try:
                        result = self.run_inventory(root)
                    finally:
                        directory.chmod(0o700)
                    self.assertTrue(jar.is_file())
                    self.assertEqual(result.returncode, 40 if not nested and mode != 0o111 else 44)
                    with self.assertRaises(capture.CaptureError):
                        capture.paths_from_listing(result.stdout)

    def test_inventory_printf_failures_propagate_without_completion(self):
        cases = [("present.jar", "./*"), ("nested/present.jar", "./*"),
                 ("present.jar", capture.INVENTORY_HEADER.decode()),
                 ("present.jar", capture.INVENTORY_FOOTER.decode())]
        for name, failed_record in cases:
            with self.subTest(name=name, failed_record=failed_record), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp).resolve(); jar = root / name
                jar.parent.mkdir(exist_ok=True); jar.write_bytes(b"synthetic JAR")
                prefix = ('printf() { case "$2" in ' + failed_record
                          + ') return 1 ;; esac; command printf "$@"; }\n')
                result = self.run_inventory(root, prefix)
                self.assertEqual(result.returncode, 45)
                with self.assertRaises(capture.CaptureError):
                    capture.paths_from_listing(result.stdout)

    def test_symlink_jar_and_directory_are_rejected(self):
        for kind in ["jar", "directory", "dangling", "nested", "root"]:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as tmp:
                base = Path(tmp).resolve(); root = base / "source"; root.mkdir()
                (root / "a.jar").write_bytes(b"x")
                inventory_root = root
                if kind == "root":
                    inventory_root = base / "indirect"; inventory_root.symlink_to(root)
                elif kind == "nested":
                    (root / "nested").mkdir(); (root / "nested/link.jar").symlink_to(root / "a.jar")
                else:
                    (root / "indirect").symlink_to(root if kind == "directory" else root / ("missing" if kind == "dangling" else "a.jar"))
                result = self.run_inventory(inventory_root)
                self.assertEqual(result.returncode, 41 if kind == "root" else 43)
                with self.assertRaises(capture.CaptureError):
                    capture.paths_from_listing(result.stdout)

    def test_unsafe_and_ambiguous_listing_is_rejected(self):
        self.assertEqual(capture.paths_from_listing(inventory_frame(b"./UPPER.JAR")), ["UPPER.JAR"])
        for paths in [(b"./../a.jar",), (b"/a.jar",), (b"./a.jar", b"./a.jar"), (b"./a\nb.jar",),
                      (capture.INVENTORY_HEADER,), (capture.INVENTORY_FOOTER,)]:
            with self.subTest(paths=paths), self.assertRaises(capture.CaptureError):
                capture.paths_from_listing(inventory_frame(*paths))

    def test_missing_truncated_or_ambiguous_inventory_frames_are_rejected(self):
        header = capture.INVENTORY_HEADER + b"\0"; footer = capture.INVENTORY_FOOTER + b"\0"
        complete = inventory_frame(b"./a.jar", b"./b.jar")
        malformed = [b"", header, footer, b"./a.jar\0", header + b"./a.jar\0",
                     b"./a.jar\0" + footer, complete[:-1], complete[:-8],
                     inventory_frame() + b"./a.jar\0", inventory_frame() * 2,
                     b"unexpected\0" + inventory_frame()]
        for data in malformed:
            with self.subTest(data=data), self.assertRaises(capture.CaptureError):
                capture.paths_from_listing(data)

    def test_empty_sources_still_preserve_database_and_require_review(self):
        source = SourceFixture(); source.data = {}
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "new"
            report = self.run_capture(source, output)
            self.assertEqual(report["status"], "SOURCE_REVIEW_REQUIRED")
            self.assertEqual([row["jarCount"] for row in report["sourceInventories"]], [0, 0])
            self.assertEqual(gzip.decompress((output / "database.archive.gz").read_bytes()), b"synthetic Mongo archive")
            self.assertEqual(json.loads((output / "capture-review.json").read_text()), report)
            self.assertFalse((output / "preservation.json").exists())

    def test_one_empty_replica_does_not_lose_other_replica_copies(self):
        class UnevenSources(SourceFixture):
            def inventory(self, pod, root):
                return [] if pod.name == "replica-a" else super().inventory(pod, root)
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "new"
            report = self.run_capture(UnevenSources(), output)
            self.assertEqual(report["status"], "SOURCE_REVIEW_REQUIRED")
            self.assertEqual([row["jarCount"] for row in report["sourceInventories"]], [0, 2])
            self.assertEqual({row["pod"] for row in report["files"]}, {"replica-b"})
            self.assertFalse((output / "preservation.json").exists())

    def test_interrupted_report_publication_is_never_a_success(self):
        def interrupted(_data, stream, **_options):
            stream.write('{"incomplete":'); raise OSError("synthetic interruption")
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "new"
            with mock.patch.object(capture.json, "dump", side_effect=interrupted), self.assertRaises(OSError):
                self.run_capture(SourceFixture(), output)
            self.assertFalse((output / "preservation.json").exists())
            self.assertTrue((output / "preservation.json.partial").exists())

    def test_post_link_cleanup_failure_rolls_back_completed_report(self):
        for empty in [False, True]:
            with self.subTest(empty=empty), tempfile.TemporaryDirectory() as tmp:
                source = SourceFixture()
                if empty:
                    source.data = {}
                output = Path(tmp) / "new"
                manifest = output / ("capture-review.json" if empty else "preservation.json")
                pending = manifest.with_name(manifest.name + ".partial")
                real_unlink = Path.unlink
                observed_post_link = []

                def failed_cleanup(path, *args, **kwargs):
                    if path == pending:
                        self.assertTrue(manifest.exists())
                        self.assertTrue(os.path.samefile(manifest, pending))
                        observed_post_link.append(True)
                        raise OSError("synthetic post-link cleanup failure")
                    return real_unlink(path, *args, **kwargs)

                with mock.patch.object(Path, "unlink", failed_cleanup), self.assertRaisesRegex(OSError, "post-link"):
                    self.run_capture(source, output)
                self.assertEqual(observed_post_link, [True])
                self.assertFalse(manifest.exists())
                report = json.loads(pending.read_text())
                self.assertEqual(report["status"], "SOURCE_REVIEW_REQUIRED" if empty else "CAPTURED")
                archive = output / "database.archive.gz"
                self.assertEqual(gzip.decompress(archive.read_bytes()), b"synthetic Mongo archive")
                self.assertEqual(report["databaseBackup"]["sha256"], hashlib.sha256(archive.read_bytes()).hexdigest())
                for row in report["files"]:
                    path = Path(row["sourcePath"])
                    self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), row["sha256"])

    def test_late_diagnostic_flush_failure_never_publishes_completed_report(self):
        class FailedOutput:
            def __init__(self):
                self.text = ""
            def write(self, text):
                self.text += text
                return len(text)
            def flush(self):
                if "Online preparation only:" in self.text:
                    raise BrokenPipeError("synthetic final diagnostic flush failure")

        for empty in [False, True]:
            with self.subTest(empty=empty), tempfile.TemporaryDirectory() as tmp:
                source = SourceFixture()
                if empty:
                    source.data = {}
                output = Path(tmp) / "new"
                name = "capture-review.json" if empty else "preservation.json"
                diagnostic = FailedOutput()
                with mock.patch.object(capture.sys, "stdout", diagnostic), self.assertRaises(BrokenPipeError):
                    self.run_capture(source, output)
                self.assertIn("Verified ", diagnostic.text)
                self.assertIn("Online preparation only:", diagnostic.text)
                self.assertFalse((output / name).exists())
                report = json.loads((output / (name + ".partial")).read_text())
                self.assertEqual(report["status"], "SOURCE_REVIEW_REQUIRED" if empty else "CAPTURED")

    def test_review_report_returns_a_distinct_non_success_exit_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            arguments = ["capture.py", "--context", "fixture", "--namespace", "fixture",
                         "--backend-pod", "backend", "--database-pod", "database", "--database", "openlap",
                         "--expected-backend-digest", DIGEST, "--output", str(Path(tmp) / "new")]
            with mock.patch.object(sys, "argv", arguments), mock.patch.object(capture, "capture", return_value={"status": "SOURCE_REVIEW_REQUIRED"}):
                self.assertEqual(capture.main(), 2)

    def test_diagnostics_identify_stage_and_hide_raw_values(self):
        private = b"never-echo-this-value"
        for text, category in [(b"Error from server (Forbidden): ", "permission denied"),
                               (b"i/o timeout ", "connection timeout"),
                               (b"command terminated with exit code 127 ", "command unavailable"),
                               (b"command terminated with exit code 44 ", "read or search permission"),
                               (b"command terminated with exit code 45 ", "inventory output failed"),
                               (b"x509: ", "certificate verification failed")]:
            error = str(capture.failure("JAR inventory", text + private))
            self.assertIn("JAR inventory", error); self.assertIn(category, error)
            self.assertNotIn(private.decode(), error)
        kube = capture.Kubernetes("fixture", ["--kubeconfig=synthetic"], "/tmp/fixture-cache")
        with mock.patch.object(capture.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, b"", b"(Forbidden) " + private)):
            with self.assertRaisesRegex(capture.CaptureError, "pod identity check: permission denied") as error:
                kube.pod("replica-a", "web")
            self.assertNotIn(private.decode(), str(error.exception))

    def test_projected_identity_configuration_uses_paths_only(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(os.environ, {"KUBERNETES_SERVICE_HOST": "2001:db8::1", "KUBERNETES_SERVICE_PORT_HTTPS": "443"}):
            args = capture.cluster_connection(Path(tmp))
            path = Path(args[0].split("=", 1)[1]); config = json.loads(path.read_text())
            self.assertEqual(config["clusters"][0]["cluster"]["server"], "https://[2001:db8::1]:443")
            self.assertEqual(config["users"][0]["user"], {"tokenFile": "/var/run/secrets/kubernetes.io/serviceaccount/token"})
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_real_subprocess_preserves_binary_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); kube = capture.Kubernetes("fixture", [], root / "cache")
            kube.command = [sys.executable, "-c", "import sys; sys.stdout.buffer.write(bytes(range(256))*1024)"]
            target = root / "binary.jar"
            digest, size = capture.write_copy(kube, target, "JAR copy", [], 300000)
            self.assertEqual(target.read_bytes(), bytes(range(256)) * 1024)
            self.assertEqual((digest, size), (hashlib.sha256(target.read_bytes()).hexdigest(), 262144))

    def test_failed_real_stream_retains_partial_and_redacts_stderr(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); kube = capture.Kubernetes("fixture", [], root / "cache")
            kube.command = [sys.executable, "-c", "import sys; sys.stdout.buffer.write(b'partial'); sys.stderr.write('(Forbidden) confidential-fixture'); sys.exit(1)"]
            target = root / "copy.jar"
            with self.assertRaisesRegex(capture.CaptureError, "JAR copy: permission denied") as error:
                capture.write_copy(kube, target, "JAR copy", [], 100)
            self.assertNotIn("confidential-fixture", str(error.exception))
            self.assertFalse(target.exists())
            self.assertEqual((root / "copy.jar.partial").read_bytes(), b"partial")

    def test_client_checksum_and_exclusive_installation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); target = root / "kubectl"
            with self.assertRaises(ValueError):
                client.install(io.BytesIO(b"wrong"), target, "0" * 64)
            self.assertFalse(target.exists())
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "kubectl"; content = b"synthetic executable"
            digest = hashlib.sha256(content).hexdigest()
            client.install(io.BytesIO(content), target, digest)
            self.assertEqual(target.read_bytes(), content)
            self.assertEqual(target.stat().st_mode & 0o777, 0o500)
            with self.assertRaises(FileExistsError):
                client.install(io.BytesIO(b"different"), target, hashlib.sha256(b"different").hexdigest())
            self.assertEqual(target.read_bytes(), content)

    def test_unconfigured_in_cluster_operation_fails_before_api_access(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(sys, "argv", ["capture.py", "--in-cluster"]), mock.patch.object(capture, "Kubernetes") as kube:
            self.assertEqual(capture.main(), 1)
            kube.assert_not_called()

    @unittest.skipUnless(shutil.which("kubectl"), "A real client is required for the isolated protocol check")
    def test_actual_client_compatibility_only_requests_version(self):
        requested = []
        local = subprocess.run(["kubectl", "version", "--client", "-o", "json"],
                               check=True, capture_output=True, timeout=10)
        client_info = json.loads(local.stdout)["clientVersion"]
        class API(BaseHTTPRequestHandler):
            version = client_info
            def log_message(self, *_args):
                pass
            def do_GET(self):
                path = self.path.split("?")[0]; requested.append(("GET", path))
                if path != "/version":
                    self.send_error(404); return
                encoded = json.dumps(self.version).encode()
                self.send_response(200); self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(encoded))); self.end_headers(); self.wfile.write(encoded)
            def do_POST(self):
                requested.append(("POST", self.path)); self.send_error(403)
        server = ThreadingHTTPServer(("127.0.0.1", 0), API)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); config = root / "fixture.json"
                config.write_text(json.dumps({"apiVersion": "v1", "kind": "Config", "current-context": "fixture",
                    "clusters": [{"name": "fixture", "cluster": {"server": "http://127.0.0.1:" + str(server.server_port)}}],
                    "users": [{"name": "fixture", "user": {"token": "synthetic-test-only"}}],
                    "contexts": [{"name": "fixture", "context": {"cluster": "fixture", "user": "fixture"}}]}))
                for supported in [True, False]:
                    API.version = client_info if supported else {"major": client_info["major"],
                        "minor": str(int(client_info["minor"].rstrip("+")) + 2),
                        "gitVersion": "v" + client_info["major"] + "." + str(int(client_info["minor"].rstrip("+")) + 2) + ".0"}
                    result = subprocess.run([sys.executable, "-B", str(ROOT / ".k8s/maintenance/plugin-preservation/capture.py"),
                        "--kubeconfig", str(config), "--compatibility-only"], capture_output=True, timeout=45,
                        env={"PATH": os.environ["PATH"], "HOME": tmp})
                    self.assertEqual(result.returncode, 0 if supported else 1, result.stderr)
                    report = json.loads(result.stdout)
                    self.assertEqual(report["supportedMinorSkew"], supported)
                    self.assertEqual(report["clientVersion"], client_info["gitVersion"])
                self.assertEqual(requested, [("GET", "/version"), ("GET", "/version")])
        finally:
            server.shutdown(); server.server_close(); thread.join()

    @unittest.skipUnless(shutil.which("kubectl"), "A real client is required for the isolated protocol check")
    def test_actual_client_reads_only_named_pod_metadata(self):
        requested = []
        class API(BaseHTTPRequestHandler):
            def log_message(self, *_args):
                pass
            def do_GET(self):
                path = self.path.split("?")[0]; requested.append(path)
                if path == "/api":
                    body = {"kind": "APIVersions", "apiVersion": "v1", "versions": ["v1"]}
                elif path == "/apis":
                    body = {"kind": "APIGroupList", "apiVersion": "v1", "groups": []}
                elif path == "/api/v1":
                    body = {"kind": "APIResourceList", "groupVersion": "v1", "resources": [{"name": "pods", "namespaced": True, "kind": "Pod", "verbs": ["get"]}]}
                elif path == "/api/v1/namespaces/fixture/pods/replica-a":
                    body = {"kind": "Pod", "apiVersion": "v1", "metadata": {"name": "replica-a", "uid": "uid-a"},
                            "spec": {"nodeName": "node"}, "status": {"containerStatuses": [{"name": "web", "imageID": DIGEST, "restartCount": 0, "ready": True}]}}
                else:
                    self.send_error(404); return
                encoded = json.dumps(body).encode()
                self.send_response(200); self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(encoded))); self.end_headers(); self.wfile.write(encoded)
        server = ThreadingHTTPServer(("127.0.0.1", 0), API)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); config = root / "fixture.json"
                config.write_text(json.dumps({"apiVersion": "v1", "kind": "Config", "current-context": "fixture",
                    "clusters": [{"name": "fixture", "cluster": {"server": "http://127.0.0.1:" + str(server.server_port)}}],
                    "users": [{"name": "fixture", "user": {"token": "synthetic-test-only"}}],
                    "contexts": [{"name": "fixture", "context": {"cluster": "fixture", "user": "fixture"}}]}))
                client = capture.Kubernetes("fixture", ["--kubeconfig=" + str(config)], root / "cache")
                self.assertEqual(client.pod("replica-a", "web"), capture.Pod("replica-a", "web", "uid-a", "node", DIGEST, 0))
            self.assertNotIn("/api/v1/namespaces/fixture/pods", requested)
        finally:
            server.shutdown(); server.server_close(); thread.join()


if __name__ == "__main__":
    unittest.main()
