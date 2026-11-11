#!/usr/bin/env python3
"""Qualify the optional Garage configuration on disposable local Docker storage."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import uuid


ROOT = Path(__file__).resolve().parents[1]
GARAGE = 'dxflrs/garage@sha256:677e5b758e4425a325b811c425c026bf35a4bf42f7ddbaa773de3f4fd779a5a5'
PYTHON = 'python@sha256:e064671ca452259bab50e8e2c7bd896e39e9a343bb06ca25234adf6fe18d0fc7'
AWS = 'public.ecr.aws/aws-cli/aws-cli@sha256:eedfdcb56e9a1b02fabcf656977ca226f40860c6672aca41d435e036bc95a075'


def main():
    prefix = 'openlap-garage-fixture-' + uuid.uuid4().hex[:12]
    network, data, private = [prefix + '-' + suffix for suffix in ('network', 'data', 'private')]
    server = prefix + '-server'
    containers, volumes = [], []
    stage = 'initialization'

    def docker(*arguments, seconds=180):
        process = subprocess.run(['docker', *map(str, arguments)], capture_output=True, timeout=seconds)
        if process.returncode:
            reason = ''
            try:
                diagnostic = json.loads(process.stderr)
                if diagnostic.get('status') == 'GARAGE_CONFIGURATION_REJECTED':
                    reason = ' (' + diagnostic['stage'] + ')'
            except (ValueError, KeyError, TypeError):
                pass
            raise RuntimeError('Docker fixture stage failed: ' + stage + reason)
        return process.stdout

    def run(name, image, arguments, *, mounts=(), env=None, detach=False, user='1000:1000', networked=True):
        command = ['run', '--name', name, '--user', user, '--cap-drop', 'ALL',
                   '--security-opt', 'no-new-privileges', '--read-only']
        if user == '0:0':
            command += ['--cap-add', 'CHOWN']
        command += ['--network', network if networked else 'none']
        if detach:
            command += ['-d', '--network-alias', 'garage']
        for mount in mounts:
            command += ['-v', mount]
        for key, value in (env or {}).items():
            command += ['-e', key + '=' + value]
        containers.append(name)
        return docker(*command, image, *arguments)

    try:
        docker('network', 'create', '--internal', network)
        for volume in (data, private):
            docker('volume', 'create', volume)
            volumes.append(volume)
        with tempfile.TemporaryDirectory(prefix=prefix) as directory:
            fixtures = Path(directory)
            # Native Linux preserves the runner's UID and mkdtemp's 0700 mode.
            # This directory contains only generated disposable fixture keys;
            # fixed UID1000 clients must be able to traverse its read-only bind.
            fixtures.chmod(0o755)
            files = {'rpc-secret': secrets.token_hex(32), 'admin-token': secrets.token_urlsafe(32),
                     'metrics-token': secrets.token_urlsafe(32)}
            for name, value in files.items():
                (fixtures / name).write_text(value)
                (fixtures / name).chmod(0o644)
            # This ownership step applies only to the two freshly created,
            # disposable fixture volumes. Never pass a deployment volume here.
            stage = 'fresh fixture volume ownership'
            run(prefix + '-ownership', PYTHON, ['python3', '-c',
                "import os;os.chown('/data',1000,1000);os.chown('/private',1000,1000)"],
                mounts=[data + ':/data', private + ':/private'], user='0:0', networked=False)
            stage = 'private RAM file preparation'
            run(prefix + '-prepare', PYTHON, ['python3', '-B', '/source/prepare-secrets.py'],
                mounts=[str(ROOT / '.k8s/storage/plugin-garage') + ':/source:ro',
                        str(fixtures) + ':/projected-secrets:ro', private + ':/secrets'], networked=False)
            key, secret = 'GK' + secrets.token_hex(12), secrets.token_hex(32)
            settings = {'GARAGE_ADMIN_ENDPOINT': 'http://garage:3903',
                        'GARAGE_ADMIN_TOKEN': files['admin-token'],
                        'PLUGIN_STORAGE_S3_BUCKET': 'synthetic-plugin-fixture',
                        'PLUGIN_STORAGE_S3_ACCESS_KEY': key,
                        'PLUGIN_STORAGE_S3_SECRET_KEY': secret}
            server_mounts = [str(ROOT / '.k8s/storage/plugin-garage/garage.toml') + ':/etc/garage/garage.toml:ro',
                             private + ':/secrets:ro', data + ':/var/lib/garage']

            def start():
                run(server, GARAGE, ['/garage', '-c', '/etc/garage/garage.toml', 'server', '--single-node'],
                    mounts=server_mounts, detach=True)

            stage = 'initial Garage startup'
            start()
            for attempt in (1, 2):
                stage = 'fresh and repeated application bootstrap'
                output = run(prefix + '-bootstrap-' + str(attempt), PYTHON,
                             ['python3', '-B', '/source/bootstrap.py'], env=settings,
                             mounts=[str(ROOT / '.k8s/maintenance/plugin-garage-bootstrap') + ':/source:ro'])
                result = json.loads(output)
                assert result['status'] == 'GARAGE_APPLICATION_BUCKET_VERIFIED'
            probe = {'AWS_ENDPOINT_URL': 'http://garage:3900', 'AWS_DEFAULT_REGION': 'garage',
                     'AWS_ACCESS_KEY_ID': key, 'AWS_SECRET_ACCESS_KEY': secret,
                     'PLUGIN_STORAGE_S3_BUCKET': settings['PLUGIN_STORAGE_S3_BUCKET'],
                     'PLUGIN_STORAGE_PILOT_CHECK_NETWORK': 'false'}
            mounts = [str(ROOT / '.k8s/maintenance/plugin-garage-smoke') + ':/smoke:ro']
            # The disposable /tmp volume is per client; no shared client cache.
            def client(name, arguments, env):
                command = ['run', '--name', name, '--user', '1000:1000', '--cap-drop', 'ALL',
                           '--security-opt', 'no-new-privileges', '--read-only', '--network', network,
                           '--tmpfs', '/tmp:rw,noexec,nosuid,size=16777216,uid=1000,gid=1000',
                           '-v', mounts[0], '--entrypoint', '/bin/sh']
                for variable, value in env.items():
                    command += ['-e', variable + '=' + value]
                containers.append(name)
                return docker(*command, AWS, *arguments)
            stage = 'independent application client round trip and access denial'
            for attempt in (1, 2):
                output = client(prefix + '-probe-' + str(attempt), ['/smoke/smoke-test.sh'], probe)
                assert output.strip() == b'GARAGE_STORAGE_PROBE_VERIFIED'
            stage = 'pre-restart persistence artifact'
            client(prefix + '-seed', ['-ec',
                'export AWS_EC2_METADATA_DISABLED=true AWS_PAGER=; base64 -d /smoke/probe.jar.b64 >/tmp/old.jar; '
                'aws s3api put-object --bucket "$PLUGIN_STORAGE_S3_BUCKET" --key _pilot/prior-artifact.jar '
                '--body /tmp/old.jar >/dev/null 2>&1'], probe)
            stage = 'cold restart using the same retained fixture volume'
            docker('stop', '--time', '60', server)
            docker('rm', server)
            containers.remove(server)
            start()
            run(prefix + '-bootstrap-after-restart', PYTHON, ['python3', '-B', '/source/bootstrap.py'],
                env=settings, mounts=[str(ROOT / '.k8s/maintenance/plugin-garage-bootstrap') + ':/source:ro'])
            probe.update(PLUGIN_STORAGE_PILOT_REQUIRE_EXISTING='true',
                         PLUGIN_STORAGE_PERSISTENCE_KEY='_pilot/prior-artifact.jar',
                         PLUGIN_STORAGE_PERSISTENCE_SHA256='a53591e422a071af63be62f915f112f2ca26c68d6604d57a893ae2b37ec510c3')
            stage = 'old artifact verified before new upload on cold storage'
            output = client(prefix + '-cold-read', ['/smoke/smoke-test.sh'], probe)
            assert output.strip() == b'GARAGE_STORAGE_PROBE_VERIFIED'
            probe['PLUGIN_STORAGE_PERSISTENCE_SHA256'] = '0' * 64
            stage = 'incorrect prior artifact checksum rejected'
            try:
                client(prefix + '-bad-proof', ['/smoke/smoke-test.sh'], probe)
            except RuntimeError:
                pass
            else:
                raise RuntimeError('Incorrect persistence proof was accepted.')
        print(json.dumps({'status': 'GARAGE_LOCAL_CONTRACT_VERIFIED', 'freshAndRepeatedBootstrap': True,
                          'independentClients': 2, 'coldRestartReadback': True,
                          'wrongPersistenceHashRejected': True,
                          'kubernetesNetworkPolicyEnforcementTested': False}, sort_keys=True))
    finally:
        for name in reversed(containers):
            subprocess.run(['docker', 'rm', '-f', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for name in reversed(volumes):
            subprocess.run(['docker', 'volume', 'rm', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['docker', 'network', 'rm', network], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == '__main__':
    main()
