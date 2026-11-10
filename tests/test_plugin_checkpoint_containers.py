"""Opt-in disposable MongoDB 4.4 checkpoint fixtures; no live or credential sources.

Run: python3 -B tests/test_plugin_checkpoint_containers.py
Only the new Dockerfile and its two scripts enter the image build context.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "openlap-analyticsframework"
MONGO = "mongo@sha256:4be76f674fc4b27859816811b8baa3c51830eb1dbf4ca81a51e26b79edd662ef"
SENTINEL = "PRIVATE-FIXTURE-VALUE-MUST-NOT-BE-LOGGED"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', help='Test an already loaded immutable Docker image ID; never pull or rebuild it.')
    args = parser.parse_args()
    if args.image and not re.fullmatch(r'sha256:[a-f0-9]{64}', args.image):
        parser.error('--image must be an immutable local Docker image ID')
    passed = 0
    name = "openlap-checkpoint-test-" + uuid.uuid4().hex[:10]
    image = args.image or name + ":test"
    with tempfile.TemporaryDirectory(prefix="openlap-checkpoint-fixtures-") as temporary:
        work = Path(temporary)
        config = work / "docker-config"; config.mkdir()
        plugin_dir = Path('/Applications/Docker.app/Contents/Resources/cli-plugins')
        if plugin_dir.is_dir():
            (config / 'config.json').write_text(json.dumps({'cliPluginsExtraDirs': [str(plugin_dir)]}))
        context = work / "context"; (context / "scripts").mkdir(parents=True)
        shutil.copyfile(MODULE / "Dockerfile.plugin-checkpoint", context / "Dockerfile")
        shutil.copytree(MODULE / "scripts/plugin-checkpoint", context / "scripts/plugin-checkpoint")
        outputs = work / "outputs"; outputs.mkdir(mode=0o777); outputs.chmod(0o777)
        docker = ["docker", "--config", str(config)]

        def call(args, timeout=180, expected=0):
            result = subprocess.run(docker + args, capture_output=True, text=True, timeout=timeout)
            if expected is not None and result.returncode != expected:
                # Do not relay container output: failure fixtures deliberately contain private values.
                raise AssertionError("Disposable Docker operation failed: " + args[0])
            return result

        def mongo(code):
            return call(["run", "--rm", "--platform=linux/amd64", "--network=" + name,
                         "--entrypoint=mongo", MONGO, "--quiet", "--host=source-mongo", "--eval", code])

        try:
            if args.image:
                assert call(['image', 'inspect', '--format={{.Id}}', image]).stdout.strip() == image
            else:
                call(["buildx", "build", "--load", "--platform=linux/amd64", "--network=none", "-t", image, str(context)])
            call(["network", "create", "--internal", name])
            call(["run", "-d", "--name=" + name, "--network=" + name, "--network-alias=source-mongo",
                  "--platform=linux/amd64", "--read-only", "--user=1000:1000", "--cap-drop=ALL",
                  "--security-opt=no-new-privileges", "--memory=768m", "--tmpfs=/data/db:rw,nosuid,size=768m,mode=0777",
                  "--tmpfs=/tmp:rw,nosuid,noexec,size=16m,mode=1777", "--entrypoint=mongod", MONGO,
                  "--bind_ip_all", "--nounixsocket", "--wiredTigerCacheSizeGB=0.25", "--quiet", "--logpath=/dev/null"])
            ready = False
            for _ in range(30):
                r = subprocess.run(docker + ["run", "--rm", "--platform=linux/amd64", "--network=" + name,
                    "--entrypoint=mongo", MONGO, "--quiet", "--host=source-mongo", "--eval", "quit(db.runCommand({ping:1}).ok===1?0:1)"],
                    capture_output=True, text=True, timeout=15)
                if r.returncode == 0:
                    ready = True; break
            if not ready:
                state = call(["inspect", "--format={{.State.Status}} {{.State.ExitCode}}", name]).stdout.strip()
                raise AssertionError("Disposable source not ready; state=" + state + "; client exit=" + str(r.returncode))
            mongo("""var d=db.getSiblingDB('checkpoint_fixture');
                d.createCollection('catalog', {validator: {value: {$type: 'string'}}});
                d.catalog.insertMany([{_id:ObjectId('000000000000000000000001'),value:'%s'},
                    {_id:'string-id',value:'second'}, {_id:42,value:'numeric'},
                    {_id:{first:1,second:2},value:'ordered document id'}]);
                d.catalog.createIndex({value:1,_id:-1},{name:'compound',partialFilterExpression:{value:{$type:'string'}}});
                d.createCollection('empty');
                d.events.insertOne({_id:'future',expires:ISODate('2099-01-01T00:00:00Z')});
                d.events.createIndex({expires:1},{expireAfterSeconds:3600,name:'ttl'});""" % SENTINEL)
            base = ["run", "--rm", "--platform=linux/amd64", "--network=" + name, "--read-only", "--user=1000:1000",
                    "--cap-drop=ALL", "--security-opt=no-new-privileges", "--memory=1g", "--pids-limit=100",
                    "--tmpfs=/tmp:rw,nosuid,noexec,size=768m,mode=1777",
                    "--mount=type=bind,source=" + str(outputs) + ",target=/outputs",
                    "--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/checkpoint_fixture",
                    "--env=OPENLAP_MONGODB_DB=checkpoint_fixture", "--env=CHECKPOINT_SOURCE_HOST=source-mongo",
                    "--env=CHECKPOINT_SOURCE_PORT=27017", "--env=CHECKPOINT_FREEZE_EVIDENCE=disposable-fixture-writers-stopped",
                    "--env=CHECKPOINT_MAX_ARCHIVE_MIB=8", "--env=CHECKPOINT_MAX_EXPANDED_MIB=16", "--env=CHECKPOINT_MAX_RESTORE_MIB=512"]

            def checkpoint(identifier, extra=(), action="--checkpoint", success=False, counts=None):
                result = call(base + ["--env=CHECKPOINT_ID=" + identifier] + list(extra) + [image, action], expected=None)
                assert SENTINEL not in result.stdout + result.stderr, "Fixture data escaped into console output"
                path = outputs / identifier
                if success:
                    fixed = next((line for line in result.stderr.splitlines() if line.startswith('Checkpoint incomplete:')), 'private diagnostics withheld')
                    assert result.returncode == 0, "Checkpoint failed; " + fixed
                    assert result.stdout.startswith("OPENLAP-CHECKPOINT-REPORT-V1\n")
                    assert result.stdout.endswith("OPENLAP-CHECKPOINT-REPORT-END-V1\n")
                    report = json.loads(result.stdout.splitlines()[1])
                    assert report["status"] == "DUMP_AND_ISOLATED_RESTORE_VERIFIED"
                    assert [row["count"] for row in report["collections"]] == ([4, 0, 1] if counts is None else counts)
                    assert report["freezeVerification"].startswith("External operator")
                    assert report["sourceBeforeAfterMatched"] and report["restoredMatched"]
                    assert (path / "checkpoint.json").is_file()
                    assert hashlib.sha256((path / "database.archive.gz").read_bytes()).hexdigest() == report["archiveSha256"]
                    assert path.stat().st_mode & 0o777 == 0o700
                    assert (path / "checkpoint.json").stat().st_mode & 0o777 == 0o600
                    assert (path / "database.archive.gz").stat().st_mode & 0o777 == 0o600
                else:
                    assert result.returncode != 0
                    if not path.is_symlink():
                        assert not (path / "checkpoint.json").exists()
                return result

            checkpoint("default-denied", action="--configure-checkpoint"); passed += 1
            checkpoint("missing-uri", extra=["--env=MONGODB_PRIMARY_URI="]); passed += 1
            checkpoint("missing-freeze", extra=["--env=CHECKPOINT_FREEZE_EVIDENCE="]); passed += 1
            checkpoint("system-db", extra=["--env=OPENLAP_MONGODB_DB=admin"]); passed += 1
            checkpoint("wrong-endpoint", extra=["--env=CHECKPOINT_SOURCE_HOST=other-source"]); passed += 1
            checkpoint("loopback-source", extra=["--env=CHECKPOINT_SOURCE_HOST=127.0.0.1", "--env=MONGODB_PRIMARY_URI=mongodb://127.0.0.1:27017/checkpoint_fixture"]); passed += 1
            checkpoint("uri-option", extra=["--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/checkpoint_fixture?tlsInsecure=true"]); passed += 1
            checkpoint("../traversal"); passed += 1
            checkpoint("verified", success=True); passed += 1
            old = hashlib.sha256((outputs / "verified" / "checkpoint.json").read_bytes()).hexdigest()
            result = call(base + ["--env=CHECKPOINT_ID=verified", image, "--checkpoint"], expected=None)
            assert result.returncode != 0 and hashlib.sha256((outputs / "verified" / "checkpoint.json").read_bytes()).hexdigest() == old
            passed += 1
            (outputs / "indirect").symlink_to(outputs / "verified", target_is_directory=True)
            checkpoint("indirect"); passed += 1
            assert hashlib.sha256((outputs / 'verified' / 'checkpoint.json').read_bytes()).hexdigest() == old
            unsupported = ['--env=OPENLAP_MONGODB_DB=unsupported_fixture', '--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/unsupported_fixture']
            mongo("db.getSiblingDB('unsupported_fixture').createView('unsupported_view','catalog',[])")
            checkpoint("view-denied", extra=unsupported); passed += 1
            mongo("db.getSiblingDB('unsupported_fixture').dropDatabase(); db.getSiblingDB('unsupported_fixture').createCollection('unsupported_capped',{capped:true,size:4096})")
            checkpoint("capped-denied", extra=unsupported); passed += 1
            mongo("db.getSiblingDB('unsupported_fixture').dropDatabase(); db.getSiblingDB('unsupported_fixture').createCollection('tmp.unsupported')")
            checkpoint("temporary-denied", extra=unsupported); passed += 1
            mongo("db.getSiblingDB('unsupported_fixture').dropDatabase()")
            # A private failing tool deliberately writes a sentinel; no raw subprocess output may escape.
            fake = work / "fake"; fake.mkdir(mode=0o755)
            script = fake / "mongodump"
            script.write_text("#!/bin/bash\nprintf '%s\\n' '" + SENTINEL + "'\nprintf '%s\\n' '" + SENTINEL + "' >&2\nexit 23\n")
            script.chmod(0o755)
            checkpoint("private-failure", extra=["--mount=type=bind,source=" + str(fake) + ",target=/fixture-bin,readonly", "--env=PATH=/fixture-bin:/usr/bin:/bin"])
            assert (outputs / "private-failure" / "database.archive.gz.partial").exists()
            passed += 1
            def stub_case(identifier, tool, body, expected_message=None):
                directory = work / identifier; directory.mkdir(mode=0o755)
                stub = directory / tool; stub.write_text('#!/bin/bash\nset -eu\n' + body + '\n'); stub.chmod(0o755)
                result = checkpoint(identifier, extra=['--mount=type=bind,source=' + str(directory) + ',target=/fixture-bin,readonly',
                                                       '--env=PATH=/fixture-bin:/usr/bin:/bin'])
                if expected_message:
                    assert expected_message in result.stderr, 'Failure did not reach the expected safety gate'
                return result

            stub_case('corrupt-dump', 'mongodump', '/usr/bin/mongodump "$@"\nprintf garbage', 'bounded gzip verification failed')
            assert (outputs / 'corrupt-dump' / 'database.archive.gz.partial').exists(); passed += 1
            stub_case('compressed-budget', 'mongodump', 'head -c 9437184 /dev/zero', 'bounded primary database dump failed')
            assert (outputs / 'compressed-budget' / 'database.archive.gz.partial').stat().st_size <= 8 * 1048576
            passed += 1
            stub_case('expanded-budget', 'mongodump', 'head -c 17825792 /dev/zero | gzip', 'bounded gzip verification failed')
            passed += 1
            stub_case('source-drift', 'mongodump', r'''/usr/bin/mongodump "$@"
/usr/bin/mongo --quiet --host=source-mongo --eval "db.getSiblingDB('checkpoint_fixture').catalog.updateOne({_id:42},{\$set:{value:'changed'}})" >/dev/null 2>/dev/null''', 'source identity, data or metadata changed around the dump')
            assert (outputs / 'source-drift' / 'database.archive.gz.partial').exists(); passed += 1
            stub_case('restore-drift', 'mongorestore', '''/usr/bin/mongorestore "$@"
/usr/bin/mongo --quiet --host=127.0.0.1 --port=37017 --eval "db.getSiblingDB('checkpoint_fixture').catalog.deleteOne({_id:42})" >/dev/null 2>/dev/null''', 'checkpoint report verification failed')
            passed += 1
            checkpoint('restore-budget', extra=['--env=CHECKPOINT_MAX_RESTORE_MIB=1']); passed += 1
            stub_case('publication-failure', 'sync', '''if [[ ${2-} == /outputs/publication-failure ]]; then exit 31; fi
exec /usr/bin/sync "$@"''')
            assert (outputs / 'publication-failure' / 'database.archive.gz').exists(); passed += 1
            stub_case('wrong-local-target', 'mongod', '''mkdir -m 0700 /tmp/unrelated-db
exec /usr/bin/mongod --bind_ip=127.0.0.1 --port=37017 --dbpath=/tmp/unrelated-db --nounixsocket --wiredTigerCacheSizeGB=0.25 --quiet --logpath=/dev/null''', 'isolated loopback MongoDB did not become ready')
            passed += 1
            mongo("db.getSiblingDB('checkpoint_fixture').createUser({user:'fixture-reader',pwd:'%s',roles:[{role:'read',db:'checkpoint_fixture'}]})" % SENTINEL)
            checkpoint('credential-private', extra=['--env=MONGODB_PRIMARY_URI=mongodb://fixture-reader:' + SENTINEL + '@source-mongo:27017/checkpoint_fixture'], success=True)
            passed += 1
            mongo("for(var i=0;i<70;i++){db.getSiblingDB('cursor_fixture').createCollection('collection_'+i)}")
            checkpoint('metadata-cursor', extra=['--env=OPENLAP_MONGODB_DB=cursor_fixture', '--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/cursor_fixture'], success=True, counts=[0] * 70)
            passed += 1
            print("PASS:", passed, "disposable checkpoint fixtures; original archive SHA, full restore, ordered indexes/options, counts/identity/content hashes and private modes verified.")
        finally:
            removals = [["rm", "-f", name], ["network", "rm", name]]
            if not args.image:
                removals.append(["image", "rm", image])
            for removal in removals:
                subprocess.run(docker + removal, capture_output=True, timeout=30)


if __name__ == "__main__":
    main()
