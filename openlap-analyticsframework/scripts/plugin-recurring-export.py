#!/usr/bin/env python3
"""Prepare the supported online immutable export from this Pod's replayed index."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys


def require(value):
    if not value: raise ValueError("Recurring export validation failed.")


def private(path, directory=False):
    path = Path(path); require(path.is_absolute() and path.resolve() == path)
    info = path.lstat()
    require((stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode))
            and info.st_uid == 1000 and stat.S_IMODE(info.st_mode) in ((0o700, 0o2700) if directory else (0o600,))
            and (directory or info.st_nlink == 1))
    return path


def read(path, maximum):
    path = private(path); require(path.stat().st_size <= maximum)
    with path.open("rb") as stream: body = stream.read(maximum + 1)
    require(len(body) <= maximum); return body


def readonly(path):
    selected = ""; options = ""
    for line in Path("/proc/self/mountinfo").read_text().splitlines():
        fields = line.split(); require(len(fields) >= 6)
        point = fields[4]
        if str(path) == point or str(path).startswith(point.rstrip("/") + "/"):
            if len(point) > len(selected): selected, options = point, fields[5]
    require("ro" in options.split(","))


def guard():
    require(os.getuid() == os.getgid() == 1000 and sys.platform.startswith("linux"))
    uid = os.environ.get("BACKUP_POD_UID", "")
    require(re.fullmatch(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", uid))
    require(os.environ.get("BACKUP_DESTINATION_APPROVED") == "true" and os.environ.get("PLUGIN_DELETION_ENABLED") == "false")
    until = os.environ.get("BACKUP_DESTINATION_VALID_UNTIL", "")
    require(re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z", until))
    expiry = datetime.fromisoformat(until.replace("Z", "+00:00"))
    minimum = os.environ.get("BACKUP_MINIMUM_DESTINATION_VALIDITY_SECONDS", "604800")
    require(re.fullmatch(r"[1-9][0-9]{0,7}", minimum) and int(minimum) <= 31536000)
    require((expiry - datetime.now(timezone.utc)).total_seconds() > int(minimum))
    return uid


def budget(name, default, maximum, minimum=1):
    value = os.environ.get(name, str(default))
    require(re.fullmatch(r"[1-9][0-9]{0,11}", value) and minimum <= int(value) <= maximum)
    return int(value)


def main(argv=None):
    previous = os.umask(0o077)
    try:
        arguments = sys.argv[1:] if argv is None else argv
        require(arguments in (["--export-recurring-online"], ["--export-recurring-frozen"]))
        online = arguments == ["--export-recurring-online"]
        uid = guard()
        for root in ("/control", "/inputs", "/outputs"): private(root, directory=True)
        readonly("/control"); readonly("/inputs")
        require(read("/control/pod-uid", 80) == (uid + "\n").encode())
        require(read("/control/capture-mode", 16) == (("ONLINE" if online else "FROZEN") + "\n").encode())
        report_hash = read("/control/checkpoint.sha256", 80).decode().strip(); require(re.fullmatch(r"[a-f0-9]{64}", report_hash))
        report_body = read("/control/checkpoint-report.json", 262144)
        require(hashlib.sha256(report_body).hexdigest() == report_hash)
        report = json.loads(report_body)
        index_path = Path("/inputs") / ("index-" + uid) / "artifact-index.json"
        body = read(index_path, 1024 * 1024); index_hash = hashlib.sha256(body).hexdigest()
        index = json.loads(body)
        require(index.get("status") == "CHECKPOINT_PLUGIN_ARTIFACT_INDEX_VERIFIED" and index.get("readyForS3Export") is True
                and index.get("associationsResolved") is True and index.get("binding", {}).get("originalCheckpointReportSha256") == report_hash)
        maximum = budget("BACKUP_MAX_BYTES", 256 * 1024 * 1024, 8 * 1024 * 1024 * 1024)
        files = budget("BACKUP_MAX_FILES", 2048, 10000, minimum=5)
        archive_size = report.get("archiveSizeBytes")
        require(type(archive_size) is int and 0 < archive_size <= 1024 * 1024 * 1024)
        # Reserve the complete bounded manifest before selecting the source cut.
        # The core exporter checks count/total before downloading any object body.
        bodies_budget = maximum - archive_size - len(report_body) - len(body) - 1024 * 1024
        require(bodies_budget > 0)
        environment = dict(os.environ)
        environment["PLUGIN_SNAPSHOT_MAX_TOTAL_BYTES"] = str(min(2 * 1024 * 1024 * 1024, bodies_budget))
        environment["PLUGIN_SNAPSHOT_MAX_OBJECTS"] = str(min(1000, files - 5))
        result = subprocess.run(["/usr/local/bin/openlap-object-snapshot", "--export-online" if online else "--export", str(index_path), index_hash,
                                 report_hash, "/outputs/objects-" + uid], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=1200, env=environment)
        require(result.returncode == 0 and len(result.stdout) <= 16384 and len(result.stderr) <= 16384)
        summary = json.loads(result.stdout)
        require(summary.get("status") == "PLUGIN_OBJECT_SNAPSHOT_EXPORTED" and summary.get("artifactIndexSha256") == index_hash
                and summary.get("recoveryVerified") is False)
        manifest = read(Path("/outputs") / ("objects-" + uid) / "snapshot.json", 1024 * 1024)
        require(hashlib.sha256(manifest).hexdigest() == summary.get("manifestSha256"))
        # Forward only the validated native bounded hash/count result.
        print(json.dumps(summary, sort_keys=True, separators=(",", ":")))
        return 0
    except (Exception, KeyboardInterrupt):
        print("Recurring export incomplete; private client diagnostics withheld.", file=sys.stderr)
        return 1
    finally:
        os.umask(previous)


if __name__ == "__main__": sys.exit(main())
