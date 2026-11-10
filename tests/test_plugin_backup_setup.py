"""Synthetic loopback form fixtures; never load an operator credential or browser."""
from contextlib import contextmanager, redirect_stderr, redirect_stdout
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import http.client
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import threading
import time
from types import SimpleNamespace
import unittest
from unittest import mock
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "openlap-analyticsframework/scripts/plugin-backup-setup.py"
spec = importlib.util.spec_from_file_location("backup_setup", SOURCE)
setup = importlib.util.module_from_spec(spec); spec.loader.exec_module(setup)
PUBLIC = "age1" + "q" * 58
SHARE = "https://backup.example.invalid/s/PRIVATE_SYNTHETIC_TOKEN"
PASSWORD = "  PRIVATE-SYNTHETIC-PASSWORD-ü  "


@contextmanager
def server_fixture(operation=None):
    operation = operation or SimpleNamespace(origin="https://backup.example.invalid", create=mock.Mock(return_value={"status": "synthetic"}))
    server = setup.LocalServer(operation)
    thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True); thread.start()
    try:
        yield server, operation
    finally:
        server.shutdown(); server.server_close(); thread.join()


def request(server, method="GET", body=None, headers=None, path="/"):
    client = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
    client.request(method, path, body=body, headers=headers or {})
    response = client.getresponse(); data = response.read(); result = response.status, dict(response.getheaders()), data
    client.close(); return result


def form(server):
    status, headers, page = request(server)
    assert status == 200
    csrf = re.search(rb'name="csrf" value="([^"]+)"', page).group(1).decode()
    return csrf, headers["Set-Cookie"].split(";", 1)[0]


def post(server, csrf, cookie, fields=None, headers=None):
    values = fields or {"csrf": csrf, "share_url": SHARE, "share_password": PASSWORD}
    actual = {"Origin": server.origin, "Cookie": cookie, "Content-Type": "application/x-www-form-urlencoded"}
    actual.update(headers or {})
    return request(server, "POST", urlencode(values).encode(), actual)


