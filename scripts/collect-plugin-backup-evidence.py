#!/usr/bin/env python3
"""Retain a current CronJob-owned online receipt using an existing Argo session.

No Kubernetes client, terminal, Secret object, application update or credential
file content is used. Collection alone is not an independent restore check.
"""
import argparse
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timedelta, timezone
import fcntl
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import resource
import stat
import subprocess
import sys
import uuid


ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


record_codec = load('collector_record', Path(__file__).with_name('plugin-recurring-record.py'))
backup = record_codec.backup
recovery = load('collector_recovery', ROOT / 'analyticsframework/scripts/check-plugin-backup-recovery.py')
ROLES = ('capture', 'index', 'export', 'uploader')
REQUIRED = {'argocd', 'argocd_config', 'argocd_context', 'application', 'namespace', 'cronjob',
            'expected_cronjob_uid', 'images', 'accepted_runtime_image_ids', 'recovery_template',
            'active_recovery_config', 'state_directory'}
DEFAULTS = {'timeout_seconds': 25, 'max_attempt_age_hours': 26, 'max_clock_skew_seconds': 300,
            'initial_active_config_sha256': None}
META_FIELDS = 'metadata.uid,metadata.namespace,metadata.name,metadata.creationTimestamp'
UID = record_codec.UUID
SHA = r'[a-f0-9]{64}'
DNS = r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
STATE_KEYS = {'schemaVersion', 'activeConfigSha256', 'recordSha256', 'captureStartedAt',
              'cronjobUid', 'jobUid', 'podUid', 'sequence'}


class CollectionError(Exception):
    pass


def require(value):
    if not value:
        raise CollectionError('Backup evidence collection validation failed.')


def sha(body):
    return hashlib.sha256(body).hexdigest()


def check_sha(value):
    require(isinstance(value, str) and re.fullmatch(SHA, value)); return value


def outside_git(path):
    require(not any((part / '.git').exists() for part in (path, *path.parents)))


def physical(value, directory=False, private=True):
    path = Path(value)
    require(path.is_absolute() and str(path) == os.path.normpath(str(path)) and path.resolve() == path
            and not any(ord(character) < 32 or ord(character) == 127 for character in str(path)))
    info = path.lstat()
    require(stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode))
    if private:
        require(info.st_uid == os.getuid() and stat.S_IMODE(info.st_mode) == (0o700 if directory else 0o600)
                and (directory or info.st_nlink == 1))
    return path


def identity(info):
    return (info.st_dev, info.st_ino, info.st_uid, info.st_mode, info.st_nlink,
            info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def snapshot(path, *, missing=False, maximum=65536):
    path = Path(path)
    try:
        physical(path)
    except FileNotFoundError:
        require(missing and not path.is_symlink()); return None
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, 'rb') as stream:
        before = os.fstat(stream.fileno())
        require(stat.S_ISREG(before.st_mode) and before.st_uid == os.getuid()
                and stat.S_IMODE(before.st_mode) == 0o600 and before.st_nlink == 1)
        body = stream.read(maximum + 1)
        require(len(body) <= maximum and identity(before) == identity(os.fstat(stream.fileno())))
    return {'path': path, 'body': body, 'sha256': sha(body), 'identity': identity(before)}


def unchanged(path, before):
    after = snapshot(path, missing=True)
    require((before is None and after is None) or (before is not None and after is not None
            and before['sha256'] == after['sha256'] and before['identity'] == after['identity']))


def parse(body):
    try:
        return backup.parse_json(body)
    except Exception:
        raise CollectionError('Metadata JSON validation failed.') from None


