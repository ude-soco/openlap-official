"""Opt-in persistent Mongo restore qualification using disposable synthetic data only.

Run: python3 -B tests/test_plugin_mongo_restore_containers.py [--image sha256:...]
No live cluster, operator configuration, cloud credentials or published port is used.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import uuid

from test_plugin_checkpoint_containers import fixture_workspace

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'analyticsframework'
MONGO = 'mongo@sha256:4be76f674fc4b27859816811b8baa3c51830eb1dbf4ca81a51e26b79edd662ef'
COMPATIBILITY_MONGO = 'mongo@sha256:52c42cbab240b3c5b1748582cc13ef46d521ddacae002bbbda645cebed270ec0'
SENTINEL = 'PRIVATE-PERSISTENT-RESTORE-FIXTURE-MUST-NOT-BE-LOGGED'
START = 'OPENLAP-PERSISTENT-MONGO-RESTORE-REPORT-V1'
END = 'OPENLAP-PERSISTENT-MONGO-RESTORE-REPORT-END-V1'
DB = 'persistent_restore_fixture'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', help='Already loaded immutable local image ID; never rebuilt or pulled.')
    options = parser.parse_args()
    if options.image and not re.fullmatch(r'sha256:[a-f0-9]{64}', options.image):
        parser.error('--image must be an immutable local image ID')
    token = 'openlap-persistent-restore-test-' + uuid.uuid4().hex[:10]
    owned_label = 'org.openlap.mongo-restore-fixture=' + token
    volumes, containers = [], []
    network_created = image_created = False
    image = options.image or token + ':test'
    passed = 0
    with fixture_workspace() as work:
        config = work / 'docker-config'; config.mkdir()
        plugins = Path('/Applications/Docker.app/Contents/Resources/cli-plugins')
        if plugins.is_dir():
            (config / 'config.json').write_text(json.dumps({'cliPluginsExtraDirs': [str(plugins)]}))
        docker = ['docker', '--config', str(config)]

        def call(arguments, timeout=180, expected=0):
            arguments = list(arguments)
            if arguments[0] == 'run':
                if not any(a == '--name' or a.startswith('--name=') for a in arguments):
                    name = token + '-client-' + uuid.uuid4().hex[:8]
                    arguments[1:1] = ['--name=' + name, '--label=' + owned_label]
                else:
                    at = next(i for i, a in enumerate(arguments) if a == '--name' or a.startswith('--name='))
                    name = arguments[at + 1] if arguments[at] == '--name' else arguments[at].split('=', 1)[1]
                containers.append(name)
            try:
                result = subprocess.run(docker + arguments, capture_output=True, text=True, timeout=timeout)
            except (OSError, subprocess.SubprocessError):
                raise AssertionError('Disposable Docker operation did not finish: ' + arguments[0]) from None
            if expected is not None and result.returncode != expected:
                raise AssertionError('Disposable Docker operation failed: ' + arguments[0])
            return result

        def mount(volume, destination, readonly=False):
            return '--mount=type=volume,volume-nocopy,source=' + volume + ',target=' + destination + (',readonly' if readonly else '')

        def volume(suffix):
            name = token + '-' + suffix
            result = call(['volume', 'create', '--label', owned_label, name])
            assert result.stdout.strip() == name
            volumes.append(name)
            call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=none', '--read-only',
                  '--user=0:0', '--cap-drop=ALL', '--cap-add=CHOWN', '--security-opt=no-new-privileges',
                  mount(name, '/volume'), '--entrypoint=/bin/bash', MONGO, '--noprofile', '--norc', '-c',
                  'chmod 0700 /volume; chown 1000:1000 /volume'])
            return name

        def helper(body, mounts=(), arguments=(), expected=0):
            return call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=none', '--read-only',
                         '--user=1000:1000', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=128m',
                         '--pids-limit=32', *mounts, '--entrypoint=/bin/bash', MONGO,
                         '--noprofile', '--norc', '-c', 'set -euo pipefail; umask 077; ' + body,
                         'fixture-helper', *arguments], expected=expected)

        def metadata(volume_name):
            # Only private synthetic fixture file names/digests; raw values never reach output.
            return helper("find /target -mindepth 1 -printf '%P %y %m %u:%g\\n' | sort; "
                          "find /target -type f -exec sha256sum '{}' + | sort",
                          [mount(volume_name, '/target', True)]).stdout

        def source_mongo(code, expected=0):
            return call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=' + token,
                         '--entrypoint=mongo', MONGO, '--norc', '--quiet', '--host=source-mongo', '--eval', code],
                        expected=expected, timeout=20)

        outputs = capture = target = None
        try:
            if options.image:
                assert call(['image', 'inspect', '--format={{.Id}}', image]).stdout.strip() == image
            else:
                context = work / 'context'; (context / 'scripts').mkdir(parents=True)
                shutil.copyfile(MODULE / 'Dockerfile.plugin-checkpoint', context / 'Dockerfile')
                shutil.copytree(MODULE / 'scripts/plugin-checkpoint', context / 'scripts/plugin-checkpoint')
                call(['buildx', 'build', '--load', '--platform=linux/amd64', '--network=none', '-t', image, str(context)], timeout=300)
                image_created = True
            image_id = call(['image', 'inspect', '--format={{.Id}}', image]).stdout.strip()
            assert re.fullmatch(r'sha256:[a-f0-9]{64}', image_id)
            for fixture_image in (MONGO, COMPATIBILITY_MONGO):
                if call(['image', 'inspect', fixture_image], expected=None).returncode:
                    call(['pull', '--platform=linux/amd64', fixture_image], timeout=180)
            capture, outputs = volume('capture'), volume('outputs')
            call(['network', 'create', '--internal', '--label', owned_label, token]); network_created = True
            source = token + '-source'
            call(['run', '-d', '--name=' + source, '--label=' + owned_label, '--pull=never',
                  '--platform=linux/amd64', '--network=' + token, '--network-alias=source-mongo', '--read-only',
                  '--user=1000:1000', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=768m',
                  '--tmpfs=/data/db:rw,nosuid,size=768m,mode=0777', '--tmpfs=/tmp:rw,nosuid,size=16m,mode=1777',
                  '--entrypoint=mongod', MONGO, '--bind_ip_all', '--nounixsocket', '--wiredTigerCacheSizeGB=0.25',
                  '--setParameter=ttlMonitorEnabled=false', '--quiet', '--logpath=/dev/null'])
            for _ in range(30):
                if source_mongo('quit(db.runCommand({ping:1}).ok===1?0:1)', expected=None).returncode == 0:
                    break
            else:
                raise AssertionError('Disposable source failed to become ready')
            source_mongo("""var d=db.getSiblingDB('%s'),h=new Array(65).join('a');
                d['plugin-artifact'].insertOne({_id:'analytics-'+h,kind:'ANALYTICS',sha256:h,
                    sizeBytes:NumberLong(19),objectKey:'plugins/analytics/'+h+'.jar',state:'READY'});
                d['analytics-technique'].insertOne({_id:'current',artifactId:'analytics-'+h,enabled:true});
                d['analytics-indicator'].insertOne({_id:ObjectId('000000000000000000000001'),
                    analyticsTechniqueReference:{analyticsTechnique:new DBRef('analytics-technique','current')},value:'%s'});
                d['analytics-indicator'].createIndex({value:1,_id:-1},{name:'fixture_compound',partialFilterExpression:{value:{$type:'string'}}});
                d.createCollection('empty');
                d.events.insertOne({_id:'future',expires:ISODate('2099-01-01T00:00:00Z')});
                d.events.createIndex({expires:1},{expireAfterSeconds:3600,name:'fixture_ttl'});""" % (DB, SENTINEL))
            common = ['run', '--rm', '--pull=never', '--platform=linux/amd64', '--read-only', '--user=1000:1000',
                      '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=1g', '--pids-limit=128',
                      '--tmpfs=/tmp:rw,nosuid,noexec,size=768m,mode=1777']
            captured = call(common + ['--network=' + token, mount(capture, '/outputs'),
                '--env=CHECKPOINT_ID=captured', '--env=CHECKPOINT_FREEZE_EVIDENCE=synthetic-writers-stopped',
                '--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/' + DB, '--env=OPENLAP_MONGODB_DB=' + DB,
                '--env=CHECKPOINT_SOURCE_HOST=source-mongo', '--env=CHECKPOINT_SOURCE_PORT=27017',
                '--env=CHECKPOINT_MAX_ARCHIVE_MIB=8', '--env=CHECKPOINT_MAX_EXPANDED_MIB=16',
                '--env=CHECKPOINT_MAX_RESTORE_MIB=512', image, '--checkpoint'], timeout=600)
            assert SENTINEL not in captured.stdout + captured.stderr
            lines = captured.stdout.splitlines()
            assert len(lines) == 3 and lines[0] == 'OPENLAP-CHECKPOINT-REPORT-V1' and lines[2] == 'OPENLAP-CHECKPOINT-REPORT-END-V1'
            report = json.loads(lines[1]); report_sha = hashlib.sha256((lines[1] + '\n').encode()).hexdigest()
            assert report['status'] == 'DUMP_AND_ISOLATED_RESTORE_VERIFIED'
            passed += 1
            # Stop/delete the original source before restoring; recovery cannot consult it.
            call(['rm', '--force', '--volumes', source])
            target = volume('target')

            def restore(identifier, destination=target, extra=(), trust=report_sha, readonly_target=False,
                        readonly_inputs=True, target_mount=True, output_mount=True, output_volume=outputs,
                        case='captured', success=False):
                arguments = common + ['--network=none', mount(capture, '/inputs', readonly_inputs),
                    '--env=CHECKPOINT_ID=' + identifier, '--env=CHECKPOINT_FREEZE_EVIDENCE=synthetic-writers-stopped',
                    '--env=CHECKPOINT_TARGET_TOKEN=fixture-target', '--env=CHECKPOINT_EXPECTED_REPORT_SHA256=' + trust,
                    '--env=CHECKPOINT_REPORT_PATH=/inputs/' + case + '/checkpoint.json',
                    '--env=CHECKPOINT_ARCHIVE_PATH=/inputs/' + case + '/database.archive.gz',
                    '--env=CHECKPOINT_MAX_ARCHIVE_MIB=8', '--env=CHECKPOINT_MAX_EXPANDED_MIB=16',
                    '--env=CHECKPOINT_MAX_RESTORE_MIB=512']
                if output_mount:
                    arguments.append(mount(output_volume, '/outputs'))
                if target_mount:
                    arguments.append(mount(destination, '/target', readonly_target))
                result = call(arguments + list(extra) + [image, '--restore-fresh-volume'], expected=None, timeout=600)
                assert SENTINEL not in result.stdout + result.stderr, 'Raw synthetic records escaped to logs'
                if success:
                    fixed = next((l for l in result.stderr.splitlines() if l.startswith('Persistent Mongo restore incomplete:')), 'private diagnostics withheld')
                    assert result.returncode == 0, 'Persistent restore failed; ' + fixed
                    rows = result.stdout.splitlines()
                    assert len(rows) == 3 and rows[0] == START and rows[2] == END
                    receipt = json.loads(rows[1])
                    assert receipt['status'] == 'FRESH_PERSISTENT_DATABASE_RESTORE_VERIFIED'
                    assert receipt['targetToken'] == 'fixture-target' and receipt['database'] == DB
                    assert receipt['targetDbPath'] == '/target'
                    assert receipt['archiveSha256'] == report['archiveSha256'] and receipt['originalReportSha256'] == report_sha
                    assert receipt['originalCheckpointId'] == 'captured'
                    assert receipt['databaseFilesRetained'] and receipt['fsyncVerified'] and receipt['cleanShutdownVerified'] and receipt['coldRestartVerified']
                    check = helper('[[ -f /outputs/$1/restore.json && -f /outputs/$1/artifact-index.json ]]; '
                                   'sha256sum /outputs/$1/artifact-index.json', [mount(outputs, '/outputs', True)], [identifier])
                    assert check.stdout.split()[0] == receipt['artifactIndexSha256']
                    return receipt
                assert result.returncode != 0, 'Unsafe restore input was accepted'
                helper('[[ ! -e /outputs/$1/restore.json ]]', [mount(output_volume, '/outputs', True)], [identifier])
                return result

            version = helper("mkdir /inputs/unsupported-version; "
                "cp /inputs/captured/database.archive.gz /inputs/unsupported-version/; "
                "sed -E 's/\"sourceServerVersion\":\"4[.]4[.][0-9]+\"/\"sourceServerVersion\":\"7.0.0\"/' "
                "/inputs/captured/checkpoint.json > /inputs/unsupported-version/checkpoint.json; "
                "sha256sum /inputs/unsupported-version/checkpoint.json", [mount(capture, '/inputs')]).stdout.split()[0]
            assert version != report_sha
            # Invalid requests must fail before a server can change a target.
            restore('wrong-trust', trust='0' * 64); passed += 1
            restore('unsupported-version', trust=version, case='unsupported-version'); passed += 1
            restore('missing-freeze', extra=['--env=CHECKPOINT_FREEZE_EVIDENCE=']); passed += 1
            restore('missing-token', extra=['--env=CHECKPOINT_TARGET_TOKEN=']); passed += 1
            restore('source-forbidden', extra=['--env=MONGODB_PRIMARY_URI=mongodb://' + SENTINEL + '@unreachable.invalid:1/private']); passed += 1
            restore('writable-inputs', readonly_inputs=False); passed += 1
            restore('readonly-target', readonly_target=True); passed += 1
            restore('missing-target', target_mount=False); passed += 1
            restore('missing-outputs', output_mount=False); passed += 1
            restore('tmpfs-target', target_mount=False, extra=['--tmpfs=/target:rw,nosuid,size=768m,mode=0777']); passed += 1
            restore('tmpfs-outputs', output_mount=False, extra=['--tmpfs=/outputs:rw,nosuid,size=16m,mode=0777']); passed += 1
            assert metadata(target) == ''
            # A shared mount is never an independent fresh target.
            original = metadata(outputs); restore('shared-output', destination=outputs)
            assert metadata(outputs) == original; passed += 1
            original = metadata(capture); restore('shared-input', destination=capture)
            assert metadata(capture) == original; passed += 1
            original = metadata(capture); restore('output-input-alias', output_volume=capture)
            assert metadata(capture) == original; passed += 1
            # Existing and partial destinations must be rejected byte-for-byte unchanged.
            nonempty = volume('nonempty')
            helper("printf 'retain-this-synthetic-file' > /target/keep", [mount(nonempty, '/target')])
            original = metadata(nonempty); restore('nonempty', destination=nonempty)
            assert metadata(nonempty) == original; passed += 1
            partial = volume('partial')
            helper("mkdir /target/db; printf 'partial' > /target/.openlap-mongo-restore-attempt", [mount(partial, '/target')])
            original = metadata(partial); restore('partial-target', destination=partial)
            assert metadata(partial) == original; passed += 1
            # A failure after claiming the target must retain it and block automatic replay.
            fault = work / 'restore-fault'; fault.mkdir(mode=0o755)
            executable = fault / 'mongorestore'
            executable.write_text('#!/bin/bash\nset -eu\nif [[ ${1-} == --version ]]; then exec /usr/bin/mongorestore "$@"; fi\nprintf "%s\\n" "' + SENTINEL + '" >&2\nexit 23\n')
            executable.chmod(0o755)
            failed_target = volume('failed-target')
            restore('restore-tool-failure', destination=failed_target,
                    extra=['--mount=type=bind,source=' + str(fault) + ',target=/fixture-bin,readonly',
                           '--env=PATH=/fixture-bin:/usr/bin:/bin']); passed += 1
            original = metadata(failed_target); assert original
            restore('restore-tool-retry', destination=failed_target)
            assert metadata(failed_target) == original; passed += 1
            publication = work / 'publication-fault'; publication.mkdir(mode=0o755)
            executable = publication / 'ln'
            executable.write_text('#!/bin/bash\nset -eu\ncase "${2-}" in /outputs/*/restore.json.partial) exit 37 ;; esac\nexec /usr/bin/ln "$@"\n')
            executable.chmod(0o755)
            publication_target = volume('publication-target')
            restore('publication-failure', destination=publication_target,
                    extra=['--mount=type=bind,source=' + str(publication) + ',target=/fixture-bin,readonly',
                           '--env=PATH=/fixture-bin:/usr/bin:/bin'])
            helper('[[ ! -e /outputs/publication-failure/artifact-index.json ]]', [mount(outputs, '/outputs', True)])
            original = metadata(publication_target); assert original; passed += 1
            restore('publication-retry', destination=publication_target)
            assert metadata(publication_target) == original; passed += 1
            # A real child killed during shutdown must not masquerade as durable success.
            shutdown = work / 'shutdown-fault'; shutdown.mkdir(mode=0o755)
            executable = shutdown / 'mongod'
            executable.write_text('#!/bin/bash\nset -eu\n/usr/bin/mongod "$@" &\nchild=$!\ntrap \'kill -KILL "$child" 2>/dev/null || true; wait "$child" 2>/dev/null || true; exit 37\' TERM INT\nwait "$child"\n')
            executable.chmod(0o755)
            shutdown_target = volume('shutdown-target')
            restore('unclean-shutdown', destination=shutdown_target,
                    extra=['--mount=type=bind,source=' + str(shutdown) + ',target=/fixture-bin,readonly',
                           '--env=PATH=/fixture-bin:/usr/bin:/bin']); passed += 1
            original = metadata(shutdown_target); assert original
            restore('unclean-shutdown-retry', destination=shutdown_target)
            assert metadata(shutdown_target) == original; passed += 1
            receipt = restore('restored', success=True); passed += 1
            original = metadata(target); restore('repeat', destination=target)
            assert metadata(target) == original; passed += 1
            # A separately started application-compatible Mongo process uses the retained volume,
            # demonstrating this was durable restoration rather than a /tmp-only rehearsal.
            for cold_image, expected_version in [(MONGO, '4.4.30'), (COMPATIBILITY_MONGO, '4.4.29')]:
                cold = token + '-cold-' + expected_version.replace('.', '-')
                call(['run', '-d', '--name=' + cold, '--label=' + owned_label, '--pull=never', '--platform=linux/amd64',
                      '--network=' + token, '--network-alias=cold-mongo', '--read-only', '--user=1000:1000',
                      '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=768m', mount(target, '/target'),
                      '--tmpfs=/tmp:rw,nosuid,size=16m,mode=1777', '--entrypoint=mongod', cold_image, '--dbpath=/target',
                      '--bind_ip_all', '--nounixsocket', '--wiredTigerCacheSizeGB=0.25', '--setParameter=ttlMonitorEnabled=false',
                      '--quiet', '--logpath=/dev/null'])
                readback = """var d=db.getSiblingDB('%s');
                    assert.eq(1,d['plugin-artifact'].countDocuments({}));
                    assert.eq(1,d['analytics-technique'].countDocuments({}));
                    var indicator=d['analytics-indicator'].findOne({_id:ObjectId('000000000000000000000001')});
                    assert(indicator);assert.eq('%s',indicator.value);
                    assert.eq('analytics-technique',indicator.analyticsTechniqueReference.analyticsTechnique.getCollection());
                    assert.eq('current',indicator.analyticsTechniqueReference.analyticsTechnique.getId());
                    assert.eq(1,d['analytics-indicator'].getIndexes().filter(function(i){return i.name==='fixture_compound'&&i.key.value===1&&i.key._id===-1&&i.partialFilterExpression.value.$type==='string';}).length);
                    assert.eq(1,d.events.countDocuments({}));assert.eq(0,d.empty.countDocuments({}));
                    assert.eq(1,d.events.getIndexes().filter(function(i){return i.name==='fixture_ttl'&&i.expireAfterSeconds===3600;}).length);
                    assert.eq('%s',db.version());print('COLD_PERSISTENT_DATABASE_VERIFIED');""" % (DB, SENTINEL, expected_version)
                for _ in range(30):
                    result = call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=' + token,
                        '--entrypoint=mongo', cold_image, '--norc', '--quiet', '--host=cold-mongo', '--eval', readback], expected=None, timeout=20)
                    assert SENTINEL not in result.stdout + result.stderr
                    if result.returncode == 0:
                        break
                else:
                    raise AssertionError('Retained-volume cold readback did not pass')
                assert result.stdout.strip() == 'COLD_PERSISTENT_DATABASE_VERIFIED'; passed += 1
                call(['stop', '--time=20', cold]); call(['rm', '--volumes', cold])
            # Match the application base with the official 4.4.29 compatibility image:
            # and its standard root-to-mongodb ownership/identity handoff.
            vendor = token + '-vendor-entrypoint'
            call(['run', '-d', '--name=' + vendor, '--label=' + owned_label, '--pull=never',
                  '--platform=linux/amd64', '--network=' + token, '--network-alias=vendor-mongo',
                  '--read-only', '--user=0:0', '--cap-drop=ALL', '--cap-add=CHOWN', '--cap-add=DAC_OVERRIDE',
                  '--cap-add=SETUID', '--cap-add=SETGID', '--security-opt=no-new-privileges', '--memory=768m',
                  mount(target, '/data/db'), '--tmpfs=/data/configdb:rw,nosuid,size=16m,mode=0777',
                  '--tmpfs=/tmp:rw,nosuid,size=16m,mode=1777', COMPATIBILITY_MONGO,
                  '--bind_ip_all', '--nounixsocket', '--wiredTigerCacheSizeGB=0.25',
                  '--setParameter=ttlMonitorEnabled=false', '--quiet', '--logpath=/dev/null'])
            for _ in range(30):
                result = call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=' + token,
                    '--entrypoint=mongo', COMPATIBILITY_MONGO, '--norc', '--quiet', '--host=vendor-mongo',
                    '--eval', readback], expected=None, timeout=20)
                assert SENTINEL not in result.stdout + result.stderr
                if result.returncode == 0:
                    break
            else:
                raise AssertionError('Official compatibility vendor-entrypoint readback did not pass')
            assert result.stdout.strip() == 'COLD_PERSISTENT_DATABASE_VERIFIED'
            # Some local Docker engines omit the top API. Read only the UID of
            # PID1 inside this owned synthetic fixture; never inspect a live system.
            labels = json.loads(call(['inspect', '--format={{json .Config.Labels}}', vendor]).stdout)
            assert labels.get('org.openlap.mongo-restore-fixture') == token
            call(['exec', vendor, '/bin/bash', '--noprofile', '--norc', '-c',
                  '[[ $(stat -c %u /data/db) == 999 ]] || exit 1; while read -r key uid rest; do if [[ $key == Uid: ]]; then [[ $uid == 999 ]] && exit 0 || exit 1; fi; done < /proc/1/status; exit 1'])
            helper('[[ $(stat -c %u /target) == 999 ]]', [mount(target, '/target', True)])
            call(['stop', '--time=20', vendor]); call(['rm', '--volumes', vendor]); passed += 1
            # A logical restore excludes local replica metadata. Initialize a fresh member
            # on the same retained volume with a renamed DNS identity using the public
            # component's exact initializer and retain the configured fixture set name.
            replica = token + '-renamed-replica'
            replica_set = 'openlap-fixture-backups'
            replica_host = 'renamed-fixture-mongo:27017'
            component = ROOT / '.k8s/components/plugin-backup-replica-set'
            call(['run', '-d', '--name=' + replica, '--label=' + owned_label, '--pull=never',
                  '--platform=linux/amd64', '--network=' + token, '--network-alias=renamed-fixture-mongo',
                  '--read-only', '--user=0:0', '--cap-drop=ALL', '--cap-add=CHOWN', '--cap-add=DAC_OVERRIDE',
                  '--cap-add=SETUID', '--cap-add=SETGID', '--security-opt=no-new-privileges', '--memory=768m',
                  mount(target, '/data/db'), '--tmpfs=/data/configdb:rw,nosuid,size=16m,mode=0777',
                  '--tmpfs=/tmp:rw,nosuid,size=16m,mode=1777',
                  '--mount=type=bind,source=' + str(component) + ',target=/opt/openlap-replica-set,readonly',
                  '--env=OPENLAP_MONGODB_REPLICA_SET=' + replica_set,
                  '--env=OPENLAP_MONGODB_REPLICA_HOST=' + replica_host,
                  '--env=OPENLAP_MONGODB_OPLOG_SIZE_MIB=16', COMPATIBILITY_MONGO,
                  '--bind_ip_all', '--nounixsocket', '--wiredTigerCacheSizeGB=0.25',
                  '--setParameter=ttlMonitorEnabled=false', '--quiet', '--logpath=/dev/null',
                  '--replSet=' + replica_set, '--oplogSize=16'])
            labels = json.loads(call(['inspect', '--format={{json .Config.Labels}}', replica]).stdout)
            assert labels.get('org.openlap.mongo-restore-fixture') == token
            for action in ['initialize', 'verify', 'initialize', 'verify']:
                initialized = call(['exec', '--user=999:999', replica, '/bin/bash', '--noprofile', '--norc',
                    '/opt/openlap-replica-set/replica-set.sh', action], timeout=170)
                assert initialized.stdout.strip() == 'MONGODB_SINGLE_NODE_PRIMARY_VERIFIED'
                assert SENTINEL not in initialized.stdout + initialized.stderr
            replica_readback = readback.replace("print('COLD_PERSISTENT_DATABASE_VERIFIED');", """
                var hello=db.getSiblingDB('admin').runCommand({isMaster:1});
                assert.eq(true,hello.ismaster);assert.eq('%s',hello.setName);
                assert.eq('%s',hello.primary);assert.eq('%s',hello.me);
                assert.eq(1,hello.hosts.length);assert.eq('%s',hello.hosts[0]);
                var config=db.getSiblingDB('admin').runCommand({replSetGetConfig:1});
                assert.eq(1,config.ok);assert.eq('%s',config.config._id);
                assert.eq(1,config.config.members.length);assert.eq('%s',config.config.members[0].host);
                assert.eq(1,db.getSiblingDB('admin').runCommand({fsync:1}).ok);
                print('RENAMED_REPLICA_PERSISTENT_DATABASE_VERIFIED');""" %
                (replica_set, replica_host, replica_host, replica_host, replica_set, replica_host))
            result = call(['run', '--rm', '--pull=never', '--platform=linux/amd64', '--network=' + token,
                '--entrypoint=mongo', COMPATIBILITY_MONGO, '--norc', '--quiet', '--host=renamed-fixture-mongo',
                '--eval', replica_readback], timeout=30)
            assert SENTINEL not in result.stdout + result.stderr
            assert result.stdout.strip() == 'RENAMED_REPLICA_PERSISTENT_DATABASE_VERIFIED'
            call(['stop', '--time=20', replica])
            assert call(['inspect', '--format={{.State.ExitCode}}', replica]).stdout.strip() == '0'
            call(['rm', '--volumes', replica]); passed += 1
            print(json.dumps({'status': 'PERSISTENT_MONGO_RESTORE_FIXTURES_VERIFIED', 'groups': passed, 'imageId': image_id,
                              'coldRuntimeVersions': ['4.4.30', '4.4.29'],
                              'sourceRemovedBeforeRestore': True, 'retainedTargetColdReadback': True,
                              'compatibilityVendorEntrypointAndDataRootVerified': True,
                              'freshReplicaSetWithRenamedDnsVerified': True,
                              'syntheticDataOnly': True, 'liveEnvironmentAccess': False}), flush=True)
        finally:
            incomplete = False
            for name in reversed(containers):
                result = call(['inspect', '--format={{json .Config.Labels}}', name], expected=None, timeout=20)
                if result.returncode != 0:
                    continue
                if json.loads(result.stdout).get('org.openlap.mongo-restore-fixture') != token:
                    incomplete = True; continue
                if call(['rm', '--force', '--volumes', name], expected=None, timeout=30).returncode:
                    incomplete = True
            for name in reversed(volumes):
                result = call(['volume', 'inspect', '--format={{json .Labels}}', name], expected=None, timeout=20)
                if result.returncode or json.loads(result.stdout).get('org.openlap.mongo-restore-fixture') != token:
                    incomplete = True; continue
                if call(['volume', 'rm', name], expected=None, timeout=30).returncode:
                    incomplete = True
            if network_created and call(['network', 'rm', token], expected=None, timeout=30).returncode:
                incomplete = True
            if image_created:
                call(['image', 'rm', image], expected=None, timeout=30)
            if incomplete:
                raise AssertionError('Owned disposable fixture cleanup incomplete')


if __name__ == '__main__':
    try:
        main()
    except (AssertionError, OSError, subprocess.SubprocessError) as error:
        print('Persistent restore qualification failed: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
