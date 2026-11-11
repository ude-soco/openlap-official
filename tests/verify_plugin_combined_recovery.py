"""Real synthetic checkpoint -> encrypted retrieval -> cold DB/object recovery.

Only public sources, generated identities and task-owned Docker volumes enter
this fixture. No operator configuration, account endpoint or browser is read.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "openlap-analyticsframework"


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


CHECKPOINT = module("checkpoint_fixture", ROOT / "tests/test_plugin_checkpoint_containers.py")
GATEWAY = module("gateway_fixture", ROOT / "tests/verify_plugin_versity_containers.py")

# Fixed trusted fixture copier. Source mounts are read-only; ownership changes
# apply only to newly created destination entries, never retained input files.
COPY = r'''
import hashlib,json,os,pathlib,shutil,stat,sys
mode,uid=sys.argv[1],int(sys.argv[2]); destination=pathlib.Path('/destination')
assert not list(destination.iterdir())
def inventory(root):
    records=[]
    for path in [root,*sorted(root.rglob('*'))]:
        meta=path.lstat(); assert stat.S_ISDIR(meta.st_mode) or stat.S_ISREG(meta.st_mode)
        assert not stat.S_ISLNK(meta.st_mode)
        body=hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
        records.append((str(path.relative_to(root)),meta.st_uid,meta.st_gid,stat.S_IMODE(meta.st_mode),meta.st_size if path.is_file() else 0,body))
    assert len(records)<1000 and sum(row[4] for row in records)<8*1024*1024
    return records
def copy(source,target):
    before=inventory(source)
    target.mkdir(mode=0o700)
    for path in sorted(source.rglob('*')):
        output=target/path.relative_to(source)
        if path.is_dir(): output.mkdir(mode=0o700)
        else:
            with path.open('rb') as stream,output.open('xb') as result: shutil.copyfileobj(stream,result)
            output.chmod(0o600)
    for path in [*target.rglob('*'),target]: os.chown(path,uid,uid)
    assert inventory(source)==before
    for path in [target,*target.rglob('*')]:
        meta=path.stat(); assert meta.st_uid==uid and stat.S_IMODE(meta.st_mode)==(0o700 if path.is_dir() else 0o600)
        if path.is_file(): assert path.read_bytes()==(source/path.relative_to(target)).read_bytes()
if mode=='upload':
    copy(pathlib.Path('/checkpoint/source-capture'),destination/'checkpoint')
    copy(pathlib.Path('/snapshot/export'),destination/'snapshot')
elif mode=='retrieved':
    source=pathlib.Path('/operator/download/recovered')
    assert all(row[1]==501 and row[3] in (0o700,0o600) for row in inventory(source))
    copy(source,destination/'retrieved')
else: raise AssertionError('Unsupported fixture copy')
print(json.dumps({'status':'FRESH_FIXTURE_COPY_VERIFIED','sourceMetadataUnchanged':True,'destinationUid':uid}))
'''

CONTROL = r'''
import hashlib,json,os,pathlib,shutil,subprocess,sys
action=sys.argv[1]
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
if action=='initialize':
    config=pathlib.Path('/control/rclone.conf'); config.write_text('[fixture]\ntype = alias\nremote = /remote\n'); config.chmod(0o600)
    subprocess.run(['/tools/age-keygen','-o','/control/identity.txt'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    recipient=subprocess.check_output(['/tools/age-keygen','-y','/control/identity.txt'],text=True).strip()
    assert recipient.startswith('age1')
    print(json.dumps({'recipient':recipient}))
elif action=='retain-receipt':
    source=pathlib.Path('/operator/upload/receipt.json'); target=pathlib.Path('/control/receipt.json')
    with source.open('rb') as stream,target.open('xb') as output: shutil.copyfileobj(stream,output)
    target.chmod(0o600); receipt=json.loads(target.read_bytes())
    assert receipt['status']=='ENCRYPTED_UPLOAD_AND_READBACK_VERIFIED'
    print(json.dumps({'receiptSha256':sha(target),'cipherSha256':receipt['cipherSha256'],'cipherSizeBytes':receipt['cipherSizeBytes']}))
elif action=='pull-summary':
    report=json.loads(pathlib.Path('/operator/download/pull-receipt.json').read_bytes())
    assert report['status']=='DOWNLOADED_DECRYPTED_FILES_VERIFIED'
    print(json.dumps({'status':report['status']}))
else: raise AssertionError('Unsupported fixture control')
'''


def require(value, message="Combined recovery fixture failed."):
    if not value:
        raise AssertionError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["snapshot", "checkpoint", "transport"]:
        parser.add_argument("--" + name + "-image", help="Optional exact local sha256 image ID; otherwise build public sources")
    options = parser.parse_args()
    token = "openlap-combined-recovery-" + uuid.uuid4().hex[:10]
    volumes, networks, containers, images = [], [], [], []
    evidence = []
    with tempfile.TemporaryDirectory(prefix="openlap-combined-public-") as temporary:
        staging = Path(temporary); staging.chmod(0o755)
        config = staging / "docker-config"; config.mkdir(mode=0o700)
        endpoint = os.environ.get("PLUGIN_BACKUP_DOCKER_HOST", "unix:///var/run/docker.sock")
        require(endpoint.startswith("unix:///") and not any(ord(c) < 33 or ord(c) == 127 for c in endpoint))
        docker = [shutil.which("docker"), "--config", str(config), "--host", endpoint]
        require(docker[0])

        def run(arguments, stage, timeout=180, success=True):
            owned = None; arguments = list(arguments)
            if arguments[0] == "run" and "--rm" in arguments and "--name" not in arguments:
                owned = token + "-client-" + uuid.uuid4().hex[:8]; arguments[1:1] = ["--name", owned]
            try:
                result = subprocess.run(docker + arguments, capture_output=True, timeout=timeout)
            except subprocess.TimeoutExpired:
                if owned: subprocess.run(docker + ["rm", "--force", owned], capture_output=True, timeout=20)
                raise AssertionError("Combined fixture timeout during " + stage)
            require(not success or result.returncode == 0, "Combined fixture failed during " + stage)
            return result

        def build(kind):
            selected = getattr(options, kind + "_image")
            if selected:
                require(re.fullmatch(r"sha256:[a-f0-9]{64}", selected)); return selected
            context = staging / (kind + "-context"); context.mkdir()
            if kind == "snapshot":
                (context / "src/main").mkdir(parents=True)
                for name in ["pom.xml", "Dockerfile.plugin-storage-versity"]: shutil.copyfile(MODULE / name, context / name)
                shutil.copytree(MODULE / "src/main/java", context / "src/main/java")
                dockerfile = "Dockerfile.plugin-storage-versity"
            elif kind == "checkpoint":
                (context / "scripts").mkdir()
                shutil.copytree(MODULE / "scripts/plugin-checkpoint", context / "scripts/plugin-checkpoint")
                dockerfile = "Dockerfile.plugin-checkpoint"; shutil.copyfile(MODULE / dockerfile, context / dockerfile)
            else:
                dockerfile = "Dockerfile.plugin-recovery-transport"
                shutil.copyfile(ROOT / "tests/fixtures" / dockerfile, context / dockerfile)
                shutil.copyfile(MODULE / "scripts/plugin-release-backup.py", context / "plugin-release-backup.py")
            name = token + "-" + kind
            run(["build", "--platform=linux/amd64", "--file", str(context / dockerfile), "--tag", name, str(context)], kind + " public image build", timeout=600)
            images.append(name)
            identity = run(["image", "inspect", name, "--format={{.Id}}"], kind + " image identity").stdout.decode().strip()
            print("BUILT: public " + kind + " image " + identity, flush=True)
            return identity

        def volume(label, uid=1000):
            name = token + "-" + label; run(["volume", "create", name], "fresh volume creation"); volumes.append(name)
            run(["run", "--rm", "--network=none", "--user=0:0", "--entrypoint=python3",
                 "--mount=type=volume,source=" + name + ",target=/fresh", transport_image, "-B", "-c",
                 "import os;os.chmod('/fresh',0o700);os.chown('/fresh'," + str(uid) + "," + str(uid) + ")"], "fresh fixture ownership")
            return name

        def mount(volume, target, readonly=False, subpath=None):
            return "--mount=type=volume,source=" + volume + ",target=" + target + (",volume-subpath=" + subpath if subpath else "") + (",readonly" if readonly else "")

        def remove_container(name):
            run(["rm", "--force", name], "task container removal"); containers.remove(name)

        def remove_volume(name):
            run(["volume", "rm", name], "source data removal"); volumes.remove(name)

        def network(label):
            name = token + "-" + label; run(["network", "create", "--internal", name], "internal fixture network"); networks.append(name); return name

        def start_mongo(name, net, alias, data):
            run(["run", "--detach", "--name", name, "--network=" + net, "--network-alias=" + alias, "--read-only", "--user=1000:1000",
                 "--cap-drop=ALL", "--security-opt=no-new-privileges", "--memory=512m", "--tmpfs=/tmp:rw,size=32m,mode=1777",
                 mount(data, "/data/db"), "--entrypoint=mongod", CHECKPOINT.MONGO, "--bind_ip_all", "--nounixsocket", "--wiredTigerCacheSizeGB=0.25",
                 "--setParameter=ttlMonitorEnabled=false", "--setParameter=diagnosticDataCollectionEnabled=false", "--quiet"], "fresh MongoDB start")
            containers.append(name)
            wait_mongo(net, alias)

        def wait_mongo(net, alias):
            for _ in range(30):
                result = run(["run", "--rm", "--network=" + net, "--entrypoint=mongo", CHECKPOINT.MONGO, "--norc", "--quiet", "--host=" + alias,
                              "--eval", "quit(db.runCommand({ping:1}).ok===1?0:1)"], "MongoDB readiness", timeout=15, success=False)
                if result.returncode == 0: return
                time.sleep(0.2)
            require(False, "Generated MongoDB did not become ready.")

        def gateway_mounts(data):
            return [mount(data, "/storage", True), mount(data, "/objects", subpath="objects"), mount(data, "/lease", subpath="lease")]

        def start_gateway(name, net, data):
            run(["run", "--detach", "--name", name, "--network=" + net, "--network-alias=gateway", *common, *root_secret,
                 *gateway_mounts(data), snapshot_image, "--serve"], "retained gateway start")
            containers.append(name)
            wait_gateway(name)

        def wait_gateway(name):
            for _ in range(40):
                if run(["exec", name, "/bin/sh", "-ceu", "test -f /tmp/openlap-storage-ready"], "gateway readiness", success=False).returncode == 0: return
                time.sleep(0.2)
            require(False, "Generated gateway did not become ready.")

        def java(class_name, arguments, mounts, net="none", root=False):
            return run(["run", "--rm", "--network=" + net, *common, *(root_secret if root else []), *sources, *mounts,
                        "--env=PLUGIN_STORAGE_S3_ENDPOINT=http://gateway:9000", "--entrypoint=/bin/sh", snapshot_image,
                        "-ceu", java_script, "fixture", "com.openlap.plugins.storage." + class_name, *arguments], "native Java " + class_name, timeout=120)

        def index(inputs, input_path, output, identifier, report_sha):
            result = run(["run", "--rm", "--network=none", *checkpoint_common, mount(inputs, "/inputs", True), mount(output, "/outputs"),
                          "--env=CHECKPOINT_ID=" + identifier, "--env=CHECKPOINT_EXPECTED_REPORT_SHA256=" + report_sha,
                          "--env=CHECKPOINT_ARCHIVE_PATH=/inputs/" + input_path + "/database.archive.gz",
                          "--env=CHECKPOINT_REPORT_PATH=/inputs/" + input_path + "/checkpoint.json", checkpoint_image, "--index-plugin-artifacts"], "verified restored index", timeout=240)
            lines = result.stdout.decode().splitlines()
            require(len(lines) == 3 and lines[0] == "OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1" and lines[2] == "OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1")
            summary = json.loads(lines[1]); require(summary["readyForS3Export"] and summary["associationsResolved"])
            require(summary["originalCheckpointReportSha256"] == report_sha); return summary

        try:
            snapshot_image, checkpoint_image, transport_image = build("snapshot"), build("checkpoint"), build("transport")
            public = staging / "fixtures"; public.mkdir(mode=0o755)
            for name in ["PluginObjectSnapshotQualification.java", "CombinedPluginRecoveryFixture.java", "plugin_combined_seed.js"]:
                shutil.copyfile(ROOT / "tests/fixtures" / name, public / name); (public / name).chmod(0o444)
            for role, keys in {"client": ["PLUGIN_STORAGE_S3_ACCESS_KEY", "PLUGIN_STORAGE_S3_SECRET_KEY"], "root": ["ROOT_ACCESS_KEY_ID", "ROOT_SECRET_ACCESS_KEY"]}.items():
                folder = public / role; folder.mkdir(mode=0o755)
                for key in keys: (folder / key).write_text(GATEWAY.SYNTHETIC[key]); (folder / key).chmod(0o444)
            common = ["--platform=linux/amd64", "--user=1000:1000", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
                      "--memory=1g", "--tmpfs=/tmp:rw,size=64m,mode=1777", "--env=PLUGIN_STORAGE_S3_BUCKET=openlap-qualification",
                      "--env=PLUGIN_STORAGE_S3_REGION=us-east-1", "--mount=type=bind,source=" + str(public / "client") + ",target=/run/openlap-client,readonly"]
            root_secret = ["--mount=type=bind,source=" + str(public / "root") + ",target=/run/openlap-root,readonly"]
            sources = ["--mount=type=bind,source=" + str(public) + ",target=/fixture,readonly"]
            java_script = ("umask 077\njavac -cp '/opt/openlap-storage/classes:/opt/openlap-storage/lib/*' -d /tmp /fixture/PluginObjectSnapshotQualification.java /fixture/CombinedPluginRecoveryFixture.java\n"
                           "exec java -Dlogback.configurationFile=/opt/openlap-storage/logback.xml -cp '/tmp:/opt/openlap-storage/classes:/opt/openlap-storage/lib/*' \"$@\"")
            checkpoint_common = ["--platform=linux/amd64", "--user=1000:1000", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--memory=1g",
                                 "--pids-limit=100", "--tmpfs=/tmp:rw,nosuid,noexec,size=768m,mode=1777", "--env=CHECKPOINT_MAX_ARCHIVE_MIB=8",
                                 "--env=CHECKPOINT_MAX_EXPANDED_MIB=16", "--env=CHECKPOINT_MAX_RESTORE_MIB=512"]
            for empty in [False, True]:
                case = "empty" if empty else "versions"; source_net = network(case + "-source")
                db_data, gateway_data, control, captures, frozen, snapshots = [volume(case + "-" + suffix) for suffix in ["db", "gateway", "seed", "capture", "index", "snapshot"]]
                source_db, source_gateway = token + "-" + case + "-mongo", token + "-" + case + "-gateway"
                start_mongo(source_db, source_net, "source-mongo", db_data)
                run(["run", "--rm", "--network=none", *common, *root_secret, mount(gateway_data, "/storage"), snapshot_image, "--bootstrap-fresh"], "fresh source gateway bootstrap")
                start_gateway(source_gateway, source_net, gateway_data)
                java("CombinedPluginRecoveryFixture", ["--prepare-source", case], [mount(control, "/control")], source_net)
                run(["run", "--rm", "--network=" + source_net, "--user=1000:1000", mount(control, "/control", True), *sources,
                     "--entrypoint=mongo", checkpoint_image, "--norc", "--quiet", "--host=source-mongo", "/fixture/plugin_combined_seed.js"], "generated database records")
                captured = run(["run", "--rm", "--network=" + source_net, *checkpoint_common, mount(captures, "/outputs"),
                                "--env=MONGODB_PRIMARY_URI=mongodb://source-mongo:27017/plugin_recovery_fixture", "--env=OPENLAP_MONGODB_DB=plugin_recovery_fixture",
                                "--env=CHECKPOINT_SOURCE_HOST=source-mongo", "--env=CHECKPOINT_SOURCE_PORT=27017", "--env=CHECKPOINT_FREEZE_EVIDENCE=generated-writers-stopped",
                                "--env=CHECKPOINT_ID=source-capture", checkpoint_image, "--checkpoint"], "actual checkpoint and isolated restore", timeout=240)
                lines = captured.stdout.decode().splitlines(); require(len(lines) == 3 and lines[0] == "OPENLAP-CHECKPOINT-REPORT-V1")
                report_sha = hashlib.sha256((lines[1] + "\n").encode()).hexdigest(); report = json.loads(lines[1])
                original = index(captures, "source-capture", frozen, "frozen-index", report_sha)
                require(original["emptyRegisteredPluginSnapshot"] == empty)
                exported = java("PluginObjectSnapshotApplication", ["--export", "/index/frozen-index/artifact-index.json", original["artifactIndexSha256"], report_sha, "/snapshot/export"],
                                [mount(frozen, "/index", True), mount(snapshots, "/snapshot")], source_net)
                snapshot = json.loads(exported.stdout); require(snapshot["objectCount"] == (0 if empty else 6))
                print("PASS: " + case + " actual checkpoint, verified index and object export", flush=True)
                operator, custody, remote = [volume(case + "-" + suffix, 501) for suffix in ["operator", "custody", "remote"]]
                copied = run(["run", "--rm", "--network=none", "--user=0:0", "--cap-drop=ALL", "--cap-add=DAC_OVERRIDE", "--cap-add=CHOWN", "--read-only",
                              mount(captures, "/checkpoint", True), mount(snapshots, "/snapshot", True), mount(operator, "/destination"),
                              "--entrypoint=python3", transport_image, "-B", "-c", COPY, "upload", "501"], "new operator upload staging")
                require(json.loads(copied.stdout)["sourceMetadataUnchanged"])
                transport_common = ["--user=501:501", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--tmpfs=/tmp:rw,size=32m,mode=1777",
                                    mount(custody, "/control"), mount(remote, "/remote")]
                initialized = run(["run", "--rm", "--network=none", *transport_common, "--entrypoint=python3", transport_image, "-B", "-c", CONTROL, "initialize"], "native generated age identity")
                recipient = json.loads(initialized.stdout)["recipient"]
                args = ["--age", "/tools/age", "--rclone", "/tools/rclone", "--rclone-config", "/control/rclone.conf", "--remote", "fixture:releases",
                        "--checkpoint-report-sha256", report_sha, "--max-bytes", "8388608", "--max-files", "1000", "--timeout-seconds", "120"]
                run(["run", "--rm", "--network=none", *transport_common, mount(operator, "/operator"), transport_image, "push", *args,
                     "--checkpoint", "/operator/checkpoint", "--source", "objects=/operator/snapshot", "--recipient", recipient, "--output", "/operator/upload"], "native encrypted push/readback")
                receipt = json.loads(run(["run", "--rm", "--network=none", *transport_common, mount(operator, "/operator", True), "--entrypoint=python3", transport_image,
                                          "-B", "-c", CONTROL, "retain-receipt"], "independent receipt retention").stdout)
                remove_container(source_gateway); remove_container(source_db)
                for source in [db_data, gateway_data, control, captures, frozen, snapshots, operator]: remove_volume(source)
                run(["network", "rm", source_net], "source network removal"); networks.remove(source_net)
                print("PASS: " + case + " native encrypted push and source data removal", flush=True)
                retrieved = volume(case + "-retrieved", 501)
                run(["run", "--rm", "--network=none", *transport_common, mount(retrieved, "/operator"), transport_image, "pull", *args,
                     "--receipt", "/control/receipt.json", "--receipt-sha256", receipt["receiptSha256"], "--identity-file", "/control/identity.txt",
                     "--output", "/operator/download"], "independent native encrypted retrieval")
                run(["run", "--rm", "--network=none", *transport_common, mount(retrieved, "/operator", True), "--entrypoint=python3", transport_image,
                     "-B", "-c", CONTROL, "pull-summary"], "typed pull completion")
                staged = volume(case + "-uid1000-staged")
                copied = run(["run", "--rm", "--network=none", "--user=0:0", "--read-only", "--cap-drop=ALL", "--cap-add=DAC_OVERRIDE", "--cap-add=CHOWN",
                              mount(retrieved, "/operator", True), mount(staged, "/destination"), "--entrypoint=python3", transport_image,
                              "-B", "-c", COPY, "retrieved", "1000"], "fresh UID1000 retrieved staging")
                require(json.loads(copied.stdout)["sourceMetadataUnchanged"])
                regenerated = volume(case + "-regenerated-index")
                recovered_index = index(staged, "retrieved/checkpoint", regenerated, "regenerated", report_sha)
                require(recovered_index["artifactIndexSha256"] == original["artifactIndexSha256"])
                print("PASS: " + case + " independent encrypted retrieval, UID staging and regenerated index", flush=True)
                fresh_objects = volume(case + "-fresh-object-store")
                restored = java("PluginObjectSnapshotApplication", ["--restore-fresh", "/backup/retrieved/sources/objects", snapshot["manifestSha256"],
                               original["artifactIndexSha256"], report_sha, "/index/regenerated/artifact-index.json"],
                               [mount(staged, "/backup", True), mount(regenerated, "/index", True), mount(fresh_objects, "/storage")], root=True)
                require(json.loads(restored.stdout.splitlines()[-1])["coldReadbackVerified"])
                recovery_net = network(case + "-recovery"); recovered_db = token + "-" + case + "-recovered-db"; recovered_gateway = token + "-" + case + "-recovered-gateway"
                fresh_db = volume(case + "-fresh-db"); start_mongo(recovered_db, recovery_net, "recovered-mongo", fresh_db)
                run(["run", "--rm", "--network=" + recovery_net, "--user=1000:1000", mount(staged, "/inputs", True), "--entrypoint=mongorestore", checkpoint_image,
                     "--host=recovered-mongo", "--archive=/inputs/retrieved/checkpoint/database.archive.gz", "--gzip", "--stopOnError", "--numParallelCollections=1"], "fresh retrieved database restore")
                run(["kill", "--signal=KILL", recovered_db], "recovered database cold shutdown"); run(["start", recovered_db], "recovered database cold restart"); wait_mongo(recovery_net, "recovered-mongo")
                start_gateway(recovered_gateway, recovery_net, fresh_objects)
                run(["kill", "--signal=KILL", recovered_gateway], "recovered gateway cold shutdown"); run(["start", recovered_gateway], "recovered gateway cold restart")
                wait_gateway(recovered_gateway)
                cold = java("CombinedPluginRecoveryFixture", ["--verify-cold", case], [], recovery_net)
                cold_result = json.loads(cold.stdout); require(cold_result["coldDatabaseAssociationsVerified"] and cold_result["coldObjectBytesAndMetadataVerified"])
                evidence.append({"case": case, "originalCheckpointReportSha256": report_sha, "archiveSha256": report["archiveSha256"],
                                 "artifactIndexSha256": original["artifactIndexSha256"], "manifestSha256": snapshot["manifestSha256"],
                                 "receiptSha256": receipt["receiptSha256"], "cipherSha256": receipt["cipherSha256"], "objectCount": snapshot["objectCount"],
                                 "sourceDataRemovedBeforeRetrieval": True, "uid501InputUnchanged": True, "uid1000FreshStagingVerified": True,
                                 "regeneratedDatabaseIndexMatched": True, "coldDatabaseAndObjectReadbackVerified": True})
                print("PASS: " + case + " actual checkpoint/index, encrypted retrieval, fresh storage and cold associations", flush=True)
                remove_container(recovered_gateway); remove_container(recovered_db)
            print(json.dumps({"schemaVersion": 1, "status": "SYNTHETIC_ENCRYPTED_PLUGIN_RECOVERY_VERIFIED", "images": {
                "snapshot": snapshot_image, "checkpoint": checkpoint_image, "transport": transport_image}, "cases": evidence,
                "sourceRevision": subprocess.check_output(["git", "-C", str(ROOT), "rev-parse", "HEAD"], text=True).strip(),
                "scope": "Generated local recovery only; no external custody, production acceptance or availability verified."}, indent=2))
        finally:
            for name in reversed(containers): run(["rm", "--force", name], "fixture cleanup", success=False)
            for name in reversed(networks): run(["network", "rm", name], "fixture cleanup", success=False)
            for name in reversed(volumes): run(["volume", "rm", name], "fixture cleanup", success=False)
            for name in reversed(images): run(["image", "rm", name], "fixture cleanup", success=False)


if __name__ == "__main__":
    main()
