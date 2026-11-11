"""Fake Argo/clock fixtures only; no account, Docker or credential access."""
import contextlib
import copy
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock
import uuid

from test_plugin_recurring_record import fixture_record

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('collector', ROOT / 'scripts/collect-plugin-backup-evidence.py')
C = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(C)
NOW = datetime(2026, 11, 11, 12, 5, tzinfo=timezone.utc)
CRON_UID = '11111111-1111-1111-1111-111111111111'
JOB_UID = '22222222-2222-2222-2222-222222222222'


class FakeArgo:
    def __init__(self, options, _directory):
        self.options = options; self.calls = []; self.on_logs = None
        self.record = fixture_record(); self.body = C.record_codec.frame(self.record)
        self.cron = self.meta(options['cronjob'], CRON_UID, '2026-11-01T00:00:00Z')
        self.job = self.meta(options['cronjob'] + '-29908079', JOB_UID, '2026-11-11T11:59:59Z')
        self.pod = self.meta(self.job['name'] + '-abcde', self.record['podUid'], '2026-11-11T12:00:00Z')
        self.jobs = [dict(metadata=self.job, status=self.job_status())]
        self.pods = [dict(metadata=self.pod)]
        self.job_owner = self.owner('CronJob', self.cron)
        self.pod_owner = self.owner('Job', self.job)
        self.status = self.pod_status()
        self.sibling_status = {}; self.sibling_owner = {}
        self.image_override = None

    def meta(self, name, uid, created):
        return {'name': name, 'uid': uid, 'namespace': self.options['namespace'], 'creationTimestamp': created}

    @staticmethod
    def owner(kind, meta):
        return [{'apiVersion': 'batch/v1', 'kind': kind, 'name': meta['name'], 'uid': meta['uid'], 'controller': True}]

    @staticmethod
    def job_status():
        return {'succeeded': 1, 'startTime': '2026-11-11T11:59:59Z', 'completionTime': '2026-11-11T12:00:20Z',
                'conditions': [{'type': 'Complete', 'status': 'True'}]}

    def pod_status(self):
        rows = {}
        for role in C.ROLES:
            repository = self.options['images'][role].split('@')[0]
            rows[role] = {'name': role, 'restartCount': 0, 'imageID': 'docker-pullable://' + repository + '@' + self.options['accepted_runtime_image_ids'][role][0],
                          'state': {'terminated': {'exitCode': 0}}}
        return {'phase': 'Succeeded', 'initContainerStatuses': [rows[role] for role in C.ROLES[:3]],
                'containerStatuses': [rows['uploader']]}

    def resource(self, kind, fields, name=None):
        self.calls.append(('resource', kind, fields, name))
        if fields == C.META_FIELDS:
            if kind == 'CronJob': return [{'metadata': copy.deepcopy(self.cron)}]
            if kind == 'Job': return [{'metadata': copy.deepcopy(self.job)}]
            if kind == 'Pod' and name is None: return copy.deepcopy(self.pods)
            return [{'metadata': copy.deepcopy(self.pod)}]
        if kind == 'Job' and fields == C.META_FIELDS + ',status': return copy.deepcopy(self.jobs)
        if fields == 'metadata.ownerReferences':
            return [{'metadata': {'name': name, 'ownerReferences': copy.deepcopy(self.job_owner if kind == 'Job' else self.sibling_owner.get(name, self.pod_owner))}}]
        if fields == 'status':
            status = self.jobs[0]['status'] if kind == 'Job' else self.sibling_status.get(name, self.status)
            return [{'metadata': {'name': name}, 'status': copy.deepcopy(status)}]
        if fields in ('spec.initContainers.name', 'spec.initContainers.image', 'spec.containers.name', 'spec.containers.image'):
            array, key = fields.split('.')[1:]
            roles = C.ROLES[:3] if array == 'initContainers' else C.ROLES[3:]
            values = [{key: role if key == 'name' else self.options['images'][role]} for role in roles]
            if key == 'image' and self.image_override: values[0]['image'] = self.image_override
            return [{'metadata': {'name': name}, 'spec': {array: values}}]
        if fields == 'spec.nodeSelector':
            return [{'metadata': {'name': name}, 'spec': {'nodeSelector': {'kubernetes.io/os': 'linux', 'kubernetes.io/arch': 'amd64'}}}]
        if fields == 'spec.automountServiceAccountToken':
            return [{'metadata': {'name': name}, 'spec': {'automountServiceAccountToken': False}}]
        raise AssertionError('Unexpected fake Argo request')

    def logs(self, pod):
        self.calls.append(('logs', pod))
        if self.on_logs: self.on_logs()
        return self.body


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='openlap-collector-unit-'); self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve(); self.root.chmod(0o700)
        self.state = self.root / 'custody'; self.state.mkdir(mode=0o700)
        restore = self.root / 'restore'; restore.mkdir(mode=0o700)
        executable = self.root / 'argocd'; executable.write_text('#!/bin/sh\nexit 99\n'); executable.chmod(0o700)
        credential = self.root / 'native-argocd-config'; credential.write_text('SYNTHETIC_CREDENTIAL_BYTES_MUST_NOT_BE_OPENED'); credential.chmod(0o600)
        self.template = self.root / 'qualified-template.json'; self.active = self.root / 'managed-active.json'
        template = {key: '/synthetic-not-opened/' + key for key in C.recovery.REQUIRED}
        template.update({'remote': 'fixture:private-releases', 'receipt_sha256': 'a' * 64,
                         'checkpoint_report_sha256': 'b' * 64, 'artifact_index_sha256': 'c' * 64,
                         'snapshot_manifest_sha256': 'd' * 64, 'snapshot_label': 'objects',
                         'recovery_point_at': '2026-11-10T12:00:00.000Z', 'state_directory': str(restore),
                         'docker_host': 'unix:///synthetic-not-opened/docker.sock',
                         'checkpoint_image': 'ghcr.io/ude-soco/openlap-official-plugin-checkpoint@sha256:' + 'a' * 64,
                         'snapshot_image': 'ghcr.io/ude-soco/openlap-official-plugin-storage-versity@sha256:' + 'b' * 64})
        self.write(self.template, template)
        self.options = dict(C.DEFAULTS, argocd=str(executable), argocd_config=str(credential), argocd_context='fixture-context',
                            application='fixture-openlap', namespace='fixture-prod', cronjob='fixture-plugin-backup', expected_cronjob_uid=CRON_UID,
                            recovery_template=str(self.template), active_recovery_config=str(self.active), state_directory=str(self.state))
        self.options['images'] = {role: 'ghcr.io/ude-soco/openlap-official-plugin-' + ('checkpoint' if role in ('capture', 'index') else 'storage-versity' if role == 'export' else 'backup-upload') + '@sha256:' + '1' * 64 for role in C.ROLES}
        # Deliberately different descriptor/config digest, accepted only through
        # the explicit qualified runtime lineage rather than a guessed equality.
        self.options['accepted_runtime_image_ids'] = {role: ['sha256:' + '2' * 64] for role in C.ROLES}
        self.path = self.root / 'collector.json'; self.write(self.path, self.options)
        self.client = FakeArgo(self.options, self.state)

    def write(self, path, value):
        path.write_bytes(C.backup.json_bytes(value)); path.chmod(0o600)

    def collect(self, independent=False):
        return C.collect(self.options, lambda *_: self.client, now=NOW, run_independent=independent)

    def advance(self):
        self.client.record['podUid'] = '33333333-3333-3333-3333-333333333333'
        self.client.record['captureStartedAt'] = '2026-11-11T12:01:00.000Z'
        self.client.record['captureCompletedAt'] = '2026-11-11T12:01:10.000Z'
        self.client.body = C.record_codec.frame(self.client.record)
        self.client.job = self.client.meta(self.options['cronjob'] + '-29908080', '44444444-4444-4444-4444-444444444444', '2026-11-11T12:00:59Z')
        self.client.pod = self.client.meta(self.client.job['name'] + '-bcdef', self.client.record['podUid'], '2026-11-11T12:01:00Z')
        status = self.client.job_status(); status['startTime'] = '2026-11-11T12:00:59Z'; status['completionTime'] = '2026-11-11T12:01:20Z'
        self.client.jobs = [{'metadata': self.client.job, 'status': status}]; self.client.pods = [{'metadata': self.client.pod}]
        self.client.job_owner = self.client.owner('CronJob', self.client.cron); self.client.pod_owner = self.client.owner('Job', self.client.job)

    def test_private_config_requires_known_uid_and_finite_qualified_runtime_ids(self):
        self.assertEqual(C.config(self.path)['expected_cronjob_uid'], CRON_UID)
        for field, value in [('expected_cronjob_uid', 'new'), ('images', {}), ('accepted_runtime_image_ids', {}), ('unknown', 'private-marker')]:
            options = copy.deepcopy(self.options); options[field] = value; self.write(self.path, options)
            with self.subTest(field=field), self.assertRaises(C.CollectionError): C.config(self.path)

    def test_success_retains_originals_then_selects_without_restore_claim(self):
        template = self.template.read_bytes()
        result = self.collect()
        self.assertTrue(result['selectionChanged']); self.assertFalse(result['independentRecoveryVerified'])
        folder = self.state / ('record-' + result['recordSha256'])
        self.assertEqual((folder / 'original-frame.txt').read_bytes(), self.client.body)
        self.assertEqual((folder / 'upload-receipt.json').read_bytes(), C.backup.json_bytes(self.client.record['uploadReceipt']))
        selected = json.loads(self.active.read_bytes()); original = json.loads(template)
        for key in original:
            if key not in ('receipt', 'receipt_sha256', 'checkpoint_report_sha256', 'artifact_index_sha256', 'snapshot_manifest_sha256', 'recovery_point_at', 'snapshot_label'):
                self.assertEqual(selected[key], original[key])
        self.assertEqual(self.template.read_bytes(), template)
        self.assertEqual(selected['recovery_point_at'], self.client.record['captureStartedAt'])
        again = self.collect(); self.assertFalse(again['selectionChanged'])
        for call in self.client.calls:
            if call[0] == 'resource': self.assertNotIn(call[1], ('Secret', 'Application'))
        self.assertFalse(any('.image,' in call[2] or '.name,' in call[2] for call in self.client.calls if call[0] == 'resource' and call[2].startswith('spec.')))

    def test_latest_failed_attempt_never_falls_back_to_older_success(self):
        newer = self.client.meta(self.options['cronjob'] + '-29908081', '55555555-5555-5555-5555-555555555555', '2026-11-11T12:01:00Z')
        self.client.jobs.append({'metadata': newer, 'status': {'failed': 1, 'conditions': [{'type': 'Failed', 'status': 'True'}]}})
        with self.assertRaises(C.CollectionError): self.collect()
        self.assertFalse(self.active.exists()); self.assertFalse(any(call[0] == 'logs' for call in self.client.calls))

    def test_equal_newest_job_instants_with_different_format_are_ambiguous(self):
        duplicate = self.client.meta(self.options['cronjob'] + '-29908081', '55555555-5555-5555-5555-555555555555', '2026-11-11T11:59:59.000Z')
        self.client.jobs.append({'metadata': duplicate, 'status': self.client.job_status()})
        with self.assertRaises(C.CollectionError): self.collect()
        self.assertFalse(self.active.exists())

    def test_argocd_create_job_ten_digit_action_name_still_requires_exact_owner(self):
        self.client.job['name'] = self.options['cronjob'] + '-2611111200'
        self.client.pod['name'] = self.client.job['name'] + '-abcde'
        self.client.pod_owner = self.client.owner('Job', self.client.job)
        self.assertTrue(self.collect()['selectionChanged'])

    def sibling(self, phase='Failed'):
        sibling = self.client.meta(self.client.job['name'] + '-retry', '55555555-5555-5555-5555-555555555555', '2026-11-11T11:59:59Z')
        self.client.pods.insert(0, {'metadata': sibling})
        self.client.sibling_status[sibling['name']] = {'phase': phase}
        self.client.sibling_owner[sibling['name']] = self.client.owner('Job', self.client.job)
        return sibling

    def test_successful_retry_accepts_one_previous_failed_owned_pod(self):
        sibling = self.sibling()
        result = self.collect()
        evidence = json.loads((self.state / ('record-' + result['recordSha256']) / 'evidence.json').read_bytes())
        self.assertEqual(evidence['failedSiblingAttempts'], [{'metadata': sibling, 'phase': 'Failed'}])
        self.assertEqual([call[1] for call in self.client.calls if call[0] == 'logs'], [self.client.pod['name']])

    def test_active_ambiguous_unowned_or_changed_retry_siblings_are_rejected(self):
        for phase in ('Pending', 'Running', 'Unknown', 'Succeeded'):
            self.client = FakeArgo(self.options, self.state); self.sibling(phase)
            with self.subTest(phase=phase), self.assertRaises(C.CollectionError): self.collect()
        self.client = FakeArgo(self.options, self.state); sibling = self.sibling()
        self.client.sibling_owner[sibling['name']][0]['uid'] = '99999999-9999-9999-9999-999999999999'
        with self.assertRaises(C.CollectionError): self.collect()
        self.client = FakeArgo(self.options, self.state); sibling = self.sibling()
        self.client.on_logs = lambda: self.client.sibling_status[sibling['name']].update(phase='Running')
        with self.assertRaises(C.CollectionError): self.collect()
        self.assertFalse(self.active.exists())

    def test_cron_job_pod_ownership_and_all_terminal_exit_codes_required(self):
        mutations = [lambda: self.client.cron.update(uid='99999999-9999-9999-9999-999999999999'),
                     lambda: self.client.job_owner[0].update(uid='99999999-9999-9999-9999-999999999999'),
                     lambda: self.client.pod_owner[0].update(uid='99999999-9999-9999-9999-999999999999'),
                     lambda: self.client.status.update(phase='Failed'),
                     lambda: self.client.status['initContainerStatuses'][1]['state']['terminated'].update(exitCode=1),
                     lambda: self.client.status['containerStatuses'][0].update(restartCount=1),
                     lambda: self.client.status.pop('initContainerStatuses')]
        for mutate in mutations:
            self.client = FakeArgo(self.options, self.state); mutate()
            with self.assertRaises(C.CollectionError): self.collect()
            self.assertFalse(self.active.exists())

    def test_image_spec_pins_and_explicit_runtime_lineage_both_required(self):
        self.client.image_override = self.options['images']['capture'].replace('1' * 64, '3' * 64)
        with self.assertRaises(C.CollectionError): self.collect()
        self.client.image_override = None
        self.client.status['containerStatuses'][0]['imageID'] = 'sha256:' + '3' * 64
        with self.assertRaises(C.CollectionError): self.collect()
        self.assertFalse(self.active.exists())

    def test_uid_and_terminal_status_rechecked_after_logs(self):
        for mutate in [lambda: self.client.pod.update(uid='99999999-9999-9999-9999-999999999999'),
                       lambda: self.client.cron.update(uid='99999999-9999-9999-9999-999999999999'),
                       lambda: self.client.status['containerStatuses'][0]['state']['terminated'].update(exitCode=1)]:
            self.client = FakeArgo(self.options, self.state); self.client.on_logs = mutate
            with self.assertRaises(C.CollectionError): self.collect()
            self.assertFalse(self.active.exists())

    def test_manual_frozen_truncated_extra_logs_and_wrong_pod_frame_rejected(self):
        frame = self.client.body
        for body in [frame[:-1], frame[:50], b'raw-private-diagnostics\n' + frame,
                     self.client.record['uploadReceiptSha256'].encode(), b'OPENLAP-UPLOAD-RECEIPT-V1\n{}\nOPENLAP-UPLOAD-RECEIPT-END-V1\n']:
            self.client.body = body
            with self.assertRaises((C.CollectionError, C.record_codec.RecordError)): self.collect()
            self.assertFalse(self.active.exists())
        record = copy.deepcopy(self.client.record); record['podUid'] = '99999999-9999-9999-9999-999999999999'
        self.client.body = C.record_codec.frame(record)
        with self.assertRaises(C.CollectionError): self.collect()

    def test_prepublication_fingerprint_check_preserves_an_observed_operator_edit(self):
        self.collect(); prior_state = (self.state / 'selection.json').read_bytes(); self.advance()
        edited = json.loads(self.active.read_bytes()); edited['remote'] = 'fixture:operator-reviewed-other-selection'
        manual = C.backup.json_bytes(edited)
        self.client.on_logs = lambda: self.active.write_bytes(manual)
        with self.assertRaises(C.CollectionError): self.collect()
        self.assertEqual(self.active.read_bytes(), manual)
        self.assertEqual((self.state / 'selection.json').read_bytes(), prior_state)
        self.assertFalse((self.state / 'selection-pending.json').exists())

    def test_old_active_config_is_retained_when_advancing(self):
        self.collect(); original = self.active.read_bytes(); self.advance()
        result = self.collect(); folder = self.state / ('record-' + result['recordSha256'])
        self.assertEqual((folder / 'previous-recovery-config.json').read_bytes(), original)

    def test_partial_local_commit_is_hash_reconciled_before_new_metadata_work(self):
        original = C.atomic_json
        with mock.patch.object(C, 'atomic_json', side_effect=OSError('synthetic interruption')):
            with self.assertRaises(OSError): self.collect()
        selected = self.active.read_bytes(); self.assertTrue((self.state / 'selection-pending.json').exists())
        def denied(*_args, **_kwargs): raise C.CollectionError('PRIVATE_NATIVE_AUTH_DIAGNOSTICS')
        self.client.resource = denied
        with self.assertRaises(C.CollectionError): self.collect()
        self.assertEqual(self.active.read_bytes(), selected)
        self.assertFalse((self.state / 'selection-pending.json').exists())
        self.assertEqual(json.loads((self.state / 'selection.json').read_bytes())['activeConfigSha256'], hashlib.sha256(selected).hexdigest())

    def test_optional_independent_check_requires_new_fully_bound_recovery_receipt(self):
        def check(_arguments):
            target = Path(json.loads(self.active.read_bytes())['state_directory']) / ('check-' + uuid.uuid4().hex)
            target.mkdir(mode=0o700)
            record = self.client.record
            report = {'status': 'INDEPENDENT_PLUGIN_RECOVERY_VERIFIED', 'uploadReceiptSha256': record['uploadReceiptSha256'],
                      'checkpointReportSha256': record['checkpointReportSha256'], 'artifactIndexSha256': record['artifactIndexSha256'],
                      'snapshotManifestSha256': record['snapshotManifestSha256'], 'archiveSha256': record['archiveSha256'],
                      'trustedRecoveryPointAt': record['captureStartedAt']}
            report.update({key: True for key in ('independentlyDownloadedAndDecrypted', 'isolatedDatabaseRestoreVerified',
                          'independentDatabaseIndexMatched', 'freshObjectStoreColdReadbackVerified', 'sourceMetadataUnchanged',
                          'dockerScratchCleanupComplete', 'backupFreshnessWithinPolicy')})
            self.write(target / 'recovery-receipt.json', report)
            return 0
        with mock.patch.object(C.recovery, 'main', side_effect=check):
            self.assertTrue(self.collect(independent=True)['independentRecoveryVerified'])
        with mock.patch.object(C.recovery, 'main', return_value=1):
            with self.assertRaises(C.CollectionError): self.collect(independent=True)

    def test_native_argocd_file_is_only_statted_and_errors_never_echo_payloads(self):
        original = C.snapshot
        def snapshot(path, **kwargs):
            self.assertNotEqual(Path(path), Path(self.options['argocd_config']))
            return original(path, **kwargs)
        with mock.patch.object(C, 'snapshot', side_effect=snapshot): self.assertEqual(C.config(self.path)['application'], self.options['application'])
        def denied(_command, **kwargs):
            kwargs['stderr'].write(b'SENSITIVE_NATIVE_TOKEN_DO_NOT_PRINT')
            return subprocess.CompletedProcess(_command, 20)
        stderr = io.StringIO()
        with mock.patch.object(C.subprocess, 'run', side_effect=denied), contextlib.redirect_stderr(stderr):
            self.assertEqual(C.main(['--config', str(self.path)]), 1)
        self.assertNotIn('SENSITIVE_NATIVE_TOKEN', stderr.getvalue())
        self.assertIn('BACKUP_EVIDENCE_COLLECTION_INCOMPLETE', stderr.getvalue())
        self.assertFalse(self.active.exists())

    def test_native_credential_cannot_alias_any_collector_custody_path(self):
        aliased = self.state / 'selection.json'
        aliased.write_text('SYNTHETIC_NATIVE_SESSION_MUST_NEVER_BE_PARSED'); aliased.chmod(0o600)
        options = dict(self.options, argocd_config=str(aliased)); self.write(self.path, options)
        original = C.snapshot
        def guarded(path, **kwargs):
            self.assertNotEqual(Path(path), aliased)
            return original(path, **kwargs)
        with mock.patch.object(C, 'snapshot', side_effect=guarded), self.assertRaises(C.CollectionError): C.config(self.path)

    def test_active_configuration_cannot_alias_absent_custody_ledger_or_journal(self):
        for name in ('selection.json', 'selection-pending.json'):
            with self.subTest(name=name):
                aliased = self.state / name
                self.assertFalse(aliased.exists())
                options = dict(self.options, active_recovery_config=str(aliased))
                self.write(self.path, options)
                before = self.path.read_bytes(), self.template.read_bytes()
                stderr = io.StringIO()
                with mock.patch.object(C, 'NativeArgo', side_effect=AssertionError('No metadata access expected')) as native, contextlib.redirect_stderr(stderr):
                    self.assertEqual(C.main(['--config', str(self.path)]), 1)
                native.assert_not_called()
                self.assertIn('BACKUP_EVIDENCE_COLLECTION_INCOMPLETE', stderr.getvalue())
                self.assertEqual(list(self.state.iterdir()), [])
                self.assertFalse(self.active.exists())
                self.assertEqual((self.path.read_bytes(), self.template.read_bytes()), before)

    def test_configuration_and_template_must_also_stay_outside_custody(self):
        for field in ('collector_config', 'recovery_template'):
            with self.subTest(field=field):
                aliased = self.state / ('selection.json' if field == 'collector_config' else 'selection-pending.json')
                options = dict(self.options)
                if field == 'collector_config':
                    self.write(aliased, options); config_path = aliased
                else:
                    self.write(aliased, json.loads(self.template.read_bytes()))
                    options['recovery_template'] = str(aliased)
                    self.write(self.path, options); config_path = self.path
                before = {item.name: item.read_bytes() for item in self.state.iterdir()}
                with self.assertRaises(C.CollectionError): C.config(config_path)
                self.assertEqual({item.name: item.read_bytes() for item in self.state.iterdir()}, before)
                self.assertFalse(self.active.exists())
                aliased.unlink()

    def test_multiple_json_resource_format_rejects_duplicates_and_arrays(self):
        self.assertEqual(C.objects(b'{"metadata":{"name":"one"}}\n---\n{"metadata":{"name":"two"}}\n')[1]['metadata']['name'], 'two')
        for body in [b'[]', b'{"a":1,"a":2}', b'{"a":NaN}', b'{}\n---\n']:
            with self.assertRaises(C.CollectionError): C.objects(body)

    def test_disabled_schedules_and_minimal_outside_git_tool_tree(self):
        examples = ROOT / 'docs/examples'
        for name, check in [('org.openlap.plugin-backup-evidence.plist', False),
                            ('org.openlap.plugin-backup-weekly-recovery.plist', True)]:
            value = plistlib.loads((examples / name).read_bytes())
            self.assertIs(value['Disabled'], True); self.assertIs(value['RunAtLoad'], False)
            self.assertEqual('--run-check' in value['ProgramArguments'], check)
            self.assertTrue(value['ProgramArguments'][2].endswith('/scripts/collect-plugin-backup-evidence.py'))
        example = json.loads((examples / 'plugin-backup-evidence-collection.json').read_bytes())
        self.assertEqual(set(example), C.REQUIRED | set(C.DEFAULTS))
        self.assertEqual(set(example['accepted_runtime_image_ids']), set(C.ROLES))
        installed = self.root / 'installed-public-tools'; installed.mkdir(mode=0o700)
        paths = ['scripts/collect-plugin-backup-evidence.py', 'scripts/plugin-recurring-record.py',
                 'openlap-analyticsframework/scripts/check-plugin-backup-recovery.py',
                 'openlap-analyticsframework/scripts/plugin-release-backup.py',
                 'openlap-analyticsframework/scripts/plugin-backup-upload.py']
        for relative in paths:
            target = installed / relative; target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, target)
        result = subprocess.run([C.sys.executable, '-B', str(installed / paths[0]), '--help'],
                                stdin=subprocess.DEVNULL, capture_output=True, timeout=10)
        self.assertEqual(result.returncode, 0)
        self.assertIn(b'--run-check', result.stdout)


if __name__ == '__main__': unittest.main()
