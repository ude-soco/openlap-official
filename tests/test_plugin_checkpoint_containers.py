"""Opt-in disposable MongoDB 4.4 checkpoint fixtures; no live or credential sources.

Run: python3 -B tests/test_plugin_checkpoint_containers.py
Only the checkpoint Dockerfile and its fixed scripts enter the image build context.
"""
import argparse
from contextlib import contextmanager
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "analyticsframework"
MONGO = "mongo@sha256:4be76f674fc4b27859816811b8baa3c51830eb1dbf4ca81a51e26b79edd662ef"
SENTINEL = "PRIVATE-FIXTURE-VALUE-MUST-NOT-BE-LOGGED"

# Run as the same UID as the production writer. The host may be UID 1001 and
# must neither read its private files nor relax their permissions for assertions.
OUTPUT_HELPER = r'''
set -euo pipefail
[[ -d /outputs && ! -L /outputs ]]
action=$1
if [[ $action == cleanup ]]; then
    shopt -s nullglob dotglob
    for entry in /outputs/*; do rm -rf -- "$entry"; done
    exit
fi
if [[ $action == empty ]]; then
    shopt -s nullglob dotglob
    entries=(/outputs/*)
    [[ ${#entries[@]} == 0 ]]
    exit
fi
if [[ $action == symlink ]]; then
    ln -s -- verified /outputs/indirect
    exit
fi
[[ $# -ge 2 && $2 =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]]
directory=/outputs/$2
if [[ $action == no-report ]]; then
    if [[ -L $directory ]]; then exit; fi
    [[ ! -e $directory/checkpoint.json && ! -L $directory/checkpoint.json ]]
    [[ ! -e $directory/rehearsal.json && ! -L $directory/rehearsal.json ]]
    [[ ! -e $directory/artifact-index.json && ! -L $directory/artifact-index.json ]]
    exit
fi
[[ -d $directory && ! -L $directory ]]
if [[ $action == file ]]; then
    [[ $# == 3 ]]
    case $3 in database.archive.gz|database.archive.gz.partial|artifact-index.json.partial|publication-fault-triggered) ;; *) exit 1 ;; esac
    target=$directory/$3
    [[ -f $target && ! -L $target ]]
    printf '{"sizeBytes":%s}\n' "$(stat -c %s -- "$target")"
elif [[ $action == artifact-index ]]; then
    [[ -f $directory/artifact-index.json && ! -L $directory/artifact-index.json ]]
    [[ -f $directory/rehearsal.json && ! -L $directory/rehearsal.json ]]
    index_sha=$(sha256sum -- "$directory/artifact-index.json"); index_sha=${index_sha%% *}
    rehearsal_sha=$(sha256sum -- "$directory/rehearsal.json"); rehearsal_sha=${rehearsal_sha%% *}
    printf '{"index":'; cat -- "$directory/artifact-index.json"
    printf ',"indexSha256":"%s","indexSizeBytes":%s,"rehearsalReportSha256":"%s","directoryMode":"%s","indexMode":"%s"}\n' \
        "$index_sha" "$(stat -c %s -- "$directory/artifact-index.json")" "$rehearsal_sha" \
        "$(stat -c %a -- "$directory")" "$(stat -c %a -- "$directory/artifact-index.json")"
elif [[ $action == rehearsal-summary ]]; then
    [[ -f $directory/rehearsal.json && ! -L $directory/rehearsal.json ]]
    report_sha=$(sha256sum -- "$directory/rehearsal.json"); report_sha=${report_sha%% *}
    printf '{"reportSha256":"%s","directoryMode":"%s","reportMode":"%s"}\n' \
        "$report_sha" "$(stat -c %a -- "$directory")" "$(stat -c %a -- "$directory/rehearsal.json")"
elif [[ $action == summary ]]; then
    [[ -f $directory/checkpoint.json && ! -L $directory/checkpoint.json ]]
    [[ -f $directory/database.archive.gz && ! -L $directory/database.archive.gz ]]
    report_sha=$(sha256sum -- "$directory/checkpoint.json"); report_sha=${report_sha%% *}
    archive_sha=$(sha256sum -- "$directory/database.archive.gz"); archive_sha=${archive_sha%% *}
    printf '{"reportSha256":"%s","archiveSha256":"%s","directoryMode":"%s","reportMode":"%s","archiveMode":"%s"}\n' \
        "$report_sha" "$archive_sha" "$(stat -c %a -- "$directory")" \
        "$(stat -c %a -- "$directory/checkpoint.json")" "$(stat -c %a -- "$directory/database.archive.gz")"
else
    exit 1
fi
'''

