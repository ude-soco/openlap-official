#!/usr/bin/env python3
"""Upload this Pod's fresh replayed checkpoint/object cut and emit its bound record."""
import argparse
from contextlib import redirect_stdout, redirect_stderr
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import sys

HERE = Path(__file__).resolve().parent


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value


def number(name, default, maximum, minimum=1):
    value = os.environ.get(name, str(default))
    if not re.fullmatch(r"[1-9][0-9]{0,11}", value) or not minimum <= int(value) <= maximum:
        raise ValueError("Recurring backup budget is invalid.")
    return int(value)


def snapshot_files(root, manifest, index, report_hash, index_hash, archive_hash, backup, deadline, online=True):
    expected = {"schemaVersion", "format", "artifactIndexSha256", "originalCheckpointReportSha256", "archiveSha256", "objects", "objectCount", "totalBytes",
                "databaseAssociationScope", "recoveryVerified"}
    if online: expected |= {"objectSelectionPolicy", "physicalDeletionDisabled"}
    backup.require(set(manifest) == expected and type(manifest["schemaVersion"]) is int and manifest["schemaVersion"] == (2 if online else 1)
                   and manifest["format"] == ("OPENLAP_PLUGIN_OBJECT_SNAPSHOT_IMMUTABLE_CUT_V1" if online else "OPENLAP_PLUGIN_OBJECT_SNAPSHOT_V1")
                   and manifest["artifactIndexSha256"] == index_hash and manifest["originalCheckpointReportSha256"] == report_hash
                   and manifest["archiveSha256"] == archive_hash and manifest["databaseAssociationScope"] == "verified-index-only" and manifest["recoveryVerified"] is False)
    if online:
        backup.require(manifest["objectSelectionPolicy"] == "IMMUTABLE_KEYS_AT_EXPORT_CUT" and manifest["physicalDeletionDisabled"] is True)
    rows = manifest["objects"]
    backup.require(isinstance(rows, list) and type(manifest["objectCount"]) is int and manifest["objectCount"] == len(rows) <= 1000)
    backup.require(type(manifest["totalBytes"]) is int and 0 <= manifest["totalBytes"] <= 2 * 1024 * 1024 * 1024)
    artifacts = index.get("artifacts")
    backup.require(isinstance(artifacts, list) and len(artifacts) <= 1000)
    registered = {row["objectKey"]: row for row in artifacts}
    backup.require(len(registered) == len(artifacts))
    expected_bodies = set(); objects = {}; previous = ""; total = 0
    for ordinal, row in enumerate(rows):
        backup.require(isinstance(row, dict) and set(row) == {"objectKey", "sha256", "sizeBytes", "contentType", "metadata", "bodyPath", "classification"})
        key = row["objectKey"]; digest = backup.sha256(row["sha256"])
        backup.require(isinstance(key, str) and re.fullmatch(r"plugins/(analytics|visualizations)/[a-f0-9]{64}\.jar", key)
                       and key > previous and key.endswith("/" + digest + ".jar"))
        size = backup.positive(row["sizeBytes"], 100 * 1024 * 1024)
        relative = "bodies/%04d.jar" % ordinal
        backup.require(row["bodyPath"] == relative and row["contentType"] == "application/java-archive" and row["metadata"] == {"sha256": digest}
                       and row["classification"] == ("REGISTERED" if key in registered else "SOURCE_ORPHAN"))
        path = root / relative
        metadata = path.lstat()
        backup.require(metadata.st_uid == os.getuid() and metadata.st_mode & 0o7777 == 0o600 and metadata.st_nlink == 1)
        backup.require(backup.digest_file(path, size, deadline)[:2] == (digest, size))
        objects[key] = size; total += size; expected_bodies.add(path.name); previous = key
    backup.require(total == manifest["totalBytes"] and {path.name for path in root.iterdir()} == {"artifact-index.json", "snapshot.json", "bodies"})
    bodies = backup.physical(root / "bodies", directory=True, private=True)
    backup.require({path.name for path in bodies.iterdir()} == expected_bodies)
    for key, artifact in registered.items():
        state = artifact.get("state")
        backup.require(state in ("READY", "STAGED", "PURGED") and (state != "READY" or key in objects) and (state != "PURGED" or key not in objects))
        if key in objects: backup.require(objects[key] == artifact.get("sizeBytes"))


