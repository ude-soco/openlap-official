"""Qualify one synthetic Mongo identity cutover with an exact local checkpoint image.

No live deployment, operator configuration, S3 service or host port is accessed.
Run: python3 -B tests/verify_plugin_mongo_rename_roundtrip.py --image sha256:...
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import uuid

from test_plugin_checkpoint_containers import fixture_workspace

ROOT = Path(__file__).resolve().parents[1]
MONGO_4_4_29 = 'mongo@sha256:52c42cbab240b3c5b1748582cc13ef46d521ddacae002bbbda645cebed270ec0'
DATABASE = 'mongo_rename_fixture'
SET_NAME = 'mongo-rename-fixture'
OLD_DNS = 'legacy-fixture-mongo'
NEW_DNS = 'renamed-fixture-mongo'
SENTINEL = 'PRIVATE-MONGO-RENAME-FIXTURE-MUST-NOT-BE-LOGGED'


def require(condition, message):
    if not condition:
        raise AssertionError(message)


class Fixture:
    def __init__(self, work, image):
        self.image = image
        self.token = 'openlap-mongo-rename-' + uuid.uuid4().hex[:10]
        self.label = 'org.openlap.mongo-rename-fixture=' + self.token
        self.containers, self.volumes = [], []
        self.network_created = False
        self.stage = 'local-image-preflight'
        config = work / 'docker-config'; config.mkdir()
        (config / 'config.json').write_text('{}')
        self.docker = ['docker', '--config', str(config)]

    def step(self, name):
        self.stage = name
        print('STEP: ' + name, flush=True)

    def call(self, arguments, expected=0, timeout=180):
        arguments = list(arguments)
        if arguments[0] == 'run':
            names = [arg.split('=', 1)[1] for arg in arguments if arg.startswith('--name=')]
            name = names[0] if names else self.token + '-client-' + uuid.uuid4().hex[:8]
            if not names:
                arguments[1:1] = ['--name=' + name, '--label=' + self.label]
            self.containers.append(name)
        try:
            result = subprocess.run(self.docker + arguments, capture_output=True, text=True, timeout=timeout)
        except (OSError, subprocess.SubprocessError):
            raise AssertionError('Owned Docker operation did not finish: ' + arguments[0]) from None
        require(SENTINEL not in result.stdout + result.stderr, 'Raw synthetic fixture data escaped into command output')
        if expected is not None:
            require(result.returncode == expected, 'Owned Docker operation failed: ' + arguments[0])
        return result

    @staticmethod
    def mount(volume, destination, readonly=False):
        return '--mount=type=volume,volume-nocopy,source=' + volume + ',target=' + destination + (',readonly' if readonly else '')

    def helper(self, body, mounts=(), arguments=()):
        return self.call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=none', '--read-only',
            '--user=1000:1000', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=128m', '--pids-limit=32',
            *mounts, '--entrypoint=/bin/bash', MONGO_4_4_29, '--noprofile', '--norc', '-c',
            'set -euo pipefail; umask 077; ' + body, 'fixture-helper', *arguments], timeout=30)

    def volume(self, suffix):
        name = self.token + '-' + suffix
        require(self.call(['volume', 'create', '--label', self.label, name]).stdout.strip() == name,
                'Owned volume creation returned another identity')
        self.volumes.append(name)
        self.call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=none', '--read-only',
            '--user=0:0', '--cap-drop=ALL', '--cap-add=CHOWN', '--security-opt=no-new-privileges',
            self.mount(name, '/volume'), '--entrypoint=/bin/bash', MONGO_4_4_29, '--noprofile', '--norc', '-c',
            'chmod 0700 /volume; chown 1000:1000 /volume'])
        return name

    def owned(self, name):
        labels = json.loads(self.call(['inspect', '--format={{json .Config.Labels}}', name]).stdout)
        require(labels.get('org.openlap.mongo-rename-fixture') == self.token, 'Container ownership mismatch')

    def start_mongo(self, suffix, data, dns, replica=False):
        name = self.token + '-' + suffix
        arguments = ['run', '-d', '--name=' + name, '--label=' + self.label, '--pull=never', '--platform=linux/amd64',
            '--network=' + self.token, '--network-alias=' + dns, '--read-only', '--user=0:0', '--cap-drop=ALL',
            '--cap-add=CHOWN', '--cap-add=DAC_OVERRIDE', '--cap-add=SETUID', '--cap-add=SETGID',
            '--security-opt=no-new-privileges', '--memory=768m', self.mount(data, '/data/db'),
            '--tmpfs=/data/configdb:rw,nosuid,size=16m,mode=0777', '--tmpfs=/tmp:rw,nosuid,size=16m,mode=1777']
        if replica:
            arguments += ['--mount=type=bind,source=' + str(ROOT / '.k8s/components/plugin-backup-replica-set') + ',target=/opt/openlap-replica-set,readonly',
                '--env=OPENLAP_MONGODB_REPLICA_SET=' + SET_NAME, '--env=OPENLAP_MONGODB_REPLICA_HOST=' + dns + ':27017',
                '--env=OPENLAP_MONGODB_OPLOG_SIZE_MIB=16']
        arguments += [MONGO_4_4_29, '--bind_ip_all', '--nounixsocket', '--wiredTigerCacheSizeGB=0.25',
            '--setParameter=ttlMonitorEnabled=false', '--setParameter=diagnosticDataCollectionEnabled=false', '--quiet', '--logpath=/dev/null']
        if replica:
            arguments += ['--replSet=' + SET_NAME, '--oplogSize=16']
        self.call(arguments)
        return name

    def mongo(self, dns, code, expected=0):
        return self.call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=' + self.token,
            '--entrypoint=mongo', MONGO_4_4_29, '--norc', '--quiet', '--host=' + dns, '--eval', code], expected=expected, timeout=30)

    def ready(self, dns):
        for _ in range(30):
            if self.mongo(dns, 'quit(db.runCommand({ping:1}).ok===1?0:1)', expected=None).returncode == 0:
                return
        raise AssertionError('Owned MongoDB did not become ready')

    def replica_check(self, name):
        self.owned(name)
        for action in ['initialize', 'verify']:
            result = self.call(['exec', '--user=999:999', name, '/bin/bash', '--noprofile', '--norc',
                '/opt/openlap-replica-set/replica-set.sh', action], timeout=170)
            require(result.stdout.strip() == 'MONGODB_SINGLE_NODE_PRIMARY_VERIFIED', 'Public replica-set probe failed')

    def stop(self, name, remove=True):
        self.owned(name)
        self.call(['stop', '--time=20', name])
        require(self.call(['inspect', '--format={{.State.ExitCode}}', name]).stdout.strip() == '0', 'MongoDB did not stop cleanly')
        if remove:
            self.call(['rm', '--volumes', name])

    def checkpoint(self, action, env, mounts, network='none'):
        return self.call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=' + network, '--read-only',
            '--user=1000:1000', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=1g', '--pids-limit=128',
            '--tmpfs=/tmp:rw,nosuid,noexec,size=768m,mode=1777', *mounts,
            '--env=CHECKPOINT_MAX_ARCHIVE_MIB=8', '--env=CHECKPOINT_MAX_EXPANDED_MIB=64', '--env=CHECKPOINT_MAX_RESTORE_MIB=512',
            *['--env=' + key + '=' + value for key, value in env.items()], self.image, action], timeout=600)

    def stored_sha(self, volume, path):
        result = self.helper('sha256sum -- /files/$1', [self.mount(volume, '/files', True)], [path])
        digest = result.stdout.split()[0]
        require(re.fullmatch(r'[a-f0-9]{64}', digest), 'Stored artifact SHA-256 missing')
        return digest

    def read_json(self, volume, path):
        return json.loads(self.helper('cat -- /files/$1', [self.mount(volume, '/files', True)], [path]).stdout)

    def cleanup(self):
        complete = True
        for name in reversed(self.containers):
            found = self.call(['inspect', '--format={{json .Config.Labels}}', name], expected=None, timeout=20)
            if found.returncode:
                continue
            if json.loads(found.stdout).get('org.openlap.mongo-rename-fixture') != self.token:
                complete = False; continue
            complete = self.call(['rm', '--force', '--volumes', name], expected=None, timeout=30).returncode == 0 and complete
        for name in reversed(self.volumes):
            found = self.call(['volume', 'inspect', '--format={{json .Labels}}', name], expected=None, timeout=20)
            if found.returncode or json.loads(found.stdout).get('org.openlap.mongo-rename-fixture') != self.token:
                complete = False; continue
            complete = self.call(['volume', 'rm', name], expected=None, timeout=30).returncode == 0 and complete
        if self.network_created:
            labels = self.call(['network', 'inspect', '--format={{json .Labels}}', self.token], expected=None)
            if labels.returncode or json.loads(labels.stdout).get('org.openlap.mongo-rename-fixture') != self.token:
                complete = False
            else:
                complete = self.call(['network', 'rm', self.token], expected=None).returncode == 0 and complete
        return complete


def framed(result, start, end):
    lines = result.stdout.splitlines()
    require(len(lines) == 3 and lines[0] == start and lines[2] == end, 'Checkpoint report framing invalid')
    return json.loads(lines[1]), hashlib.sha256((lines[1] + '\n').encode()).hexdigest()


def index(fixture, captures, outputs, identifier, action, checkpoint_id, report_sha):
    result = fixture.checkpoint(action, {'CHECKPOINT_ID': identifier, 'CHECKPOINT_EXPECTED_REPORT_SHA256': report_sha,
        'CHECKPOINT_REPORT_PATH': '/inputs/' + checkpoint_id + '/checkpoint.json',
        'CHECKPOINT_ARCHIVE_PATH': '/inputs/' + checkpoint_id + '/database.archive.gz'},
        [fixture.mount(captures, '/inputs', True), fixture.mount(outputs, '/outputs')])
    summary, _ = framed(result, 'OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1', 'OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1')
    require(summary['readyForS3Export'] and summary['associationsResolved'] and not summary['objectBytesVerified'],
            'Verified plugin projection was incomplete or claimed object-byte recovery')
    require(summary['originalCheckpointReportSha256'] == report_sha, 'Index bound to another checkpoint')
    digest = fixture.stored_sha(outputs, identifier + '/artifact-index.json')
    require(digest == summary['artifactIndexSha256'], 'Stored index differs from verified summary')
    return digest, fixture.read_json(outputs, identifier + '/artifact-index.json')


def readback(fixture, dns, replica=False, marker=False):
    code = """var d=db.getSiblingDB('%s'),h=new Array(65).join('a');
        assert.eq('4.4.29',db.version());
        assert.eq('4.4',db.getSiblingDB('admin').runCommand({getParameter:1,featureCompatibilityVersion:1}).featureCompatibilityVersion.version);
        assert.eq(1,d['plugin-artifact'].countDocuments({}));assert.eq(1,d['analytics-technique'].countDocuments({}));
        assert.eq('analytics-'+h,d['analytics-technique'].findOne({_id:'current'}).artifactId);
        var indicator=d['analytics-indicator'].findOne({_id:ObjectId('000000000000000000000001')});
        assert(indicator);assert.eq('%s',indicator.value);
        assert.eq('analytics-technique',indicator.analyticsTechniqueReference.analyticsTechnique.getCollection());
        assert.eq('current',indicator.analyticsTechniqueReference.analyticsTechnique.getId());
        assert.eq(1,d['analytics-indicator'].getIndexes().filter(function(i){return i.name==='fixture_compound'&&i.key.value===1&&i.key._id===-1&&i.partialFilterExpression.value.$type==='string';}).length);
        assert.eq(0,d.empty.countDocuments({}));assert.eq(%s,d.events.countDocuments({}));
        assert.eq(1,d.events.getIndexes().filter(function(i){return i.name==='fixture_ttl'&&i.expireAfterSeconds===3600;}).length);
        assert.eq(1,d.users.countDocuments({}));
    """ % (DATABASE, SENTINEL, 2 if marker else 1)
    if marker:
        code += "assert.eq('majority-journaled-after-rename',d.events.findOne({_id:'after-rename'}).value);"
    if replica:
        code += "var r=db.getSiblingDB('admin').runCommand({isMaster:1});assert.eq(true,r.ismaster);assert.eq('%s',r.setName);assert.eq('%s:27017',r.me);assert.eq('%s:27017',r.primary);" % (SET_NAME, dns, dns)
    code += "print('RETAINED_DATABASE_READBACK_VERIFIED');"
    require(fixture.mongo(dns, code).stdout.strip() == 'RETAINED_DATABASE_READBACK_VERIFIED', 'Retained database readback failed')


def configuration(fixture, dns):
    result = fixture.mongo(dns, "var r=db.getSiblingDB('admin').runCommand({replSetGetConfig:1});assert.eq(1,r.ok);print(JSON.stringify(r.config));")
    return json.loads(result.stdout)


def durable_configuration(value):
    # Elections may advance only the top-level term. Preserve configuration
    # version, set identity, member settings and every other durable field.
    value = dict(value)
    value.pop('term', None)
    return value


def run(fixture):
    f = fixture
    f.step('verify exact local images')
    require(f.call(['image', 'inspect', '--format={{.Id}}', f.image]).stdout.strip() == f.image, 'Checkpoint image identity differs')
    f.call(['image', 'inspect', MONGO_4_4_29])
    f.call(['network', 'create', '--internal', '--label', f.label, f.token]); f.network_created = True
    source_data, captures, frozen_index, target_data, restored, online_captures, online_index = [f.volume(name) for name in
        ['source-data', 'frozen-captures', 'frozen-index', 'target-data', 'restore-output', 'online-captures', 'online-index']]
    f.step('seed official 4.4.29 standalone with stable FCV 4.4')
    seed = f.start_mongo('source-seed', source_data, OLD_DNS); f.ready(OLD_DNS)
    f.mongo(OLD_DNS, """var d=db.getSiblingDB('%s'),h=new Array(65).join('a');
        d['plugin-artifact'].insertOne({_id:'analytics-'+h,kind:'ANALYTICS',sha256:h,sizeBytes:NumberLong(19),objectKey:'plugins/analytics/'+h+'.jar',state:'READY'});
        d['analytics-technique'].insertOne({_id:'current',artifactId:'analytics-'+h,enabled:true});
        d['analytics-indicator'].insertOne({_id:ObjectId('000000000000000000000001'),value:'%s',
            analyticsTechniqueReference:{analyticsTechnique:new DBRef('analytics-technique','current')}});
        d['analytics-indicator'].createIndex({value:1,_id:-1},{name:'fixture_compound',partialFilterExpression:{value:{$type:'string'}}});
        d.createCollection('empty');d.users.insertOne({_id:'fixture-user',password:'%s'});
        d.events.insertOne({_id:'future',expires:ISODate('2099-01-01T00:00:00Z')});
        d.events.createIndex({expires:1},{expireAfterSeconds:3600,name:'fixture_ttl'});
        print('SYNTHETIC_DATABASE_SEEDED');""" % (DATABASE, SENTINEL, SENTINEL))
    readback(f, OLD_DNS); f.stop(seed)
    f.step('initialize old-DNS single-member replica set and pause fixture writers')
    source = f.start_mongo('source-replica', source_data, OLD_DNS, replica=True); f.replica_check(source)
    readback(f, OLD_DNS, replica=True); source_config = configuration(f, OLD_DNS)
    require(source_config['_id'] == SET_NAME and source_config['members'][0]['host'] == OLD_DNS + ':27017', 'Source replica identity invalid')
    f.step('capture frozen v1 from actual 4.4.29 replica-set source')
    frozen_result = f.checkpoint('--checkpoint', {'CHECKPOINT_ID': 'frozen', 'CHECKPOINT_FREEZE_EVIDENCE': 'synthetic-writers-stopped',
        'MONGODB_PRIMARY_URI': 'mongodb://' + OLD_DNS + ':27017/' + DATABASE, 'OPENLAP_MONGODB_DB': DATABASE,
        'CHECKPOINT_SOURCE_HOST': OLD_DNS, 'CHECKPOINT_SOURCE_PORT': '27017'}, [f.mount(captures, '/outputs')], network=f.token)
    frozen, frozen_sha = framed(frozen_result, 'OPENLAP-CHECKPOINT-REPORT-V1', 'OPENLAP-CHECKPOINT-REPORT-END-V1')
    require(frozen['schemaVersion'] == 1 and frozen['sourceServerVersion'] == '4.4.29' and frozen['fcv'] == '4.4'
            and frozen['status'] == 'DUMP_AND_ISOLATED_RESTORE_VERIFIED', 'Frozen source qualification invalid')
    require(f.stored_sha(captures, 'frozen/checkpoint.json') == frozen_sha, 'Stored frozen report changed')
    f.step('independently index frozen archive without source access')
    frozen_index_sha, frozen_projection = index(f, captures, frozen_index, 'indexed', '--index-plugin-artifacts', 'frozen', frozen_sha)
    f.stop(source)
    f.step('restore authenticated frozen archive to fresh persistent target')
    result = f.checkpoint('--restore-fresh-volume', {'CHECKPOINT_ID': 'restored', 'CHECKPOINT_TARGET_TOKEN': 'synthetic-renamed-target',
        'CHECKPOINT_FREEZE_EVIDENCE': 'synthetic-old-source-stopped', 'CHECKPOINT_EXPECTED_REPORT_SHA256': frozen_sha,
        'CHECKPOINT_REPORT_PATH': '/inputs/frozen/checkpoint.json', 'CHECKPOINT_ARCHIVE_PATH': '/inputs/frozen/database.archive.gz'},
        [f.mount(captures, '/inputs', True), f.mount(target_data, '/target'), f.mount(restored, '/outputs')])
    receipt, _ = framed(result, 'OPENLAP-PERSISTENT-MONGO-RESTORE-REPORT-V1', 'OPENLAP-PERSISTENT-MONGO-RESTORE-REPORT-END-V1')
    require(receipt['status'] == 'FRESH_PERSISTENT_DATABASE_RESTORE_VERIFIED' and receipt['coldRestartVerified']
            and receipt['cleanShutdownVerified'] and receipt['fsyncVerified'] and receipt['databaseFilesRetained'], 'Persistent target not durable')
    require(receipt['originalReportSha256'] == frozen_sha and receipt['artifactIndexSha256'] == frozen_index_sha
            and f.stored_sha(restored, 'restored/artifact-index.json') == frozen_index_sha, 'Persistent index differs from independent frozen projection')
    f.step('initialize fresh 4.4.29 replica set at new DNS with same set name')
    target = f.start_mongo('renamed-replica', target_data, NEW_DNS, replica=True); f.replica_check(target)
    readback(f, NEW_DNS, replica=True); before_restart = configuration(f, NEW_DNS)
    require(before_restart['_id'] == source_config['_id'] and before_restart['members'][0]['host'] == NEW_DNS + ':27017', 'Renamed replica identity invalid')
    require(before_restart['settings']['replicaSetId'] != source_config['settings']['replicaSetId'],
            'Fresh target incorrectly reused the old replica-set metadata identity')
    f.step('cold-restart same target volume and verify unchanged durable replica configuration')
    f.stop(target, remove=False); f.call(['start', target]); f.replica_check(target)
    require(durable_configuration(configuration(f, NEW_DNS)) == durable_configuration(before_restart),
            'Cold restart changed the durable replica configuration')
    readback(f, NEW_DNS, replica=True)
    f.step('resume one majority-journaled write into existing events collection')
    f.mongo(NEW_DNS, "var d=db.getSiblingDB('%s');assert.commandWorked(d.runCommand({insert:'events',documents:[{_id:'after-rename',value:'majority-journaled-after-rename'}],writeConcern:{w:'majority',j:true}}));print('MAJORITY_JOURNALED_WRITE_VERIFIED');" % DATABASE)
    readback(f, NEW_DNS, replica=True, marker=True)
    expected = json.loads(f.mongo(NEW_DNS, "var d=db.getSiblingDB('%s'),h=d.runCommand({dbHash:1});assert.eq(1,h.ok);var rows=d.getCollectionInfos().map(function(c){return {name:c.name,count:d.getCollection(c.name).countDocuments({}),dataMd5:h.collections[c.name]};});rows.sort(function(a,b){return a.name<b.name?-1:1});print(JSON.stringify(rows));" % DATABASE).stdout)
    require(next(row for row in expected if row['name'] == 'events')['count'] == 2, 'Resumed marker missing before capture')
    f.step('capture online v2 from the restarted renamed 4.4.29 PRIMARY')
    online_result = f.checkpoint('--checkpoint-online', {'CHECKPOINT_ID': 'online', 'PLUGIN_DELETION_ENABLED': 'false',
        'MONGODB_PRIMARY_URI': 'mongodb://' + NEW_DNS + ':27017/', 'OPENLAP_MONGODB_DB': DATABASE,
        'CHECKPOINT_SOURCE_HOST': NEW_DNS, 'CHECKPOINT_SOURCE_PORT': '27017', 'CHECKPOINT_REPLICA_SET': SET_NAME},
        [f.mount(online_captures, '/outputs')], network=f.token)
    online, online_sha = framed(online_result, 'OPENLAP-CHECKPOINT-ONLINE-REPORT-V2', 'OPENLAP-CHECKPOINT-ONLINE-REPORT-END-V2')
    require(online['schemaVersion'] == 2 and online['sourceServerVersion'] == '4.4.29' and online['fcv'] == '4.4'
            and online['status'] == 'INSTANCE_WIDE_OPLOG_REPLAY_VERIFIED' and online['sourceReplicaSet']['name'] == SET_NAME,
            'Fresh online backup does not match renamed source')
    authoritative = [{key: row[key] for key in ['name', 'count', 'dataMd5']} for row in online['collections']]
    require(authoritative == expected, 'Online authoritative replay omitted or changed post-rename source records')
    require(f.stored_sha(online_captures, 'online/checkpoint.json') == online_sha, 'Stored online report changed')
    f.stop(target)
    f.step('independently replay and index online archive with all source servers stopped')
    online_index_sha, online_projection = index(f, online_captures, online_index, 'indexed', '--index-online-plugin-artifacts', 'online', online_sha)
    require(online_index_sha != frozen_index_sha, 'New checkpoint binding unexpectedly equals original frozen binding')
    require(online_projection['artifacts'] == frozen_projection['artifacts'] and online_projection['associations'] == frozen_projection['associations'],
            'Rename changed retained plugin artifact associations')
    f.step('completed local identity-cutover and fresh-online-backup proof')
    return {'schemaVersion': 1, 'status': 'MONGO_RENAME_ROUNDTRIP_VERIFIED', 'checkpointImageId': f.image, 'mongoImage': MONGO_4_4_29,
        'sourceServerVersion': '4.4.29', 'fcv': '4.4', 'database': DATABASE, 'oldHost': OLD_DNS + ':27017', 'newHost': NEW_DNS + ':27017',
        'replicaSetName': SET_NAME, 'frozenCheckpointSchemaVersion': 1, 'frozenReportSha256': frozen_sha,
        'frozenIndexSha256': frozen_index_sha, 'persistentIndexMatchedFrozenIndex': True, 'sourceStoppedBeforePersistentRestore': True,
        'replicaSetNamePreserved': True, 'sameVolumeReplicaSetColdRestartVerified': True, 'durableReplicaConfigurationUnchangedAfterRestart': True,
        'electionTermExcludedFromConfigurationIdentity': True, 'freshReplicaMetadataIdentityVerified': True,
        'retainedCatalogIdsDbrefsIndexesAndContentVerified': True, 'majorityJournaledPostRenameWriteVerified': True,
        'onlineCheckpointSchemaVersion': 2, 'onlineReportSha256': online_sha, 'onlineIndexSha256': online_index_sha,
        'onlineReplayMatchedPostRenameSourceCountsAndDataHashes': True, 'independentOnlineFullReplayAndIndexVerified': True,
        'pluginAssociationsUnchanged': True, 's3BytesVerified': False, 'offNodeBackupVerified': False, 'liveEnvironmentAccess': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True, help='Exact already-loaded local checkpoint image ID; never rebuilt or pulled.')
    options = parser.parse_args()
    if not re.fullmatch(r'sha256:[a-f0-9]{64}', options.image):
        parser.error('--image must be an immutable local SHA-256 image ID')
    with fixture_workspace() as work:
        fixture = Fixture(work, options.image)
        try:
            receipt = run(fixture)
        except (AssertionError, OSError, subprocess.SubprocessError, ValueError, KeyError) as error:
            raise AssertionError('stage=' + fixture.stage + ': ' + str(error)) from None
        finally:
            if not fixture.cleanup():
                if sys.exc_info()[0] is None:
                    raise AssertionError('Owned fixture resource cleanup incomplete')
                print('Owned fixture cleanup incomplete after the original failure.', file=sys.stderr)
        receipt['ownedFixtureCleanupComplete'] = True
        print(json.dumps(receipt, sort_keys=True), flush=True)


if __name__ == '__main__':
    try:
        main()
    except (AssertionError, OSError, subprocess.SubprocessError, ValueError, KeyError) as error:
        print('Mongo rename qualification failed: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
