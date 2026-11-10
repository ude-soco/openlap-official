#!/usr/bin/env python3
"""One private loopback form for a fresh, unverified backup share profile."""
import argparse
import configparser
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, HTTPServer
import io
import json
import os
from pathlib import Path
import re
import secrets
import signal
import socket
import stat
import subprocess
import sys
import threading
import time
from urllib.parse import parse_qsl, urlsplit


class SetupError(Exception):
    pass


def require(condition):
    if not condition:
        raise SetupError("Private setup validation failed.")


def canonical(value):
    data = (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()
    require(len(data) < 4096)
    return data


def metadata_token(value):
    return (value.st_dev, value.st_ino, value.st_mode, value.st_nlink, value.st_uid,
            value.st_size, value.st_mtime_ns, value.st_ctime_ns)


def physical(path, directory=False, private=False):
    path = Path(path)
    require(path.is_absolute() and len(str(path)) <= 1024 and str(path) == os.path.normpath(str(path)))
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current /= part
        require(not stat.S_ISLNK(current.lstat().st_mode))
    metadata = path.stat()
    require(stat.S_ISDIR(metadata.st_mode) if directory else stat.S_ISREG(metadata.st_mode))
    if private:
        require(metadata.st_uid == os.getuid() and metadata.st_mode & 0o077 == 0)
    if not directory:
        require(metadata.st_nlink == 1)
    require(not any((p / ".git").exists() for p in (path.parent, *path.parents)))
    return path


@contextmanager
def directory_fd(path):
    descriptor = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in path.parts[1:]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
            os.close(descriptor); descriptor = child
        yield descriptor
    finally:
        os.close(descriptor)


def trusted_binary(path, expected):
    path = physical(path)
    require(re.fullmatch(r"[a-f0-9]{64}", expected or "") and os.access(path, os.X_OK))
    before = path.stat()
    require(before.st_uid in (0, os.getuid()) and before.st_mode & (stat.S_ISUID | stat.S_ISGID | 0o022) == 0
            and 0 < before.st_size <= 128 * 1024 * 1024)
    with directory_fd(path.parent) as parent:
        descriptor = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
        with os.fdopen(descriptor, "rb") as stream:
            require(metadata_token(os.fstat(stream.fileno())) == metadata_token(before))
            digest = hashlib.sha256(); size = 0
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                size += len(block); require(size <= 128 * 1024 * 1024); digest.update(block)
            require(metadata_token(os.fstat(stream.fileno())) == metadata_token(before))
    require(digest.hexdigest() == expected)
    return path


def provider_origin(value):
    require(isinstance(value, str) and len(value) <= 261 and not any(ord(c) < 33 or ord(c) > 126 for c in value))
    parsed = urlsplit(value)
    host = parsed.hostname or ""
    require(re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?", host)
            and all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in host.split(".")))
    require(value == "https://" + host)
    return value


def share_profile(value, origin):
    require(isinstance(value, str) and len(value) <= 2048
            and not any(ord(c) < 33 or ord(c) > 126 for c in value)
            and not any(c in value for c in "?#%\\"))
    parsed = urlsplit(value)
    require(parsed.scheme == "https" and "https://" + parsed.netloc == origin)
    match = re.fullmatch(r"/(?:index\.php/)?s/([A-Za-z0-9_-]{1,128})", parsed.path)
    require(match is not None)
    return origin + "/public.php/webdav/", match.group(1)


def identity_metadata(path):
    path = physical(path, private=True)
    require(0 < path.stat().st_size <= 4096 and path.stat().st_mode & 0o400)
    return path


def sync_fresh_identity(path):
    before = metadata_token(identity_metadata(path).stat())
    with directory_fd(path.parent) as parent:
        descriptor = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
        try:
            require(metadata_token(os.fstat(descriptor)) == before)
            os.fsync(descriptor)  # Flush the native-created key without reading any key bytes.
            require(metadata_token(os.fstat(descriptor)) == before)
            os.fsync(parent)
        finally:
            os.close(descriptor)
    require(metadata_token(path.stat()) == before)