def config(path):
    physical(path); outside_git(Path(path))
    value = parse(snapshot(path)['body'])
    require(REQUIRED <= set(value) <= REQUIRED | set(DEFAULTS))
    options = dict(DEFAULTS); options.update(value)
    for field in REQUIRED - {'images', 'accepted_runtime_image_ids'}:
        require(isinstance(options[field], str) and 0 < len(options[field]) <= 4096)
    for field in ('application', 'namespace', 'cronjob'):
        require(re.fullmatch(DNS, options[field]))
    require(len(options['cronjob']) <= 40)
    require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,79}', options['argocd_context']))
    require(re.fullmatch(UID, options['expected_cronjob_uid']))
    for field, maximum in (('timeout_seconds', 60), ('max_attempt_age_hours', 168), ('max_clock_skew_seconds', 600)):
        require(type(options[field]) is int and 0 < options[field] <= maximum)
    if options['initial_active_config_sha256'] is not None:
        check_sha(options['initial_active_config_sha256'])
    require(isinstance(options['images'], dict) and set(options['images']) == set(ROLES))
    require(isinstance(options['accepted_runtime_image_ids'], dict)
            and set(options['accepted_runtime_image_ids']) == set(ROLES))
    for role in ROLES:
        suffix = 'checkpoint' if role in ('capture', 'index') else 'storage-versity' if role == 'export' else 'backup-upload'
        require(isinstance(options['images'][role], str) and re.fullmatch(r'ghcr\.io/ude-soco/openlap-official-plugin-' + suffix + r'@sha256:' + SHA, options['images'][role]))
        values = options['accepted_runtime_image_ids'][role]
        require(isinstance(values, list) and 1 <= len(values) <= 4)
        require(all(isinstance(item, str) and re.fullmatch(r'sha256:' + SHA, item) for item in values))
        require(len(set(values)) == len(values))
    state = physical(options['state_directory'], directory=True); outside_git(state)
    template = physical(options['recovery_template']); outside_git(template)
    require(template.suffix == '.json')
    active = Path(options['active_recovery_config']); physical(active.parent, directory=True); outside_git(active.parent)
    require(active.is_absolute() and active.parent.resolve() == active.parent and active.suffix == '.json'
            and str(active) == os.path.normpath(str(active))
            and not any(ord(character) < 32 or ord(character) == 127 for character in str(active))
            and active != template and active != Path(path))
    # Custody owns its complete directory tree, including the selection ledger
    # and journal. Configuration paths must never alias these generated files.
    require(all(state not in item.parents for item in (Path(path), template, active)))
    # Only stat the native Argo credential file. Never open or hash it.
    credential = physical(options['argocd_config'])
    require(credential not in (template, active, Path(path)) and state not in credential.parents)
    executable = Path(options['argocd']); require(executable.is_absolute())
    physical(executable.resolve(), private=False); require(os.access(executable, os.X_OK))
    return options


