"""Opt-in isolated three-node Garage proof. No deployment credentials or live services.

Run python3 -B tests/test_garage_rf3_containers.py [--image sha256:LOCAL_IMAGE_ID].
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "openlap-analyticsframework"
AWS = "amazon/aws-cli@sha256:bba262340b0bc7cbf3a8a48612531263b56f4b280c4f036a07816af1b271bda0"
CLIENT = r'''
import json, sys, urllib.error, urllib.request
value=json.loads(sys.stdin.buffer.read(65536))
payload=None if value['data'] is None else json.dumps(value['data']).encode()
request=urllib.request.Request(value['endpoint']+'/v2/'+value['operation'], data=payload,
 headers={'Authorization':'Bearer '+value['token'],'Content-Type':'application/json'})
try:
 with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request, timeout=5) as response:
  data=response.read(65537)
  if len(data)>65536: raise RuntimeError()
  json.loads(data); sys.stdout.buffer.write(data)
except urllib.error.HTTPError as error: print(json.dumps({'fixtureHttpFailure':error.code}))
except Exception: print('{"fixtureRequestFailed":true}')
'''
STAGE = r'''
import json, os, pathlib, sys
os.umask(0o077); root=pathlib.Path('/fixture')
if len(sys.argv)>1:
 import shutil
 for name in ('secrets','data0','data1','data2','outputs','payload'):
  path=root/name
  if not path.exists() and not path.is_symlink(): continue
  if path.is_dir() and not path.is_symlink(): shutil.rmtree(path)
  else: path.unlink()
else:
 value=json.loads(sys.stdin.buffer.read(65536))
 (root/'secrets').mkdir(mode=0o700)
 for key,item in value.items(): (root/'secrets'/key).write_text(item)
 for index in range(3): (root/('data'+str(index))).mkdir(mode=0o700)
 (root/'outputs').mkdir(mode=0o777); (root/'outputs').chmod(0o777)
 (root/'payload').write_bytes(b'SYNTHETIC-RF3-OBJECT\n')
'''


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image")
    options = parser.parse_args()
    if options.image and not re.fullmatch(r"sha256:[a-f0-9]{64}", options.image):
        parser.error("Use an immutable local image ID")
    work = Path(tempfile.mkdtemp(prefix="openlap-rf3-fixtures-")).resolve(); work.chmod(0o777)
    docker_config = work / "docker-config"; docker_config.mkdir(mode=0o700)
    plugins = Path("/Applications/Docker.app/Contents/Resources/cli-plugins")
    if plugins.is_dir():
        (docker_config / "config.json").write_text(json.dumps({"cliPluginsExtraDirs": [str(plugins)]}))
    docker = [shutil.which("docker"), "--host=unix:///var/run/docker.sock", "--config", str(docker_config)]
    environment = {"PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": str(work), "LANG": "C"}
    name = "openlap-rf3-it-" + secrets.token_hex(5)
    image = options.image or name + ":fixture"
    config = {"schemaVersion": 1, "installationId": "fixture-" + secrets.token_hex(12),
              "statefulSetName": name, "rpcServiceName": "garage-rpc", "namespace": "fixture",
              "clusterDomain": "cluster.local", "bucket": "openlap-rf3-fixture", "region": "garage",
              "capacityBytes": 64 * 1024**2, "zones": ["fixture-a", "fixture-b", "fixture-c"], "expectedNodeIds": [], "expectedBucketId": ""}
    names = [name + "-" + str(index) for index in range(3)]
    dns = [node + ".garage-rpc.fixture.svc.cluster.local" for node in names]
    fixture = {"rpc-secret": secrets.token_hex(32), "admin-token": secrets.token_hex(32),
               "access-key-id": "GK" + secrets.token_hex(12), "secret-access-key": secrets.token_hex(32)}
    network = built = staged = False
    count = 0
    common = ["run", "--rm", "--pull=never", "--read-only", "--user=1000:1000", "--cap-drop=ALL",
              "--security-opt=no-new-privileges", "--pids-limit=100", "--memory=512m"]

    def call(arguments, payload=None, expected=0, timeout=180, credentials=None):
        try:
            result = subprocess.run(docker + arguments, input=payload, capture_output=True, timeout=timeout,
                                    env=dict(environment, **(credentials or {})))
        except (OSError, subprocess.SubprocessError):
            raise AssertionError("Disposable RF3 operation timed out or could not start") from None
        if expected is not None and result.returncode != expected:
            raise AssertionError("Disposable RF3 operation failed: " + arguments[0])
        return result

    def private_helper(code=STAGE, arguments=(), payload=None):
        return call(common + ["--network=none", "--mount=type=bind,source="+str(work)+",target=/fixture",
                     "--entrypoint=python3", "-i", image, "-B", "-c", code, *arguments], payload=payload)

    def write_config(value=config):
        (work / "settings.json").write_bytes(canonical(value)); (work / "settings.json").chmod(0o644)

    def node(index):
        return call(["run", "-d", "--pull=never", "--name="+names[index], "--hostname="+names[index], "--network="+name,
                     "--network-alias="+dns[index], "--read-only", "--user=1000:1000", "--cap-drop=ALL",
                     "--security-opt=no-new-privileges", "--pids-limit=100", "--memory=512m",
                     "--tmpfs=/tmp:rw,nosuid,noexec,size=16m,mode=1777", "--env=POD_NAME="+names[index],
                     "--env=POD_NAMESPACE=fixture", "--mount=type=bind,source="+str(work/('data'+str(index)))+",target=/data",
                     "--mount=type=bind,source="+str(work/'settings.json')+",target=/config/settings.json,readonly",
                     "--mount=type=bind,source="+str(work/'secrets')+",target=/secrets,readonly", image,
                     "serve", "--config", "/config/settings.json", "--secrets", "/secrets"])

    def api(index, operation, data=None):
        result = call(common + ["--network="+name, "--entrypoint=python3", "-i", image, "-B", "-c", CLIENT],
                      payload=json.dumps({"endpoint":"http://"+dns[index]+":3903", "operation":operation,
                                          "data":data, "token":fixture["admin-token"]}).encode(), timeout=15)
        value=json.loads(result.stdout)
        if isinstance(value,dict) and ("fixtureHttpFailure" in value or "fixtureRequestFailed" in value):
            raise AssertionError("Disposable Garage API request failed")
        return value

    def job(action, identifier, intent=None, digest=None, success=True):
        arguments = common + ["--network="+name, "--tmpfs=/tmp:rw,nosuid,noexec,size=16m,mode=1777",
                     "--mount=type=bind,source="+str(work/'settings.json')+",target=/config/settings.json,readonly",
                     "--mount=type=bind,source="+str(work/'secrets')+",target=/secrets,readonly",
                     "--mount=type=bind,source="+str(work/'outputs')+",target=/outputs"]
        if intent is not None:
            path=work/(identifier+'-intent.json'); path.write_bytes(canonical(intent)); path.chmod(0o644)
            arguments += ["--mount=type=bind,source="+str(path)+",target=/inputs/intent.json,readonly"]
        arguments += [image, action, "--config", "/config/settings.json", "--secrets", "/secrets", "--output", "/outputs/"+identifier]
        if intent is not None: arguments += ["--intent", "/inputs/intent.json", "--intent-sha256", digest]
        result=call(arguments, expected=None)
        assert not any(value.encode() in result.stdout+result.stderr for value in fixture.values()), "Fixture credential escaped into logs"
        fixed = next((line.decode() for line in result.stderr.splitlines() if line.startswith(b'Garage RF3 operation incomplete at ')), 'private diagnostics withheld')
        assert (result.returncode == 0) is success, "RF3 bootstrap outcome differed from expected; " + fixed
        records={}
        for label in ("INTENT","REPORT"):
            marker=("OPENLAP-GARAGE-RF3-"+label+"-V1").encode()
            lines=result.stdout.splitlines()
            if marker in lines:
                offset=lines.index(marker); data=lines[offset+1]+b'\n'
                assert lines[offset+2] == b'SHA256='+hashlib.sha256(data).hexdigest().encode()
                assert lines[offset+3] == ("OPENLAP-GARAGE-RF3-"+label+"-END-V1").encode()
                records[label]=json.loads(data)
        if success: assert records['REPORT']['status'] == 'GARAGE_RF3_CONFIGURATION_VERIFIED'
        else: assert 'REPORT' not in records
        return records

    def s3(index, arguments, success=True):
        result=call(common + ["--network="+name, "--tmpfs=/tmp:rw,nosuid,noexec,size=8m,mode=1777",
                      "--env=AWS_ACCESS_KEY_ID", "--env=AWS_SECRET_ACCESS_KEY", "--env=AWS_CONFIG_FILE=/dev/null",
                      "--env=AWS_SHARED_CREDENTIALS_FILE=/dev/null", "--env=AWS_EC2_METADATA_DISABLED=true",
                      "--env=AWS_MAX_ATTEMPTS=1", "--env=AWS_DEFAULT_REGION=garage", "--env=AWS_PAGER=",
                      "--mount=type=bind,source="+str(work/'payload')+",target=/payload,readonly", AWS,
                      "--endpoint-url", "http://"+dns[index]+":3900", "--region", "garage", "--no-cli-pager",
                      "--cli-connect-timeout", "2", "--cli-read-timeout", "45", *arguments], expected=None, timeout=60,
                    credentials={"AWS_ACCESS_KEY_ID":fixture['access-key-id'],"AWS_SECRET_ACCESS_KEY":fixture['secret-access-key']})
        classification = next((label for marker,label in ((b'Read timeout','client read timeout'),(b'Connect timeout','client connect timeout'),
                              (b'InternalError','server internal failure'),(b'ServiceUnavailable','service unavailable'),(b'AccessDenied','access denied'))
                              if marker in result.stderr),'raw diagnostics withheld')
        assert (result.returncode == 0) is success, "S3 quorum/access outcome differed; " + classification
        return result.stdout

    def wait_down(stopped, observers):
        # Garage's liveness detector is asynchronous; no five-second SLO is implied.
        deadline=time.monotonic()+90
        while True:
            if all(any(row['id']==config['expectedNodeIds'][stopped] and row['isUp'] is False
                       for row in api(index,'GetClusterStatus')['nodes']) for index in observers):
                return
            assert time.monotonic()<deadline, 'Failed node was not detected within the fixture bound'
            time.sleep(1)

    try:
        if options.image:
            assert call(["image","inspect","--format={{.Id}}",image]).stdout.decode().strip() == image
        else:
            context=work/'context'; (context/'scripts').mkdir(parents=True)
            shutil.copyfile(MODULE/'Dockerfile.garage-rf3',context/'Dockerfile')
            shutil.copyfile(MODULE/'scripts/garage-rf3.py',context/'scripts/garage-rf3.py')
            call(["buildx","build","--load","--network=none","-t",image,str(context)],timeout=300); built=True
        denied=call(common+["--network=none",image],expected=None)
        assert denied.returncode != 0 and b'operation incomplete' in denied.stderr; count+=1
        staged=True
        private_helper(payload=json.dumps(fixture).encode())
        write_config()
        call(["network","create","--internal",name]); network=True
        for index in range(3): node(index)
        for index in range(3):
            deadline=time.monotonic()+45
            while True:
                try: api(index,'GetNodeInfo?node=self'); break
                except AssertionError:
                    if time.monotonic()>deadline: raise AssertionError('Disposable server startup failed') from None
                    time.sleep(.25)
        initialized=job('initialize','first'); count+=1
        intent=initialized['INTENT']; intent_sha=hashlib.sha256(canonical(intent)).hexdigest()
        config['expectedNodeIds']=[member['id'] for member in intent['members']]
        config['expectedBucketId']=initialized['REPORT']['bucketId']; write_config()
        job('initialize','idempotent',intent,intent_sha); count+=1
        job('verify','verified',intent,intent_sha); count+=1
        job('verify','wrong-trust',intent,'0'*64,success=False); count+=1
        job('verify','no-overwrite',intent,intent_sha)
        job('verify','no-overwrite',intent,intent_sha,success=False); count+=1
        s3(0,['s3api','put-object','--bucket',config['bucket'],'--key','fixture','--body','/payload']); count+=1
        assert s3(2,['s3','cp','s3://'+config['bucket']+'/fixture','-']) == b'SYNTHETIC-RF3-OBJECT\n'; count+=1
        s3(0,['--no-sign-request','s3api','head-object','--bucket',config['bucket'],'--key','fixture'],success=False); count+=1
        s3(0,['s3api','create-bucket','--bucket','fixture-denied'],success=False); count+=1
        before=[call(['inspect','--format={{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',item]).stdout.strip() for item in names]
        for item in names: call(['rm','-f',item])
        # Hold the previous addresses; this prevents a coldstart proof from accidentally reusing them.
        holds=[]
        for index in range(3):
            hold=name+'-hold-'+str(index)
            call(['run','-d','--name='+hold,'--network='+name,'--read-only','--user=1000:1000','--cap-drop=ALL',
                  '--security-opt=no-new-privileges','--memory=64m','--pids-limit=16',
                  '--entrypoint=python3',image,'-c','import time; time.sleep(300)'])
            holds.append(hold)
        for index in range(3): node(index)
        after=[call(['inspect','--format={{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',item]).stdout.strip() for item in names]
        assert not set(before)&set(after), 'Coldstart reused previous addresses'
        job('verify','cold-restart',intent,intent_sha); count+=1
        assert s3(1,['s3','cp','s3://'+config['bucket']+'/fixture','-']) == b'SYNTHETIC-RF3-OBJECT\n'; count+=1
        call(['stop','-t','10',names[2]])
        wait_down(2,(0,1))
        s3(0,['s3api','put-object','--bucket',config['bucket'],'--key','one-node-down','--body','/payload']); count+=1
        assert s3(1,['s3','cp','s3://'+config['bucket']+'/one-node-down','-']) == b'SYNTHETIC-RF3-OBJECT\n'; count+=1
        call(['stop','-t','10',names[1]])
        wait_down(1,(0,))
        s3(0,['s3api','put-object','--bucket',config['bucket'],'--key','two-nodes-down','--body','/payload'],success=False); count+=1
        call(['start',names[1],names[2]])
        job('verify','quorum-recovered',intent,intent_sha); count+=1
        bucket_id=initialized['REPORT']['bucketId']
        permission={'bucketId':bucket_id,'accessKeyId':fixture['access-key-id'],
                    'permissions':{'read':False,'write':False,'owner':True}}
        api(0,'AllowBucketKey',permission)
        job('verify','unexpected-owner',intent,intent_sha,success=False)
        assert api(0,'GetBucketInfo?id='+bucket_id)['keys'][0]['permissions']['owner'] is True
        api(0,'DenyBucketKey',permission)
        job('verify','owner-restored',intent,intent_sha); count+=1
        call(['stop','-t','10',names[2]])
        private_helper(code="from pathlib import Path; p=Path('/fixture/data2/garage/meta/node_key'); p.rename(p.with_name('node_key.fixture-held'))")
        call(['start',names[2]])
        deadline=time.monotonic()+10
        while call(['inspect','--format={{.State.Status}}',names[2]]).stdout.strip() != b'exited':
            assert time.monotonic()<deadline, 'Retained identity loss did not fail closed'
            time.sleep(.1)
        private_helper(code="from pathlib import Path; p=Path('/fixture/data2/garage/meta/node_key'); assert not p.exists(); p.with_name('node_key.fixture-held').rename(p)")
        call(['start',names[2]])
        job('verify','identity-restored',intent,intent_sha); count+=1
        call(['stop','-t','10',names[2]])
        changed=dict(config,bucket='fixture-unexpected-bucket'); write_config(changed)
        call(['start',names[2]])
        deadline=time.monotonic()+10
        while call(['inspect','--format={{.State.Status}}',names[2]]).stdout.strip() != b'exited':
            assert time.monotonic()<deadline, 'Retained configuration drift did not fail closed'
            time.sleep(.1)
        write_config(); call(['start',names[2]])
        job('verify','configuration-restored',intent,intent_sha); count+=1
        for key in ('fixture','one-node-down','two-nodes-down'):
            s3(0,['s3api','delete-object','--bucket',config['bucket'],'--key',key])
        api(0,'DeleteBucket?id='+bucket_id,{})
        job('initialize','deleted-bucket',intent,intent_sha,success=False)
        assert api(0,'ListBuckets?limit=2') == [], 'Verification recreated a deleted bucket'
        count+=1
        api(0,'CreateBucket',{'globalAlias':config['bucket']})
        replacement=api(0,'ListBuckets?limit=2')[0]['id']
        assert replacement != bucket_id
        api(0,'AllowBucketKey',{'bucketId':replacement,'accessKeyId':fixture['access-key-id'],
                              'permissions':{'read':True,'write':True,'owner':False}})
        job('verify','recreated-alias',intent,intent_sha,success=False)
        assert api(0,'ListBuckets?limit=2')[0]['id'] == replacement, 'Verification changed replacement storage'
        count+=1
    finally:
        original_failure = __import__('sys').exc_info()[0] is not None
        failure=False
        for item in names+[name+'-hold-'+str(index) for index in range(3)]:
            try: failure |= call(['rm','-f',item],expected=None,timeout=30).returncode != 0
            except AssertionError: failure=True
        if network:
            try: failure |= call(['network','rm',name],expected=None,timeout=30).returncode != 0
            except AssertionError: failure=True
        if staged:
            try: private_helper(arguments=('cleanup',))
            except BaseException: failure=True
        if built:
            try: failure |= call(['image','rm',image],expected=None,timeout=30).returncode != 0
            except AssertionError: failure=True
        if not failure:
            try: shutil.rmtree(work)
            except OSError: failure=True
        if failure and not original_failure:
            raise AssertionError('Disposable RF3 cleanup incomplete; private fixture artifacts retained')
        elif failure:
            print('Disposable RF3 cleanup incomplete; original failure preserved.',file=__import__('sys').stderr)
    print('PASS:',count,'disposable RF3 fixtures; exact APIs, immutable intent, limited key, changed-IP cold recovery and 2-of-3 write quorum verified. No worker-placement/production availability claim.')


if __name__ == '__main__':
    main()
