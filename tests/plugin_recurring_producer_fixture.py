"""Actual packaged producer stages on fresh task volumes and generated inputs."""
import base64
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import uuid

ROOT = Path(__file__).resolve().parents[1]

COPY_ONE = r'''
import hashlib,json,os,pathlib,shutil,stat,sys
source=pathlib.Path('/from')/sys.argv[1];target=pathlib.Path('/to')/sys.argv[2]
assert not target.exists()
def inventory(root):
 result=[]
 for p in [root,*sorted(root.rglob('*'))]:
  m=p.lstat();assert stat.S_ISDIR(m.st_mode) or stat.S_ISREG(m.st_mode)
  assert not stat.S_ISLNK(m.st_mode) and m.st_uid==1000
  assert stat.S_IMODE(m.st_mode) in ((0o700,0o2700) if p.is_dir() else (0o600,))
  result.append((str(p.relative_to(root)),m.st_uid,m.st_gid,stat.S_IMODE(m.st_mode),m.st_size if p.is_file() else 0,hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None))
 assert len(result)<1500 and sum(r[4] for r in result)<16*1024*1024
 return result
before=inventory(source);target.mkdir(mode=0o700)
for p in sorted(source.rglob('*')):
 q=target/p.relative_to(source)
 if p.is_dir():q.mkdir(mode=0o700)
 else:
  with p.open('rb') as a,q.open('xb') as b:shutil.copyfileobj(a,b)
  q.chmod(0o600)
assert inventory(source)==before
for p in [target,*target.rglob('*')]:
 m=p.stat();assert m.st_uid==1000 and stat.S_IMODE(m.st_mode)==(0o700 if p.is_dir() else 0o600)
 if p.is_file():assert p.read_bytes()==(source/p.relative_to(target)).read_bytes()
print('FRESH_PRODUCER_VIEW_COPY_VERIFIED')
'''

RETAIN = r'''
import hashlib,json,os,pathlib,shutil,stat,sys
def inventory(root):
 result=[]
 for p in [root,*sorted(root.rglob('*'))]:
  m=p.lstat();assert stat.S_ISDIR(m.st_mode) or stat.S_ISREG(m.st_mode)
  assert not stat.S_ISLNK(m.st_mode)
  result.append((str(p.relative_to(root)),m.st_uid,m.st_gid,stat.S_IMODE(m.st_mode),m.st_size if p.is_file() else 0,hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None))
 assert len(result)<100 and sum(r[4] for r in result)<16*1024*1024
 return result
def copy(source,target):
 before=inventory(source);assert not list(target.iterdir())
 for p in sorted(source.rglob('*')):
  q=target/p.relative_to(source)
  if p.is_dir():q.mkdir(mode=0o700)
  else:
   with p.open('rb') as a,q.open('xb') as b:shutil.copyfileobj(a,b)
   q.chmod(0o600)
  os.chown(q,501,501)
 assert inventory(source)==before
copy(pathlib.Path('/actual-remote'),pathlib.Path('/remote'))
copy(pathlib.Path('/actual-custody'),pathlib.Path('/control'))
source=pathlib.Path('/actual-upload')/('upload-'+sys.argv[1])/'receipt.json';before=inventory(source.parent)
body=source.read_bytes();receipt=json.loads(body)
target=pathlib.Path('/control/receipt.json');target.write_bytes(body);target.chmod(0o600);os.chown(target,501,501)
assert inventory(source.parent)==before
print(json.dumps({'receiptSha256':hashlib.sha256(body).hexdigest(),'cipherSha256':receipt['cipherSha256'],'cipherSizeBytes':receipt['cipherSizeBytes']}))
'''


def require(value, message="Packaged producer fixture failed."):
    if not value: raise AssertionError(message)


