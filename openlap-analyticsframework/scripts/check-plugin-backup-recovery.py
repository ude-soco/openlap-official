#!/usr/bin/env python3
"""Independently retrieve and rehearse one trusted plugin release on an operator host.

This is a recovery check, not a live checkpoint producer or a backup scheduler.
Credential files are consumed only by the existing native age/rclone transport.
"""
import argparse
from datetime import datetime, timezone
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import resource
import signal
import stat
import subprocess
import sys
import tempfile
import uuid

MIB = 1024 * 1024
SCRIPT = Path(__file__).resolve()
HELPER_IMAGE = "python@sha256:e064671ca452259bab50e8e2c7bd896e39e9a343bb06ca25234adf6fe18d0fc7"
REQUIRED = {"age", "rclone", "rclone_config", "remote", "identity_file", "receipt", "receipt_sha256",
            "checkpoint_report_sha256", "artifact_index_sha256", "snapshot_manifest_sha256", "snapshot_label",
            "state_directory", "docker", "docker_host", "checkpoint_image", "snapshot_image"}
DEFAULTS = {"max_bytes": 2 * 1024 * MIB, "max_files": 10000, "timeout_seconds": 900,
            "max_backup_age_hours": 26, "max_archive_mib": 256, "max_expanded_mib": 1024,
            "max_restore_mib": 1024}

# This fixed program can alter only fresh Docker volumes. Retained inputs are
# mounted read-only, inventoried before/after, and never chmod/chowned.
STAGE = r'''
import hashlib,json,os,pathlib,secrets,shutil,stat,sys
action=sys.argv[1]
def require(value):
    if not value: raise RuntimeError('Recovery staging validation failed')
def inventory(root,maximum,files):
    rows=[]; owner=root.lstat().st_uid; total=0
    def visit(path):
        nonlocal total
        meta=path.lstat(); directory=stat.S_ISDIR(meta.st_mode)
        require(directory or stat.S_ISREG(meta.st_mode))
        require(meta.st_uid==owner and stat.S_IMODE(meta.st_mode)==(0o700 if directory else 0o600))
        require(directory or meta.st_nlink==1)
        size=0; digest=None
        if not directory:
            digest=hashlib.sha256()
            with path.open('rb') as stream:
                while True:
                    block=stream.read(1024*1024)
                    if not block: break
                    size+=len(block); total+=len(block); require(total<=maximum); digest.update(block)
            require(size==meta.st_size); digest=digest.hexdigest()
        rows.append([str(path.relative_to(root)),directory,stat.S_IMODE(meta.st_mode),size,digest])
        require(len(rows)<=2*files+8)
        if directory:
            for child in sorted(path.iterdir()): visit(child)
    visit(root)
    return owner,rows
if action=='initialize':
    target=pathlib.Path('/fresh'); require(not list(target.iterdir()))
    target.chmod(0o700); os.chown(target,1000,1000)
    print(json.dumps({'status':'FRESH_RECOVERY_VOLUME_INITIALIZED'}))
elif action=='credentials':
    root=pathlib.Path('/control'); require(not list(root.iterdir()))
    for role,keys in {'root':['ROOT_ACCESS_KEY_ID','ROOT_SECRET_ACCESS_KEY'],
                      'client':['PLUGIN_STORAGE_S3_ACCESS_KEY','PLUGIN_STORAGE_S3_SECRET_KEY']}.items():
        folder=root/role; folder.mkdir(mode=0o700)
        for key in keys:
            with (folder/key).open('x') as stream: stream.write(secrets.token_hex(30))
            (folder/key).chmod(0o400)
    print(json.dumps({'status':'DISPOSABLE_LOCAL_RECOVERY_IDENTITIES_CREATED'}))
elif action=='copy':
    expected,native_owner,maximum,files=sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5])
    source=pathlib.Path('/source'); destination=pathlib.Path('/destination')
    require(not list(destination.iterdir()))
    owner,before=inventory(source,maximum,files)
    # Docker Desktop may project a host-owned bind mount as UID0. No retained
    # ownership is repaired to accommodate this documented projection.
    require(owner in (0,native_owner))
    fingerprint=lambda rows:hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest()
    require(fingerprint(before)==expected)
    target=destination/'retrieved'; target.mkdir(mode=0o700)
    for name,directory,mode,size,digest in before:
        if name=='.': continue
        output=target/name
        if directory: output.mkdir(mode=0o700)
        else:
            with (source/name).open('rb') as stream,output.open('xb') as result: shutil.copyfileobj(stream,result)
            output.chmod(0o600)
    for path in [target,*target.rglob('*')]: os.chown(path,1000,1000)
    require(inventory(source,maximum,files)==(owner,before))
    new_owner,after=inventory(target,maximum,files)
    require(new_owner==1000 and after==before)
    print(json.dumps({'status':'FRESH_UID1000_COPY_VERIFIED','sourceMetadataUnchanged':True,'sourceProjectionUid':owner}))
else: raise RuntimeError('Unsupported recovery helper action')
'''


