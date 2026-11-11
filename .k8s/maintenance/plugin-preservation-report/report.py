#!/usr/bin/env python3
"""Validate completed preservation manifest metadata without opening backup content."""
import argparse
from contextlib import contextmanager
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys

MAX_MANIFEST = 1024 * 1024
MAX_OUTPUT = 64 * 1024
MAX_TOTAL = 1800 * 1024 * 1024
HEADER = "OPENLAP-PRESERVATION-METADATA-V1"
FOOTER = "OPENLAP-PRESERVATION-METADATA-END-V1"
COVERAGE = "not assessed; verify every catalog reference before migration"
CONSISTENCY = "online preparation; write-paused checkpoint and restore rehearsal still required"
SCOPE = "Stored manifest metadata only; backup bytes, catalog coverage, consistency and restore were not verified by this reader."


class ReportError(Exception):
    pass


def require(condition):
    if not condition:
        raise ReportError("Preservation metadata validation failed.")


def fields(value, names):
    require(isinstance(value, dict) and set(value) == set(names.split()))
    return value


def text(value, maximum=4096):
    require(isinstance(value, str) and 0 < len(value.encode("utf-8")) <= maximum
            and not any(ord(c) < 32 or ord(c) == 127 for c in value))
    return value


def identifier(value):
    require(re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?", text(value, 253)) is not None)
    return value


def checkpoint_id(value):
    require(isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,80}", value) is not None)
    return value


def integer(value, maximum, minimum=0):
    require(type(value) is int and minimum <= value <= maximum)
    return value


def sha256(value):
    require(isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value) is not None)
    return value


def absolute(value):
    path = PurePosixPath(text(value))
    require(path.is_absolute() and str(path) == value and not value.startswith("//")
            and ".." not in path.parts and "\\" not in value)
    return value


def relative_jar(value):
    path = PurePosixPath(text(value))
    require(not path.is_absolute() and str(path) == value and path.parts and ".." not in path.parts
            and "\\" not in value and value.lower().endswith(".jar"))
    return value