# Only this fixed helper stages/mutates synthetic retrieved copies. Capture input
# is read-only; the separate fixture inputs mount is writable only for setup.
INPUT_HELPER = r'''
set -euo pipefail
umask 077
[[ -d /inputs && ! -L /inputs ]]
action=$1
if [[ $action == cleanup ]]; then
    shopt -s nullglob dotglob
    for entry in /inputs/*; do rm -rf -- "$entry"; done
    exit
fi
if [[ $action == empty ]]; then
    shopt -s nullglob dotglob
    entries=(/inputs/*)
    [[ ${#entries[@]} == 0 ]]
    exit
fi
[[ ( $# == 3 || $# == 4 ) && $2 =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]]
directory=/inputs/$2
if [[ $action == stage ]]; then
    capture=${4:-verified}
    [[ $capture =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ && -d /captures/$capture && ! -L /captures/$capture ]]
    if [[ $3 == ancestor-symlink ]]; then
        ln -s -- retrieved /inputs/$2
    else
        mkdir -m 0700 -- "$directory"
        cp -- "/captures/$capture/checkpoint.json" "/captures/$capture/database.archive.gz" "$directory/"
        case $3 in
            original) ;;
            corrupt-report) printf '%s\n' '{"private":"PRIVATE-FIXTURE-VALUE-MUST-NOT-BE-LOGGED"' > "$directory/checkpoint.json" ;;
            oversized-report) head -c 262145 /dev/zero > "$directory/checkpoint.json" ;;
            corrupt-archive) printf X | dd of="$directory/database.archive.gz" bs=1 count=1 conv=notrunc status=none ;;
            archive-symlink) mv -- "$directory/database.archive.gz" "$directory/archive.original"; ln -s -- archive.original "$directory/database.archive.gz" ;;
            report-symlink) mv -- "$directory/checkpoint.json" "$directory/report.original"; ln -s -- report.original "$directory/checkpoint.json" ;;
            schema|false-flag|source-identity|archive-size|expanded-size|logical-data|logical-count|logical-indexes|logical-options|corrupt-gzip)
                if [[ $3 == corrupt-gzip ]]; then printf 'corruption' >> "$directory/database.archive.gz"; fi
                archive_sha=$(sha256sum -- "$directory/database.archive.gz"); archive_sha=${archive_sha%% *}
                FIXTURE_CASE_REPORT="$directory/checkpoint.json" FIXTURE_MUTATION="$3" \
                FIXTURE_ARCHIVE_SHA256="$archive_sha" FIXTURE_ARCHIVE_SIZE="$(stat -c %s -- "$directory/database.archive.gz")" \
                mongo --nodb --norc --quiet --eval '
                    (function() {
                        var path = _getEnv("FIXTURE_CASE_REPORT"), report = JSON.parse(cat(path));
                        switch (_getEnv("FIXTURE_MUTATION")) {
                            case "schema": report.unexpectedField = true; break;
                            case "false-flag": report.restoredMatched = false; break;
                            case "source-identity": report.sourceIdentityMd5 = "00000000000000000000000000000000"; break;
                            case "archive-size": report.archiveSizeBytes += 1; break;
                            case "expanded-size": report.expandedArchiveBytes += 1; break;
                            case "logical-data": report.collections[0].dataMd5 = "00000000000000000000000000000000"; break;
                            case "logical-count": report.collections[0].count += 1; break;
                            case "logical-indexes": report.collections[0].indexesMd5 = "00000000000000000000000000000000"; break;
                            case "logical-options": report.collections[0].optionsMd5 = "00000000000000000000000000000000"; break;
                            case "corrupt-gzip":
                                report.archiveSha256 = _getEnv("FIXTURE_ARCHIVE_SHA256");
                                report.archiveSizeBytes = Number(_getEnv("FIXTURE_ARCHIVE_SIZE")); break;
                            default: quit(1);
                        }
                        writeFile(path + ".mutated", JSON.stringify(report) + "\n");
                    }());' >/dev/null
                mv -- "$directory/checkpoint.json.mutated" "$directory/checkpoint.json"
                ;;
            *) exit 1 ;;
        esac
    fi
elif [[ $action != summary || $3 != original ]]; then
    exit 1
fi
report_sha=$(sha256sum -- "$directory/checkpoint.json"); report_sha=${report_sha%% *}
archive_sha=$(sha256sum -- "$directory/database.archive.gz"); archive_sha=${archive_sha%% *}
printf '{"reportSha256":"%s","archiveSha256":"%s"}\n' "$report_sha" "$archive_sha"
'''