class Native:
    def __init__(self, work):
        self.environment = {"PATH": "/usr/bin:/bin", "HOME": str(work), "TMPDIR": str(work), "LANG": "C", "LC_ALL": "C"}

    def run(self, arguments, password=None, discard=False):
        process = subprocess.Popen([str(a) for a in arguments],
            stdin=subprocess.PIPE if password is not None else subprocess.DEVNULL,
            stdout=subprocess.DEVNULL if discard else subprocess.PIPE, stderr=subprocess.DEVNULL,
            env=self.environment, start_new_session=True)
        expired = threading.Event()
        def stop():
            expired.set()
            try: os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError: pass
        timer = threading.Timer(10, stop); timer.daemon = True; timer.start()
        try:
            if password is not None:
                process.stdin.write(password + b"\n"); process.stdin.close()
            output = b"" if discard else process.stdout.read(4097)
            require(len(output) <= 4096)
            require(process.wait(timeout=10) == 0 and not expired.is_set())
            return output
        finally:
            timer.cancel()
            if process.poll() is None:
                stop(); process.wait()
            if process.stdout is not None: process.stdout.close()
            if process.stdin is not None: process.stdin.close()


def exclusive_file(directory, name, data):
    with directory_fd(directory) as parent:
        descriptor = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=parent)
        with os.fdopen(descriptor, "wb") as target:
            target.write(data); target.flush(); os.fsync(target.fileno())
        os.fsync(parent)


class Setup:
    def __init__(self, options):
        self.root = physical(options.operator_root, directory=True, private=True)
        self.origin = provider_origin(options.allowed_provider_origin)
        self.age = trusted_binary(options.age, options.age_sha256)
        self.keygen = trusted_binary(options.age_keygen, options.age_keygen_sha256)
        self.rclone = trusted_binary(options.rclone, options.rclone_sha256)
        self.tools = [(self.age, options.age_sha256), (self.keygen, options.age_keygen_sha256), (self.rclone, options.rclone_sha256)]
        self.identity = identity_metadata(options.existing_identity) if options.existing_identity else None
        self.identity_token = metadata_token(self.identity.stat()) if self.identity else None

    def create(self, share_url, password):
        endpoint, username = share_profile(share_url, self.origin)
        require(isinstance(password, str))
        password_bytes = password.encode("utf-8")
        require(0 < len(password_bytes) <= 1024 and not any(ord(c) < 32 or ord(c) == 127 for c in password))
        physical(self.root, directory=True, private=True)
        for path, expected in self.tools: trusted_binary(path, expected)
        if self.identity: require(metadata_token(identity_metadata(self.identity).stat()) == self.identity_token)
        name = "setup-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ-") + secrets.token_hex(16)
        with directory_fd(self.root) as parent:
            os.mkdir(name, mode=0o700, dir_fd=parent); os.fsync(parent)
        profile = physical(self.root / name, directory=True, private=True)
        native = Native(profile)
        obscured = native.run([self.rclone, "--config", "/dev/null", "--log-level", "OFF", "obscure", "-"], password_bytes)
        require(re.fullmatch(rb"[A-Za-z0-9_-]{20,2048}\n", obscured) is not None)
        identity = self.identity or profile / "age-identity.txt"
        if self.identity is None:
            native.run([self.keygen, "-o", identity], discard=True)
        identity = identity_metadata(identity)
        if self.identity is None: sync_fresh_identity(identity)
        before = identity.stat()
        recipient = native.run([self.keygen, "-y", identity])
        require(metadata_token(identity.stat()) == metadata_token(before)
                and re.fullmatch(rb"age1[023456789acdefghjklmnpqrstuvwxyz]{58}\n", recipient) is not None)
        config = configparser.ConfigParser(interpolation=None)
        config["sciebo"] = {"type": "webdav", "url": endpoint, "vendor": "other", "user": username,
                            "pass": obscured[:-1].decode("ascii")}
        text = io.StringIO(); config.write(text)
        exclusive_file(profile, "sciebo-setup.conf", text.getvalue().encode("utf-8"))
        receipt = {"schemaVersion": 1, "status": "LOCAL_PROFILE_CREATED_UNVERIFIED",
            "configPath": str(profile / "sciebo-setup.conf"), "identityPath": str(identity),
            "receiptPath": str(profile / "setup-receipt.json"), "publicRecipient": recipient[:-1].decode("ascii"),
            "identityReused": self.identity is not None, "providerConnectivityVerified": False, "keyRecoveryVerified": False}
        physical(profile / "sciebo-setup.conf", private=True)
        exclusive_file(profile, "setup-receipt.json", canonical(receipt))
        return receipt