class RecoveryError(Exception):
    pass


def require(value):
    if not value:
        raise RecoveryError("Recovery check validation failed.")


def digest(value):
    require(isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value))
    return value


def physical(value, directory=False, private=False):
    path = Path(value)
    require(path.is_absolute() and str(path) == os.path.normpath(str(path))
            and str(path.resolve()) == str(path) and "," not in str(path)
            and not any(ord(c) < 32 or ord(c) == 127 for c in str(path)))
    info = path.lstat()
    require(stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode))
    if private:
        require(info.st_uid == os.getuid() and stat.S_IMODE(info.st_mode) & 0o077 == 0
                and (directory or info.st_nlink == 1))
    return path


def read_json(path, maximum=MIB):
    with path.open("rb") as stream:
        body = stream.read(maximum + 1)
    require(len(body) <= maximum)
    def unique(pairs):
        value = {}
        for key, item in pairs:
            require(key not in value); value[key] = item
        return value
    return json.loads(body, object_pairs_hook=unique)


def metadata_digest(path):
    with path.open("rb") as stream:
        body = stream.read(MIB + 1)
    require(len(body) <= MIB)
    return hashlib.sha256(body).hexdigest()


def config(path):
    value = read_json(physical(path, private=True), 65536)
    require(isinstance(value, dict) and REQUIRED <= set(value) <= REQUIRED | set(DEFAULTS))
    result = dict(DEFAULTS); result.update(value)
    for key in REQUIRED - {"checkpoint_image", "snapshot_image", "docker_host", "snapshot_label", "remote"}:
        require(isinstance(result[key], str) and len(result[key]) <= 4096)
    for key in ("receipt_sha256", "checkpoint_report_sha256", "artifact_index_sha256", "snapshot_manifest_sha256"):
        digest(result[key])
    require(re.fullmatch(r"[a-z][a-z0-9_-]{0,31}", result["snapshot_label"]))
    require(isinstance(result["docker_host"], str) and result["docker_host"].startswith("unix:///")
            and not any(ord(c) < 33 or ord(c) == 127 for c in result["docker_host"]))
    for role, name in (("checkpoint", "checkpoint_image"), ("storage-versity", "snapshot_image")):
        require(isinstance(result[name], str) and (re.fullmatch(r"sha256:[a-f0-9]{64}", result[name]) or re.fullmatch(
            r"ghcr\.io/ude-soco/openlap-official-plugin-" + role + r"@sha256:[a-f0-9]{64}", result[name])))
    for name, ceiling in {"max_bytes": 8 * 1024 * MIB, "max_files": 10000, "timeout_seconds": 3600,
                          "max_backup_age_hours": 24 * 366, "max_archive_mib": 1024,
                          "max_expanded_mib": 1024, "max_restore_mib": 1024}.items():
        require(type(result[name]) is int and 0 < result[name] <= ceiling)
    require(result["max_files"] >= 3)
    return result