def kube_time(value):
    require(isinstance(value, str) and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z', value))
    try:
        return datetime.fromisoformat(value[:-1] + '+00:00')
    except ValueError:
        raise CollectionError('Kubernetes metadata timestamp validation failed.') from None


def objects(body):
    require(isinstance(body, bytes) and 0 < len(body) <= 1048576)
    parts = body.strip().split(b'\n---\n'); require(1 <= len(parts) <= 512)
    return [parse(part) for part in parts]


class NativeArgo:
    def __init__(self, options, private_directory):
        self.options = options; self.directory = private_directory
        self.base = [options['argocd']]
        self.flags = ['--config', options['argocd_config'], '--argocd-context', options['argocd_context'],
                      '--grpc-web', '--loglevel', 'error']
        self.environment = {name: os.environ[name] for name in ('HOME', 'PATH', 'LANG') if name in os.environ}

    def call(self, arguments):
        def limit():
            resource.setrlimit(resource.RLIMIT_FSIZE, (1048576, 1048576))
        with tempfile_files(self.directory) as (out, err):
            try:
                result = subprocess.run(self.base + arguments + self.flags, stdout=out, stderr=err,
                                        stdin=subprocess.DEVNULL, timeout=self.options['timeout_seconds'],
                                        env=self.environment, preexec_fn=limit)
            except (OSError, subprocess.TimeoutExpired):
                raise CollectionError('Native Argo metadata request failed.') from None
            require(result.returncode == 0 and os.fstat(out.fileno()).st_size <= 1048576
                    and os.fstat(err.fileno()).st_size <= 1048576)
            out.seek(0); return out.read(1048576)

    def resource(self, kind, fields, name=None):
        arguments = ['app', 'get-resource', self.options['application'], '--kind', kind,
                     '--filter-fields', fields, '-o', 'json']
        if kind in ('CronJob', 'Job'): arguments += ['--group', 'batch']
        if name is not None: arguments += ['--resource-name', name]
        return objects(self.call(arguments))

    def logs(self, pod):
        return self.call(['app', 'logs', self.options['application'], '--kind', 'Pod', '--name', pod,
                          '--namespace', self.options['namespace'], '--container', 'uploader', '--tail', '20'])


def tempfile_files(directory):
    # Kept out of records: unexpected service output must never become evidence.
    import contextlib
    import tempfile
    @contextlib.contextmanager
    def pair():
        with tempfile.TemporaryFile(dir=directory) as out, tempfile.TemporaryFile(dir=directory) as err:
            yield out, err
    return pair()


def one(client, kind, fields, name):
    values = client.resource(kind, fields, name)
    require(len(values) == 1 and values[0].get('metadata', {}).get('name') == name)
    return values[0]


def metadata(value, options):
    item = value.get('metadata'); require(isinstance(item, dict))
    require(set(item) == {'uid', 'name', 'namespace', 'creationTimestamp'})
    require(item['namespace'] == options['namespace'] and isinstance(item['uid'], str) and re.fullmatch(UID, item['uid'])
            and isinstance(item['name'], str) and re.fullmatch(DNS, item['name']))
    kube_time(item['creationTimestamp'])
    return dict(item)


def owner(client, kind, name, owner_kind, owner_name, owner_uid):
    value = one(client, kind, 'metadata.ownerReferences', name)
    rows = value['metadata'].get('ownerReferences')
    require(isinstance(rows, list) and len(rows) == 1)
    row = rows[0]
    require(row.get('apiVersion') == 'batch/v1' and row.get('kind') == owner_kind
            and row.get('name') == owner_name and row.get('uid') == owner_uid and row.get('controller') is True)


def job_success(status):
    require(isinstance(status, dict) and type(status.get('succeeded')) is int and status['succeeded'] == 1)
    require(type(status.get('active', 0)) is int and status.get('active', 0) == 0)
    conditions = status.get('conditions'); require(isinstance(conditions, list))
    require(sum(row.get('type') == 'Complete' and row.get('status') == 'True' for row in conditions) == 1)
    require(not any(row.get('type') in ('Failed', 'FailureTarget') and row.get('status') == 'True' for row in conditions))
    started, finished = kube_time(status.get('startTime')), kube_time(status.get('completionTime'))
    require(started <= finished)
    return {'succeeded': 1, 'startTime': status['startTime'], 'completionTime': status['completionTime']}


def runtime_digest(value, image):
    require(isinstance(value, str) and len(value) <= 512)
    repository = re.escape(image.split('@')[0])
    match = re.fullmatch(r'(?:(?:docker-pullable|docker|containerd|cri-o)://)?(?:' + repository + r'@)?(sha256:' + SHA + r')', value)
    require(match); return match.group(1)


def pod_success(status, options):
    require(isinstance(status, dict) and status.get('phase') == 'Succeeded')
    result = {}
    for key, roles in (('initContainerStatuses', ROLES[:3]), ('containerStatuses', ROLES[3:])):
        entries = status.get(key); require(isinstance(entries, list) and len(entries) == len(roles))
        require({entry.get('name') for entry in entries} == set(roles))
        for entry in entries:
            role = entry['name']; terminated = entry.get('state', {}).get('terminated')
            require(isinstance(terminated, dict) and type(terminated.get('exitCode')) is int and terminated['exitCode'] == 0
                    and type(entry.get('restartCount')) is int and entry['restartCount'] == 0)
            digest = runtime_digest(entry.get('imageID'), options['images'][role])
            require(digest in options['accepted_runtime_image_ids'][role])
            result[role] = {'exitCode': 0, 'restartCount': 0, 'runtimeImageID': entry['imageID'], 'acceptedRuntimeDigest': digest}
    return result


def pod_spec(client, pod, options):
    result = {}
    for field, roles in (('initContainers', ROLES[:3]), ('containers', ROLES[3:])):
        # One array field per call: Argo3.5.5 overwrites prior filtered arrays.
        names = one(client, 'Pod', 'spec.' + field + '.name', pod).get('spec', {}).get(field)
        images = one(client, 'Pod', 'spec.' + field + '.image', pod).get('spec', {}).get(field)
        require(isinstance(names, list) and isinstance(images, list) and len(names) == len(images) == len(roles))
        require(all(isinstance(row, dict) and set(row) == {'name'} for row in names))
        require([row.get('name') for row in names] == list(roles))
        for role, row in zip(roles, images):
            require(set(row) == {'image'} and row['image'] == options['images'][role])
            result[role] = row['image']
    node = one(client, 'Pod', 'spec.nodeSelector', pod).get('spec', {}).get('nodeSelector')
    require(isinstance(node, dict) and node.get('kubernetes.io/os') == 'linux' and node.get('kubernetes.io/arch') == 'amd64')
    require(one(client, 'Pod', 'spec.automountServiceAccountToken', pod).get('spec', {}).get('automountServiceAccountToken') is False)
    return result


def pod_attempts(options, client, job):
    pods = []
    for value in client.resource('Pod', META_FIELDS):
        selected = value.get('metadata', {})
        if selected.get('namespace') != options['namespace'] or not isinstance(selected.get('name'), str) or not selected['name'].startswith(job['name'] + '-'):
            continue
        item = metadata(value, options)
        owner(client, 'Pod', item['name'], 'Job', job['name'], job['uid'])
        status = one(client, 'Pod', 'status', item['name']).get('status')
        require(isinstance(status, dict) and status.get('phase') in ('Failed', 'Succeeded'))
        pods.append((item, status))
    # The public producer has backoffLimit=1: one failed attempt may precede
    # exactly one successful retry. Never choose among active or ambiguous Pods.
    require(1 <= len(pods) <= 2 and len({row[0]['uid'] for row in pods}) == len(pods)
            and len({row[0]['name'] for row in pods}) == len(pods))
    successful = [row for row in pods if row[1]['phase'] == 'Succeeded']
    require(len(successful) == 1)
    pod, status = successful[0]
    failed = sorted([{'metadata': item, 'phase': 'Failed'} for item, state in pods if state['phase'] == 'Failed'],
                    key=lambda row: row['metadata']['name'])
    require(all(kube_time(row['metadata']['creationTimestamp']) <= kube_time(pod['creationTimestamp']) for row in failed))
    return pod, pod_success(status, options), failed


def witness(options, client, now):
    cron = metadata(one(client, 'CronJob', META_FIELDS, options['cronjob']), options)
    require(cron['uid'] == options['expected_cronjob_uid'])
    candidates = []
    for value in client.resource('Job', META_FIELDS + ',status'):
        selected = value.get('metadata', {})
        if selected.get('namespace') != options['namespace'] or not isinstance(selected.get('name'), str) or not re.fullmatch(re.escape(options['cronjob']) + r'-[0-9]{1,12}', selected['name']):
            continue
        meta = metadata(value, options)
        if re.fullmatch(re.escape(options['cronjob']) + r'-[0-9]{1,12}', meta['name']): candidates.append((meta, value.get('status')))
    require(candidates)
    candidates.sort(key=lambda row: kube_time(row[0]['creationTimestamp']), reverse=True)
    require(len(candidates) == 1 or kube_time(candidates[0][0]['creationTimestamp']) != kube_time(candidates[1][0]['creationTimestamp']))
    job, raw_status = candidates[0]
    require(-options['max_clock_skew_seconds'] <= (now - kube_time(job['creationTimestamp'])).total_seconds()
            <= options['max_attempt_age_hours'] * 3600)
    owner(client, 'Job', job['name'], 'CronJob', cron['name'], cron['uid'])
    job_status = job_success(raw_status)
    pod, statuses, failed = pod_attempts(options, client, job)
    images = pod_spec(client, pod['name'], options)
    body = client.logs(pod['name'])
    # Never feed arbitrary logs into the codec or retain their contents.
    require(isinstance(body, bytes) and len(body) <= record_codec.LIMIT and len(body.splitlines()) == 3
            and body.splitlines()[0] == record_codec.HEADER and body.splitlines()[2] == record_codec.FOOTER)
    record = record_codec.parse_frame(body)
    require(record['podUid'] == pod['uid'])
    skew = timedelta(seconds=options['max_clock_skew_seconds'])
    started, finished = record_codec.utc(record['captureStartedAt']), record_codec.utc(record['captureCompletedAt'])
    require(kube_time(job['creationTimestamp']) - skew <= started <= finished
            <= kube_time(job_status['completionTime']) + skew and finished <= now + skew
            and (now - started).total_seconds() <= options['max_attempt_age_hours'] * 3600)
    # Recheck immutable ownership, terminal state and qualified images after logs.
    require(metadata(one(client, 'CronJob', META_FIELDS, cron['name']), options) == cron)
    require(metadata(one(client, 'Job', META_FIELDS, job['name']), options) == job)
    owner(client, 'Job', job['name'], 'CronJob', cron['name'], cron['uid'])
    require(job_success(one(client, 'Job', 'status', job['name']).get('status')) == job_status)
    require(metadata(one(client, 'Pod', META_FIELDS, pod['name']), options) == pod)
    require(pod_attempts(options, client, job) == (pod, statuses, failed))
    require(pod_spec(client, pod['name'], options) == images)
    return body, record, {'schemaVersion': 1, 'status': 'CRONJOB_JOB_POD_EVIDENCE_VERIFIED',
                          'observedAt': now.isoformat(), 'cronjob': cron, 'job': job, 'pod': pod,
                          'jobTerminalStatus': job_status, 'containerTerminalStatuses': statuses,
                          'failedSiblingAttempts': failed,
                          'qualifiedSpecImages': images, 'independentRecoveryVerified': False}


def sync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def write_new(path, body):
    physical(path.parent, directory=True)
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600), 'wb') as stream:
        stream.write(body); stream.flush(); os.fsync(stream.fileno())
    sync_directory(path.parent)