@contextmanager
def fixture_workspace():
    path = Path(tempfile.mkdtemp(prefix="openlap-checkpoint-fixtures-"))
    try:
        yield path
    finally:
        original_failure = sys.exc_info()[0] is not None
        try:
            shutil.rmtree(path)
        except OSError:
            if not original_failure:
                raise AssertionError("Fixture workspace cleanup failed; private fixture outputs retained") from None
            print("Fixture workspace cleanup incomplete; original test failure preserved.", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', help='Test an already loaded immutable Docker image ID; never pull or rebuild it.')
    args = parser.parse_args()
    if args.image and not re.fullmatch(r'sha256:[a-f0-9]{64}', args.image):
        parser.error('--image must be an immutable local Docker image ID')
    passed = 0
    name = "openlap-checkpoint-test-" + uuid.uuid4().hex[:10]
    index_volume = name + "-index"
    image = args.image or name + ":test"
    with fixture_workspace() as work:
        config = work / "docker-config"; config.mkdir()
        plugin_dir = Path('/Applications/Docker.app/Contents/Resources/cli-plugins')
        if plugin_dir.is_dir():
            (config / 'config.json').write_text(json.dumps({'cliPluginsExtraDirs': [str(plugin_dir)]}))
        context = work / "context"; (context / "scripts").mkdir(parents=True)
        shutil.copyfile(MODULE / "Dockerfile.plugin-checkpoint", context / "Dockerfile")
        shutil.copytree(MODULE / "scripts/plugin-checkpoint", context / "scripts/plugin-checkpoint")
        outputs = work / "outputs"; outputs.mkdir(mode=0o777); outputs.chmod(0o777)
        inputs = work / "inputs"; inputs.mkdir(mode=0o777); inputs.chmod(0o777)
        docker = ["docker", "--config", str(config)]
        created_image = created_network = created_source = created_index_volume = False

        def call(args, timeout=180, expected=0):
            try:
                result = subprocess.run(docker + args, capture_output=True, text=True, timeout=timeout)
            except (OSError, subprocess.SubprocessError):
                raise AssertionError("Disposable Docker operation could not finish: " + args[0]) from None
            if expected is not None and result.returncode != expected:
                # Do not relay container output: failure fixtures deliberately contain private values.
                raise AssertionError("Disposable Docker operation failed: " + args[0])
            return result

        def mongo(code):
            return call(["run", "--rm", "--platform=linux/amd64", "--network=" + name,
                         "--entrypoint=mongo", MONGO, "--quiet", "--host=source-mongo", "--eval", code])

        def output_helper(action, *arguments, index_outputs=False):
            mount = ("--mount=type=volume,source=" + index_volume + ",target=/outputs" if index_outputs
                     else "--mount=type=bind,source=" + str(outputs) + ",target=/outputs")
            if action not in ("cleanup", "symlink"):
                mount += ",readonly"
            result = call(["run", "--rm", "--pull=never", "--platform=linux/amd64", "--network=none", "--read-only",
                           "--user=1000:1000", "--cap-drop=ALL", "--security-opt=no-new-privileges",
                           "--memory=64m", "--pids-limit=32", mount, "--entrypoint=/bin/bash", MONGO,
                           "--noprofile", "--norc", "-c", OUTPUT_HELPER, "fixture-output-helper", action, *arguments], timeout=30)
            return json.loads(result.stdout) if result.stdout else None

        def input_helper(action, identifier="unused", mutation="original", capture="verified"):
            mount = "--mount=type=bind,source=" + str(inputs) + ",target=/inputs"
            if action in ("summary", "empty"):
                mount += ",readonly"
            result = call(["run", "--rm", "--pull=never", "--platform=linux/amd64", "--network=none", "--read-only",
                           "--user=1000:1000", "--cap-drop=ALL", "--security-opt=no-new-privileges",
                           "--memory=128m", "--pids-limit=32", mount,
                           "--mount=type=bind,source=" + str(outputs) + ",target=/captures,readonly",
                           "--entrypoint=/bin/bash", MONGO, "--noprofile", "--norc", "-c", INPUT_HELPER,
                           "fixture-input-helper", action, identifier, mutation, capture], timeout=30)
            return json.loads(result.stdout) if result.stdout else None

        try:
            if args.image:
                assert call(['image', 'inspect', '--format={{.Id}}', image]).stdout.strip() == image
            else:
                call(["buildx", "build", "--load", "--platform=linux/amd64", "--network=none", "-t", image, str(context)])
                created_image = True
            # Projection rules are tested against real BSON types in a no-server,
            # no-network shell; only this public synthetic fixture is mounted.
            projected = call(["run", "--rm", "--pull=never", "--platform=linux/amd64", "--network=none", "--read-only",
                "--user=1000:1000", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--memory=256m",
                "--mount=type=bind,source=" + str(ROOT / "tests/plugin_artifact_index_fixtures.js") + ",target=/fixtures/projection.js,readonly",
                "--entrypoint=mongo", image, "--nodb", "--norc", "--quiet", "/fixtures/projection.js"])
            assert re.fullmatch(r"PASS: [0-9]+ synthetic artifact index projection fixtures\n", projected.stdout)
            assert SENTINEL not in projected.stdout + projected.stderr
            print(projected.stdout.strip(), flush=True)
            call(["volume", "create", index_volume]); created_index_volume = True
            # Test-only preparation models a retained fsGroup-owned claim. The
            # installable index mode itself has no initializer or chmod/chown.
            call(["run", "--rm", "--platform=linux/amd64", "--network=none", "--read-only", "--user=0:0",
                "--cap-drop=ALL", "--cap-add=CHOWN", "--security-opt=no-new-privileges",
                "--mount=type=volume,source=" + index_volume + ",target=/outputs", "--entrypoint=/bin/bash", MONGO,
                "--noprofile", "--norc", "-c", "chmod 0700 /outputs; chown 1000:1000 /outputs"])
            def index_parent(mode):
                call(["run", "--rm", "--platform=linux/amd64", "--network=none", "--read-only", "--user=1000:1000",
                    "--cap-drop=ALL", "--security-opt=no-new-privileges",
                    "--mount=type=volume,source=" + index_volume + ",target=/outputs", "--entrypoint=/bin/bash", MONGO,
                    "--noprofile", "--norc", "-c", 'chmod "$1" /outputs; [[ $(stat -c %a /outputs) == "$2" ]]',
                    "fixture-sgid-parent", mode, mode.lstrip("0")])
            index_parent("02770")
            call(["network", "create", "--internal", name])
            created_network = True
            call(["run", "-d", "--name=" + name, "--network=" + name, "--network-alias=source-mongo",
                  "--platform=linux/amd64", "--read-only", "--user=1000:1000", "--cap-drop=ALL",
                  "--security-opt=no-new-privileges", "--memory=768m", "--tmpfs=/data/db:rw,nosuid,size=768m,mode=0777",
                  "--tmpfs=/tmp:rw,nosuid,noexec,size=16m,mode=1777", "--entrypoint=mongod", MONGO,
                  "--bind_ip_all", "--nounixsocket", "--wiredTigerCacheSizeGB=0.25", "--quiet", "--logpath=/dev/null"])
            created_source = True
            ready = False
            for _ in range(30):
                r = call(["run", "--rm", "--platform=linux/amd64", "--network=" + name,
                    "--entrypoint=mongo", MONGO, "--quiet", "--host=source-mongo", "--eval", "quit(db.runCommand({ping:1}).ok===1?0:1)"],
                    timeout=15, expected=None)
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
                    stored = output_helper("summary", identifier)
                    assert stored["archiveSha256"] == report["archiveSha256"]
                    assert stored["reportSha256"] == hashlib.sha256((result.stdout.splitlines()[1] + '\n').encode()).hexdigest()
                    assert stored["directoryMode"] == "700"
                    assert stored["reportMode"] == stored["archiveMode"] == "600"
                else:
                    assert result.returncode != 0
                    if re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}', identifier):
                        output_helper("no-report", identifier)
                    else:
                        output_helper("empty")
                return result

            checkpoint("default-denied", action="--configure-checkpoint"); passed += 1
            checkpoint("missing-uri", extra=["--env=MONGODB_PRIMARY_URI="]); passed += 1
            checkpoint("missing-freeze", extra=["--env=CHECKPOINT_FREEZE_EVIDENCE="]); passed += 1
            checkpoint("system-db", extra=["--env=OPENLAP_MONGODB_DB=admin"]); passed += 1
            checkpoint("wrong-endpoint", extra=["--env=CHECKPOINT_SOURCE_HOST=other-source"]); passed += 1
            checkpoint("loopback-source", extra=["--env=CHECKPOINT_SOURCE_HOST=127.0.0.1", "--env=MONGODB_PRIMARY_URI=mongodb://127.0.0.1:27017/checkpoint_fixture"]); passed += 1
            checkpoint("uri-option", extra=["--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/checkpoint_fixture?tlsInsecure=true"]); passed += 1
            checkpoint("../traversal"); passed += 1
            verified = checkpoint("verified", success=True)
            verified_report = json.loads(verified.stdout.splitlines()[1]); passed += 1
            old = output_helper("summary", "verified")["reportSha256"]
            result = call(base + ["--env=CHECKPOINT_ID=verified", image, "--checkpoint"], expected=None)
            assert result.returncode != 0 and output_helper("summary", "verified")["reportSha256"] == old
            passed += 1
            output_helper("symlink")
            checkpoint("indirect"); passed += 1
            assert output_helper("summary", "verified")["reportSha256"] == old
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
            output_helper("file", "private-failure", "database.archive.gz.partial")
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
            output_helper("file", "corrupt-dump", "database.archive.gz.partial"); passed += 1
            stub_case('compressed-budget', 'mongodump', 'head -c 9437184 /dev/zero', 'bounded primary database dump failed')
            assert output_helper("file", "compressed-budget", "database.archive.gz.partial")["sizeBytes"] <= 8 * 1048576
            passed += 1
            stub_case('expanded-budget', 'mongodump', 'head -c 17825792 /dev/zero | gzip', 'bounded gzip verification failed')
            passed += 1
            stub_case('source-drift', 'mongodump', r'''/usr/bin/mongodump "$@"
/usr/bin/mongo --quiet --host=source-mongo --eval "db.getSiblingDB('checkpoint_fixture').catalog.updateOne({_id:42},{\$set:{value:'changed'}})" >/dev/null 2>/dev/null''', 'source identity, data or metadata changed around the dump')
            output_helper("file", "source-drift", "database.archive.gz.partial"); passed += 1
            stub_case('restore-drift', 'mongorestore', '''/usr/bin/mongorestore "$@"
/usr/bin/mongo --quiet --host=127.0.0.1 --port=37017 --eval "db.getSiblingDB('checkpoint_fixture').catalog.deleteOne({_id:42})" >/dev/null 2>/dev/null''', 'checkpoint report verification failed')
            passed += 1
            checkpoint('restore-budget', extra=['--env=CHECKPOINT_MAX_RESTORE_MIB=1']); passed += 1
            stub_case('publication-failure', 'sync', '''if [[ ${2-} == /outputs/publication-failure ]]; then exit 31; fi
exec /usr/bin/sync "$@"''')
            output_helper("file", "publication-failure", "database.archive.gz"); passed += 1
            stub_case('wrong-local-target', 'mongod', '''mkdir -m 0700 /tmp/unrelated-db
exec /usr/bin/mongod --bind_ip=127.0.0.1 --port=37017 --dbpath=/tmp/unrelated-db --nounixsocket --wiredTigerCacheSizeGB=0.25 --quiet --logpath=/dev/null''', 'isolated loopback MongoDB did not become ready')
            passed += 1
            mongo("db.getSiblingDB('checkpoint_fixture').createUser({user:'fixture-reader',pwd:'%s',roles:[{role:'read',db:'checkpoint_fixture'}]})" % SENTINEL)
            checkpoint('credential-private', extra=['--env=MONGODB_PRIMARY_URI=mongodb://fixture-reader:' + SENTINEL + '@source-mongo:27017/checkpoint_fixture'], success=True)
            passed += 1
            mongo("for(var i=0;i<70;i++){db.getSiblingDB('cursor_fixture').createCollection('collection_'+i)}")
            checkpoint('metadata-cursor', extra=['--env=OPENLAP_MONGODB_DB=cursor_fixture', '--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/cursor_fixture'], success=True, counts=[0] * 70)
            passed += 1

            retrieved = input_helper("stage", "retrieved")
            assert retrieved["reportSha256"] == old
            assert retrieved["archiveSha256"] == verified_report["archiveSha256"]

            def rehearse(identifier, case="retrieved", expected_sha=None, extra=(), success=False, readonly=True, preserve_existing=False, expected_message=None, plugin_index=False):
                mount = "--mount=type=bind,source=" + str(inputs) + ",target=/inputs"
                if readonly:
                    mount += ",readonly"
                output_mount = ("--mount=type=volume,source=" + index_volume + ",target=/outputs" if plugin_index
                                else "--mount=type=bind,source=" + str(outputs) + ",target=/outputs")
                arguments = ["run", "--rm", "--pull=never", "--platform=linux/amd64", "--network=none", "--read-only",
                             "--user=1000:1000", "--cap-drop=ALL", "--security-opt=no-new-privileges",
                             "--memory=1g", "--pids-limit=100", "--tmpfs=/tmp:rw,nosuid,noexec,size=768m,mode=1777",
                             mount, output_mount,
                             "--env=CHECKPOINT_ID=" + identifier,
                             "--env=CHECKPOINT_ARCHIVE_PATH=/inputs/" + case + "/database.archive.gz",
                             "--env=CHECKPOINT_REPORT_PATH=/inputs/" + case + "/checkpoint.json",
                             "--env=CHECKPOINT_MAX_ARCHIVE_MIB=8", "--env=CHECKPOINT_MAX_EXPANDED_MIB=16",
                             "--env=CHECKPOINT_MAX_RESTORE_MIB=512"]
                if expected_sha is not None:
                    arguments.append("--env=CHECKPOINT_EXPECTED_REPORT_SHA256=" + expected_sha)
                result = call(arguments + list(extra) + [image, "--index-plugin-artifacts" if plugin_index else "--rehearse-archive"], expected=None)
                assert SENTINEL not in result.stdout + result.stderr, "Retrieved fixture data escaped into console output"
                if success:
                    fixed = next((line for line in result.stderr.splitlines() if line.startswith('Checkpoint rehearsal incomplete:')), 'private diagnostics withheld')
                    assert result.returncode == 0, "Retrieved archive rehearsal failed; " + fixed
                    if plugin_index:
                        assert result.stdout.startswith("OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1\n")
                        assert result.stdout.endswith("OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1\n")
                        summary = json.loads(result.stdout.splitlines()[1])
                        assert summary["status"] == "CHECKPOINT_PLUGIN_ARTIFACT_INDEX_VERIFIED"
                        assert summary["originalCheckpointReportSha256"] == expected_sha
                        stored = output_helper("artifact-index", identifier, index_outputs=True)
                        assert summary["artifactIndexSha256"] == stored["indexSha256"]
                        assert summary["artifactIndexSizeBytes"] == stored["indexSizeBytes"]
                        assert summary["rehearsalReportSha256"] == stored["rehearsalReportSha256"]
                        assert stored["index"]["binding"]["originalCheckpointReportSha256"] == expected_sha
                        assert stored["index"]["binding"]["archiveSha256"] == input_helper("summary", case)["archiveSha256"]
                        assert stored["directoryMode"] == "2700" and stored["indexMode"] == "600"
                        assert SENTINEL not in json.dumps(stored)
                        return stored
                    assert result.stdout.startswith("OPENLAP-CHECKPOINT-REHEARSAL-REPORT-V1\n")
                    assert result.stdout.endswith("OPENLAP-CHECKPOINT-REHEARSAL-REPORT-END-V1\n")
                    report = json.loads(result.stdout.splitlines()[1])
                    assert report["status"] == "RETRIEVED_ARCHIVE_RESTORE_VERIFIED"
                    assert report["originalReportSha256"] == expected_sha
                    assert report["archiveSha256"] == verified_report["archiveSha256"]
                    assert report["collections"] == verified_report["collections"]
                    stored = output_helper("rehearsal-summary", identifier)
                    assert stored["reportSha256"] == hashlib.sha256((result.stdout.splitlines()[1] + '\n').encode()).hexdigest()
                    assert stored["directoryMode"] == "700" and stored["reportMode"] == "600"
                else:
                    assert result.returncode != 0
                    if not preserve_existing:
                        output_helper("no-report", identifier, index_outputs=plugin_index)
                    if expected_message:
                        assert expected_message in result.stderr, "Rehearsal did not reach the expected safety gate"
                return result

            rehearse("rehearsed", expected_sha=old, success=True); passed += 1
            assert input_helper("summary", "retrieved") == retrieved
            provenance = input_helper("stage", "retrieved-source-identity", "source-identity")
            result = rehearse("rehearsed-source-identity", case="retrieved-source-identity",
                              expected_sha=provenance["reportSha256"], success=True)
            assert json.loads(result.stdout.splitlines()[1])["originalSourceIdentityMd5"] == "0" * 32
            passed += 1
            rehearsal_sha = output_helper("rehearsal-summary", "rehearsed")["reportSha256"]
            # Reusing a destination must preserve its successful report byte-for-byte.
            result = rehearse("rehearsed", expected_sha=old, preserve_existing=True)
            assert result.returncode != 0
            assert output_helper("rehearsal-summary", "rehearsed")["reportSha256"] == rehearsal_sha
            passed += 1
            rehearse("rehearsal-missing-trust"); passed += 1
            rehearse("rehearsal-wrong-trust", expected_sha="0" * 64); passed += 1
            for mutation in ("corrupt-report", "schema", "false-flag", "oversized-report", "corrupt-archive",
                             "archive-size", "expanded-size", "logical-data", "logical-count", "logical-indexes",
                             "logical-options", "corrupt-gzip", "archive-symlink", "report-symlink", "ancestor-symlink"):
                case = "retrieved-" + mutation
                staged = input_helper("stage", case, mutation)
                expected_message = "rehearsal report verification failed" if mutation.startswith("logical-") else None
                if mutation == "corrupt-archive":
                    expected_message = "retrieved archive bytes differ from the trusted report"
                rehearse("rehearsal-" + mutation, case=case, expected_sha=staged["reportSha256"], expected_message=expected_message)
                passed += 1
            rehearse("rehearsal-writable-inputs", expected_sha=old, readonly=False); passed += 1
            rehearse("rehearsal-forbidden-source", expected_sha=old,
                     extra=["--env=MONGODB_PRIMARY_URI=mongodb://" + SENTINEL + "@unreachable.invalid:1/private"])
            passed += 1
            failure = work / "rehearsal-publication-failure"; failure.mkdir(mode=0o755)
            stub = failure / "sync"
            stub.write_text('#!/bin/bash\nset -eu\nif [[ ${2-} == /outputs/rehearsal-publication-failure ]]; then : > "$2/publication-fault-triggered"; exit 31; fi\nexec /usr/bin/sync "$@"\n')
            stub.chmod(0o755)
            rehearse("rehearsal-publication-failure", expected_sha=old,
                     extra=["--mount=type=bind,source=" + str(failure) + ",target=/fixture-bin,readonly",
                            "--env=PATH=/fixture-bin:/usr/bin:/bin"])
            output_helper("file", "rehearsal-publication-failure", "publication-fault-triggered")
            passed += 1

            empty_index = rehearse("indexed-empty", expected_sha=old, success=True, plugin_index=True)
            assert empty_index["index"]["emptyRegisteredPluginSnapshot"] is True
            assert empty_index["index"]["readyForS3Export"] is True
            assert empty_index["index"]["artifacts"] == []
            assert empty_index["index"]["objectBytesVerified"] is False
            passed += 1
            index_parent("02700")
            empty_repeat = rehearse("indexed-empty-repeat", expected_sha=old, success=True, plugin_index=True)
            assert empty_repeat["indexSha256"] == empty_index["indexSha256"]
            passed += 1
            rehearse("indexed-wrong-trust", expected_sha="0" * 64, plugin_index=True)
            passed += 1
            rehearse("indexed-source-forbidden", expected_sha=old, plugin_index=True,
                extra=["--env=MONGODB_PRIMARY_URI=mongodb://" + SENTINEL + "@unreachable.invalid:1/private"])
            passed += 1
            mongo("""(function() {
                var d=db.getSiblingDB('artifact_index_fixture');
                function hash(c) { return new Array(65).join(c); }
                function artifact(c,state) { var h=hash(c); return {_id:'analytics-'+h,kind:'ANALYTICS',sha256:h,
                    sizeBytes:NumberLong(19),objectKey:'plugins/analytics/'+h+'.jar',state:state||'READY',createdBy:'%s'}; }
                d.users.insertOne({_id:'operator',password:'%s'});
                d['plugin-artifact'].insertMany([artifact('a'),artifact('b'),artifact('c'),artifact('d'),artifact('e','STAGED'),artifact('f','PURGED')]);
                d['analytics-technique'].insertMany([
                    {_id:'current',artifactId:artifact('a')._id,enabled:true},
                    {_id:'older',artifactId:artifact('b')._id,enabled:false,previousId:'current',pluginFamilyId:artifact('a')._id},
                    {_id:'recoverable',artifactId:artifact('c')._id,removalState:'REMOVED',removalOperation:'removed'},
                    {_id:'purged-history',artifactId:artifact('f')._id,removalState:'REMOVED',removalOperation:'purged'}]);
                d['plugin-installation'].insertMany([
                    {_id:'discarded',kind:'ANALYTICS',artifactId:artifact('d')._id,state:'DISCARDED'},
                    {_id:'old-active',kind:'ANALYTICS',artifactId:artifact('f')._id,state:'ACTIVE'}]);
                d['plugin-removal'].insertMany([
                    {_id:'removed',kind:'ANALYTICS_METHOD',catalogId:'recoverable',state:'REMOVED',rows:[{_id:'recoverable',_collection:'analytics-technique',artifactId:artifact('c')._id}]},
                    {_id:'purged',kind:'ANALYTICS_METHOD',catalogId:'purged-history',state:'REMOVED',rows:[{_id:'purged-history',_collection:'analytics-technique',artifactId:artifact('f')._id}]}]);
                d['plugin-version-family'].insertOne({_id:'ANALYTICS_METHOD:'+artifact('a')._id,ordinal:NumberLong(2)});
                d['analytics-indicator'].insertOne({_id:ObjectId('000000000000000000000001'),
                    analyticsTechniqueReference:{analyticsTechnique:new DBRef('analytics-technique','current')},
                    configurationRequest:JSON.stringify({previous:'older'}),createdBy:'%s',
                    _pluginReferenceWrite:{token:'completed-marker',pins:[{rawId:'not-a-current-reservation'}]}});
            }());""" % (SENTINEL, SENTINEL, SENTINEL))
            checkpoint("index-source", extra=["--env=OPENLAP_MONGODB_DB=artifact_index_fixture",
                "--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/artifact_index_fixture"], success=True,
                counts=[1, 4, 6, 2, 2, 1, 1])
            source_indexed = input_helper("stage", "index-retrieved", capture="index-source")
            indexed = rehearse("indexed-versions", case="index-retrieved", expected_sha=source_indexed["reportSha256"], success=True, plugin_index=True)
            body = indexed["index"]
            assert body["readyForS3Export"] and body["associationsResolved"] and not body["emptyRegisteredPluginSnapshot"]
            assert body["summary"]["requiredObjectCount"] == 4
            assert body["summary"]["optionalStagedCount"] == body["summary"]["purgedCount"] == 1
            assert body["summary"]["catalogEntryCount"] == 4 and body["summary"]["installationCount"] == 2
            assert body["objectBytesVerified"] is False and body["s3RestoreVerified"] is False
            assert [a["presenceRequirement"] for a in body["artifacts"]] == ["REQUIRED"] * 4 + ["OPTIONAL_STAGED", "MUST_BE_ABSENT"]
            passed += 1
            repeated = rehearse("indexed-versions-repeat", case="index-retrieved", expected_sha=source_indexed["reportSha256"], success=True, plugin_index=True)
            assert repeated["indexSha256"] == indexed["indexSha256"]
            assert input_helper("summary", "index-retrieved") == source_indexed
            passed += 1
            rehearse("indexed-versions", case="index-retrieved", expected_sha=source_indexed["reportSha256"], plugin_index=True, preserve_existing=True)
            assert output_helper("artifact-index", "indexed-versions", index_outputs=True)["indexSha256"] == indexed["indexSha256"]
            passed += 1
            index_failure = work / "index-publication-failure"; index_failure.mkdir(mode=0o755)
            (index_failure / "sync").write_text('#!/bin/bash\nset -eu\nif [[ ${2-} == /outputs/index-publication-failure/artifact-index.json.partial ]]; then exit 31; fi\nexec /usr/bin/sync "$@"\n')
            (index_failure / "sync").chmod(0o755)
            rehearse("index-publication-failure", expected_sha=old, plugin_index=True,
                extra=["--mount=type=bind,source=" + str(index_failure) + ",target=/fixture-bin,readonly", "--env=PATH=/fixture-bin:/usr/bin:/bin"])
            output_helper("file", "index-publication-failure", "artifact-index.json.partial", index_outputs=True)
            passed += 1
        finally:
            original_failure = sys.exc_info()[0] is not None
            cleanup_failed = False
            helpers = [input_helper, output_helper]
            if created_index_volume:
                helpers.append(lambda action: output_helper(action, index_outputs=True))
            for helper in helpers:
                try:
                    helper("cleanup")
                    helper("empty")
                except (AssertionError, OSError, subprocess.SubprocessError):
                    cleanup_failed = True
            removals = []
            if created_source:
                removals.append(["rm", "-f", name])
            if created_network:
                removals.append(["network", "rm", name])
            if created_image:
                removals.append(["image", "rm", image])
            if created_index_volume:
                removals.append(["volume", "rm", index_volume])
            for removal in removals:
                try:
                    result = subprocess.run(docker + removal, capture_output=True, timeout=30)
                    cleanup_failed = cleanup_failed or result.returncode != 0
                except (OSError, subprocess.SubprocessError):
                    cleanup_failed = True
            if cleanup_failed:
                if not original_failure:
                    raise AssertionError("Disposable fixture cleanup failed; private outputs retained")
                print("Disposable fixture cleanup incomplete; original test failure preserved.", file=sys.stderr)
    print("PASS:", passed, "disposable checkpoint fixtures; original archive SHA, full restore, ordered indexes/options, counts/identity/content hashes and private modes verified.")


if __name__ == "__main__":
    main()
