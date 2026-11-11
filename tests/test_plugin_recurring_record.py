import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('recurring_record', ROOT / 'scripts/plugin-recurring-record.py')
RECORD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RECORD)


def fixture_record():
    receipt = {'schemaVersion': 1, 'status': 'ENCRYPTED_UPLOAD_AND_READBACK_VERIFIED',
               'releaseId': '20261111T120000Z-' + '1' * 32,
               'objectName': 'release-20261111T120000Z-' + '1' * 32 + '.tar.age',
               'cipherSha256': '2' * 64, 'cipherSizeBytes': 640,
               'tarSha256': '3' * 64, 'tarSizeBytes': 512, 'manifestSha256': '4' * 64,
               'checkpointReportSha256': '5' * 64, 'scope': RECORD.upload.SCOPE}
    return {'schemaVersion': 1, 'status': 'FRESH_ONLINE_RELEASE_UPLOADED',
            'podUid': '12345678-1234-1234-1234-123456789abc', 'captureMode': 'INSTANCE_WIDE_OPLOG',
            'checkpointReportSha256': '5' * 64, 'artifactIndexSha256': '6' * 64,
            'snapshotManifestSha256': '7' * 64, 'archiveSha256': '8' * 64,
            'captureStartedAt': '2026-11-11T12:00:00.000Z', 'captureCompletedAt': '2026-11-11T12:00:10.123Z',
            'objectCount': 0, 'totalObjectBytes': 0, 'sourceReplicaSetIdentityMd5': '9' * 32,
            'uploadReceiptSha256': hashlib.sha256(RECORD.backup.json_bytes(receipt)).hexdigest(),
            'uploadReceipt': receipt, 'recoveryVerified': False, 'scope': RECORD.SCOPE}


class RecordTests(unittest.TestCase):
    def test_canonical_roundtrip_preserves_exact_record_and_hash(self):
        record = fixture_record()
        self.assertIs(RECORD.validate_record(record), record)
        framed = RECORD.frame(record)
        self.assertEqual(RECORD.parse_frame(framed), record)
        self.assertTrue(framed.endswith(b'\n'))
        self.assertEqual(len(framed.splitlines()), 3)
        envelope = json.loads(framed.splitlines()[1])
        self.assertEqual(envelope['recordSha256'], hashlib.sha256(RECORD.backup.json_bytes(record)).hexdigest())

    def test_hashes_scope_modes_custody_and_counts_fail_closed(self):
        mutations = [('schemaVersion', True), ('status', 'OLDER_RELEASE_UPLOADED'), ('captureMode', 'FROZEN'),
                     ('podUid', '../other'), ('podUid', '12345678-1234-1234-1234-123456789ABC'),
                     ('checkpointReportSha256', 'x' * 64), ('sourceReplicaSetIdentityMd5', '9' * 64),
                     ('recoveryVerified', True), ('scope', 'everything backed up'),
                     ('objectCount', True), ('objectCount', -1), ('objectCount', 1001),
                     ('totalObjectBytes', True), ('totalObjectBytes', 2147483649),
                     ('totalObjectBytes', 1), ('uploadReceiptSha256', '0' * 64)]
        for key, value in mutations:
            record = fixture_record(); record[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(RECORD.RecordError):
                RECORD.validate_record(record)
        record = fixture_record(); record['objectCount'] = 3; record['totalObjectBytes'] = 300
        self.assertEqual(RECORD.parse_frame(RECORD.frame(record)), record)

    def test_unknown_missing_nested_or_duplicate_fields_rejected(self):
        for record in [dict(fixture_record(), unknown='no'), {k: v for k, v in fixture_record().items() if k != 'scope'}]:
            with self.assertRaises(RECORD.RecordError): RECORD.validate_record(record)
        record = fixture_record(); record['uploadReceipt']['unknown'] = 'no'
        record['uploadReceiptSha256'] = hashlib.sha256(RECORD.backup.json_bytes(record['uploadReceipt'])).hexdigest()
        with self.assertRaises(RECORD.RecordError): RECORD.frame(record)
        framed = RECORD.frame(fixture_record())
        duplicated = framed.replace(b'"schemaVersion":1', b'"schemaVersion":1,"schemaVersion":1', 1)
        with self.assertRaises(RECORD.RecordError): RECORD.parse_frame(duplicated)

    def test_only_fixed_millisecond_ordered_real_utc_times(self):
        for value in ['2026-02-30T12:00:00.000Z', '2026-11-11T12:00:00Z',
                      '2026-11-11T12:00:00.000000Z', '2026-11-11T12:00:00.000+00:00',
                      '2026-11-12T12:00:00.000Z']:
            record = fixture_record(); record['captureStartedAt'] = value
            with self.subTest(value=value), self.assertRaises(RECORD.RecordError): RECORD.frame(record)

    def test_complete_exact_three_line_frame_only(self):
        framed = RECORD.frame(fixture_record())
        for data in [framed[:-1], framed + b'\n', b'raw diagnostics\n' + framed,
                     framed.replace(b'\n', b'\r\n'), framed[:50], b'x' * 16385,
                     framed.replace(b'"objectCount":0', b'"objectCount":NaN'),
                     framed.replace(b'"schemaVersion":1', b'"schemaVersion":1.0', 1)]:
            with self.subTest(size=len(data)), self.assertRaises(RECORD.RecordError): RECORD.parse_frame(data)

    def test_nested_receipt_hash_and_checkpoint_binding_are_required(self):
        record = fixture_record(); record['uploadReceipt']['checkpointReportSha256'] = 'a' * 64
        record['uploadReceiptSha256'] = hashlib.sha256(RECORD.backup.json_bytes(record['uploadReceipt'])).hexdigest()
        with self.assertRaises(RECORD.RecordError): RECORD.validate_record(record)


if __name__ == '__main__':
    unittest.main()