def options(root, binaries):
    result = dict(operator_root=root, allowed_provider_origin="https://backup.example.invalid", existing_identity=None)
    for name, path in binaries.items():
        result[name.replace("-", "_")] = path
        result[name.replace("-", "_") + "_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    return SimpleNamespace(**result)


def fake_binaries(root):
    result = {}
    for name in ["age", "age-keygen", "rclone"]:
        path = root / name; path.write_bytes(b"synthetic fixture executable; never executed\n"); path.chmod(0o700); result[name] = path
    return result


def fake_native(arguments, password=None, discard=False):
    if "obscure" in arguments:
        return b"A" * 40 + b"\n"
    if "-o" in arguments:
        target = Path(arguments[-1]); setup.exclusive_file(target.parent, target.name, b"synthetic identity fixture\n"); return b""
    return PUBLIC.encode() + b"\n"


class FormTests(unittest.TestCase):
    def test_two_field_form_and_one_success_never_echo_inputs_or_log(self):
        output = io.StringIO()
        with redirect_stdout(output), redirect_stderr(output), server_fixture() as (server, operation):
            status, headers, page = request(server)
            self.assertEqual(status, 200)
            self.assertEqual(len(re.findall(rb'<input type="(?:url|password)"', page)), 2)
            self.assertNotIn(b"<script", page); self.assertNotIn(b"src=", page)
            self.assertIn("HttpOnly", headers["Set-Cookie"]); self.assertIn("SameSite=Strict", headers["Set-Cookie"])
            self.assertEqual(headers["Cache-Control"], "no-store")
            self.assertIn("frame-ancestors 'none'", headers["Content-Security-Policy"])
            csrf, cookie = form(server)
            status, headers, page = post(server, csrf, cookie)
            self.assertEqual(status, 200); self.assertNotIn(b"Access-Control-Allow-Origin", str(headers).encode())
            for value in [PASSWORD.encode(), SHARE.encode(), b"PRIVATE_SYNTHETIC_TOKEN"]:
                self.assertNotIn(value, page)
            operation.create.assert_called_once_with(SHARE, PASSWORD)
            self.assertEqual(post(server, csrf, cookie)[0], 400)
            self.assertEqual(request(server)[0], 400)
        self.assertEqual(output.getvalue(), "")

    def test_origin_host_csrf_cookie_type_and_fields_fail_closed(self):
        with server_fixture() as (server, operation):
            csrf, cookie = form(server)
            cases = [{"Origin": "https://attacker.example.invalid"}, {"Origin": "null"}, {"Origin": ""},
                     {"Host": "localhost:" + str(server.server_port)}, {"Host": "127.0.0.1.attacker.invalid"},
                     {"Cookie": "openlap_setup=wrong"}, {"Cookie": cookie + "; " + cookie},
                     {"Content-Type": "application/json"}, {"Content-Type": "application/x-www-form-urlencoded; charset=utf-8"},
                     {"Transfer-Encoding": "chunked"}, {"X-Forwarded-Host": "attacker.invalid"}, {"Expect": "100-continue"}]
            for headers in cases:
                with self.subTest(headers=list(headers)):
                    self.assertEqual(post(server, csrf, cookie, headers=headers)[0], 400)
            for fields in [{"csrf": "wrong", "share_url": SHARE, "share_password": PASSWORD},
                           {"csrf": "ü", "share_url": SHARE, "share_password": PASSWORD},
                           {"csrf": csrf, "share_url": SHARE, "share_password": ""},
                           {"csrf": csrf, "share_url": SHARE, "share_password": "p\nq"},
                           {"csrf": csrf, "share_url": SHARE, "share_password": "x" * 1025},
                           {"csrf": csrf, "share_url": SHARE, "unknown": PASSWORD}]:
                self.assertEqual(post(server, csrf, cookie, fields=fields)[0], 400)
            operation.create.assert_not_called(); self.assertFalse(server.consumed)

    def test_missing_duplicate_and_oversized_protocol_fields_are_rejected(self):
        with server_fixture() as (server, operation):
            csrf, cookie = form(server)
            body = urlencode({"csrf": csrf, "share_url": SHARE, "share_password": PASSWORD}).encode()
            basic = [("Host", server.origin[7:]), ("Origin", server.origin), ("Cookie", cookie),
                     ("Content-Type", "application/x-www-form-urlencoded"), ("Content-Length", str(len(body)))]
            cases = [[item for item in basic if item[0] != "Origin"]]
            cases += [basic + [next(item for item in basic if item[0] == name)] for name in ["Host", "Origin", "Cookie", "Content-Length", "Content-Type"]]
            cases += [[(key, "9000" if key == "Content-Length" else value) for key, value in basic], basic + [("X-Padding", "x" * 8192)]]
            for headers in cases:
                connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                connection.putrequest("POST", "/", skip_host=True, skip_accept_encoding=True)
                for key, value in headers: connection.putheader(key, value)
                connection.endheaders(body)
                response = connection.getresponse(); self.assertEqual(response.status, 400); self.assertNotIn(PASSWORD.encode(), response.read()); connection.close()
            headers = dict(basic); headers.pop("Content-Length")
            for malformed in [body + b"&csrf=duplicate", body + b"&extra=value", body.replace(b"PRIVATE", b"%ff", 1), b"csrf=%ZZ", b"x" * 8193]:
                self.assertEqual(request(server, "POST", malformed, headers)[0], 400)
            operation.create.assert_not_called()

    def test_expired_session_wrong_path_and_native_failure_have_generic_output(self):
        with server_fixture() as (server, operation):
            csrf, cookie = form(server)
            self.assertEqual(request(server, path="/?PRIVATE_SYNTHETIC_TOKEN")[0], 400)
            server.expires = time.monotonic() - 1
            self.assertEqual(post(server, csrf, cookie)[0], 400); operation.create.assert_not_called()
        operation = SimpleNamespace(origin="https://backup.example.invalid", create=mock.Mock(side_effect=OSError(PASSWORD)))
        with server_fixture(operation) as (server, _):
            csrf, cookie = form(server); status, _, page = post(server, csrf, cookie)
            self.assertEqual(status, 400); self.assertNotIn(PASSWORD.encode(), page)
            self.assertTrue(server.done); self.assertTrue(server.failed)

    def test_truncated_body_and_malformed_request_never_create_outputs(self):
        with server_fixture() as (server, operation):
            csrf, cookie = form(server)
            with socket.create_connection(("127.0.0.1", server.server_port), timeout=3) as client:
                client.sendall(("POST / HTTP/1.1\r\nHost: " + server.origin[7:] + "\r\nOrigin: " + server.origin
                    + "\r\nCookie: " + cookie + "\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 100\r\n\r\nshort").encode())
                client.shutdown(socket.SHUT_WR); response = client.recv(4096)
                self.assertIn(b"400", response)
            operation.create.assert_not_called()

    def test_slow_request_has_absolute_deadline(self):
        timer = threading.Timer
        with server_fixture() as (server, operation), mock.patch.object(setup.threading, "Timer", side_effect=lambda _delay, callback: timer(0.05, callback)):
            with socket.create_connection(("127.0.0.1", server.server_port), timeout=3) as client:
                client.sendall(b"POST / HTTP/1.1\r\nHost: ")
                self.assertEqual(client.recv(1024), b"")
            operation.create.assert_not_called()

    def test_session_expiring_while_body_arrives_cannot_create_profile(self):
        with server_fixture() as (server, operation):
            csrf, cookie = form(server)
            body = urlencode({"csrf": csrf, "share_url": SHARE, "share_password": PASSWORD}).encode()
            with socket.create_connection(("127.0.0.1", server.server_port), timeout=3) as client:
                client.sendall(("POST / HTTP/1.1\r\nHost: " + server.origin[7:] + "\r\nOrigin: " + server.origin
                    + "\r\nCookie: " + cookie + "\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: "
                    + str(len(body)) + "\r\n\r\n").encode() + body[:1])
                time.sleep(0.02); server.expires = time.monotonic() - 1
                client.sendall(body[1:])
                response = http.client.HTTPResponse(client); response.begin()
                self.assertEqual(response.status, 400); response.read()
            operation.create.assert_not_called()

    def test_concurrent_submissions_create_only_once(self):
        with server_fixture() as (server, operation):
            csrf, cookie = form(server)
            with ThreadPoolExecutor(max_workers=2) as workers:
                statuses = list(workers.map(lambda _index: post(server, csrf, cookie)[0], range(2)))
            self.assertCountEqual(statuses, [200, 400]); operation.create.assert_called_once()

    def test_browser_response_failure_cannot_complete_session(self):
        original = setup.Handler.reply
        def failed_response(handler, code, text, cookie=False):
            if text == setup.SUCCESS: raise OSError(PASSWORD)
            return original(handler, code, text, cookie)
        with server_fixture() as (server, _), mock.patch.object(setup.Handler, "reply", failed_response):
            csrf, cookie = form(server)
            self.assertEqual(post(server, csrf, cookie)[0], 400)
            self.assertTrue(server.done); self.assertTrue(server.failed)
            self.assertIsNotNone(server.receipt)


class StorageTests(unittest.TestCase):
    def test_url_policy_rejects_aliases_and_normalization_tricks(self):
        origin = setup.provider_origin("https://backup.example.invalid")
        for value in [SHARE, SHARE.replace("/s/", "/index.php/s/")]:
            self.assertEqual(setup.share_profile(value, origin), (origin + "/public.php/webdav/", "PRIVATE_SYNTHETIC_TOKEN"))
        for value in [SHARE + "?", SHARE + "#", SHARE + "/", SHARE.replace("https:", "http:"),
                SHARE.replace("backup.example.invalid", "backup.example.invalid.attacker.invalid"),
                SHARE.replace("backup.example.invalid", "user@backup.example.invalid"),
                SHARE.replace("backup.example.invalid", "backup.example.invalid:443"),
                SHARE.replace("/s/", "//s/"), SHARE.replace("TOKEN", "%54OKEN"), "\n" + SHARE,
                SHARE.replace("/s/", "/a/../s/"), SHARE.replace("backup", "BACKUP", 1)]:
            with self.subTest(value=value), self.assertRaises((setup.SetupError, ValueError)):
                setup.share_profile(value, origin)

    def test_private_exclusive_profile_and_receipt_exclude_authentication_values(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            operation = setup.Setup(options(root, fake_binaries(root)))
            with mock.patch.object(setup.Native, "run", side_effect=fake_native):
                receipt = operation.create(SHARE, PASSWORD)
            profile = Path(receipt["configPath"]).parent
            self.assertEqual(profile.stat().st_mode & 0o777, 0o700)
            for name in ["sciebo-setup.conf", "age-identity.txt", "setup-receipt.json"]:
                self.assertEqual((profile / name).stat().st_mode & 0o777, 0o600)
            self.assertEqual(json.loads(Path(receipt["receiptPath"]).read_bytes()), receipt)
            self.assertFalse(receipt["providerConnectivityVerified"]); self.assertFalse(receipt["keyRecoveryVerified"])
            encoded = setup.canonical(receipt)
            for private in [PASSWORD.encode(), b"PRIVATE_SYNTHETIC_TOKEN", SHARE.encode(), b"public.php"]:
                self.assertNotIn(private, encoded)
            with self.assertRaises(FileExistsError): setup.exclusive_file(profile, "sciebo-setup.conf", b"overwrite")

    def test_reuses_identity_only_through_native_public_conversion(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            identity = root / "retained-identity"; identity.write_bytes(b"synthetic existing identity"); identity.chmod(0o600)
            arguments = options(root, fake_binaries(root)); arguments.existing_identity = identity
            operation = setup.Setup(arguments)
            with mock.patch.object(setup.Native, "run", side_effect=fake_native) as native, mock.patch.object(setup, "sync_fresh_identity") as sync:
                receipt = operation.create(SHARE, PASSWORD)
            sync.assert_not_called()
            self.assertTrue(receipt["identityReused"]); self.assertEqual(receipt["identityPath"], str(identity))
            self.assertFalse(any("-o" in call.args[0] for call in native.call_args_list))
            self.assertEqual(identity.read_bytes(), b"synthetic existing identity")
            os.link(identity, root / "hardlink")
            with self.assertRaises(setup.SetupError): setup.Setup(arguments)

    def test_paths_binary_hashes_and_existing_profile_fail_closed(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            arguments = options(root, fake_binaries(root)); arguments.rclone_sha256 = "0" * 64
            with self.assertRaises(setup.SetupError): setup.Setup(arguments)
            arguments = options(root, {name: root / name for name in ["age", "age-keygen", "rclone"]})
            (root / "rclone").chmod(0o4700)
            with self.assertRaises(setup.SetupError): setup.Setup(arguments)
            (root / "rclone").chmod(0o700)
            root.chmod(0o755)
            with self.assertRaises(setup.SetupError): setup.Setup(arguments)
            root.chmod(0o700)
            link = root / "indirect"; link.symlink_to(root, target_is_directory=True); arguments.operator_root = link
            with self.assertRaises(setup.SetupError): setup.Setup(arguments)
            arguments.operator_root = root; operation = setup.Setup(arguments)
            fixed = datetime.now(timezone.utc)
            with mock.patch.object(setup, "datetime") as clock, mock.patch.object(setup.secrets, "token_hex", return_value="0" * 32), \
                 mock.patch.object(setup.Native, "run", side_effect=fake_native):
                clock.now.return_value = fixed
                first = operation.create(SHARE, PASSWORD)
                retained = Path(first["configPath"]).read_bytes()
                with self.assertRaises(FileExistsError): operation.create(SHARE, "different password")
                self.assertEqual(Path(first["configPath"]).read_bytes(), retained)

    def test_failed_keygen_or_receipt_write_retains_private_unverified_outputs(self):
        for stage in ["keygen", "identity-sync", "receipt"]:
            with self.subTest(stage=stage), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve(); root.chmod(0o700)
                operation = setup.Setup(options(root, fake_binaries(root)))
                def native(arguments, password=None, discard=False):
                    if stage == "keygen" and "-o" in arguments: raise setup.SetupError(PASSWORD)
                    return fake_native(arguments, password, discard)
                real_write = setup.exclusive_file
                def write(directory, name, data):
                    if stage == "receipt" and name == "setup-receipt.json": raise OSError(PASSWORD)
                    return real_write(directory, name, data)
                synchronize = setup.sync_fresh_identity
                def sync(path):
                    if stage == "identity-sync": raise OSError(PASSWORD)
                    return synchronize(path)
                with mock.patch.object(setup.Native, "run", side_effect=native), mock.patch.object(setup, "exclusive_file", side_effect=write), \
                     mock.patch.object(setup, "sync_fresh_identity", side_effect=sync), self.assertRaises((setup.SetupError, OSError)):
                    operation.create(SHARE, PASSWORD)
                profiles = list(root.glob("setup-*")); self.assertEqual(len(profiles), 1)
                self.assertEqual(profiles[0].stat().st_mode & 0o777, 0o700)
                self.assertFalse((profiles[0] / "setup-receipt.json").exists())

    def test_fresh_identity_is_synced_before_config_and_receipt_without_reading_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            operation = setup.Setup(options(root, fake_binaries(root)))
            events = []; synchronize = setup.sync_fresh_identity; original = setup.exclusive_file
            def sync(path):
                with mock.patch.object(setup.os, "read", side_effect=AssertionError("Identity byte reads are forbidden")):
                    synchronize(path)
                events.append("identity-sync")
            def write(directory, name, data):
                original(directory, name, data); events.append(name)
            with mock.patch.object(setup.Native, "run", side_effect=fake_native), mock.patch.object(setup, "sync_fresh_identity", side_effect=sync), \
                 mock.patch.object(setup, "exclusive_file", side_effect=write):
                operation.create(SHARE, PASSWORD)
            self.assertLess(events.index("identity-sync"), events.index("sciebo-setup.conf"))
            self.assertLess(events.index("sciebo-setup.conf"), events.index("setup-receipt.json"))

    def test_unexpected_native_output_and_symlink_config_never_publish_receipt(self):
        for failure in ["obscure", "recipient", "symlink"]:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve(); root.chmod(0o700)
                operation = setup.Setup(options(root, fake_binaries(root)))
                retained = root / "retained"; retained.write_bytes(b"keep existing private bytes"); retained.chmod(0o600)
                def native(arguments, password=None, discard=False):
                    if failure == "obscure" and "obscure" in arguments: return PASSWORD.encode()
                    if "-y" in arguments:
                        if failure == "recipient": return PUBLIC.encode() + b"\n" + PUBLIC.encode() + b"\n"
                        if failure == "symlink": (Path(arguments[-1]).parent / "sciebo-setup.conf").symlink_to(retained)
                    return fake_native(arguments, password, discard)
                with mock.patch.object(setup.Native, "run", side_effect=native), self.assertRaises((setup.SetupError, FileExistsError)):
                    operation.create(SHARE, PASSWORD)
                self.assertEqual(retained.read_bytes(), b"keep existing private bytes")
                self.assertFalse(list(root.glob("setup-*/setup-receipt.json")))

    def test_late_completion_stdout_failure_is_non_success_without_raw_errors(self):
        receipt = {"schemaVersion": 1, "status": "LOCAL_PROFILE_CREATED_UNVERIFIED", "publicRecipient": PUBLIC}
        server = SimpleNamespace(origin="http://127.0.0.1:12345", done=True, failed=False, receipt=receipt,
                                 requests=0, expires=time.monotonic() + 30)
        arguments = ["setup.py", "--operator-root", "/private/synthetic", "--allowed-provider-origin", "https://backup.example.invalid"]
        for name in ["age", "age-keygen", "rclone"]: arguments += ["--" + name, "/synthetic/" + name, "--" + name + "-sha256", "a" * 64]
        class Output:
            text = ""
            def write(self, value): self.text += value; return len(value)
            def flush(self):
                if "LOCAL_PROFILE_CREATED_UNVERIFIED" in self.text: raise BrokenPipeError(PASSWORD)
        output = Output(); errors = io.StringIO()
        with mock.patch.object(sys, "argv", arguments), mock.patch.object(setup, "Setup"), mock.patch.object(setup, "LocalServer") as constructor, \
             mock.patch.object(setup.signal, "signal"), redirect_stdout(output), redirect_stderr(errors):
            constructor.return_value.__enter__.return_value = server
            self.assertEqual(setup.main(), 1)
        self.assertEqual(json.loads(errors.getvalue())["status"], "LOCAL_SETUP_INCOMPLETE_PRIVATE_OUTPUTS_RETAINED")
        self.assertNotIn(PASSWORD, errors.getvalue())

    def test_native_subprocess_has_clean_environment_and_bounded_redacted_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            native = setup.Native(Path(temporary))
            self.assertEqual(set(native.environment), {"PATH", "HOME", "TMPDIR", "LANG", "LC_ALL"})
            with self.assertRaises(setup.SetupError) as error:
                native.run([sys.executable, "-c", "import sys;sys.stderr.write('PRIVATE-SENTINEL');sys.exit(1)"])
            self.assertNotIn("PRIVATE-SENTINEL", str(error.exception))
            with self.assertRaises(setup.SetupError): native.run([sys.executable, "-c", "print('x'*5000)"])
            timer = threading.Timer
            with mock.patch.object(setup.threading, "Timer", side_effect=lambda _delay, callback: timer(0.05, callback)), self.assertRaises(setup.SetupError):
                native.run([sys.executable, "-c", "import time;time.sleep(5)"])


TOOLS = {name: os.environ.get(environment) for name, environment in [
    ("age", "PLUGIN_BACKUP_AGE_BIN"), ("age-keygen", "PLUGIN_BACKUP_AGE_KEYGEN_BIN"), ("rclone", "PLUGIN_BACKUP_RCLONE_BIN")]}


@unittest.skipUnless(all(TOOLS.values()), "Explicit verified native clients are required")
class RealClientTests(unittest.TestCase):
    def test_cli_creates_nothing_before_submit_and_reports_only_typed_metadata(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            arguments = [sys.executable, "-B", str(SOURCE), "--operator-root", str(root),
                         "--allowed-provider-origin", "https://backup.example.invalid", "--timeout-seconds", "30"]
            for name, value in TOOLS.items():
                path = Path(value)
                arguments += ["--" + name, str(path), "--" + name + "-sha256", hashlib.sha256(path.read_bytes()).hexdigest()]
            process = subprocess.Popen(arguments, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                env={"PATH": "/usr/bin:/bin", "HOME": temporary}, start_new_session=True)
            try:
                ready = json.loads(process.stdout.readline())
                self.assertEqual(ready["status"], "LOCAL_FORM_READY")
                self.assertRegex(ready["url"], r"^http://127\.0\.0\.1:[0-9]+/$")
                server = SimpleNamespace(origin=ready["url"][:-1], server_port=int(ready["url"].split(":")[-1][:-1]))
                self.assertEqual(list(root.iterdir()), [])
                csrf, cookie = form(server); self.assertEqual(list(root.iterdir()), [])
                self.assertEqual(post(server, csrf, cookie)[0], 200)
                output, errors = process.communicate(timeout=5)
                self.assertEqual(process.returncode, 0, errors)
                receipt = json.loads(output); self.assertEqual(receipt["status"], "LOCAL_PROFILE_CREATED_UNVERIFIED")
                self.assertEqual(json.loads(Path(receipt["receiptPath"]).read_bytes()), receipt)
                for value in [PASSWORD.encode(), SHARE.encode(), b"PRIVATE_SYNTHETIC_TOKEN"]:
                    self.assertNotIn(value, output + errors)
                self.assertEqual(errors, b"")
            finally:
                if process.poll() is None:
                    process.kill(); process.wait()
                process.stdout.close(); process.stderr.close()

    def test_synthetic_form_uses_native_clients_without_provider_requests_or_secret_argv_env(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(); root.chmod(0o700)
            binaries = {name: Path(path) for name, path in TOOLS.items()}
            operation = setup.Setup(options(root, binaries))
            calls = []; writes = []; original = subprocess.Popen
            class Input:
                def __init__(self, wrapped): self.wrapped = wrapped
                def write(self, value): writes.append(value); return self.wrapped.write(value)
                def close(self): self.wrapped.close()
            def recorded(arguments, **kwargs):
                calls.append((arguments, kwargs))
                result = original(arguments, **kwargs)
                if result.stdin is not None: result.stdin = Input(result.stdin)
                return result
            with server_fixture(operation) as (server, _), mock.patch.object(setup.subprocess, "Popen", side_effect=recorded):
                csrf, cookie = form(server); status, _, page = post(server, csrf, cookie)
                self.assertEqual(status, 200, page)
                receipt = server.receipt
            self.assertEqual(writes, [PASSWORD.encode() + b"\n"])
            self.assertEqual(len(calls), 3)
            self.assertIn("obscure", calls[0][0]); self.assertIn("-o", calls[1][0]); self.assertIn("-y", calls[2][0])
            self.assertEqual(calls[1][1]["stdout"], subprocess.DEVNULL)
            for arguments, kwargs in calls:
                self.assertNotIn(PASSWORD, str(arguments)); self.assertNotIn(PASSWORD, str(kwargs["env"]))
                self.assertEqual(set(kwargs["env"]), {"PATH", "HOME", "TMPDIR", "LANG", "LC_ALL"})
                self.assertEqual(kwargs["stderr"], subprocess.DEVNULL)
            config = Path(receipt["configPath"]).read_text()
            self.assertIn("[sciebo]", config); self.assertIn("vendor = other", config)
            self.assertIn("url = https://backup.example.invalid/public.php/webdav/", config)
            self.assertNotIn(PASSWORD, config)
            identity = Path(receipt["identityPath"])
            self.assertEqual(identity.stat().st_mode & 0o777, 0o600)
            self.assertEqual(receipt["publicRecipient"], subprocess.check_output([str(binaries["age-keygen"]), "-y", str(identity)], stderr=subprocess.DEVNULL).decode().strip())


if __name__ == "__main__":
    unittest.main()