FORM = """<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Private backup setup</title><style>body{font:18px system-ui;max-width:32em;margin:3em auto;padding:1em}label{display:block;margin:1em 0}input{display:block;width:100%;box-sizing:border-box;padding:.6em;font:inherit}button{padding:.7em 1em;font:inherit}</style>
<h1>Private backup setup</h1><p>Paste the folder share link and its share password. They stay in protected local files. This step uploads nothing.</p>
<form method="post" action="/" autocomplete="off" accept-charset="utf-8"><input type="hidden" name="csrf" value="CSRF_VALUE">
<label>Share link<input type="url" name="share_url" maxlength="2048" required autocomplete="off" spellcheck="false" autocapitalize="off"></label>
<label>Share password<input type="password" name="share_password" maxlength="1024" required autocomplete="off"></label>
<button type="submit">Submit</button></form></html>"""
SUCCESS = "<!doctype html><html lang=en><meta charset=utf-8><title>Setup saved</title><h1>Private setup saved</h1><p>You can close this tab. The operator will verify the next step.</p></html>"
FAILURE = "<!doctype html><html lang=en><meta charset=utf-8><title>Setup unavailable</title><p>Setup could not be completed. Close this tab and return to the operator.</p></html>"


class LocalServer(HTTPServer):
    allow_reuse_address = False
    def __init__(self, setup, seconds=300):
        self.setup = setup; self.expires = time.monotonic() + seconds
        self.session = secrets.token_urlsafe(32); self.csrf = secrets.token_urlsafe(32)
        self.consumed = False; self.done = False; self.failed = False; self.receipt = None; self.requests = 0
        super().__init__(("127.0.0.1", 0), Handler)
        self.origin = "http://127.0.0.1:" + str(self.server_port)
        self.timeout = 0.25

    def handle_error(self, *_args):
        pass

    def get_request(self):
        connection = super().get_request(); self.requests += 1
        return connection


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def version_string(self):
        return "PrivateSetup"

    def setup(self):
        super().setup(); self.connection.settimeout(5)
        def stop():
            try: self.connection.shutdown(socket.SHUT_RDWR)
            except OSError: pass
        self.request_timer = threading.Timer(10, stop)
        self.request_timer.daemon = True; self.request_timer.start()

    def finish(self):
        self.request_timer.cancel()
        super().finish()

    def send_error(self, code, *_args):
        self.reply(code, FAILURE)

    def reply(self, code, text, cookie=False):
        data = text.encode("utf-8")
        self.send_response(code)
        for key, value in {"Content-Type": "text/html; charset=utf-8", "Content-Length": str(len(data)),
            "Cache-Control": "no-store", "Pragma": "no-cache", "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Connection": "close",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}.items():
            self.send_header(key, value)
        if cookie:
            lifetime = max(1, int(self.server.expires - time.monotonic()))
            self.send_header("Set-Cookie", "openlap_setup=" + self.server.session + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + str(lifetime))
        self.end_headers(); self.wfile.write(data); self.wfile.flush(); self.close_connection = True

    def one(self, name, required=True):
        values = self.headers.get_all(name, [])
        require(len(values) == 1 if required else len(values) <= 1)
        return values[0] if values else None

    def guard(self, post=False):
        require(time.monotonic() < self.server.expires and not self.server.consumed)
        require(self.request_version in ("HTTP/1.0", "HTTP/1.1"))
        require(self.path == "/" and len(self.raw_requestline) <= 4096)
        require(sum(len(k) + len(v) for k, v in self.headers.items()) <= 8192)
        require(self.one("Host") == self.server.origin[7:])
        origin = self.one("Origin", required=post)
        require(origin == self.server.origin if origin is not None else not post)
        require(not any(key.lower() == "forwarded" or key.lower().startswith("x-forwarded-") for key in self.headers))
        require(self.one("Transfer-Encoding", required=False) is None and self.one("Expect", required=False) is None
                and self.one("Content-Encoding", required=False) is None)

    def do_GET(self):
        try:
            self.guard()
            require(self.one("Content-Length", required=False) in (None, "0"))
            self.reply(200, FORM.replace("CSRF_VALUE", self.server.csrf), cookie=True)
        except Exception:
            self.reply(400, FAILURE)

    def do_POST(self):
        try:
            self.guard(post=True)
            require(self.one("Content-Type") == "application/x-www-form-urlencoded")
            length = self.one("Content-Length")
            require(re.fullmatch(r"[1-9][0-9]{0,3}", length) and int(length) <= 8192)
            cookie = self.one("Cookie"); require(len(cookie) <= 2048)
            values = {}
            for item in cookie.split(";"):
                key, separator, value = item.strip().partition("=")
                require(separator and key not in values and len(values) < 16)
                values[key] = value
            require(hmac.compare_digest(values.get("openlap_setup", "").encode("ascii"), self.server.session.encode("ascii")))
            body = self.rfile.read(int(length)); require(len(body) == int(length))
            encoded = body.decode("ascii"); require(re.search(r"%(?![0-9A-Fa-f]{2})", encoded) is None)
            pairs = parse_qsl(encoded, keep_blank_values=True, strict_parsing=True, encoding="utf-8", errors="strict", max_num_fields=3)
            fields = dict(pairs); require(len(pairs) == len(fields) == 3 and set(fields) == {"csrf", "share_url", "share_password"})
            require(hmac.compare_digest(fields["csrf"].encode("ascii"), self.server.csrf.encode("ascii")))
            # Validate before consuming the handoff; never echo or retain invalid input.
            share_profile(fields["share_url"], self.server.setup.origin)
            require(0 < len(fields["share_password"].encode("utf-8")) <= 1024
                    and not any(ord(c) < 32 or ord(c) == 127 for c in fields["share_password"]))
            require(time.monotonic() < self.server.expires)
            self.request_timer.cancel(); self.server.consumed = True
            self.server.receipt = self.server.setup.create(fields["share_url"], fields["share_password"])
            self.reply(200, SUCCESS)
        except Exception:
            if self.server.consumed: self.server.failed = True
            self.reply(400, FAILURE)
        finally:
            if self.server.consumed:
                self.server.done = True