def compatibility(value):
    fields(value, "schemaVersion clientVersion serverVersion supportedMinorSkew")
    require(type(value["schemaVersion"]) is int and value["schemaVersion"] == 1 and value["supportedMinorSkew"] is True)
    versions = []
    for key in ["clientVersion", "serverVersion"]:
        match = re.fullmatch(r"v([1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,5})"
            r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?", text(value[key], 128))
        require(match is not None); versions.append(tuple(map(int, match.group(1, 2))))
    require(versions[0][0] == versions[1][0] and abs(versions[0][1] - versions[1][1]) <= 1)


def pod_identity(value):
    fields(value, "name container uid node image restarts")
    identifier(value["name"]); identifier(value["container"]); identifier(value["node"])
    require(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", text(value["uid"], 128)) is not None)
    require(re.fullmatch(r"(?:[a-z0-9-]+://)?(?:[a-z0-9][A-Za-z0-9._:/-]*@)?sha256:[a-f0-9]{64}", text(value["image"], 1024)) is not None)
    integer(value["restarts"], 2147483647)


def validate(report, filename, checkpoint):
    fields(report, "namespace capturedAt kubernetesCompatibility pods files sourceInventories catalogCoverage consistency databaseBackup status")
    identifier(report["namespace"])
    stamp = text(report["capturedAt"], 40)
    require(re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?\+00:00", stamp) is not None)
    require(datetime.fromisoformat(stamp).utcoffset().total_seconds() == 0)
    compatibility(report["kubernetesCompatibility"])
    require(report["catalogCoverage"] == COVERAGE and report["consistency"] == CONSISTENCY)
    pods = report["pods"]; sources = report["sourceInventories"]; copies = report["files"]
    require(isinstance(pods, list) and 2 <= len(pods) <= 33)
    for pod in pods: pod_identity(pod)
    names = [pod["name"] for pod in pods]
    require(len(set(names)) == len(names) and len({pod["uid"] for pod in pods}) == len(pods))
    require(len({pod["image"][-71:] for pod in pods[:-1]}) == 1)
    require(isinstance(sources, list) and len(sources) == len(pods) - 1)
    roots = {}; counts = {}
    for pod, source in zip(pods[:-1], sources):
        fields(source, "pod root jarCount")
        require(source["pod"] == pod["name"])
        absolute(source["root"]); require(source["root"] != "/")
        roots[source["pod"]] = source["root"]
        counts[source["pod"]] = integer(source["jarCount"], 10000)
    require(len(set(roots.values())) == 1)
    require(isinstance(copies, list) and len(copies) <= 10000)
    seen = set(); actual = dict.fromkeys(roots, 0); total = 0
    for copy in copies:
        fields(copy, "pod recordedPath sourcePath sha256 sizeBytes")
        pod = identifier(copy["pod"]); require(pod in roots)
        recorded = absolute(copy["recordedPath"]); prefix = roots[pod] + "/"
        require(recorded.startswith(prefix))
        relative = relative_jar(recorded[len(prefix):])
        require(absolute(copy["sourcePath"]) == str(checkpoint / "replicas" / pod / relative))
        require(copy["sourcePath"] not in seen); seen.add(copy["sourcePath"])
        sha256(copy["sha256"]); total += integer(copy["sizeBytes"], 256 * 1024 * 1024, 1)
        actual[pod] += 1
    require(actual == counts)
    database = fields(report["databaseBackup"], "path sha256 sizeBytes")
    require(absolute(database["path"]) == str(checkpoint / "database.archive.gz"))
    sha256(database["sha256"]); total += integer(database["sizeBytes"], MAX_TOTAL, 1)
    require(total <= MAX_TOTAL)
    empty = sum(count == 0 for count in counts.values())
    require((filename, report["status"]) == (("capture-review.json", "SOURCE_REVIEW_REQUIRED") if empty else ("preservation.json", "CAPTURED")))
    return {"schemaVersion": 1, "status": "PRESERVATION_MANIFEST_METADATA_VALIDATED",
        "captureStatus": report["status"], "capturedAt": stamp, "namespace": report["namespace"],
        "kubernetesCompatibility": report["kubernetesCompatibility"], "pods": pods, "sourceInventories": sources,
        "backendReplicaCount": len(sources), "jarCopyCount": len(copies), "emptySourceRootCount": empty,
        "files": copies, "databaseBackup": {"sha256": database["sha256"], "sizeBytes": database["sizeBytes"]},
        "backupBytesVerified": False, "catalogCoverageVerified": False,
        "consistencyVerified": False, "restoreVerified": False,
        "scope": SCOPE}


def private(metadata, directory=False):
    require(metadata.st_uid == os.getuid()
            and stat.S_IMODE(metadata.st_mode) in ((0o500, 0o700) if directory else (0o400, 0o600)))
    require(stat.S_ISDIR(metadata.st_mode) if directory else stat.S_ISREG(metadata.st_mode))
    required = 0o500 if directory else 0o400
    require(metadata.st_mode & required == required and (directory or metadata.st_nlink == 1))


def token(metadata):
    return (metadata.st_dev, metadata.st_ino, metadata.st_mode, metadata.st_uid, metadata.st_nlink,
            metadata.st_size, metadata.st_mtime_ns, metadata.st_ctime_ns)


@contextmanager
def open_root(path):
    path = Path(absolute(str(path)))
    descriptor = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in path.parts[1:]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
            os.close(descriptor); descriptor = child
        yield path, descriptor
    finally:
        os.close(descriptor)


def selected_name(directory):
    present = []
    for name in ["preservation.json", "capture-review.json", "preservation.json.partial", "capture-review.json.partial"]:
        try: os.stat(name, dir_fd=directory, follow_symlinks=False)
        except FileNotFoundError: continue
        present.append(name)
    require(len(present) == 1 and present[0] in ["preservation.json", "capture-review.json"])
    return present[0]


def parse(data):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result); result[key] = value
        return result
    def invalid(_value):
        raise ReportError("Preservation metadata validation failed.")
    return json.loads(data.decode("utf-8"), object_pairs_hook=unique, parse_constant=invalid)


def read_report(backup_root, checkpoint):
    checkpoint_id(checkpoint)
    with open_root(backup_root) as (root, parent):
        directory = os.open(checkpoint, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
        try:
            directory_before = os.fstat(directory); private(directory_before, directory=True)
            name = selected_name(directory)
            descriptor = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
            with os.fdopen(descriptor, "rb") as source:
                before = os.fstat(source.fileno()); private(before)
                require(0 < before.st_size <= MAX_MANIFEST)
                data = source.read(MAX_MANIFEST + 1)
                require(len(data) == before.st_size and token(os.fstat(source.fileno())) == token(before))
            require(selected_name(directory) == name
                    and token(os.stat(name, dir_fd=directory, follow_symlinks=False)) == token(before))
            result = validate(parse(data), name, root / checkpoint)
            require(token(os.fstat(directory)) == token(directory_before)
                    and token(os.stat(checkpoint, dir_fd=parent, follow_symlinks=False)) == token(directory_before))
            with open_root(root) as (_, current):
                require((os.fstat(current).st_dev, os.fstat(current).st_ino)
                        == (os.fstat(parent).st_dev, os.fstat(parent).st_ino))
            result.update(checkpointId=checkpoint, manifestFile=name, manifestSha256=hashlib.sha256(data).hexdigest(), manifestSizeBytes=len(data))
            return result
        finally:
            os.close(directory)


def output(summary):
    payload = json.dumps(summary, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    framed = HEADER + "\n" + payload + "\n" + FOOTER + "\n"
    require(len(framed.encode("ascii")) <= MAX_OUTPUT)
    require(sys.stdout.write(framed) == len(framed)); sys.stdout.flush()


class Arguments(argparse.ArgumentParser):
    def error(self, _message):
        raise ReportError("Invalid preservation metadata arguments.")


def main():
    try:
        parser = Arguments(description=__doc__)
        parser.add_argument("--backup-root", type=Path, required=True)
        parser.add_argument("--checkpoint-id", default=os.environ.get("CHECKPOINT_ID"))
        options = parser.parse_args()
        output(read_report(options.backup_root, options.checkpoint_id))
        return 0
    except (Exception, KeyboardInterrupt):
        try:
            print("Preservation metadata verification or output failed. Treat this run as incomplete.", file=sys.stderr, flush=True)
        except OSError:
            pass
        return 1


if __name__ == "__main__":
    sys.exit(main())