def source_inventory(root, maximum, files):
    """Hash private retrieved data locally; never return record bodies or keys."""
    rows = []; metadata = []; total = 0
    def visit(path):
        nonlocal total
        info = path.lstat(); directory = stat.S_ISDIR(info.st_mode)
        require(directory or stat.S_ISREG(info.st_mode))
        require(info.st_uid == os.getuid() and stat.S_IMODE(info.st_mode) == (0o700 if directory else 0o600)
                and (directory or info.st_nlink == 1))
        body = None; size = 0
        if not directory:
            value = hashlib.sha256()
            with path.open("rb") as stream:
                while True:
                    block = stream.read(MIB)
                    if not block: break
                    size += len(block); total += len(block); require(total <= maximum); value.update(block)
            require(size == info.st_size); body = value.hexdigest()
        rows.append([str(path.relative_to(root)), directory, stat.S_IMODE(info.st_mode), size, body])
        metadata.append((info.st_dev, info.st_ino, info.st_uid, info.st_gid, info.st_mode,
                         info.st_size, info.st_mtime_ns, info.st_ctime_ns))
        require(len(rows) <= 2 * files + 8)
        if directory:
            for child in sorted(path.iterdir()): visit(child)
    visit(root)
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest(), metadata


def publish(path, value):
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600), "wb") as stream:
        stream.write((json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode())
        stream.flush(); os.fsync(stream.fileno())


def json_result(body, status):
    require(len(body) <= 16384)
    lines = body.decode().splitlines(); require(lines)
    value = json.loads(lines[-1]); require(isinstance(value, dict) and value.get("status") == status)
    return value


class Docker:
    def __init__(self, options, output):
        self.options = options; self.output = output
        self.token = "openlap-recovery-check-" + uuid.uuid4().hex
        self.volumes = []; self.containers = []
        docker_config = output / "docker-config"; docker_config.mkdir(mode=0o700)
        self.command = [str(physical(Path(options["docker"]).resolve())), "--config", str(docker_config), "--host", options["docker_host"]]
        self.env = {"PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"), "LANG": "C"}
        self.journal()

    def journal(self):
        path = self.output / "docker-resources.json"
        encoded = (json.dumps({"schemaVersion": 1, "runId": self.token,
                              "volumes": self.volumes, "containers": self.containers}) + "\n").encode()
        with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600), "wb") as stream:
            stream.write(encoded); stream.flush(); os.fsync(stream.fileno())

    def call(self, args, timeout=120, success=True):
        def limits():
            resource.setrlimit(resource.RLIMIT_FSIZE, (MIB, MIB))
        with tempfile.TemporaryFile(dir=self.output) as out, tempfile.TemporaryFile(dir=self.output) as err:
            result = subprocess.run(self.command + list(args), stdout=out, stderr=err, stdin=subprocess.DEVNULL,
                                    timeout=timeout, env=self.env, preexec_fn=limits)
            require(not success or result.returncode == 0)
            require(os.fstat(out.fileno()).st_size <= MIB and os.fstat(err.fileno()).st_size <= MIB)
            out.seek(0)
            return result.returncode, out.read(MIB)

    def image(self, reference):
        _, body = self.call(["image", "inspect", "--platform=linux/amd64", reference, "--format={{.Id}} {{.Os}} {{.Architecture}}"])
        values = body.decode().strip().split()
        require(len(values) == 3 and re.fullmatch(r"sha256:[a-f0-9]{64}", values[0]) and values[1:] == ["linux", "amd64"])
        require(not reference.startswith("sha256:") or values[0] == reference)
        return values[0]

    def volume(self, name, helper):
        value = self.token + "-" + name
        _, body = self.call(["volume", "create", "--label", "org.openlap.recovery-run=" + self.token, value])
        require(body.decode().strip() == value)
        self.volumes.append(value); self.journal()
        self.owned(value, volume=True)
        result = self.run(helper, ["-B", "-c", STAGE, "initialize"], [self.mount(value, "/fresh")], user="0:0",
                          capabilities=["CHOWN"], entrypoint="python3")
        json_result(result, "FRESH_RECOVERY_VOLUME_INITIALIZED")
        return value

    @staticmethod
    def mount(name, target, readonly=False, subpath=None):
        return "--mount=type=volume,volume-nocopy,source=" + name + ",target=" + target + (",volume-subpath=" + subpath if subpath else "") + (",readonly" if readonly else "")

    def run(self, image, args, mounts, user="1000:1000", capabilities=(), entrypoint=None, env=(), timeout=900, scratch="64m"):
        name = self.token + "-client-" + uuid.uuid4().hex[:12]
        self.containers.append(name); self.journal()
        arguments = ["run", "--name", name, "--label", "org.openlap.recovery-run=" + self.token,
                     "--platform=linux/amd64", "--network=none", "--pull=never", "--user=" + user,
                     "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--memory=1g", "--pids-limit=128",
                     "--tmpfs=/tmp:rw,nosuid,size=" + scratch + ",mode=1777"]
        arguments += ["--cap-add=" + value for value in capabilities]
        arguments += list(mounts) + ["--env=" + value for value in env]
        if entrypoint: arguments += ["--entrypoint=" + entrypoint]
        return self.call(arguments + [image] + list(args), timeout=timeout)[1]

    def owned(self, name, volume=False):
        arguments = ["volume", "inspect", name, "--format={{json .Labels}}"] if volume else ["inspect", name, "--format={{json .Config.Labels}}"]
        _, body = self.call(arguments)
        require(json.loads(body).get("org.openlap.recovery-run") == self.token)

    def cleanup(self, volumes=False):
        complete = True
        for name in reversed(self.containers):
            try:
                self.owned(name); self.call(["rm", "--force", name], timeout=30)
            except Exception: complete = False
        if volumes:
            for name in reversed(self.volumes):
                try:
                    self.owned(name, volume=True); self.call(["volume", "rm", name], timeout=30)
                except Exception: complete = False
        return complete


