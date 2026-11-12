#!/usr/bin/env python3
"""Local age/rclone release transport. Never restores a database or reads credentials."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import shutil
import signal
import stat
import subprocess
import sys
import tarfile
import threading
import time

MIB = 1024 * 1024
METADATA_LIMIT = MIB
ENCRYPTION_OVERHEAD = 4 * MIB
REPORT = "checkpoint/checkpoint.json"
ARCHIVE = "checkpoint/database.archive.gz"
MANIFEST = "release-manifest.json"
COMPLETE = "DUMP_AND_ISOLATED_RESTORE_VERIFIED"
ONLINE_COMPLETE = "INSTANCE_WIDE_OPLOG_REPLAY_VERIFIED"
ONLINE_SCOPE = "Full dump eligible source instance excluding local; selected application projection only; no separate MongoDB instance, S3 bytes, freeze, off-node custody or application acceptance verified"
ONLINE_KEYS = {"schemaVersion", "status", "captureMode", "checkpointId", "database", "sourceServerVersion", "restoreServerVersion", "fcv", "databaseToolsVersion",
               "archiveFile", "archiveSha256", "archiveSizeBytes", "expandedArchiveBytes", "gzipValidated", "oplogReplayVerified", "sourceMetadataMatched", "sourceIdentityMd5",
               "sourceReplicaSet", "sourceOplogBefore", "sourceOplogAfter", "captureStartedAt", "captureCompletedAt", "oplogRangeValidation", "fingerprintAuthority", "databases", "collections", "scope"}


class BackupError(Exception):
    pass


def require(condition, message="Release backup validation failed."):
    if not condition:
        raise BackupError(message)


def sha256(value):
    require(isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value))
    return value


def positive(value, maximum):
    require(type(value) is int and 0 < value <= maximum)
    return value


def member_path(value):
    require(isinstance(value, str) and 0 < len(value.encode("utf-8")) <= 240)
    path = PurePosixPath(value)
    require(path.parts and not path.is_absolute() and str(path) == value and ".." not in path.parts
            and "." not in path.parts and "\\" not in value
            and not any(ord(c) < 32 or ord(c) == 127 for c in value))
    return value


def physical(path, directory=False, private=False):
    path = Path(path)
    require(path.is_absolute() and str(path) == os.path.normpath(str(path)), "Use explicit physical absolute paths.")
    current = Path(path.anchor)
    for part in path.parts[1:]:
        require(part not in (".", ".."))
        current /= part
        require(not stat.S_ISLNK(current.lstat().st_mode), "Indirect paths are unsupported.")
    metadata = path.stat()
    require(stat.S_ISDIR(metadata.st_mode) if directory else stat.S_ISREG(metadata.st_mode))
    if private:
        require(metadata.st_uid == os.getuid() and metadata.st_mode & 0o077 == 0,
                "Credential and receipt files must have private owner-only access.")
    return path


@contextmanager
def read_file(path):
    """Open every ancestor without following links; do not race a parent symlink."""
    path = physical(path)
    descriptor = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in path.parts[1:-1]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
            os.close(descriptor); descriptor = child
        file_descriptor = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=descriptor)
        with os.fdopen(file_descriptor, "rb") as stream:
            require(stat.S_ISREG(os.fstat(stream.fileno()).st_mode))
            yield stream
    finally:
        os.close(descriptor)


def token(metadata):
    return metadata.st_dev, metadata.st_ino, metadata.st_size, metadata.st_mtime_ns, metadata.st_ctime_ns


def digest_file(path, maximum, deadline):
    with read_file(path) as stream:
        before = token(os.fstat(stream.fileno()))
        digest = hashlib.sha256(); size = 0
        while True:
            deadline.check()
            block = stream.read(min(MIB, maximum - size + 1))
            if not block:
                break
            size += len(block); require(size <= maximum, "A file exceeds the reviewed byte budget.")
            digest.update(block)
        require(before == token(os.fstat(stream.fileno())), "A source changed during capture.")
    return digest.hexdigest(), size, before


def private_file(path):
    return os.fdopen(os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600), "wb")


def sync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try: os.fsync(descriptor)
    finally: os.close(descriptor)


def new_directory(path):
    path = Path(path); parent = physical(path.parent, directory=True)
    require(path.name not in ("", ".", ".."))
    require(not any((p / ".git").exists() for p in (parent, *parent.parents)), "Keep backup data outside Git worktrees.")
    os.mkdir(path, 0o700)
    sync_directory(parent)
    return physical(path, directory=True, private=True)


def json_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def parse_json(data):
    require(len(data) <= METADATA_LIMIT)
    def pairs(values):
        result = {}
        for key, value in values:
            require(key not in result, "Duplicate JSON keys are unsupported.")
            result[key] = value
        return result
    def invalid_constant(_value):
        raise BackupError("Nonstandard JSON values are unsupported.")
    result = json.loads(data, object_pairs_hook=pairs, parse_constant=invalid_constant)
    require(isinstance(result, dict))
    return result


def read_json(path, expected_sha, deadline):
    with read_file(path) as stream:
        data = stream.read(METADATA_LIMIT + 1)
    require(len(data) <= METADATA_LIMIT and hashlib.sha256(data).hexdigest() == sha256(expected_sha),
            "Trusted metadata hash does not match.")
    deadline.check()
    return parse_json(data)


def online_time(value):
    require(isinstance(value, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z", value))
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        require(parsed.isoformat(timespec="milliseconds").replace("+00:00", "Z") == value)
        return parsed
    except ValueError:
        raise BackupError("Invalid checkpoint UTC timestamp.") from None


def online_rows(rows, system=False):
    require(isinstance(rows, list) and 0 < len(rows) <= 256)
    previous = ""
    for row in rows:
        require(isinstance(row, dict) and set(row) == {"name", "count", "identityMd5", "dataMd5", "optionsMd5", "indexesMd5"})
        name = row["name"]
        require(isinstance(name, str) and re.fullmatch(r"[A-Za-z][A-Za-z0-9_.-]{0,119}", name)
                and name > previous and not name.startswith("tmp.") and (system or not name.startswith("system.")))
        require(type(row["count"]) is int and 0 <= row["count"] <= 1000000)
        require(all(isinstance(row[key], str) and re.fullmatch(r"[a-f0-9]{32}", row[key])
                    for key in ("identityMd5", "dataMd5", "optionsMd5", "indexesMd5")))
        previous = name


def validate_online_report(report):
    require(set(report) == ONLINE_KEYS and report["status"] == ONLINE_COMPLETE and report["captureMode"] == "INSTANCE_WIDE_OPLOG"
            and report["archiveFile"] == "database.archive.gz")
    require(all(report[key] is True for key in ("gzipValidated", "oplogReplayVerified", "sourceMetadataMatched")))
    require(report["restoreServerVersion"] == "4.4.30" and isinstance(report["sourceServerVersion"], str)
            and re.fullmatch(r"4\.4\.[0-9]{1,3}", report["sourceServerVersion"]))
    require(isinstance(report["checkpointId"], str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", report["checkpointId"]))
    require(report["oplogRangeValidation"] == "NATIVE_MONGODUMP_COMPLETE_RANGE"
            and report["fingerprintAuthority"] == "ISOLATED_FULL_OPLOG_REPLAY" and report["scope"] == ONLINE_SCOPE)
    require(online_time(report["captureStartedAt"]) <= online_time(report["captureCompletedAt"]))
    replica = report["sourceReplicaSet"]
    require(isinstance(replica, dict) and set(replica) == {"name", "identityMd5"}
            and isinstance(replica["name"], str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", replica["name"])
            and isinstance(replica["identityMd5"], str) and re.fullmatch(r"[a-f0-9]{32}", replica["identityMd5"]))
    timestamps = []
    for key in ("sourceOplogBefore", "sourceOplogAfter"):
        value = report[key]
        require(isinstance(value, dict) and set(value) == {"seconds", "increment"}
                and all(type(value[name]) is int and 0 <= value[name] <= 4294967295 for name in ("seconds", "increment")))
        timestamps.append((value["seconds"], value["increment"]))
    require(timestamps[0] <= timestamps[1])
    databases = report["databases"]
    require(isinstance(databases, list) and 0 < len(databases) <= 16)
    previous = ""; total = 0; selected = []
    for row in databases:
        require(isinstance(row, dict) and set(row) == {"name", "collections"})
        name = row["name"]
        require(isinstance(name, str) and re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,62}", name) and name != "local" and name > previous)
        online_rows(row["collections"], system=name in ("admin", "config"))
        total += len(row["collections"]); require(total <= 512)
        if name == report["database"]: selected.append(row["collections"])
        previous = name
    online_rows(report["collections"])
    require(len(selected) == 1 and selected[0] == report["collections"])


def validate_checkpoint(directory, expected_sha, maximum, deadline):
    report = read_json(directory / "checkpoint.json", expected_sha, deadline)
    version = report.get("schemaVersion")
    require(type(version) is int)
    if version == 1:
        require(report.get("status") == COMPLETE and report.get("archiveFile") == "database.archive.gz")
        require(all(report.get(key) is True for key in ("gzipValidated", "sourceBeforeAfterMatched", "restoredMatched")))
        require(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", report.get("checkpointId", ""))
                and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}", report.get("freezeEvidenceId", "")))
    else:
        require(version == 2 and (directory / "checkpoint.json").stat().st_size <= 262144)
        validate_online_report(report)
    database = report.get("database", "")
    require(re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,62}", database) and database not in ("admin", "config", "local"))
    require(report.get("fcv") == "4.4" and report.get("databaseToolsVersion") == "100.10.0"
            and all(re.fullmatch(r"4\.4\.[0-9]+", report.get(key, "")) for key in ("sourceServerVersion", "restoreServerVersion")))
    require(re.fullmatch(r"[a-f0-9]{32}", report.get("sourceIdentityMd5", "")))
    collections = report.get("collections"); require(isinstance(collections, list) and 0 < len(collections) <= 256)
    names = []
    for row in collections:
        name = row.get("name", "")
        require(re.fullmatch(r"[A-Za-z][A-Za-z0-9_.-]{0,119}", name) and not name.startswith(("system.", "tmp."))
                and name not in names and type(row.get("count")) is int and 0 <= row["count"] <= 1000000)
        require(all(re.fullmatch(r"[a-f0-9]{32}", row.get(key, "")) for key in ("identityMd5", "dataMd5", "optionsMd5", "indexesMd5")))
        names.append(name)
    size = positive(report.get("archiveSizeBytes"), min(maximum, 1024 * MIB))
    expanded = positive(report.get("expandedArchiveBytes"), 1024 * MIB)
    digest, actual_size, _ = digest_file(directory / "database.archive.gz", maximum, deadline)
    require((digest, actual_size) == (sha256(report.get("archiveSha256")), size), "Checkpoint archive identity does not match.")
    with read_file(directory / "database.archive.gz") as raw, gzip.GzipFile(fileobj=raw) as stream:
        count = 0
        while True:
            deadline.check()
            block = stream.read(min(MIB, expanded - count + 1))
            if not block:
                break
            count += len(block); require(count <= expanded, "Checkpoint expansion exceeds its trusted budget.")
        require(count == expanded, "Checkpoint expansion size does not match.")
    return report


class Deadline:
    def __init__(self, seconds):
        self.end = time.monotonic() + seconds

    def check(self):
        require(time.monotonic() < self.end, "Release backup runtime budget exceeded.")

    def remaining(self):
        self.check()
        return max(0.01, self.end - time.monotonic())


class Tools:
    def __init__(self, options, work, deadline):
        self.age = physical(options.age)
        self.rclone = physical(options.rclone)
        require(os.access(self.age, os.X_OK) and os.access(self.rclone, os.X_OK))
        # Metadata checks only. These files are opened by their respective clients.
        self.config = physical(options.rclone_config, private=True)
        self.work = work; self.deadline = deadline
        self.environment = {"PATH": "/usr/bin:/bin", "HOME": str(work), "TMPDIR": str(work), "LANG": "C"}

    def run(self, arguments, stage, output=None, maximum=METADATA_LIMIT, accepted=(0,)):
        digest = hashlib.sha256(); count = 0; result = bytearray()
        remaining = self.deadline.remaining()
        process = subprocess.Popen([str(a) for a in arguments], stdin=subprocess.DEVNULL,
                                   stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                   env=self.environment, start_new_session=True)
        def stop():
            try: os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError: pass
        timer = threading.Timer(remaining, stop); timer.daemon = True; timer.start()
        try:
            while True:
                block = process.stdout.read(MIB)
                if not block: break
                self.deadline.check(); count += len(block)
                require(count <= maximum, stage + " exceeded its byte budget.")
                digest.update(block)
                if output is not None: output.write(block)
                else: result.extend(block)
            code = process.wait(timeout=self.deadline.remaining())
            require(code in accepted, stage + " failed; client diagnostics withheld.")
            self.deadline.check()
            return code, bytes(result), digest.hexdigest(), count
        finally:
            timer.cancel()
            if process.poll() is None: stop(); process.wait()
            process.stdout.close()

    def remote(self, arguments, stage, **options):
        return self.run([self.rclone, "--config", self.config, "--ask-password=false",
                         "--retries=1", "--low-level-retries=1", "--contimeout=10s", "--timeout=30s",
                         *arguments], stage, **options)


def remote_path(value):
    require(isinstance(value, str) and re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,63}:.+", value),
            "Use a configured remote and a normalized directory, without connection strings.")
    name, path = value.split(":", 1)
    require(len(path.encode("utf-8")) <= 500 and not path.startswith("/")
            and all(part not in ("", ".", "..") for part in path.split("/"))
            and ":" not in path and "\\" not in path
            and not any(ord(c) < 32 or ord(c) == 127 for c in path))
    return name + ":" + path


def sources(options):
    result = {}
    for value in options.source:
        label, separator, directory = value.partition("=")
        require(separator and re.fullmatch(r"[a-z][a-z0-9_-]{0,47}", label) and label not in result,
                "Supply unique labels for reviewed source directories.")
        result[label] = physical(directory, directory=True)
    require(result, "At least one reviewed source directory is required.")
    return result


def scan(roots, maximum_files, deadline):
    files = {}; count = 0
    for label, root in sorted(roots.items()):
        pending = [(root, 0)]
        while pending:
            parent, depth = pending.pop(); deadline.check()
            require(depth <= 32, "Source directory depth exceeds its reviewed budget.")
            try:
                with os.scandir(parent) as entries:
                    for entry in entries:
                        deadline.check(); count += 1
                        require(count <= maximum_files, "Source entry count exceeds its reviewed budget.")
                        path = Path(entry.path)
                        member = member_path(label + "/" + path.relative_to(root).as_posix())
                        metadata = entry.stat(follow_symlinks=False)
                        require(entry.name != ".git" and not stat.S_ISLNK(metadata.st_mode), "Indirect or repository sources are unsupported.")
                        if stat.S_ISDIR(metadata.st_mode): pending.append((path, depth + 1))
                        else:
                            require(stat.S_ISREG(metadata.st_mode), "Only regular source files are supported.")
                            files[member] = (path, token(metadata))
            except OSError:
                raise BackupError("A source directory could not be read completely.") from None
    return files


def make_tar(path, checkpoint, report, folders, options, release_id, deadline):
    roots = {"sources/" + label: directory for label, directory in folders.items()}
    listing = scan(roots, options.max_files - 2, deadline)
    for name in ("checkpoint.json", "database.archive.gz"):
        source = checkpoint / name
        listing["checkpoint/" + name] = (source, token(source.stat()))
    ledger = []; total = 0
    with private_file(path) as destination, tarfile.open(fileobj=destination, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for name, (source, expected_token) in sorted(listing.items()):
            digest, size, actual_token = digest_file(source, options.max_bytes - total, deadline)
            require(actual_token == expected_token, "A source changed before capture.")
            if name == REPORT:
                require(digest == options.checkpoint_report_sha256, "Checkpoint report changed before capture.")
            if name == ARCHIVE:
                require((digest, size) == (report["archiveSha256"], report["archiveSizeBytes"]), "Checkpoint archive changed before capture.")
            total += size; require(total <= options.max_bytes)
            with read_file(source) as stream:
                require(token(os.fstat(stream.fileno())) == expected_token)
                info = tarfile.TarInfo(name); info.size = size; info.mode = 0o600
                archive.addfile(info, stream)
                require(token(os.fstat(stream.fileno())) == expected_token, "A source changed during capture.")
            ledger.append({"path": name, "sha256": digest, "sizeBytes": size})
        manifest = {"schemaVersion": 1, "releaseId": release_id, "checkpointReportSha256": options.checkpoint_report_sha256,
                    "catalogCoverage": "Operator-reviewed source selection; not assessed by this tool", "files": ledger}
        data = json_bytes(manifest); require(len(data) <= METADATA_LIMIT)
        info = tarfile.TarInfo(MANIFEST); info.size = len(data); info.mode = 0o600
        archive.addfile(info, io.BytesIO(data))
        destination.flush(); os.fsync(destination.fileno())
    for row in ledger:
        digest, size, current = digest_file(listing[row["path"]][0], options.max_bytes, deadline)
        require((digest, size, current) == (row["sha256"], row["sizeBytes"], listing[row["path"]][1]), "A source changed during capture.")
    require(scan(roots, options.max_files - 2, deadline) == {key: value for key, value in listing.items() if key.startswith("sources/")},
            "Source membership changed during capture.")
    return hashlib.sha256(data).hexdigest()


def publish_receipt(path, receipt):
    pending = path.with_name(path.name + ".partial")
    with private_file(pending) as stream:
        stream.write(json_bytes(receipt)); stream.flush(); os.fsync(stream.fileno())
    sync_directory(path.parent)
    os.link(pending, path)
    try:
        sync_directory(path.parent)
        pending.unlink()
    except BaseException:
        path.unlink()
        raise


def fetch(tools, object_path, destination, expected_sha, expected_size):
    with private_file(destination) as stream:
        _, _, digest, size = tools.remote(["cat", object_path], "Encrypted readback", output=stream, maximum=expected_size)
        stream.flush(); os.fsync(stream.fileno())
    require((digest, size) == (expected_sha, expected_size), "Encrypted readback identity does not match.")


def push(options, output, work, tools, deadline):
    checkpoint = physical(options.checkpoint, directory=True)
    folders = sources(options)
    require(all(output != root and root not in output.parents and output not in root.parents
                and tools.config != root and root not in tools.config.parents
                for root in (checkpoint, *folders.values())), "Outputs and client configuration must be outside sources.")
    report = validate_checkpoint(checkpoint, options.checkpoint_report_sha256, options.max_bytes, deadline)
    release_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + secrets.token_hex(16)
    filename = "release-" + release_id + ".tar.age"
    tar_path = work / "release.tar"
    manifest_sha = make_tar(tar_path, checkpoint, report, folders, options, release_id, deadline)
    tar_sha, tar_size, _ = digest_file(tar_path, options.max_bytes + (options.max_files + 4) * 2048 + METADATA_LIMIT, deadline)
    cipher = output / filename
    recipients = []
    require(0 < len(options.recipient) <= 16 and len(set(options.recipient)) == len(options.recipient))
    for value in options.recipient:
        require(re.fullmatch(r"age1[0-9a-z]{58}", value), "Use native age public recipients.")
        recipients.extend(["--recipient", value])
    with private_file(cipher) as stream:
        _, _, cipher_sha, cipher_size = tools.run([tools.age, "--encrypt", *recipients, tar_path], "Encryption",
                                                output=stream, maximum=tar_size + ENCRYPTION_OVERHEAD)
        stream.flush(); os.fsync(stream.fileno())
    object_path = remote_path(options.remote) + "/" + filename
    code, _, _, _ = tools.remote(["lsjson", "--stat", object_path], "Destination check", accepted=(0, 3, 4))
    require(code in (3, 4), "Destination already exists; existing objects are never reused.")
    tools.remote(["copyto", "--immutable", cipher, object_path], "Encrypted upload")
    fetch(tools, object_path, work / "readback.age", cipher_sha, cipher_size)
    require(digest_file(cipher, cipher_size, deadline)[:2] == (cipher_sha, cipher_size), "Local encrypted copy changed.")
    receipt = {"schemaVersion": 1, "status": "ENCRYPTED_UPLOAD_AND_READBACK_VERIFIED", "releaseId": release_id,
               "objectName": filename, "cipherSha256": cipher_sha, "cipherSizeBytes": cipher_size,
               "tarSha256": tar_sha, "tarSizeBytes": tar_size, "manifestSha256": manifest_sha,
               "checkpointReportSha256": options.checkpoint_report_sha256,
               "scope": "Encrypted transport integrity only; no catalog coverage, database restore, freeze or availability verified"}
    shutil.rmtree(work)
    publish_receipt(output / "receipt.json", receipt)


def unpack(tar_path, destination, receipt, options, deadline):
    with tarfile.open(tar_path, mode="r:") as archive:
        members = {}; total = 0; end = 0
        for item in archive:
            deadline.check(); name = member_path(item.name)
            require(item.type == tarfile.REGTYPE and item.offset_data == item.offset + 512
                    and not item.pax_headers and not archive.pax_headers and name not in members,
                    "Unsafe or duplicate archive member.")
            require(name == MANIFEST or name in (REPORT, ARCHIVE) or name.startswith("sources/"))
            require(type(item.size) is int and item.size >= 0)
            total += item.size; require(total <= options.max_bytes + METADATA_LIMIT and len(members) < options.max_files + 1)
            members[name] = item; end = item.offset_data + ((item.size + 511) // 512) * 512
        require(MANIFEST in members and REPORT in members and ARCHIVE in members)
        require(members[MANIFEST].size <= METADATA_LIMIT)
        manifest_bytes = archive.extractfile(members[MANIFEST]).read(METADATA_LIMIT + 1)
        require(hashlib.sha256(manifest_bytes).hexdigest() == receipt["manifestSha256"])
        manifest = parse_json(manifest_bytes)
        require(type(manifest.get("schemaVersion")) is int and manifest["schemaVersion"] == 1
                and manifest.get("releaseId") == receipt["releaseId"]
                and manifest.get("checkpointReportSha256") == options.checkpoint_report_sha256)
        ledger = manifest.get("files"); require(isinstance(ledger, list) and len(ledger) == len(members) - 1)
        indexed = {}
        for row in ledger:
            name = member_path(row["path"]); require(name not in indexed and name != MANIFEST and name in members)
            require(type(row["sizeBytes"]) is int and row["sizeBytes"] == members[name].size)
            sha256(row["sha256"]); indexed[name] = row
        require(set(indexed) == set(members) - {MANIFEST})
        parents = {parent for name in indexed for parent in PurePosixPath(name).parents if str(parent) != "."}
        require(len(parents) + len(indexed) <= 2 * options.max_files + 4
                and all(len(PurePosixPath(name).parts) <= 35 for name in indexed), "Recovered directory budget exceeded.")
        with read_file(tar_path) as raw:
            raw.seek(end); tail_size = 0
            while True:
                block = raw.read(MIB)
                if not block: break
                deadline.check(); require(not block.strip(b"\0"), "Unexpected archive trailer."); tail_size += len(block)
            require(tail_size >= 1024, "Truncated archive trailer.")
        destination.mkdir(mode=0o700)
        for name, row in sorted(indexed.items()):
            deadline.check(); target = destination / name
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            digest = hashlib.sha256(); size = 0
            with archive.extractfile(members[name]) as source, private_file(target) as output:
                while True:
                    block = source.read(MIB)
                    if not block: break
                    deadline.check(); size += len(block); require(size <= row["sizeBytes"])
                    digest.update(block); output.write(block)
                output.flush(); os.fsync(output.fileno())
            require((digest.hexdigest(), size) == (row["sha256"], row["sizeBytes"]), "Recovered file identity does not match.")
        with private_file(destination / MANIFEST) as stream:
            stream.write(manifest_bytes); stream.flush(); os.fsync(stream.fileno())
    validate_checkpoint(destination / "checkpoint", options.checkpoint_report_sha256, options.max_bytes, deadline)
    for parent, _directories, _files in os.walk(destination, topdown=False): sync_directory(parent)


def pull(options, output, work, tools, deadline):
    receipt = read_json(physical(options.receipt, private=True), options.receipt_sha256, deadline)
    require(type(receipt.get("schemaVersion")) is int and receipt["schemaVersion"] == 1
            and receipt.get("status") == "ENCRYPTED_UPLOAD_AND_READBACK_VERIFIED")
    require(receipt.get("checkpointReportSha256") == sha256(options.checkpoint_report_sha256))
    require(re.fullmatch(r"[0-9]{8}T[0-9]{6}Z-[a-f0-9]{32}", receipt.get("releaseId", "")))
    require(receipt.get("objectName") == "release-" + receipt["releaseId"] + ".tar.age")
    for key in ("cipherSha256", "tarSha256", "manifestSha256"): sha256(receipt.get(key))
    tar_limit = options.max_bytes + (options.max_files + 4) * 2048 + METADATA_LIMIT
    cipher_size = positive(receipt.get("cipherSizeBytes"), tar_limit + ENCRYPTION_OVERHEAD)
    tar_size = positive(receipt.get("tarSizeBytes"), tar_limit)
    identity = physical(options.identity_file, private=True)
    cipher = output / receipt["objectName"]
    fetch(tools, remote_path(options.remote) + "/" + receipt["objectName"], cipher, receipt["cipherSha256"], cipher_size)
    tar_path = work / "release.tar"
    with private_file(tar_path) as stream:
        _, _, digest, size = tools.run([tools.age, "--decrypt", "--identity", identity, cipher], "Decryption", output=stream, maximum=tar_size)
        stream.flush(); os.fsync(stream.fileno())
    require((digest, size) == (receipt["tarSha256"], tar_size), "Decrypted archive identity does not match.")
    recovered = work / "recovered"
    unpack(tar_path, recovered, receipt, options, deadline)
    os.rename(recovered, output / "recovered")
    shutil.rmtree(work)
    publish_receipt(output / "pull-receipt.json", {"schemaVersion": 1, "status": "DOWNLOADED_DECRYPTED_FILES_VERIFIED",
                    "uploadReceiptSha256": options.receipt_sha256, "checkpointReportSha256": options.checkpoint_report_sha256,
                    "cipherSha256": receipt["cipherSha256"], "releaseId": receipt["releaseId"],
                    "scope": "Transfer/file integrity only; retrieved database archive still requires isolated restore verification"})


class Parser(argparse.ArgumentParser):
    def error(self, _message):
        raise BackupError("Invalid arguments; consult --help.")


def main(argv=None):
    parser = Parser(description=__doc__)
    actions = parser.add_subparsers(dest="action", required=True)
    for name in ("push", "pull"):
        command = actions.add_parser(name)
        for option in ("age", "rclone", "rclone-config", "remote", "output", "checkpoint-report-sha256"):
            command.add_argument("--" + option, required=True)
        command.add_argument("--max-bytes", type=int, default=2 * 1024 * MIB)
        command.add_argument("--max-files", type=int, default=10000)
        command.add_argument("--timeout-seconds", type=int, default=900)
    actions.choices["push"].add_argument("--checkpoint", required=True)
    actions.choices["push"].add_argument("--source", action="append", required=True, metavar="LABEL=DIRECTORY")
    actions.choices["push"].add_argument("--recipient", action="append", required=True)
    for option in ("receipt", "receipt-sha256", "identity-file"):
        actions.choices["pull"].add_argument("--" + option, required=True)
    previous_signals = {}; previous_umask = None
    try:
        options = parser.parse_args(argv)
        require(os.name == "posix", "This tool requires a POSIX operator host.")
        positive(options.max_bytes, 8 * 1024 * MIB); positive(options.max_files, 10000); require(options.max_files >= 3)
        positive(options.timeout_seconds, 3600); sha256(options.checkpoint_report_sha256); remote_path(options.remote)
        previous_umask = os.umask(0o077)
        deadline = Deadline(options.timeout_seconds)
        def expired(_signal, _frame):
            raise BackupError("Release backup runtime budget exceeded.")
        for selected_signal in (signal.SIGALRM, signal.SIGTERM, signal.SIGHUP):
            previous_signals[selected_signal] = signal.signal(selected_signal, expired)
        signal.setitimer(signal.ITIMER_REAL, options.timeout_seconds)
        output = new_directory(options.output)
        work = output / ".work"; work.mkdir(mode=0o700)
        tools = Tools(options, work, deadline)
        (push if options.action == "push" else pull)(options, output, work, tools, deadline)
        return 0
    except (Exception, KeyboardInterrupt):
        print("Release backup incomplete. Client diagnostics withheld; retained outputs are unverified. Existing backups were not selected for deletion.", file=sys.stderr)
        return 1
    finally:
        if previous_signals:
            signal.setitimer(signal.ITIMER_REAL, 0)
            for selected_signal, handler in previous_signals.items(): signal.signal(selected_signal, handler)
        if previous_umask is not None:
            os.umask(previous_umask)


if __name__ == "__main__":
    sys.exit(main())