def main(argv=None):
    previous = os.umask(0o077)
    try:
        arguments = sys.argv[1:] if argv is None else argv
        if arguments not in (["--upload-recurring-online"], ["--upload-recurring-frozen"]):
            raise ValueError("Configure the explicit recurring upload action.")
        online = arguments == ["--upload-recurring-online"]
        guard = module("recurring_stage_guard", "plugin-recurring-export.py")
        upload = module("recurring_native_upload", "plugin-backup-upload.py")
        codec = module("recurring_record_codec", "plugin-recurring-record.py") if online else None
        backup = upload.backup
        uid = guard.guard()
        for root in ("/control", "/checkpoint", "/indexes", "/sources", "/outputs"): guard.private(root, directory=True)
        for root in ("/control", "/checkpoint", "/indexes", "/sources"): guard.readonly(root)
        backup.require(guard.read("/control/pod-uid", 80) == (uid + "\n").encode())
        backup.require(guard.read("/control/capture-mode", 16) == (("ONLINE" if online else "FROZEN") + "\n").encode())
        report_hash = guard.read("/control/checkpoint.sha256", 80).decode().strip(); backup.sha256(report_hash)
        maximum = number("BACKUP_MAX_BYTES", 256 * 1024 * 1024, 8 * 1024 * 1024 * 1024)
        maximum_files = number("BACKUP_MAX_FILES", 2048, 10000, minimum=5)
        timeout = number("BACKUP_TIMEOUT_SECONDS", 600, 3600)
        deadline = backup.Deadline(timeout)
        checkpoint = Path("/checkpoint") / ("capture-" + uid)
        report = backup.validate_checkpoint(checkpoint, report_hash, maximum, deadline)
        backup.require(report["schemaVersion"] == (2 if online else 1))
        if online: backup.require(report["captureMode"] == "INSTANCE_WIDE_OPLOG")
        index_path = Path("/indexes") / ("index-" + uid) / "artifact-index.json"
        index_body = guard.read(index_path, 1024 * 1024); index_hash = hashlib.sha256(index_body).hexdigest(); index = backup.parse_json(index_body)
        backup.require(index.get("status") == "CHECKPOINT_PLUGIN_ARTIFACT_INDEX_VERIFIED" and index.get("readyForS3Export") is True
                       and index.get("associationsResolved") is True and index.get("binding", {}).get("originalCheckpointReportSha256") == report_hash
                       and index.get("binding", {}).get("archiveSha256") == report["archiveSha256"])
        objects = Path("/sources") / ("objects-" + uid); guard.private(objects, directory=True)
        backup.require(guard.read(objects / "artifact-index.json", 1024 * 1024) == index_body)
        snapshot_body = guard.read(objects / "snapshot.json", 1024 * 1024)
        snapshot_hash = hashlib.sha256(snapshot_body).hexdigest(); snapshot = backup.parse_json(snapshot_body)
        snapshot_files(objects, snapshot, index, report_hash, index_hash, report["archiveSha256"], backup, deadline, online=online)
        selection = argparse.Namespace(checkpoint=str(checkpoint), source=["objects=" + str(objects)], recipient=[os.environ.get("BACKUP_RECIPIENT", "")],
            remote=os.environ.get("BACKUP_REMOTE", ""), output="/outputs/upload-" + uid, checkpoint_report_sha256=report_hash,
            max_bytes=maximum, max_files=maximum_files, timeout_seconds=timeout)
        captured = io.StringIO()
        with redirect_stdout(captured), redirect_stderr(io.StringIO()): upload.upload(selection)
        receipt = upload.parse_report(captured.getvalue().encode(), report_hash)
        if not online:
            data = captured.getvalue()
            backup.require(sys.stdout.write(data) == len(data)); sys.stdout.flush()
            return 0
        record = {"schemaVersion": 1, "status": "FRESH_ONLINE_RELEASE_UPLOADED", "podUid": uid, "captureMode": "INSTANCE_WIDE_OPLOG",
            "checkpointReportSha256": report_hash, "artifactIndexSha256": index_hash, "snapshotManifestSha256": snapshot_hash,
            "archiveSha256": report["archiveSha256"], "captureStartedAt": report["captureStartedAt"], "captureCompletedAt": report["captureCompletedAt"],
            "objectCount": snapshot["objectCount"], "totalObjectBytes": snapshot["totalBytes"], "sourceReplicaSetIdentityMd5": report["sourceReplicaSet"]["identityMd5"],
            "uploadReceiptSha256": hashlib.sha256(backup.json_bytes(receipt)).hexdigest(), "uploadReceipt": receipt, "recoveryVerified": False,
            "scope": "Fresh instance capture and isolated replay, immutable object cut and encrypted upload/readback only; independent off-node recovery check required"}
        data = codec.frame(record)
        with backup.private_file(Path(selection.output) / "recurring-record.json") as stream:
            stream.write(backup.json_bytes(record)); stream.flush(); os.fsync(stream.fileno())
        backup.sync_directory(Path(selection.output))
        backup.require(sys.stdout.buffer.write(data) == len(data)); sys.stdout.flush()
        return 0
    except (Exception, KeyboardInterrupt):
        print("Recurring backup incomplete; no verified bound record was accepted. Private client diagnostics withheld.", file=sys.stderr)
        return 1
    finally:
        os.umask(previous)


if __name__ == "__main__": sys.exit(main())