class Arguments(argparse.ArgumentParser):
    def error(self, _message):
        raise SetupError("Invalid operator setup arguments.")


def main():
    try:
        def interrupted(_signum, _frame):
            raise SetupError("Private setup interrupted.")
        signal.signal(signal.SIGTERM, interrupted)
        parser = Arguments(description=__doc__)
        parser.add_argument("--operator-root", type=Path, required=True)
        parser.add_argument("--allowed-provider-origin", required=True)
        for name in ["age", "age-keygen", "rclone"]:
            parser.add_argument("--" + name, type=Path, required=True)
            parser.add_argument("--" + name + "-sha256", required=True)
        parser.add_argument("--existing-identity", type=Path)
        parser.add_argument("--timeout-seconds", type=int, default=300)
        options = parser.parse_args(); require(30 <= options.timeout_seconds <= 900)
        os.umask(0o077)
        with LocalServer(Setup(options), options.timeout_seconds) as server:
            sys.stdout.write(canonical({"schemaVersion": 1, "status": "LOCAL_FORM_READY", "url": server.origin + "/",
                                        "expiresInSeconds": options.timeout_seconds}).decode()); sys.stdout.flush()
            while not server.done and server.requests < 32 and time.monotonic() < server.expires:
                server.handle_request()
            require(server.done and not server.failed and server.receipt is not None)
            sys.stdout.write(canonical(server.receipt).decode()); sys.stdout.flush()
        return 0
    except (Exception, KeyboardInterrupt):
        try:
            sys.stderr.write('{"schemaVersion":1,"status":"LOCAL_SETUP_INCOMPLETE_PRIVATE_OUTPUTS_RETAINED"}\n'); sys.stderr.flush()
        except OSError:
            pass
        return 1


if __name__ == "__main__":
    sys.exit(main())
