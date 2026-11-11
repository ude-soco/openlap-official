"""Test the exact local image with synthetic allowlisted mounts and no network/identity."""
import argparse
import base64
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
RECIPIENT = "age1h2hvrqlfd9ly7xwpm9h5e2fayhjzvggt9736sfhhklalxfmmn35qexxk72"
PROBE = r'''
import hashlib, importlib.util, json, os, pathlib, stat, subprocess, sys
mode, recipient, report_sha = sys.argv[1:]
assert os.getuid() == os.getgid() == 1000
assert not pathlib.Path('/opt/plugin-backup/bin/age-keygen').exists()
assert not pathlib.Path('/var/run/secrets/kubernetes.io/serviceaccount').exists()
try: pathlib.Path('/checkpoint/not-writable').write_bytes(b'fixture')
except OSError: pass
else: raise AssertionError('checkpoint mount is writable')
arguments = ['/opt/plugin-backup/entrypoint.sh', '--upload-report', '--checkpoint', '/checkpoint',
             '--source', 'artifacts=/sources', '--recipient', recipient, '--remote', 'fixture:copies',
             '--output', '/outputs/new', '--checkpoint-report-sha256', report_sha,
             '--max-bytes', '1048576', '--max-files', '100', '--timeout-seconds', '30']
if mode == 'default': arguments = ['/opt/plugin-backup/entrypoint.sh']
if mode == 'import': arguments = ['/opt/plugin-backup/entrypoint.sh', '--import-report', '/checkpoint/checkpoint.json']
result = subprocess.run(arguments, capture_output=True, timeout=40)
assert b'SYNTHETIC_CONFIG_PRIVATE_MARKER' not in result.stdout + result.stderr
if mode == 'valid':
    assert result.returncode == 0, result.stderr.decode()
    spec = importlib.util.spec_from_file_location('upload', '/opt/plugin-backup/plugin-backup-upload.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    receipt = module.parse_report(result.stdout, report_sha)
    actual = pathlib.Path('/outputs/new/receipt.json').read_bytes()
    assert actual == module.backup.json_bytes(receipt)
    assert len(result.stdout) < 4096
    assert json.loads(result.stdout.splitlines()[1])['receiptSha256'] == hashlib.sha256(actual).hexdigest()
    assert pathlib.Path('/outputs/new', receipt['objectName']).is_file()
    assert not pathlib.Path('/outputs/new/.work').exists()
    staged = list(pathlib.Path('/tmp').glob('plugin-backup-upload.*/rclone.conf'))
    assert len(staged) == 1
    assert staged[0].stat().st_uid == 1000 and stat.S_IMODE(staged[0].stat().st_mode) == 0o600
    assert stat.S_IMODE(staged[0].parent.stat().st_mode) == 0o700
    for path in [pathlib.Path('/outputs/new'), *pathlib.Path('/outputs/new').rglob('*')]:
        assert stat.S_IMODE(path.stat().st_mode) == (0o700 if path.is_dir() else 0o600)
else:
    assert result.returncode == 1
    assert result.stdout == b''
    assert not pathlib.Path('/outputs/new').exists()
print(json.dumps({'mode': mode, 'status': 'PASS'}))
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="Exact local sha256 Docker image ID")
    options = parser.parse_args()
    assert re.fullmatch(r"sha256:[a-f0-9]{64}", options.image)
    spec = importlib.util.spec_from_file_location("synthetic_checkpoint", ROOT / "tests/test_plugin_release_backup.py")
    fixture = importlib.util.module_from_spec(spec); spec.loader.exec_module(fixture)
    with tempfile.TemporaryDirectory(prefix="plugin-upload-image-") as temporary:
        root = Path(temporary).resolve(); root.chmod(0o755)
        docker_config = root / "docker-config"; docker_config.mkdir(mode=0o700)
        endpoint = os.environ.get("PLUGIN_BACKUP_DOCKER_HOST", "unix:///var/run/docker.sock")
        assert endpoint.startswith("unix:///") and len(endpoint) > 8 and all(31 < ord(c) != 127 for c in endpoint)
        docker = [shutil.which("docker"), "--config", str(docker_config), "--host", endpoint]
        assert docker[0]
        environment = {"PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": str(docker_config), "TMPDIR": str(root), "LANG": "C"}
        inspected = subprocess.check_output(docker + ["image", "inspect", options.image, "--format", "{{.Id}} {{.Config.User}} {{.Architecture}}"],
                                            text=True, env=environment).strip()
        assert inspected.split() == [options.image, "1000:1000", "amd64"]
        checkpoint, report_sha = fixture.checkpoint(root)
        checkpoint.chmod(0o755)
        for path in checkpoint.iterdir(): path.chmod(0o444)
        sources = root / "sources"; sources.mkdir(mode=0o755); (sources / "fixture.jar").write_bytes(b"SYNTHETIC_PLUGIN_BYTES")
        (sources / "fixture.jar").chmod(0o444)
        probe = root / "probe.py"; probe.write_text(PROBE); probe.chmod(0o444)
        compile(PROBE, "image-probe", "exec")
        configuration = b"[fixture]\ntype = alias\nremote = /outputs/remote\n# SYNTHETIC_CONFIG_PRIVATE_MARKER\n"
        modes = ["valid", "default", "import", "invalid", "garbage", "encoded-limit", "decoded-limit", "fifo", "escape", "missing", "unreadable"]
        for mode in modes:
            config = root / ("config-" + mode); config.mkdir(mode=0o755)
            version = config / "..fixture"; version.mkdir(mode=0o755)
            selected = version / "rclone.conf.b64"
            if mode == "fifo": os.mkfifo(selected, 0o444)
            elif mode != "missing":
                content = b"%%% invalid base64 %%%" if mode == "invalid" else base64.b64encode(configuration)
                if mode == "garbage": content += b"%"
                if mode == "encoded-limit": content = b"A" * 131073
                if mode == "decoded-limit": content = base64.b64encode(b"A" * 65537)
                selected.write_bytes(content); selected.chmod(0o444)
                if mode == "unreadable": selected.chmod(0)
            (config / "..data").symlink_to("..fixture", target_is_directory=True)
            (config / "rclone.conf.b64").symlink_to("/checkpoint/checkpoint.json" if mode == "escape" else "..data/rclone.conf.b64")
            command = docker + ["run", "--rm", "--pull=never", "--platform=linux/amd64", "--network=none", "--read-only",
                       "--user=1000:1000", "--cap-drop=ALL", "--security-opt=no-new-privileges",
                       "--tmpfs=/tmp:rw,noexec,nosuid,size=128m,mode=1777",
                       "--tmpfs=/outputs:rw,noexec,nosuid,size=32m,mode=0777",
                       "--mount", "type=bind,source=" + str(checkpoint) + ",target=/checkpoint,readonly",
                       "--mount", "type=bind,source=" + str(sources) + ",target=/sources,readonly",
                       "--mount", "type=bind,source=" + str(config) + ",target=/run/plugin-backup-config,readonly",
                       "--mount", "type=bind,source=" + str(probe) + ",target=/verification/probe.py,readonly",
                       "--entrypoint=python3", options.image, "-B", "/verification/probe.py", mode, RECIPIENT, report_sha]
            result = subprocess.run(command, capture_output=True, timeout=60, env=environment)
            if result.returncode:
                raise AssertionError("Synthetic image fixture failed: " + mode + "\n" + result.stderr.decode()[-2000:])
            assert json.loads(result.stdout)["status"] == "PASS"
        # Exercise Docker's configured ENTRYPOINT/CMD as well as the mounted probe.
        default = subprocess.run(docker + ["run", "--rm", "--pull=never", "--network=none", "--read-only", "--user=1000:1000",
                                  "--cap-drop=ALL", "--security-opt=no-new-privileges", options.image], capture_output=True, timeout=10, env=environment)
        assert default.returncode == 1 and default.stdout == b""
        print("PASS: exact image, UID1000/read-only/no-network operation, projected Secret staging, typed receipt and ten fail-closed cases.")


if __name__ == "__main__": main()