def atomic_json(path, value):
    pending = path.with_name('.' + path.name + '-' + uuid.uuid4().hex)
    write_new(pending, backup.json_bytes(value))
    os.replace(pending, path); sync_directory(path.parent)


def lock(path):
    """Serialize cooperating writers; this advisory lock cannot block manual edits."""
    physical(path.parent, directory=True)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    info = os.fstat(descriptor)
    try:
        require(stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid()
                and info.st_nlink == 1 and stat.S_IMODE(info.st_mode) == 0o600)
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BaseException:
        os.close(descriptor); raise
    return descriptor


def state_value(value):
    require(isinstance(value, dict) and set(value) == STATE_KEYS and type(value['schemaVersion']) is int
            and value['schemaVersion'] == 1 and type(value['sequence']) is int and 1 <= value['sequence'] <= 2147483647)
    check_sha(value['activeConfigSha256']); check_sha(value['recordSha256'])
    record_codec.utc(value['captureStartedAt'])
    for field in ('cronjobUid', 'jobUid', 'podUid'):
        require(isinstance(value[field], str) and re.fullmatch(UID, value[field]))
    return value


def selected_bindings(value, record, receipt):
    require(value.get('receipt') == str(receipt) and value.get('receipt_sha256') == record['uploadReceiptSha256']
            and value.get('checkpoint_report_sha256') == record['checkpointReportSha256']
            and value.get('artifact_index_sha256') == record['artifactIndexSha256']
            and value.get('snapshot_manifest_sha256') == record['snapshotManifestSha256']
            and value.get('recovery_point_at') == record['captureStartedAt'] and value.get('snapshot_label') == 'objects')