def recover(options, output, transport):
    docker = Docker(options, output)
    completed = False; stage = "qualified-image-preflight"
    try:
        images = {}
        for role, reference in (("checkpoint", options["checkpoint_image"]), ("snapshot", options["snapshot_image"]), ("helper", HELPER_IMAGE)):
            stage = "qualified-" + role + "-image-preflight"
            images[role] = docker.image(reference)
        download = output / "download"
        stage = "independent-native-retrieval"
        pull = ["pull", "--age", options["age"], "--rclone", options["rclone"], "--rclone-config", options["rclone_config"],
                "--remote", options["remote"], "--identity-file", options["identity_file"], "--receipt", options["receipt"],
                "--receipt-sha256", options["receipt_sha256"], "--checkpoint-report-sha256", options["checkpoint_report_sha256"],
                "--output", str(download), "--max-bytes", str(options["max_bytes"]), "--max-files", str(options["max_files"]),
                "--timeout-seconds", str(options["timeout_seconds"])]
        require(transport.main(pull) == 0)
        receipt = read_json(download / "pull-receipt.json")
        require(receipt.get("status") == "DOWNLOADED_DECRYPTED_FILES_VERIFIED"
                and receipt.get("uploadReceiptSha256") == options["receipt_sha256"]
                and receipt.get("checkpointReportSha256") == options["checkpoint_report_sha256"])
        source = physical(download / "recovered", directory=True, private=True)
        stage = "retrieved-source-validation"
        before = source_inventory(source, options["max_bytes"] + MIB, options["max_files"])
        snapshot_path = source / "sources" / options["snapshot_label"]
        for filename, expected in (("artifact-index.json", options["artifact_index_sha256"]), ("snapshot.json", options["snapshot_manifest_sha256"])):
            require(metadata_digest(snapshot_path / filename) == expected)
        checkpoint = read_json(source / "checkpoint/checkpoint.json")
        snapshot = read_json(snapshot_path / "snapshot.json")
        require(snapshot.get("artifactIndexSha256") == options["artifact_index_sha256"]
                and snapshot.get("originalCheckpointReportSha256") == options["checkpoint_report_sha256"]
                and snapshot.get("archiveSha256") == checkpoint.get("archiveSha256"))
        stage = "fresh-volume-preparation"
        staged, index, storage, identities = [docker.volume(name, images["helper"]) for name in ("staging", "index", "storage", "identities")]
        stage = "fresh-uid1000-staging"
        copy = docker.run(images["helper"], ["-B", "-c", STAGE, "copy", before[0], str(os.getuid()), str(options["max_bytes"] + MIB), str(options["max_files"])],
                          ["--mount=type=bind,source=" + str(source) + ",target=/source,readonly", docker.mount(staged, "/destination")],
                          user="0:0", capabilities=["DAC_OVERRIDE", "CHOWN"], entrypoint="python3")
        copy_report = json_result(copy, "FRESH_UID1000_COPY_VERIFIED"); require(copy_report.get("sourceMetadataUnchanged") is True)
        stage = "disposable-local-identity-generation"
        json_result(docker.run(images["helper"], ["-B", "-c", STAGE, "credentials"], [docker.mount(identities, "/control")], entrypoint="python3"),
                    "DISPOSABLE_LOCAL_RECOVERY_IDENTITIES_CREATED")
        env = ["CHECKPOINT_ID=regenerated", "CHECKPOINT_EXPECTED_REPORT_SHA256=" + options["checkpoint_report_sha256"],
               "CHECKPOINT_REPORT_PATH=/inputs/retrieved/checkpoint/checkpoint.json", "CHECKPOINT_ARCHIVE_PATH=/inputs/retrieved/checkpoint/database.archive.gz"]
        for name in ("archive", "expanded", "restore"): env += ["CHECKPOINT_MAX_" + name.upper() + "_MIB=" + str(options["max_" + name + "_mib"])]
        stage = "isolated-database-rehearsal"
        checked = docker.run(images["checkpoint"], ["--index-plugin-artifacts"], [docker.mount(staged, "/inputs", True), docker.mount(index, "/outputs")],
                             env=env, timeout=600, scratch=str(options["max_restore_mib"] + 256) + "m")
        lines = checked.decode().splitlines()
        require(len(lines) == 3 and lines[0] == "OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1"
                and lines[2] == "OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1")
        db = json.loads(lines[1]); require(db.get("readyForS3Export") is True and db.get("associationsResolved") is True
                                         and db.get("artifactIndexSha256") == options["artifact_index_sha256"]
                                         and db.get("originalCheckpointReportSha256") == options["checkpoint_report_sha256"])
        stage = "fresh-object-store-rehearsal"
        restored = docker.run(images["snapshot"], ["--restore-fresh", "/backup/retrieved/sources/" + options["snapshot_label"],
                              options["snapshot_manifest_sha256"], options["artifact_index_sha256"], options["checkpoint_report_sha256"],
                              "/index/regenerated/artifact-index.json"],
                              [docker.mount(staged, "/backup", True), docker.mount(index, "/index", True), docker.mount(storage, "/storage"),
                               docker.mount(identities, "/run/openlap-root", True, "root"), docker.mount(identities, "/run/openlap-client", True, "client")],
                              env=["PLUGIN_STORAGE_S3_BUCKET=openlap-recovery-check", "PLUGIN_STORAGE_S3_REGION=us-east-1"],
                              entrypoint="/usr/local/bin/openlap-object-snapshot", timeout=1200)
        objects = json_result(restored, "FRESH_LOCAL_PLUGIN_OBJECT_RESTORE_VERIFIED")
        require(objects.get("databaseIndexMatched") is True and objects.get("coldReadbackVerified") is True
                and objects.get("manifestSha256") == options["snapshot_manifest_sha256"]
                and objects.get("artifactIndexSha256") == options["artifact_index_sha256"]
                and objects.get("originalCheckpointReportSha256") == options["checkpoint_report_sha256"]
                and objects.get("archiveSha256") == checkpoint.get("archiveSha256"))
        stage = "unchanged-source-verification"
        require(source_inventory(source, options["max_bytes"] + MIB, options["max_files"]) == before)
        stage = "backup-freshness-verification"
        release_time = datetime.strptime(receipt["releaseId"].split("-")[0], "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        age_hours = (datetime.now(timezone.utc) - release_time).total_seconds() / 3600
        fresh = 0 <= age_hours <= options["max_backup_age_hours"]
        completed = True
        stage = "scratch-cleanup-and-receipt"
        cleanup = docker.cleanup(volumes=True)
        report = {"schemaVersion": 1, "status": "INDEPENDENT_PLUGIN_RECOVERY_VERIFIED", "finishedAt": datetime.now(timezone.utc).isoformat(),
                  "uploadReceiptSha256": options["receipt_sha256"], "checkpointReportSha256": options["checkpoint_report_sha256"],
                  "artifactIndexSha256": options["artifact_index_sha256"], "snapshotManifestSha256": options["snapshot_manifest_sha256"],
                  "archiveSha256": checkpoint.get("archiveSha256"), "releaseId": receipt["releaseId"], "images": images,
                  "independentlyDownloadedAndDecrypted": True, "isolatedDatabaseRestoreVerified": True,
                  "independentDatabaseIndexMatched": True, "freshObjectStoreColdReadbackVerified": True,
                  "objectCount": objects.get("objectCount"), "sourceMetadataUnchanged": True,
                  "dockerSourceProjectionUid": copy_report.get("sourceProjectionUid"), "dockerScratchCleanupComplete": cleanup,
                  "backupFreshnessWithinPolicy": fresh, "maximumBackupAgeHours": options["max_backup_age_hours"],
                  "scope": "Retrieved primary-database/plugin-object recovery only; no fresh live checkpoint, application execution, secondary database or availability verified"}
        publish(output / "recovery-receipt.json", report)
        return report, 0 if fresh and cleanup else 2
    except (Exception, KeyboardInterrupt):
        try:
            publish(output / "recovery-failure.json", {"schemaVersion": 1, "status": "PLUGIN_RECOVERY_CHECK_INCOMPLETE", "stage": stage})
        except Exception:
            pass
        raise
    finally:
        if not completed:
            docker.cleanup(volumes=False)  # Retain failed scratch for a scoped review; never prune other Docker data.


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, help="Private owner-only JSON of paths, hashes and reviewed image references; never credential values")
    options = parser.parse_args(argv)
    lock = None; previous_umask = os.umask(0o077); previous_signals = {}
    try:
        require(os.name == "posix")
        def interrupted(_number, _frame):
            raise RecoveryError("Recovery check interrupted.")
        for selected in (signal.SIGTERM, signal.SIGHUP):
            previous_signals[selected] = signal.signal(selected, interrupted)
        settings = config(options.config)
        state = physical(settings["state_directory"], directory=True, private=True)
        require(not any((path / ".git").exists() for path in (state, *state.parents)))
        lock = os.open(state / "recovery-check.lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        info = os.fstat(lock); require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_uid == os.getuid() and info.st_mode & 0o077 == 0)
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        output = state / ("check-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:12])
        output.mkdir(mode=0o700)
        spec = importlib.util.spec_from_file_location("plugin_release_transport", SCRIPT.with_name("plugin-release-backup.py"))
        transport = importlib.util.module_from_spec(spec); spec.loader.exec_module(transport)
        report, result = recover(settings, output, transport)
        print(json.dumps({"status": report["status"], "backupFreshnessWithinPolicy": report["backupFreshnessWithinPolicy"],
                          "dockerScratchCleanupComplete": report["dockerScratchCleanupComplete"]}))
        return result
    except (Exception, KeyboardInterrupt):
        print("Plugin recovery check incomplete. Private diagnostics and retained scratch were not printed; inspect the protected run directory.", file=sys.stderr)
        return 1
    finally:
        if lock is not None: os.close(lock)
        for selected, handler in previous_signals.items(): signal.signal(selected, handler)
        os.umask(previous_umask)


if __name__ == "__main__":
    sys.exit(main())
