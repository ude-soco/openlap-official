#!/usr/bin/env python3
"""Qualify an existing standalone volume's optional RS lifecycle locally only."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.k8s/components/plugin-backup-replica-set'
# Same official4.4.30 image used by the qualified checkpoint runtime.
IMAGE = 'mongo@sha256:4be76f674fc4b27859816811b8baa3c51830eb1dbf4ca81a51e26b79edd662ef'
SET = 'synthetic-backup-rs'


def main():
    token = 'openlap-rs-fixture-' + uuid.uuid4().hex[:12]
    network = token + '-network'
    containers, volumes = [], []
    stage = 'initialization'

    def command(args, *, success=True, seconds=180):
        result = subprocess.run(['docker', *map(str, args)], capture_output=True, timeout=seconds)
        if success and result.returncode:
            diagnostics = re.findall(rb'\bMONGODB_REPLICA_SET_[A-Z_]+\b', result.stderr)
            reason = ' (' + diagnostics[-1].decode() + ')' if diagnostics else ''
            raise AssertionError('Replica-set Docker fixture failed during ' + stage + reason)
        return result

    def volume(label):
        name = token + '-' + label
        command(['volume', 'create', '--label', 'org.openlap.rs-fixture=' + token, name])
        volumes.append(name)
        return name

    def remove(name):
        command(['stop', '--time', '60', name], success=False)
        command(['rm', '--force', '--volumes', name])
        containers.remove(name)

    def start(label, data, *, replica=True, alias=None):
        name = token + '-' + label
        alias = alias or label
        host = alias + ':27017'
        args = ['run', '-d', '--name', name, '--label', 'org.openlap.rs-fixture=' + token,
                '--platform=linux/amd64', '--network', network, '--network-alias', alias,
                '--memory=768m', '--pids-limit=256', '--security-opt=no-new-privileges',
                '--mount=type=volume,source=' + data + ',target=/data/db',
                '--tmpfs=/data/configdb:rw,nosuid,size=16777216',
                '--mount=type=bind,source=' + str(SOURCE) + ',target=/opt/openlap-replica-set,readonly',
                '--env=OPENLAP_MONGODB_REPLICA_SET=' + SET,
                '--env=OPENLAP_MONGODB_REPLICA_HOST=' + host,
                '--env=OPENLAP_MONGODB_OPLOG_SIZE_MIB=16',
                '--health-cmd=/bin/bash --noprofile --norc /opt/openlap-replica-set/replica-set.sh verify',
                '--health-interval=2s', '--health-timeout=10s', '--health-retries=1',
                IMAGE, 'mongod', '--bind_ip', '0.0.0.0', '--wiredTigerCacheSizeGB', '0.25', '--quiet']
        if replica:
            args += ['--replSet', SET, '--oplogSize', '16']
        containers.append(name)
        command(args)
        for _ in range(80):
            if js(name, "assert.commandWorked(db.adminCommand({ping:1}));print('READY')", success=False).returncode == 0:
                return name, host
            time.sleep(0.25)
        raise AssertionError('MongoDB fixture did not start.')

    def js(server, source, *, success=True):
        return command(['exec', server, 'mongo', '--norc', '--quiet', '--host', '127.0.0.1', '--port', '27017',
                        '--eval', source], success=success, seconds=30)

    def hook(server, action='initialize', env=(), expected=None):
        args = ['exec']
        for key, value in env:
            args += ['--env=' + key + '=' + value]
        result = command(args + [server, '/bin/bash', '--noprofile', '--norc',
                                  '/opt/openlap-replica-set/replica-set.sh', action], success=False)
        if expected is None:
            if result.returncode:
                diagnostic = js(server, "var module={exports:{}};load('/opt/openlap-replica-set/replica-set.js');var a=db.getSiblingDB('admin'),c=a.runCommand({replSetGetConfig:1}).config,e=module.exports.settings({OPENLAP_MONGODB_REPLICA_SET:_getEnv('OPENLAP_MONGODB_REPLICA_SET'),OPENLAP_MONGODB_REPLICA_HOST:_getEnv('OPENLAP_MONGODB_REPLICA_HOST'),OPENLAP_MONGODB_OPLOG_SIZE_MIB:'16'}),r={};try{module.exports.configuration(c,e);r.configuration='valid'}catch(x){r.configuration=x.check};try{r.primary=module.exports.primary(a,e)}catch(x){r.primary=x.exitCode};print(JSON.stringify(r))", success=False)
                if diagnostic.returncode == 0 and len(diagnostic.stdout) < 8192:
                    print('Disposable fixture check results: ' + diagnostic.stdout.decode().strip())
                raise AssertionError('Replica-set fixture hook rejected: ' + result.stderr.decode().strip())
            assert result.stdout.strip() == b'MONGODB_SINGLE_NODE_PRIMARY_VERIFIED'
        else:
            if result.returncode == 0 or result.stderr.strip() != expected.encode():
                diagnostics = re.findall(rb'\bMONGODB_REPLICA_SET_[A-Z_]+\b', result.stderr)
                reason = diagnostics[-1].decode() if diagnostics else 'NO_FIXED_FAILURE_STATUS'
                raise AssertionError('Expected ' + expected + ' during ' + stage + '; observed ' + reason)
        return result

    def config(server):
        result = js(server, 'print(JSON.stringify(db.adminCommand({replSetGetConfig:1}).config))')
        return json.loads(result.stdout)

    def config_identity(server):
        value = config(server)
        # Elections may advance a term. The configuration version and durable
        # set identity must not be rewritten by repeated lifecycle checks.
        value.pop('term', None)
        return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()

    def wait_primary(server):
        for _ in range(120):
            ready = js(server, "assert.eq(true,db.isMaster().ismaster);assert.eq('4.4',db.adminCommand({getParameter:1,featureCompatibilityVersion:1}).featureCompatibilityVersion.version)", success=False)
            if ready.returncode == 0:
                return
            time.sleep(0.25)
        raise AssertionError('Synthetic replica set did not become FCV4.4 primary.')

    try:
        command(['network', 'create', '--internal', '--label', 'org.openlap.rs-fixture=' + token, network])
        data = volume('retained-data')
        stage = 'standalone startup and seed'
        server, host = start('standalone', data, replica=False, alias='mongo-service')
        js(server, "var d=db.getSiblingDB('openlap_fixture');assert.commandWorked(d.records.insert({_id:'retained',value:'before-rs'}));assert.commandWorked(d.records.createIndex({value:1}));")
        ownership = command(['exec', server, 'stat', '-c', '%u:%g', '/data/db']).stdout.strip()
        hook(server, 'verify', expected='MONGODB_REPLICA_SET_SERVER_PREREQUISITE_REJECTED')
        remove(server)
        stage = 'retained standalone volume starts with explicit replica-set options'
        server, host = start('primary', data, alias='mongo-service')
        hook(server, 'verify', expected='MONGODB_REPLICA_SET_INITIALIZATION_OR_PRIMARY_UNAVAILABLE')
        state = command(['inspect', server, '--format={{.State.Health.Status}}']).stdout.strip()
        assert state in (b'starting', b'unhealthy')
        # Docker DNS remains available while unhealthy. This models the service
        # contract proven separately by publishNotReadyAddresses in the fixture.
        hook(server)
        hook(server, 'verify')
        fingerprint = config_identity(server)
        js(server, "assert.eq('before-rs',db.getSiblingDB('openlap_fixture').records.findOne({_id:'retained'}).value)")
        stage = 'concurrent application writes and idempotent lifecycle verification'
        writers = []
        for writer in range(2):
            source = "var d=db.getSiblingDB('openlap_fixture');for(var i=0;i<100;i++){assert.commandWorked(d.runCommand({insert:'records',documents:[{_id:'writer-" + str(writer) + "-'+i,value:i}],writeConcern:{w:'majority',j:true}}));sleep(5)}"
            process = subprocess.Popen(['docker', 'exec', server, 'mongo', '--norc', '--quiet', '--host', '127.0.0.1',
                                        '--eval', source], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            writers.append(process)
        hook(server)
        for process in writers:
            output, errors = process.communicate(timeout=60)
            assert process.returncode == 0 and len(output) < 65536 and len(errors) < 65536
        assert config_identity(server) == fingerprint
        js(server, "assert.eq(201,db.getSiblingDB('openlap_fixture').records.countDocuments({}))")
        stage = 'wrong existing set host and oplog budget reject without reconfiguration'
        for variable, value, reason in [
                ('OPENLAP_MONGODB_REPLICA_SET', 'different-rs', 'SERVER_PREREQUISITE_REJECTED'),
                ('OPENLAP_MONGODB_REPLICA_HOST', 'different-service:27017', 'EXISTING_CONFIGURATION_REJECTED'),
                ('OPENLAP_MONGODB_OPLOG_SIZE_MIB', '32', 'SERVER_PREREQUISITE_REJECTED')]:
            hook(server, env=[(variable, value)], expected='MONGODB_REPLICA_SET_' + reason)
            assert config_identity(server) == fingerprint
        stage = 'same-volume restart preserves data indexes configuration and ownership'
        remove(server)
        server, host = start('restarted', data, alias='mongo-service')
        hook(server)
        assert config_identity(server) == fingerprint
        assert command(['exec', server, 'stat', '-c', '%u:%g', '/data/db']).stdout.strip() == ownership
        js(server, "var d=db.getSiblingDB('openlap_fixture');assert.eq(201,d.records.countDocuments({}));assert.eq(2,d.records.getIndexes().length);assert.eq('before-rs',d.records.findOne({_id:'retained'}).value)")
        remove(server)

        stage = 'existing non-default member attributes reject unchanged'
        special, special_host = start('nondefault', volume('nondefault-data'))
        js(special, 'assert.commandWorked(rs.initiate({_id:' + json.dumps(SET) + ',members:[{_id:0,host:' + json.dumps(special_host) + ',priority:2}]}))')
        wait_primary(special)
        special_fingerprint = config_identity(special)
        hook(special, expected='MONGODB_REPLICA_SET_EXISTING_CONFIGURATION_REJECTED')
        assert config_identity(special) == special_fingerprint

        stage = 'advertised route to another server rejects before first initialization'
        wrong_data = volume('wrong-route-data')
        wrong, _ = start('wrong-route-fresh', wrong_data)
        # A fresh, uninitialized RS starts below FCV4.4. This component requires
        # an already initialized standalone/RS source and must not upgrade FCV.
        hook(wrong, expected='MONGODB_REPLICA_SET_SERVER_PREREQUISITE_REJECTED')
        js(wrong, 'assert.eq(94,db.adminCommand({replSetGetConfig:1}).code)')
        remove(wrong)
        wrong, _ = start('wrong-route-standalone', wrong_data, replica=False)
        js(wrong, "assert.eq('4.4',db.adminCommand({getParameter:1,featureCompatibilityVersion:1}).featureCompatibilityVersion.version)")
        remove(wrong)
        wrong, _ = start('wrong-route', wrong_data)
        hook(wrong, env=[('OPENLAP_MONGODB_REPLICA_HOST', special_host)],
             expected='MONGODB_REPLICA_SET_ADVERTISED_HOST_IS_NOT_THIS_SERVER')
        js(wrong, 'assert.eq(94,db.adminCommand({replSetGetConfig:1}).code)')
        remove(wrong); remove(special)

        stage = 'multi-member existing configuration rejects unchanged'
        first, first_host = start('multi-first', volume('multi-first-data'))
        second, second_host = start('multi-second', volume('multi-second-data'))
        js(first, 'assert.commandWorked(rs.initiate({_id:' + json.dumps(SET) + ',members:[{_id:0,host:' + json.dumps(first_host) + '},{_id:1,host:' + json.dumps(second_host) + ',priority:0,votes:0}]}))')
        wait_primary(first)
        multi_fingerprint = config_identity(first)
        hook(first, expected='MONGODB_REPLICA_SET_EXISTING_CONFIGURATION_REJECTED')
        assert config_identity(first) == multi_fingerprint and len(config(first)['members']) == 2
        print(json.dumps({'status': 'OPTIONAL_SINGLE_NODE_REPLICA_SET_QUALIFIED',
                          'retainedStandaloneVolumeConverted': True, 'dataIndexesAndVolumeOwnershipPreserved': True,
                          'concurrentMajorityJournaledWrites': 200, 'sameVolumeRestartVerified': True,
                          'unhealthySelfHostBootstrapVerified': True, 'idempotentConfigurationIdentityVerified': True,
                          'wrongSetHostAndOplogBudgetRejected': True, 'wrongAdvertisedServerRejectedBeforeInitialization': True,
                          'unsupportedInitialFcvRejectedWithoutUpgrade': True,
                          'nonDefaultMemberAndMultiMemberConfigurationsRejected': True,
                          'kubernetesEndpointControllerTested': False}, sort_keys=True))
    finally:
        for name in reversed(containers):
            inspected = command(['inspect', name, '--format={{json .Config.Labels}}'], success=False)
            if inspected.returncode == 0 and json.loads(inspected.stdout).get('org.openlap.rs-fixture') == token:
                command(['rm', '--force', '--volumes', name], success=False)
        for name in reversed(volumes):
            inspected = command(['volume', 'inspect', name, '--format={{json .Labels}}'], success=False)
            if inspected.returncode == 0 and json.loads(inspected.stdout).get('org.openlap.rs-fixture') == token:
                command(['volume', 'rm', name], success=False)
        inspected = command(['network', 'inspect', network, '--format={{json .Labels}}'], success=False)
        if inspected.returncode == 0 and json.loads(inspected.stdout).get('org.openlap.rs-fixture') == token:
            command(['network', 'rm', network], success=False)


if __name__ == '__main__':
    main()