def custody_existing(folder, record_hash):
    physical(folder, directory=True)
    require(folder.name == 'record-' + check_sha(record_hash))
    entries = {path.name for path in folder.iterdir()}
    require({'original-frame.txt', 'record.json', 'upload-receipt.json', 'evidence.json'} <= entries
            <= {'original-frame.txt', 'record.json', 'upload-receipt.json', 'evidence.json', 'previous-recovery-config.json'})
    body = snapshot(folder / 'original-frame.txt', maximum=record_codec.LIMIT)['body']
    record = record_codec.parse_frame(body); require(record_codec.record_sha256(record) == record_hash)
    require(snapshot(folder / 'record.json')['body'] == backup.json_bytes(record))
    require(snapshot(folder / 'upload-receipt.json')['body'] == backup.json_bytes(record['uploadReceipt']))
    evidence = parse(snapshot(folder / 'evidence.json')['body'])
    require(evidence.get('recordSha256') == record_hash and evidence.get('originalFrameSha256') == sha(body)
            and evidence.get('pod', {}).get('uid') == record['podUid'])
    return record, evidence


def retain_custody(options, body, record, evidence, old_active):
    state = Path(options['state_directory']); record_hash = record_codec.record_sha256(record)
    folder = state / ('record-' + record_hash)
    if folder.exists() or folder.is_symlink():
        saved_record, saved = custody_existing(folder, record_hash)
        require(saved_record == record and all(saved.get(key) == evidence.get(key)
                for key in ('cronjob', 'job', 'pod', 'jobTerminalStatus', 'containerTerminalStatuses', 'qualifiedSpecImages', 'failedSiblingAttempts')))
        return folder
    staging = state / ('.custody-' + uuid.uuid4().hex); staging.mkdir(mode=0o700)
    evidence = dict(evidence, recordSha256=record_hash, originalFrameSha256=sha(body),
                    previousActiveConfigSha256=old_active['sha256'] if old_active else None,
                    collectionIsIndependentRestore=False)
    for name, content in [('original-frame.txt', body), ('record.json', backup.json_bytes(record)),
                          ('upload-receipt.json', backup.json_bytes(record['uploadReceipt'])),
                          ('evidence.json', backup.json_bytes(evidence))]:
        write_new(staging / name, content)
    if old_active is not None:
        write_new(staging / 'previous-recovery-config.json', old_active['body'])
    sync_directory(staging); require(not folder.exists() and not folder.is_symlink())
    os.rename(staging, folder); sync_directory(state)
    custody_existing(folder, record_hash)
    return folder


