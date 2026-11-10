#!/usr/bin/env python3
"""Push-only runtime and strict local import of its bounded operational receipt report."""
import argparse
from contextlib import redirect_stderr
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import re
import signal
import sys

spec = importlib.util.spec_from_file_location("release_backup", Path(__file__).with_name("plugin-release-backup.py"))
backup = importlib.util.module_from_spec(spec); spec.loader.exec_module(backup)
HEADER = b"OPENLAP-UPLOAD-RECEIPT-V1"
FOOTER = b"OPENLAP-UPLOAD-RECEIPT-END-V1"
REPORT_LIMIT = 4096
SCOPE = "Encrypted transport integrity only; no catalog coverage, database restore, freeze or availability verified"
KEYS = {"schemaVersion", "status", "releaseId", "objectName", "cipherSha256", "cipherSizeBytes",
        "tarSha256", "tarSizeBytes", "manifestSha256", "checkpointReportSha256", "scope"}
AGE = Path("/opt/plugin-backup/bin/age")
RCLONE = Path("/opt/plugin-backup/bin/rclone")
CHECKPOINT_ROOT = Path("/checkpoint")
SOURCE_ROOT = Path("/sources")
OUTPUT_ROOT = Path("/outputs")


def typed_receipt(receipt, report_sha):
    backup.require(isinstance(receipt, dict) and set(receipt) == KEYS)
    backup.require(type(receipt["schemaVersion"]) is int and receipt["schemaVersion"] == 1
                   and receipt["status"] == "ENCRYPTED_UPLOAD_AND_READBACK_VERIFIED" and receipt["scope"] == SCOPE)
    backup.require(isinstance(receipt["releaseId"], str)
                   and re.fullmatch(r"[0-9]{8}T[0-9]{6}Z-[a-f0-9]{32}", receipt["releaseId"]))
    backup.require(receipt["objectName"] == "release-" + receipt["releaseId"] + ".tar.age")
    for key in ("cipherSha256", "tarSha256", "manifestSha256", "checkpointReportSha256"): backup.sha256(receipt[key])
    backup.require(receipt["checkpointReportSha256"] == backup.sha256(report_sha))
    maximum = 8 * 1024 * backup.MIB + (10000 + 4) * 2048 + backup.METADATA_LIMIT
    size = backup.positive(receipt["tarSizeBytes"], maximum)
    cipher_size = backup.positive(receipt["cipherSizeBytes"], maximum + backup.ENCRYPTION_OVERHEAD)
    backup.require(size % 512 == 0 and size < cipher_size <= size + backup.ENCRYPTION_OVERHEAD)
    return receipt


def frame(receipt, report_sha):
    typed_receipt(receipt, report_sha)
    envelope = {"schemaVersion": 1, "receiptSha256": hashlib.sha256(backup.json_bytes(receipt)).hexdigest(), "receipt": receipt}
    data = HEADER + b"\n" + backup.json_bytes(envelope) + FOOTER + b"\n"
    backup.require(len(data) <= REPORT_LIMIT)
    return data


def parse_report(data, report_sha):
    backup.require(0 < len(data) <= REPORT_LIMIT)
    lines = data.splitlines()
    backup.require(len(lines) == 3 and lines[0] == HEADER and lines[2] == FOOTER)
    envelope = backup.parse_json(lines[1])
    backup.require(set(envelope) == {"schemaVersion", "receiptSha256", "receipt"}
                   and type(envelope["schemaVersion"]) is int and envelope["schemaVersion"] == 1)
    receipt = typed_receipt(envelope["receipt"], report_sha)
    digest = hashlib.sha256(backup.json_bytes(receipt)).hexdigest()
    backup.require(backup.sha256(envelope["receiptSha256"]) == digest and data == frame(receipt, report_sha))
    return receipt


def beneath(value, root, directory=True):
    path = backup.physical(value, directory=directory)
    backup.require(path == root or root in path.parents)
    return path


def upload(options):
    checkpoint = beneath(options.checkpoint, CHECKPOINT_ROOT)
    backup.require(options.source and options.recipient and options.remote)
    for source in options.source:
        _label, separator, path = source.partition("=")
        backup.require(separator); beneath(path, SOURCE_ROOT)
    output = Path(options.output)
    backup.require(output != OUTPUT_ROOT and OUTPUT_ROOT in output.parents)
    beneath(output.parent, OUTPUT_ROOT)
    config = backup.physical(os.environ["PLUGIN_BACKUP_STAGED_CONFIG"], private=True)
    arguments = ["push", "--age", str(AGE), "--rclone", str(RCLONE), "--rclone-config", str(config),
                 "--remote", options.remote, "--checkpoint", str(checkpoint), "--output", str(output),
                 "--checkpoint-report-sha256", options.checkpoint_report_sha256,
                 "--max-bytes", str(options.max_bytes), "--max-files", str(options.max_files),
                 "--timeout-seconds", str(options.timeout_seconds)]
    for source in options.source: arguments += ["--source", source]
    for recipient in options.recipient: arguments += ["--recipient", recipient]
    # The reviewed core CLI suppresses client diagnostics. Do not forward even its fixed errors.
    with redirect_stderr(io.StringIO()): backup.require(backup.main(arguments) == 0)
    with backup.read_file(output / "receipt.json") as stream: original = stream.read(REPORT_LIMIT + 1)
    backup.require(len(original) <= REPORT_LIMIT)
    receipt = typed_receipt(backup.parse_json(original), options.checkpoint_report_sha256)
    backup.require(original == backup.json_bytes(receipt))
    data = frame(receipt, options.checkpoint_report_sha256).decode("ascii")
    # A complete-looking frame is insufficient if this write/flush or the Job later fails.
    backup.require(sys.stdout.write(data) == len(data))
    sys.stdout.flush()


def import_report(options):
    source = backup.physical(options.import_report, private=True)
    with backup.read_file(source) as stream: data = stream.read(REPORT_LIMIT + 1)
    receipt = parse_report(data, options.checkpoint_report_sha256)
    output = Path(options.output); parent = backup.physical(output.parent, directory=True, private=True)
    backup.require(not any((p / ".git").exists() for p in (parent, *parent.parents)))
    backup.publish_receipt(output, receipt)


def main(argv=None):
    parser = backup.Parser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--upload-report", action="store_true")
    action.add_argument("--import-report")
    parser.add_argument("--checkpoint-report-sha256", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--checkpoint")
    parser.add_argument("--source", action="append")
    parser.add_argument("--recipient", action="append")
    parser.add_argument("--remote")
    parser.add_argument("--max-bytes", type=int, default=2 * 1024 * backup.MIB)
    parser.add_argument("--max-files", type=int, default=10000)
    parser.add_argument("--timeout-seconds", type=int, default=900)
    handlers = {}
    try:
        options = parser.parse_args(argv); backup.sha256(options.checkpoint_report_sha256)
        def interrupted(_signal, _frame): raise backup.BackupError("Upload interrupted.")
        for selected in (signal.SIGTERM, signal.SIGHUP): handlers[selected] = signal.signal(selected, interrupted)
        if options.upload_report: upload(options)
        else:
            backup.require(not any((options.checkpoint, options.source, options.recipient, options.remote)))
            import_report(options)
        return 0
    except (Exception, KeyboardInterrupt):
        print("Backup upload/report incomplete; client diagnostics withheld. Verify terminal Job success and the complete typed report before accepting it.", file=sys.stderr)
        return 1
    finally:
        for selected, handler in handlers.items(): signal.signal(selected, handler)


if __name__ == "__main__": sys.exit(main())
