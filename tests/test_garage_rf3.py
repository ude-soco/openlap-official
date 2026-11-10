"""Credential-free contracts for the explicit Garage RF3 runner."""
from contextlib import redirect_stderr
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import urllib.request

SOURCE = Path(__file__).resolve().parents[1] / "openlap-analyticsframework/scripts/garage-rf3.py"
spec = importlib.util.spec_from_file_location("garage_rf3", SOURCE)
runner = importlib.util.module_from_spec(spec); spec.loader.exec_module(runner)


def settings(ids=None):
    return {"schemaVersion": 1, "installationId": "fixture-installation-0001", "statefulSetName": "fixture-garage",
            "rpcServiceName": "fixture-rpc", "namespace": "fixture", "clusterDomain": "cluster.local",
            "bucket": "fixture-bucket", "region": "garage", "capacityBytes": 67108864,
            "zones": ["site-a", "site-a", "site-b"], "expectedNodeIds": [] if ids is None else ids,
            "expectedBucketId": "" if ids is None else "d"*64}


class ApiFixture:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []
        self.end = time.monotonic() - 1

    def request(self, host, operation, body=None):
        self.calls.append((operation, body is not None))
        return self.responses[operation]


class RunnerTest(unittest.TestCase):
    def test_configuration_rejects_unknown_types_and_identity_aliases(self):
        for update in ({"schemaVersion": True}, {"capacityBytes": 0}, {"capacityBytes": True},
                       {"unexpected": True}, {"expectedNodeIds": ["a"*64]*3}, {"namespace": "../escape"},
                       {"expectedBucketId": "d"*64}):
            value = settings(); value.update(update)
            with self.subTest(fields=tuple(update)), self.assertRaises(runner.Incomplete):
                runner.Configuration(value)

    def test_pinning_peers_and_bucket_preserves_intent_but_other_changes_do_not(self):
        initial = runner.Configuration(settings())
        pinned = runner.Configuration(settings(["a"*64, "b"*64, "c"*64]))
        self.assertEqual(initial.fingerprint, pinned.fingerprint)
        changed = settings(); changed["bucket"] = "another-bucket"
        self.assertNotEqual(initial.fingerprint, runner.Configuration(changed).fingerprint)

    def test_secret_framing_never_silently_trims_credential_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); source = root / "admin-token"
            source.write_text("fixture-admin-token\n")
            self.assertEqual(runner.secret(root,"admin-token"),"fixture-admin-token")
            for value in (" fixture-admin-token", "fixture-admin-token ", "fixture-admin-token\n\n"):
                source.write_text(value)
                with self.assertRaises(runner.Incomplete): runner.secret(root,"admin-token")

    def test_old_or_changed_volume_fails_before_starting_garage(self):
        config = runner.Configuration(settings())
        for kind in ("unmarked", "different-intent"):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve(); data = root / "garage"; data.mkdir()
                if kind == "unmarked":
                    (data / "old-data").write_text("synthetic retained data")
                else:
                    runner.publish(data / ".openlap-rf3-installation.json", {"schemaVersion": 1,
                        "installationId": config.value["installationId"], "podName": config.names[0],
                        "configurationSha256": "0"*64})
                with patch.dict(runner.os.environ, {"POD_NAME": config.names[0], "POD_NAMESPACE": "fixture"}), patch.object(runner.subprocess, "Popen") as process:
                    with self.assertRaises(runner.Incomplete): runner.server(config, root, data)
                    process.assert_not_called()

    def test_retained_node_identity_is_not_regenerated(self):
        config = runner.Configuration(settings())
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); data = root / "garage"; data.mkdir()
            for name in ("meta", "blocks"): (data / name).mkdir()
            runner.publish(data / ".openlap-rf3-installation.json", {"schemaVersion": 1,
                "installationId": config.value["installationId"], "podName": config.names[0], "configurationSha256": config.fingerprint})
            runner.publish(data / ".openlap-rf3-node.json", {"nodeId": "a"*64, "privateKeySha256": "0"*64})
            (data / "meta/node_key.pub").write_bytes(bytes.fromhex("a"*64))
            with patch.dict(runner.os.environ, {"POD_NAME": config.names[0], "POD_NAMESPACE": "fixture"}), patch.object(runner.subprocess, "Popen") as process:
                with self.assertRaises(runner.Incomplete): runner.server(config, root, data)
                process.assert_not_called()
            self.assertFalse((data / "meta/node_key").exists())
            (data / "meta/node_key").write_bytes(b"x"*64)
            with patch.dict(runner.os.environ, {"POD_NAME": config.names[0], "POD_NAMESPACE": "fixture"}), patch.object(runner.subprocess, "Popen") as process:
                with self.assertRaises(runner.Incomplete): runner.server(config, root, data)
                process.assert_not_called()
            self.assertEqual((data / "meta/node_key").stat().st_size, 64)

    def test_fresh_filesystem_directory_is_not_reformatted_or_removed(self):
        config = runner.Configuration(settings())
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); volume = root / "volume"; volume.mkdir()
            lost = volume / "lost+found"; lost.mkdir()
            credentials = root / "inputs"; credentials.mkdir()
            (credentials / "rpc-secret").write_text("a"*64)
            (credentials / "admin-token").write_text("fixture-admin-token")
            with patch.dict(runner.os.environ, {"POD_NAME": config.names[0], "POD_NAMESPACE": "fixture"}), \
                 patch.object(runner, "secret_descriptor", side_effect=lambda _value: runner.os.open("/dev/null",runner.os.O_RDONLY)), \
                 patch.object(runner.subprocess, "Popen", side_effect=OSError("synthetic startup failure")) as process:
                with self.assertRaises(OSError): runner.server(config, credentials, volume / "garage")
                process.assert_called_once()
            self.assertTrue(lost.is_dir())
            self.assertTrue((volume / "garage/.openlap-rf3-installation.json").is_file())

    @unittest.skipUnless(hasattr(runner.os, "memfd_create"), "Linux anonymous RAM files")
    def test_anonymous_credential_file_is_private_sealed_and_not_named_on_disk(self):
        descriptor=runner.secret_descriptor("disposable-fixture-value")
        try:
            self.assertEqual(runner.os.fstat(descriptor).st_mode & 0o777, 0o600)
            self.assertEqual(runner.os.fstat(descriptor).st_nlink, 0)
            self.assertEqual(runner.os.read(descriptor,128),b"disposable-fixture-value")
            with self.assertRaises(OSError): runner.os.write(descriptor,b"changed")
            with self.assertRaises(OSError): runner.os.ftruncate(descriptor,0)
        finally: runner.os.close(descriptor)

    def test_child_teardown_error_cannot_skip_credential_handle_cleanup(self):
        config=runner.Configuration(settings()); descriptors=[]
        def descriptor(_value):
            result=runner.os.open("/dev/null",runner.os.O_RDONLY); descriptors.append(result); return result
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary).resolve(); volume=root/"volume"; volume.mkdir(); data=volume/"garage"; data.mkdir()
            inputs=root/"inputs"; inputs.mkdir()
            (inputs/"rpc-secret").write_text("a"*64); (inputs/"admin-token").write_text("fixture-admin-token")
            scratch=root/"scratch"; scratch.mkdir()
            with patch.dict(runner.os.environ,{"POD_NAME":config.names[0],"POD_NAMESPACE":"fixture"}), \
                 patch.object(runner.tempfile,"mkdtemp",return_value=str(scratch)), \
                 patch.object(runner,"secret_descriptor",side_effect=descriptor), \
                 patch.object(runner.subprocess,"Popen") as process, \
                 patch.object(runner,"self_info",side_effect=runner.Unexpected), \
                 patch.object(runner.os,"killpg",side_effect=PermissionError("fixture teardown failure")):
                process.return_value.poll.return_value=None
                with self.assertRaises(PermissionError): runner.server(config,inputs,data)
            self.assertEqual(len(descriptors),2)
            for value in descriptors:
                with self.assertRaises(OSError): runner.os.fstat(value)
            self.assertFalse(scratch.exists())

    def test_http_redirect_never_forwards_administration_token(self):
        received = []
        class Destination(BaseHTTPRequestHandler):
            def do_GET(self):
                received.append(True); self.send_response(200); self.end_headers(); self.wfile.write(b"{}")
            def log_message(self, *_args): pass
        destination = ThreadingHTTPServer(("127.0.0.1", 0), Destination)
        class Redirect(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(302); self.send_header("Location", "http://127.0.0.1:"+str(destination.server_port)+"/"); self.end_headers()
            def log_message(self, *_args): pass
        redirect = ThreadingHTTPServer(("127.0.0.1", 0), Redirect)
        threads = [threading.Thread(target=server.serve_forever, daemon=True) for server in (destination, redirect)]
        for thread in threads: thread.start()
        try:
            api = runner.Api("fixture-token-not-for-output")
            request = urllib.request.Request("http://127.0.0.1:"+str(redirect.server_port)+"/", headers={"Authorization": "Bearer fixture-token-not-for-output"})
            with self.assertRaises(runner.Incomplete): api.opener.open(request, timeout=2)
            self.assertEqual(len(received), 0)
        finally:
            for server in (redirect, destination): server.shutdown(); server.server_close()
            for thread in threads: thread.join(timeout=2)

    def test_foreign_bucket_fails_before_key_import(self):
        config = runner.Configuration(settings())
        api = ApiFixture({"ListKeys?limit=2": [], "ListBuckets?limit=2": [{"id": "d"*64, "globalAliases": ["foreign"], "localAliases": []}]})
        with self.assertRaises(runner.Incomplete):
            runner.verify_storage(api, "fixture", config, "fixture-key-identifier", "fixture-secret-key", create=True)
        self.assertFalse(any(write for _operation, write in api.calls))

    def test_missing_existing_storage_is_never_recreated(self):
        api = ApiFixture({"ListKeys?limit=2": [], "ListBuckets?limit=2": []})
        with self.assertRaises(runner.Incomplete):
            runner.verify_storage(api, "fixture", runner.Configuration(settings()), "fixture-key-identifier", "fixture-secret-key")
        self.assertFalse(any(write for _operation, write in api.calls))

    def test_recreated_alias_with_new_bucket_id_is_never_adopted(self):
        config = runner.Configuration(settings(["a"*64,"b"*64,"c"*64]))
        api = ApiFixture({"ListKeys?limit=2": [{"id":"fixture-key-identifier"}],
                          "ListBuckets?limit=2": [{"id":"e"*64,"globalAliases":["fixture-bucket"],"localAliases":[]}]})
        with self.assertRaises(runner.Incomplete):
            runner.verify_storage(api, "fixture", config, "fixture-key-identifier", "fixture-secret-key")
        self.assertFalse(any(write for _operation, write in api.calls))

    def test_trusted_rerun_never_reapplies_stale_primary_layout(self):
        ids = ["a"*64, "b"*64, "c"*64]; config = runner.Configuration(settings(ids))
        intent = runner.record(config, config.members(ids), "fixture-key-identifier")
        api = ApiFixture({"GetClusterLayout": {"version": 0, "roles": []}})
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); source = root / "intent.json"; source.write_bytes(runner.encoded(intent))
            with patch.object(runner, "Api", return_value=api), patch.object(runner, "secret", return_value="fixture-admin-token"), \
                 patch.object(runner, "application_key", return_value=("fixture-key-identifier", "fixture-secret-key")), \
                 patch.object(runner, "self_info", side_effect=ids), patch.object(runner, "report"):
                with self.assertRaises(runner.Incomplete):
                    runner.bootstrap("initialize", config, root, root / "output", source, hashlib.sha256(source.read_bytes()).hexdigest())
            self.assertFalse(any(write for _operation, write in api.calls))
            self.assertFalse((root / "output/verified.json").exists())

    def test_publication_failure_preserves_existing_receipt_and_removes_only_new_success(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); receipt = root / "verified.json"
            receipt.write_bytes(b"retained")
            with self.assertRaises(FileExistsError): runner.publish(receipt, {"status": "fixture"})
            self.assertEqual(receipt.read_bytes(), b"retained")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); receipt = root / "verified.json"
            with patch.object(runner, "sync_dir", side_effect=OSError("synthetic fsync failure")):
                with self.assertRaises(OSError): runner.publish(receipt, {"status": "fixture"})
            self.assertFalse(receipt.exists())
            self.assertTrue((root / "verified.json.partial").exists())

    def test_invalid_action_never_echoes_untrusted_argument(self):
        error = io.StringIO()
        with redirect_stderr(error): result = runner.main(["fixture-sensitive-value"])
        self.assertEqual(result, 1)
        self.assertNotIn("fixture-sensitive-value", error.getvalue())


if __name__ == "__main__": unittest.main()