def reconcile_pending(options):
    """Finish only an already written, hash-bound local selection transaction."""
    root = Path(options['state_directory']); pending_path = root / 'selection-pending.json'
    pending = snapshot(pending_path, missing=True)
    if pending is None:
        return
    value = parse(pending['body'])
    require(set(value) == {'schemaVersion', 'oldActiveSha256', 'oldStateSha256', 'newActiveSha256', 'newState'}
            and value['schemaVersion'] == 1 and type(value['schemaVersion']) is int)
    for key in ('oldActiveSha256', 'oldStateSha256'):
        if value[key] is not None: check_sha(value[key])
    check_sha(value['newActiveSha256']); new_state = state_value(value['newState'])
    require(new_state['activeConfigSha256'] == value['newActiveSha256'])
    active_path = Path(options['active_recovery_config']); current = snapshot(active_path, missing=True)
    state_path = root / 'selection.json'; stored = snapshot(state_path, missing=True)
    current_hash = current['sha256'] if current else None; stored_hash = stored['sha256'] if stored else None
    if current_hash == value['newActiveSha256']:
        record, _ = custody_existing(root / ('record-' + new_state['recordSha256']), new_state['recordSha256'])
        recovery.config(active_path); selected_bindings(parse(current['body']), record,
                                                       root / ('record-' + new_state['recordSha256']) / 'upload-receipt.json')
        require(stored_hash in (value['oldStateSha256'], sha(backup.json_bytes(new_state))))
        if stored_hash == value['oldStateSha256']:
            atomic_json(state_path, new_state)
    else:
        # The active rename never happened. Keep the old selection exactly.
        require(current_hash == value['oldActiveSha256'] and stored_hash == value['oldStateSha256'])
    pending_path.unlink(); sync_directory(root)