class Producer:
    def __init__(self, *, run, volume, mount, checkpoint_image, snapshot_image, uploader_image, transport_image,
                 checkpoint_common, sdk_common, staging, online):
        self.run, self.volume, self.mount = run, volume, mount
        self.checkpoint_image, self.snapshot_image = checkpoint_image, snapshot_image
        self.uploader_image, self.transport_image = uploader_image, transport_image
        self.online = online; self.mode = "online" if online else "frozen"; self.uid = str(uuid.uuid4())
        self.workspace = volume("producer-workspace-" + self.uid[:8]); self.scratch = volume("producer-scratch-" + self.uid[:8])
        # Model kubelet's fresh emptyDir fsGroup; no private subdirectories are
        # prepared and neither fresh root is changed to owner UID1000.
        for fresh in (self.workspace, self.scratch):
            run(["run", "--rm", "--network=none", "--user=0:0", mount(fresh, "/fresh"), "--entrypoint=python3", transport_image, "-B", "-c",
                 "import os,pathlib,stat;p=pathlib.Path('/fresh');assert not list(p.iterdir());os.chown(p,0,1000);p.chmod(0o2770);m=p.stat();assert(m.st_uid,m.st_gid,stat.S_IMODE(m.st_mode))==(0,1000,0o2770)"],
                "fresh emptyDir group model")
        self.relative = "run-" + self.uid
        self.env = ["--env=BACKUP_POD_UID=" + self.uid, "--env=BACKUP_DESTINATION_APPROVED=true",
            "--env=BACKUP_DESTINATION_VALID_UNTIL=" + (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "--env=BACKUP_MINIMUM_DESTINATION_VALIDITY_SECONDS=3600", "--env=BACKUP_MAX_BYTES=8388608", "--env=BACKUP_MAX_FILES=1000",
            "--env=BACKUP_TIMEOUT_SECONDS=120", "--env=BACKUP_WORKSPACE_MAX_BYTES=1342177280", "--env=BACKUP_SCRATCH_MAX_BYTES=805306368",
            "--env=PLUGIN_DELETION_ENABLED=false"]
        self.checkpoint_common = [arg for arg in checkpoint_common if not arg.startswith("--tmpfs=/tmp")]
        self.sdk_common = [arg for arg in sdk_common if not arg.startswith("--tmpfs=/tmp")]
        self.basic = ["--platform=linux/amd64", "--user=1000:1000", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--memory=1g"]
        self.staging = staging

    def sub(self, folder, target, readonly=False):
        return self.mount(self.workspace, target, readonly, subpath=self.relative + "/" + folder)

    def copy(self, folder, source, destination, target):
        result = self.run(["run", "--rm", "--network=none", *self.basic, self.sub(folder, "/from", True), self.mount(destination, "/to"),
            "--entrypoint=python3", self.transport_image, "-B", "-c", COPY_ONE, source, target], "fresh fixture view of unchanged producer output")
        require(result.stdout.strip() == b"FRESH_PRODUCER_VIEW_COPY_VERIFIED")

    def capture(self, net, env, output):
        result = self.run(["run", "--rm", "--network=" + net, *self.checkpoint_common, *self.env, *env,
            self.mount(self.workspace, "/workspace"), self.mount(self.scratch, "/tmp"), "--entrypoint=/bin/bash", self.checkpoint_image,
            "--noprofile", "--norc", "/opt/openlap-checkpoint/recurring.sh", "--capture-" + self.mode], "packaged producer capture", timeout=600)
        self.report = json.loads(result.stdout.splitlines()[1]); self.report_hash = hashlib.sha256((result.stdout.splitlines()[1] + b"\n")).hexdigest()
        self.copy("checkpoints", "capture-" + self.uid, output, "source-capture")
        self.run(["run", "--rm", "--network=none", *self.basic, self.mount(self.workspace, "/workspace", True), "--entrypoint=python3", self.transport_image,
            "-B", "-c", "import pathlib,stat,sys;r=pathlib.Path('/workspace');m=r.stat();assert(m.st_uid,m.st_gid,stat.S_IMODE(m.st_mode))==(0,1000,0o2770);d=r/('run-'+sys.argv[1]);assert d.stat().st_uid==1000 and stat.S_IMODE(d.stat().st_mode)==0o2700;assert all(p.stat().st_uid==1000 and stat.S_IMODE(p.stat().st_mode)==0o2700 for p in d.iterdir() if p.is_dir());print('ROOTLESS_FRESH_PRIVATE_RUN_VERIFIED')", self.uid],
            "rootless producer creates private SGID directories")
        return result

    def index(self, output):
        result = self.run(["run", "--rm", "--network=none", *self.checkpoint_common, *self.env,
            self.sub("checkpoints", "/inputs", True), self.sub("indexes", "/outputs"), self.sub("control", "/control", True), self.mount(self.scratch, "/tmp"),
            "--entrypoint=/bin/bash", self.checkpoint_image, "--noprofile", "--norc", "/opt/openlap-checkpoint/recurring.sh", "--index-" + self.mode], "packaged producer independent index", timeout=600)
        self.index_summary = json.loads(result.stdout.splitlines()[1]); self.index_hash = self.index_summary["artifactIndexSha256"]
        self.copy("indexes", "index-" + self.uid, output, "frozen-index")
        return result

    def export(self, net, output):
        result = self.run(["run", "--rm", "--network=" + net, *self.sdk_common, *self.env,
            "--env=PLUGIN_STORAGE_S3_ENDPOINT=http://gateway:9000", self.sub("indexes", "/inputs", True), self.sub("objects", "/outputs"),
            self.sub("control", "/control", True), self.mount(self.scratch, "/tmp"), "--entrypoint=python3", self.snapshot_image,
            "-B", "/opt/openlap-storage/plugin-recurring-export.py", "--export-recurring-" + self.mode], "packaged producer immutable object export", timeout=1200)
        self.snapshot = json.loads(result.stdout); self.manifest_hash = self.snapshot["manifestSha256"]
        self.copy("objects", "objects-" + self.uid, output, "export")
        return result

    def upload(self, recipient, remote):
        folder = self.staging / ("producer-profile-" + self.uid); folder.mkdir(mode=0o755)
        (folder / "rclone.conf.b64").write_bytes(base64.b64encode(b"[fixture]\ntype = alias\nremote = /remote\n")); (folder / "rclone.conf.b64").chmod(0o444)
        result = self.run(["run", "--rm", "--network=none", *self.basic, *self.env, "--env=BACKUP_RECIPIENT=" + recipient, "--env=BACKUP_REMOTE=fixture:releases",
            self.sub("checkpoints", "/checkpoint", True), self.sub("indexes", "/indexes", True), self.sub("objects", "/sources", True), self.sub("control", "/control", True),
            self.sub("encrypted", "/outputs"), self.mount(self.scratch, "/tmp"), self.mount(remote, "/remote"),
            "--mount=type=bind,source=" + str(folder) + ",target=/run/plugin-backup-config,readonly", self.uploader_image, "--upload-recurring-" + self.mode],
            "packaged producer native encrypted upload/readback", timeout=600)
        return result

    def retain(self, remote, custody, new_remote, new_custody):
        result = self.run(["run", "--rm", "--network=none", "--user=0:0", "--read-only", "--cap-drop=ALL", "--cap-add=DAC_OVERRIDE", "--cap-add=CHOWN",
            self.mount(remote, "/actual-remote", True), self.mount(custody, "/actual-custody", True), self.sub("encrypted", "/actual-upload", True),
            self.mount(new_remote, "/remote"), self.mount(new_custody, "/control"), "--entrypoint=python3", self.transport_image, "-B", "-c", RETAIN, self.uid],
            "fresh independent ciphertext/identity custody copies")
        return json.loads(result.stdout)
