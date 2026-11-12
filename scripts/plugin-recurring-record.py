"""Strict metadata-only receipt for one fresh online producer Pod.

The same codec runs in the uploader image and the operator's evidence collector.
It neither reads credential files nor contacts a service.
"""
from datetime import datetime, timezone
import hashlib
import importlib.util
from pathlib import Path
import re


def _load_upload():
    here = Path(__file__).resolve()
    choices = (here.with_name('plugin-backup-upload.py'),
               here.parents[1] / 'analyticsframework/scripts/plugin-backup-upload.py')
    selected = next((path for path in choices if path.is_file() and not path.is_symlink()), None)
    if selected is None:
        raise RuntimeError('The qualified upload receipt codec is required.')
    spec = importlib.util.spec_from_file_location('openlap_recurring_upload', selected)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


upload = _load_upload()
backup = upload.backup
HEADER = b'OPENLAP-RECURRING-BACKUP-V1'
FOOTER = b'OPENLAP-RECURRING-BACKUP-END-V1'
LIMIT = 16384
SCOPE = 'Fresh instance capture and isolated replay, immutable object cut and encrypted upload/readback only; independent off-node recovery check required'
KEYS = {'schemaVersion', 'status', 'podUid', 'captureMode', 'checkpointReportSha256',
        'artifactIndexSha256', 'snapshotManifestSha256', 'archiveSha256', 'captureStartedAt',
        'captureCompletedAt', 'objectCount', 'totalObjectBytes', 'sourceReplicaSetIdentityMd5',
        'uploadReceiptSha256', 'uploadReceipt', 'recoveryVerified', 'scope'}
UUID = r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'


class RecordError(Exception):
    pass


def require(value):
    if not value:
        raise RecordError('Recurring backup record validation failed.')


def utc(value):
    require(isinstance(value, str) and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z', value))
    try:
        parsed = datetime.strptime(value, '%Y-%m-%dT%H:%M:%S.%fZ').replace(tzinfo=timezone.utc)
    except ValueError:
        raise RecordError('Recurring backup timestamp validation failed.') from None
    require(parsed.isoformat(timespec='milliseconds').replace('+00:00', 'Z') == value)
    return parsed


def validate_record(value):
    require(isinstance(value, dict) and set(value) == KEYS)
    require(type(value['schemaVersion']) is int and value['schemaVersion'] == 1
            and value['status'] == 'FRESH_ONLINE_RELEASE_UPLOADED'
            and value['captureMode'] == 'INSTANCE_WIDE_OPLOG'
            and value['recoveryVerified'] is False and value['scope'] == SCOPE)
    require(isinstance(value['podUid'], str) and re.fullmatch(UUID, value['podUid']))
    for name in ('checkpointReportSha256', 'artifactIndexSha256', 'snapshotManifestSha256',
                 'archiveSha256', 'uploadReceiptSha256'):
        require(isinstance(value[name], str) and re.fullmatch(r'[a-f0-9]{64}', value[name]))
    require(isinstance(value['sourceReplicaSetIdentityMd5'], str)
            and re.fullmatch(r'[a-f0-9]{32}', value['sourceReplicaSetIdentityMd5']))
    require(utc(value['captureStartedAt']) <= utc(value['captureCompletedAt']))
    require(type(value['objectCount']) is int and 0 <= value['objectCount'] <= 1000)
    require(type(value['totalObjectBytes']) is int and 0 <= value['totalObjectBytes'] <= 2147483648)
    require((value['objectCount'] == 0) == (value['totalObjectBytes'] == 0))
    try:
        receipt = upload.typed_receipt(value['uploadReceipt'], value['checkpointReportSha256'])
        require(hashlib.sha256(backup.json_bytes(receipt)).hexdigest() == value['uploadReceiptSha256'])
    except RecordError:
        raise
    except Exception:
        raise RecordError('Nested upload receipt validation failed.') from None
    return value


def record_sha256(value):
    return hashlib.sha256(backup.json_bytes(validate_record(value))).hexdigest()


def frame(value):
    validate_record(value)
    envelope = {'schemaVersion': 1, 'recordSha256': record_sha256(value), 'record': value}
    data = HEADER + b'\n' + backup.json_bytes(envelope) + FOOTER + b'\n'
    require(len(data) <= LIMIT)
    return data


def parse_frame(data):
    require(isinstance(data, bytes) and 0 < len(data) <= LIMIT)
    lines = data.splitlines()
    require(len(lines) == 3 and lines[0] == HEADER and lines[2] == FOOTER)
    try:
        envelope = backup.parse_json(lines[1])
        require(isinstance(envelope, dict) and set(envelope) == {'schemaVersion', 'recordSha256', 'record'})
        require(type(envelope['schemaVersion']) is int and envelope['schemaVersion'] == 1)
        record = validate_record(envelope['record'])
        require(envelope['recordSha256'] == record_sha256(record) and data == frame(record))
        return record
    except RecordError:
        raise
    except Exception:
        raise RecordError('Recurring backup frame validation failed.') from None