def selection_before(options):
    root = Path(options['state_directory']); active_path = Path(options['active_recovery_config'])
    active = snapshot(active_path, missing=True)
    stored = snapshot(root / 'selection.json', missing=True)
    if stored is not None:
        value = state_value(parse(stored['body']))
        require(active is not None and active['sha256'] == value['activeConfigSha256'])
        recovery.config(active_path)
    else:
        require((active is None and options['initial_active_config_sha256'] is None)
                or (active is not None and active['sha256'] == options['initial_active_config_sha256']))
        if active is not None: recovery.config(active_path)
        value = None
    return active, stored, value


def publish_selection(options, record, evidence, folder, old_active, old_stored, old_state, template):
    """Publish collector-owned selection with advisory locks and fingerprint checks.

    A noncooperating edit after the final check can still be overwritten by the
    atomic rename. Manual maintenance must stop collection and use its locks.
    """
    record_hash = record_codec.record_sha256(record)
    if old_state is not None and old_state['recordSha256'] == record_hash:
        require(old_state['cronjobUid'] == evidence['cronjob']['uid'] and old_state['jobUid'] == evidence['job']['uid']
                and old_state['podUid'] == record['podUid'])
        unchanged(options['active_recovery_config'], old_active)
        unchanged(Path(options['state_directory']) / 'selection.json', old_stored)
        return False
    if old_state is not None:
        require(record_codec.utc(record['captureStartedAt']) > record_codec.utc(old_state['captureStartedAt']))
    value = parse(template['body'])
    overrides = {'receipt': str(folder / 'upload-receipt.json'), 'receipt_sha256': record['uploadReceiptSha256'],
                 'checkpoint_report_sha256': record['checkpointReportSha256'], 'artifact_index_sha256': record['artifactIndexSha256'],
                 'snapshot_manifest_sha256': record['snapshotManifestSha256'], 'recovery_point_at': record['captureStartedAt'],
                 'snapshot_label': 'objects'}
    selected = dict(value); selected.update(overrides)
    require(all(selected[key] == value[key] for key in value if key not in overrides))
    path = Path(options['active_recovery_config']); temporary = path.with_name('.' + path.name + '-' + uuid.uuid4().hex + '.json')
    write_new(temporary, backup.json_bytes(selected))
    try:
        recovery.config(temporary)
        unchanged(options['recovery_template'], template)
        unchanged(path, old_active)
        state_path = Path(options['state_directory']) / 'selection.json'
        unchanged(state_path, old_stored)
        new_hash = sha(backup.json_bytes(selected))
        new_state = {'schemaVersion': 1, 'activeConfigSha256': new_hash, 'recordSha256': record_hash,
                     'captureStartedAt': record['captureStartedAt'], 'cronjobUid': evidence['cronjob']['uid'],
                     'jobUid': evidence['job']['uid'], 'podUid': record['podUid'],
                     'sequence': old_state['sequence'] + 1 if old_state else 1}
        state_value(new_state)
        pending_path = Path(options['state_directory']) / 'selection-pending.json'
        write_new(pending_path, backup.json_bytes({'schemaVersion': 1,
                  'oldActiveSha256': old_active['sha256'] if old_active else None,
                  'oldStateSha256': old_stored['sha256'] if old_stored else None,
                  'newActiveSha256': new_hash, 'newState': new_state}))
        os.replace(temporary, path); sync_directory(path.parent)
        atomic_json(state_path, new_state)
        pending_path.unlink(); sync_directory(pending_path.parent)
        return True
    finally:
        if temporary.exists(): temporary.unlink()


