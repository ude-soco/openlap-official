"""Host-native operator runner qualification using generated combined fixtures only."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "openlap-analyticsframework/scripts"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


def require(value):
    if not value: raise AssertionError("Generated operator recovery qualification failed.")


def clients(directory, run, image, staging, token, containers):
    if directory:
        folder = directory.resolve()
    else:
        require(platform.system() == "Linux" and platform.machine() in ("x86_64", "amd64"))
        folder = staging.resolve() / "native-tools"; folder.mkdir(mode=0o700)
        name = token + "-native-tools"; containers.append(name)
        run(["create", "--name", name, image], "public native fixture client container")
        for binary in ("age", "age-keygen", "rclone"):
            run(["cp", name + ":/tools/" + binary, str(folder / binary)], "public native fixture client extraction")
            (folder / binary).chmod(0o700)
        run(["rm", name], "public native fixture client container removal"); containers.remove(name)
    for binary in ("age", "age-keygen", "rclone"):
        require((folder / binary).is_file() and os.access(folder / binary, os.X_OK))
    return folder


def prepare(case, count, staging, tools, run, copy_code, mount, capture, snapshot, transport_image,
            checkpoint_image, snapshot_image, checkpoint_hash, index_hash, snapshot_hash, docker, endpoint, recovery_point, online=False):
    transport = load("operator_fixture_transport", SCRIPTS / "plugin-release-backup.py")
    root = staging.resolve() / ("operator-native-" + case); root.mkdir(mode=0o700)
    payload = root / "payload"; payload.mkdir(mode=0o700)
    copied = run(["run", "--rm", "--network=none", "--user=0:0", "--read-only", "--cap-drop=ALL",
                  "--cap-add=DAC_OVERRIDE", "--cap-add=CHOWN", "--security-opt=no-new-privileges",
                  mount(capture, "/checkpoint", True), mount(snapshot, "/snapshot", True),
                  "--mount=type=bind,source=" + str(payload) + ",target=/destination", "--entrypoint=python3", transport_image,
                  "-B", "-c", copy_code, "upload", "host-projection"], "fresh host generated release staging")
    require(json.loads(copied.stdout)["sourceMetadataUnchanged"])
    for path in [payload, *payload.rglob('*')]:
        require(path.stat().st_uid == os.getuid())
    if online:
        captured = json.loads((payload / "checkpoint/checkpoint.json").read_bytes())
        require(captured["schemaVersion"] == 2 and captured["captureMode"] == "INSTANCE_WIDE_OPLOG")
        recovery_point = captured["captureStartedAt"]
    profile = root / "rclone.conf"; remote = root / "remote"; remote.mkdir(mode=0o700)
    profile.write_text("[fixture]\ntype = alias\nremote = " + str(remote) + "\n"); profile.chmod(0o600)
    identity = root / "identity.txt"
    environment = {"PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"), "LANG": "C"}
    require(subprocess.run([str(tools / "age-keygen"), "-o", str(identity)], capture_output=True, env=environment, timeout=10).returncode == 0)
    recipient = subprocess.run([str(tools / "age-keygen"), "-y", str(identity)], capture_output=True, env=environment, timeout=10)
    require(recipient.returncode == 0 and recipient.stdout.decode().strip().startswith("age1"))
    uploaded = root / "upload"
    require(transport.main(["push", "--age", str(tools / "age"), "--rclone", str(tools / "rclone"),
        "--rclone-config", str(profile), "--remote", "fixture:releases", "--checkpoint-report-sha256", checkpoint_hash,
        "--checkpoint", str(payload / "checkpoint"), "--source", "objects=" + str(payload / "snapshot"),
        "--recipient", recipient.stdout.decode().strip(), "--output", str(uploaded),
        "--max-bytes", "8388608", "--max-files", "1000", "--timeout-seconds", "120"]) == 0)
    receipt = uploaded / "receipt.json"; receipt_hash = hashlib.sha256(receipt.read_bytes()).hexdigest()
    state = root / "checks"; state.mkdir(mode=0o700)
    options = {"age": str(tools / "age"), "rclone": str(tools / "rclone"), "rclone_config": str(profile), "remote": "fixture:releases",
               "identity_file": str(identity), "receipt": str(receipt), "receipt_sha256": receipt_hash,
               "checkpoint_report_sha256": checkpoint_hash, "artifact_index_sha256": index_hash,
               "recovery_point_at": recovery_point,
               "snapshot_manifest_sha256": snapshot_hash, "snapshot_label": "objects", "state_directory": str(state),
               "docker": str(Path(docker[0]).absolute()), "docker_host": endpoint,
               "checkpoint_image": checkpoint_image, "snapshot_image": snapshot_image,
               "max_bytes": 8388608, "max_files": 1000, "timeout_seconds": 120,
               "max_archive_mib": 8, "max_expanded_mib": 64 if online else 16, "max_restore_mib": 512}
    config = root / "recovery-check.json"; config.write_text(json.dumps(options) + "\n"); config.chmod(0o600)
    return {"root": root, "payload": payload, "config": config, "state": state, "objectCount": count}


def cleanup_failed_fixture(prepared, run):
    """Only generated fixture resources, authorized by their private run journal."""
    for path in prepared["state"].glob("check-*/docker-resources.json"):
        journal = json.loads(path.read_bytes()); token = journal["runId"]
        require(token.startswith("openlap-recovery-check-"))
        for kind in ("containers", "volumes"):
            for name in journal[kind]:
                require(name.startswith(token + "-"))
                arguments = ["volume", "inspect", name, "--format={{json .Labels}}"] if kind == "volumes" else ["inspect", name, "--format={{json .Config.Labels}}"]
                result = run(arguments, "generated operator fixture cleanup identity", success=False)
                if result.returncode: continue
                require(json.loads(result.stdout).get("org.openlap.recovery-run") == token)
                arguments = ["volume", "rm", name] if kind == "volumes" else ["rm", "--force", name]
                run(arguments, "generated operator fixture resource removal")


COPY_PRODUCER_CIPHER = r'''
import hashlib,json,os,pathlib,re,shutil,stat,sys
name,relative,expected,size=sys.argv[1:]; size=int(size)
assert re.fullmatch(r'release-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{32}\.tar\.age',name)
assert re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9/_-]{0,120}',relative) and all(p not in ('','..','.') for p in relative.split('/'))
assert re.fullmatch(r'[a-f0-9]{64}',expected) and 0<size<=64*1024*1024
destination=pathlib.Path('/destination'); assert not list(destination.iterdir())
uid=destination.stat().st_uid
sources=[pathlib.Path('/remote')/relative/name,pathlib.Path('/custody/identity.txt')]
def identity(path,owner,maximum):
 meta=path.lstat(); assert stat.S_ISREG(meta.st_mode) and meta.st_uid==owner and stat.S_IMODE(meta.st_mode)==0o600 and meta.st_nlink==1 and 0<meta.st_size<=maximum
 digest=hashlib.sha256()
 with path.open('rb') as stream:
  while True:
   block=stream.read(1024*1024)
   if not block: break
   digest.update(block)
 return (meta.st_dev,meta.st_ino,meta.st_uid,meta.st_gid,meta.st_mode,meta.st_nlink,meta.st_size,meta.st_mtime_ns,meta.st_ctime_ns,digest.hexdigest())
before=[identity(sources[0],1000,64*1024*1024),identity(sources[1],501,65536)]
assert (before[0][6],before[0][-1])==(size,expected)
remote=destination/'remote'; remote.mkdir(mode=0o700)
folder=remote
for part in relative.split('/'):
 folder=folder/part; folder.mkdir(mode=0o700)
for source,target,record in zip(sources,[folder/name,destination/'identity.txt'],before):
 with source.open('rb') as stream,os.fdopen(os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600),'wb') as output:
  shutil.copyfileobj(stream,output)
 assert hashlib.sha256(target.read_bytes()).hexdigest()==record[-1]
for path in [*remote.rglob('*'),remote,destination/'identity.txt']: os.chown(path,uid,uid)
assert [identity(sources[0],1000,64*1024*1024),identity(sources[1],501,65536)]==before
print(json.dumps({'status':'ACTUAL_PRODUCER_CIPHERTEXT_MIRRORED','sourceMetadataUnchanged':True,'cipherSha256':expected,'cipherSizeBytes':size}))
'''


def prepare_existing_producer(case, count, staging, tools, run, mount, remote, custody, transport_image,
                              checkpoint_image, snapshot_image, receipt, checkpoint_hash, index_hash, snapshot_hash,
                              docker, endpoint, recovery_point, online=False, remote_directory="releases"):
    """Mirror the actual generated producer ciphertext; never upload a substitute."""
    upload = load("producer_fixture_receipt", SCRIPTS / "plugin-backup-upload.py")
    upload.typed_receipt(receipt, checkpoint_hash)
    for volume in (remote, custody): require(isinstance(volume, str) and volume.startswith("openlap-") and "/" not in volume)
    root = staging.resolve() / ("operator-actual-producer-" + case); root.mkdir(mode=0o700)
    mirror = root / "mirror"; mirror.mkdir(mode=0o700)
    copied = run(["run", "--rm", "--network=none", "--user=0:0", "--read-only", "--cap-drop=ALL",
                  "--cap-add=DAC_OVERRIDE", "--cap-add=CHOWN", "--security-opt=no-new-privileges",
                  mount(remote, "/remote", True), mount(custody, "/custody", True),
                  "--mount=type=bind,source=" + str(mirror) + ",target=/destination", "--entrypoint=python3", transport_image,
                  "-B", "-c", COPY_PRODUCER_CIPHER, receipt["objectName"], remote_directory, receipt["cipherSha256"], str(receipt["cipherSizeBytes"])],
                 "independent mirror of actual producer ciphertext")
    result = json.loads(copied.stdout)
    require(result["status"] == "ACTUAL_PRODUCER_CIPHERTEXT_MIRRORED" and result["sourceMetadataUnchanged"] is True)
    for path in [mirror, *mirror.rglob('*')]:
        require(path.stat().st_uid == os.getuid() and path.stat().st_mode & 0o077 == 0)
    profile = root / "rclone.conf"
    profile.write_text("[fixture]\ntype = alias\nremote = " + str(mirror / "remote") + "\n"); profile.chmod(0o600)
    receipt_path = root / "receipt.json"; receipt_path.write_bytes(upload.backup.json_bytes(receipt)); receipt_path.chmod(0o600)
    state = root / "checks"; state.mkdir(mode=0o700)
    payload = root / "removed-source-placeholder"; payload.mkdir(mode=0o700)
    options = {"age": str(tools / "age"), "rclone": str(tools / "rclone"), "rclone_config": str(profile), "remote": "fixture:" + remote_directory,
               "identity_file": str(mirror / "identity.txt"), "receipt": str(receipt_path), "receipt_sha256": hashlib.sha256(receipt_path.read_bytes()).hexdigest(),
               "checkpoint_report_sha256": checkpoint_hash, "artifact_index_sha256": index_hash, "snapshot_manifest_sha256": snapshot_hash,
               "recovery_point_at": recovery_point, "snapshot_label": "objects", "state_directory": str(state),
               "docker": str(Path(docker[0]).absolute()), "docker_host": endpoint, "checkpoint_image": checkpoint_image, "snapshot_image": snapshot_image,
               "max_bytes": 16 * 1024 * 1024, "max_files": 1000, "timeout_seconds": 120,
               "max_archive_mib": 8, "max_expanded_mib": 64 if online else 16, "max_restore_mib": 512}
    config = root / "recovery-check.json"; config.write_text(json.dumps(options) + "\n"); config.chmod(0o600)
    return {"root": root, "payload": payload, "config": config, "state": state, "objectCount": count, "producerCiphertextUsed": True}


def verify(prepared, run):
    # The caller has already removed the original source containers/volumes and
    # network. Remove these host plaintext source copies before independent pull.
    shutil.rmtree(prepared["payload"])
    runner = load("operator_recovery_runner", SCRIPTS / "check-plugin-backup-recovery.py")
    result_code = runner.main(["--config", str(prepared["config"])])
    if result_code:
        failures = list(prepared["state"].glob("check-*/recovery-failure.json"))
        detail = json.loads(failures[0].read_bytes()) if len(failures) == 1 else {"stage": "runner-preflight"}
        docker_failures = [json.loads(path.read_bytes()) for path in prepared["state"].glob("check-*/docker-failure-*.json")]
        cleanup_failed_fixture(prepared, run)
        raise AssertionError("Generated operator recovery failed: " + json.dumps({"detail": detail, "dockerFailures": docker_failures}))
    receipts = list(prepared["state"].glob("check-*/recovery-receipt.json")); require(len(receipts) == 1)
    result = json.loads(receipts[0].read_bytes())
    require(result["status"] == "INDEPENDENT_PLUGIN_RECOVERY_VERIFIED" and result["objectCount"] == prepared["objectCount"])
    for field in ("independentlyDownloadedAndDecrypted", "isolatedDatabaseRestoreVerified", "independentDatabaseIndexMatched",
                  "freshObjectStoreColdReadbackVerified", "sourceMetadataUnchanged", "dockerScratchCleanupComplete", "backupFreshnessWithinPolicy"):
        require(result[field] is True)
    proof = {"objectCount": result["objectCount"], "receiptSha256": hashlib.sha256(receipts[0].read_bytes()).hexdigest(),
             "nativeOperatorRunnerVerified": True, "sourceDataRemovedBeforeRunner": True}
    if prepared.get("producerCiphertextUsed"): proof["actualProducerCiphertextRecovered"] = True
    return proof
