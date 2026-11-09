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

SOURCE = Path(__file__).resolve().parents[1] / ".k8s/maintenance/plugin-preservation/capture.py"
spec = importlib.util.spec_from_file_location("plugin_capture", SOURCE)
capture = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = capture
spec.loader.exec_module(capture)
client_spec = importlib.util.spec_from_file_location("preservation_client", SOURCE.with_name("client.py"))
client = importlib.util.module_from_spec(client_spec)
client_spec.loader.exec_module(client)
DIGEST = "sha256:" + "a" * 64


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
            for name in ["a.jar", "UPPER.JAR", "space dir/b '$()`.jar", ".hidden/c.jar", "empty/not-a-jar"]:
                path = root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b"x")
            result = subprocess.run(["/bin/sh", "-ceu", capture.LIST_JARS, "preserve", str(root)],
                                    env={"PATH": "/no-external-programs"}, capture_output=True, check=True)
            self.assertEqual(capture.paths_from_listing(result.stdout),
                             [".hidden/c.jar", "UPPER.JAR", "a.jar", "space dir/b '$()`.jar"])
            self.assertEqual(sorted(p for p in root.rglob("*") if p.name.lower().endswith(".jar")),
                             sorted(root / p for p in capture.paths_from_listing(result.stdout)))

    def test_symlink_jar_and_directory_are_rejected(self):
        for directory in [False, True]:
            with self.subTest(directory=directory), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp).resolve(); (root / "a.jar").write_bytes(b"x")
                (root / ("indirect" if directory else "link.jar")).symlink_to(root if directory else root / "a.jar")
                result = subprocess.run(["/bin/sh", "-ceu", capture.LIST_JARS, "preserve", str(root)],
                                        env={"PATH": "/no-external-programs"}, capture_output=True)
                self.assertEqual(result.returncode, 43)

    def test_unsafe_and_ambiguous_listing_is_rejected(self):
        self.assertEqual(capture.paths_from_listing(b""), [])
        self.assertEqual(capture.paths_from_listing(b"./UPPER.JAR\0"), ["UPPER.JAR"])
        for data in [b"./../a.jar\0", b"/a.jar\0", b"./a.jar\0./a.jar\0", b"./a\nb.jar\0", b"./a.jar"]:
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