def run_check(options, folder, record):
    selected = recovery.config(Path(options['active_recovery_config']))
    selected_bindings(selected, record, folder / 'upload-receipt.json')
    state = physical(selected['state_directory'], directory=True)
    before = {path.name for path in state.iterdir() if path.is_dir() and path.name.startswith('check-')}
    with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
        result = recovery.main(['--config', options['active_recovery_config']])
    require(result == 0)
    after = {path.name for path in state.iterdir() if path.is_dir() and path.name.startswith('check-')}
    require(len(after - before) == 1)
    report_path = state / next(iter(after - before)) / 'recovery-receipt.json'
    report = parse(snapshot(report_path)['body'])
    require(report.get('status') == 'INDEPENDENT_PLUGIN_RECOVERY_VERIFIED'
            and report.get('uploadReceiptSha256') == record['uploadReceiptSha256']
            and report.get('checkpointReportSha256') == record['checkpointReportSha256']
            and report.get('artifactIndexSha256') == record['artifactIndexSha256']
            and report.get('snapshotManifestSha256') == record['snapshotManifestSha256']
            and report.get('archiveSha256') == record['archiveSha256']
            and report.get('trustedRecoveryPointAt') == record['captureStartedAt'])
    for key in ('independentlyDownloadedAndDecrypted', 'isolatedDatabaseRestoreVerified', 'independentDatabaseIndexMatched',
                'freshObjectStoreColdReadbackVerified', 'sourceMetadataUnchanged', 'dockerScratchCleanupComplete', 'backupFreshnessWithinPolicy'):
        require(report.get(key) is True)
    return {'receiptPath': str(report_path), 'receiptSha256': sha(snapshot(report_path)['body']), 'independentRecoveryVerified': True}


def collect(options, client_factory=None, *, now=None, run_independent=False):
    root = Path(options['state_directory']); active = Path(options['active_recovery_config'])
    handles = []
    try:
        handles.append(lock(root / 'collector.lock'))
        handles.append(lock(active.with_name('.' + active.name + '.selection.lock')))
        reconcile_pending(options)
        old_active, old_stored, old_state = selection_before(options)
        template = snapshot(options['recovery_template']); recovery.config(Path(options['recovery_template']))
        now = now or datetime.now(timezone.utc)
        require(now.tzinfo is not None)
        client = (client_factory or NativeArgo)(options, root)
        body, record, evidence = witness(options, client, now)
        folder = retain_custody(options, body, record, evidence, old_active)
        changed = publish_selection(options, record, evidence, folder, old_active, old_stored, old_state, template)
        result = {'status': 'RECURRING_BACKUP_EVIDENCE_COLLECTED', 'recordSha256': record_codec.record_sha256(record),
                  'selectionChanged': changed, 'independentRecoveryVerified': False}
        if run_independent:
            proof = run_check(options, folder, record)
            write_new(root / ('independent-check-' + uuid.uuid4().hex + '.json'), backup.json_bytes(proof))
            result['independentRecoveryVerified'] = True
        return result
    finally:
        for descriptor in reversed(handles): os.close(descriptor)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    parser.add_argument('--run-check', action='store_true', help='Also independently retrieve and rehearse the selected release using the qualified local recovery runner')
    args = parser.parse_args(argv)
    previous = os.umask(0o077)
    try:
        require(os.name == 'posix')
        result = collect(config(args.config), run_independent=args.run_check)
        print(json.dumps(result, sort_keys=True, separators=(',', ':')))
        return 0
    except (Exception, KeyboardInterrupt):
        print('BACKUP_EVIDENCE_COLLECTION_INCOMPLETE: current ownership, terminal success, image qualification or local selection could not be verified. Private diagnostics withheld.', file=sys.stderr)
        return 1
    finally:
        os.umask(previous)


if __name__ == '__main__':
    sys.exit(main())
