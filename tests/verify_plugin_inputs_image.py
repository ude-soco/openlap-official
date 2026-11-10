#!/usr/bin/env python3
"""Credential-free Docker checks for the public source-staging image; no service access."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import runpy
import secrets
import stat
import subprocess
import sys
import tempfile

EXPECTED = {
    "analytics/AnalyticsMethods-Prototypes-1.0-SNAPSHOT.jar": (87176, "5ed1a34bee570f1a8fc209a55f2ff69ff90c5c686c4a7b7fa35a6c010fff68c7"),
    "visualizations/Visualizer-C3-1.0-SNAPSHOT.jar": (60130, "ba08d00b3a26d7d5e6b127a55b1a965c08dd3e1bfd5da6ef865134f78d380033"),
}


def snapshot(root):
    return {str(path.relative_to(root)): (path.stat().st_ino, path.stat().st_mode, path.stat().st_uid,
            path.stat().st_gid, path.stat().st_mtime_ns, path.stat().st_ctime_ns,
            path.read_bytes() if path.is_file() else None) for path in [root, *root.rglob("*")]}


def inside():
    assert os.geteuid() == 1000 and os.getegid() == 1000
    script = Path("/opt/plugin-inputs/stage.py")
    source = script.parent / "jars"
    assert {str(path.relative_to(source)) for path in source.rglob("*.jar")} == set(EXPECTED)
    for name, (size, digest) in EXPECTED.items():
        data = (source / name).read_bytes()
        assert len(data) == size and hashlib.sha256(data).hexdigest() == digest
    manifest = Path("/manifest/manifest.json")
    digest = hashlib.sha256(manifest.read_bytes()).hexdigest()
    target = Path("/staging/input")
    assert stat.S_IMODE(target.parent.stat().st_mode) == 0o777
    command = [sys.executable, "-B", str(script), "--manifest", str(manifest), "--manifest-sha256", digest,
               "--destination", str(target)]
    created = subprocess.run(command, capture_output=True, timeout=15)
    assert created.returncode == 0, "Staging entrypoint failed"
    assert (target / "manifest.json").read_bytes() == manifest.read_bytes()
    assert set(path.name for path in target.iterdir()) == {"jars", "manifest.json", "staging-provenance.json"}
    for path in [target, *target.rglob("*")]:
        info = path.lstat()
        assert info.st_uid == 1000 and info.st_gid == 1000 and not path.is_symlink()
        assert stat.S_IMODE(info.st_mode) == (0o700 if path.is_dir() else 0o600)
    before = snapshot(target)
    checked = subprocess.run(command + ["--verify"], capture_output=True, timeout=15)
    assert checked.returncode == 0 and snapshot(target) == before
    repeated = subprocess.run(command, capture_output=True, timeout=15)
    assert repeated.returncode == 1 and snapshot(target) == before
    bad = command.copy()
    bad[bad.index("--manifest-sha256") + 1] = "0" * 64
    bad[bad.index("--destination") + 1] = "/staging/rejected"
    assert subprocess.run(bad, capture_output=True, timeout=15).returncode == 1
    assert not Path("/staging/rejected").exists()
    # The post-stage verifier does not need access to the source volume or ConfigMap.
    module = runpy.run_path(str(script))
    module["stage"](Path("/not-mounted/manifest.json"), digest, target,
                    source_root=Path("/not-mounted/jars"), verify=True)
    assert snapshot(target) == before
    print("PASS: pinned source JAR set/hashes; UID1000/private modes; stage/readonly verify; no overwrite; wrong hash rejected.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image")
    parser.add_argument("--inside", action="store_true")
    options = parser.parse_args()
    if options.inside:
        inside()
        return
    if not options.image:
        parser.error("--image is required")
    metadata = json.loads(subprocess.check_output(["docker", "image", "inspect", "--format",
        '{"id":{{json .Id}},"user":{{json .Config.User}},"entrypoint":{{json .Config.Entrypoint}}}', options.image], text=True))
    assert re.fullmatch(r"sha256:[a-f0-9]{64}", metadata["id"])
    assert metadata["user"] == "1000:1000"
    assert metadata["entrypoint"] == ["python3", "-B", "/opt/plugin-inputs/stage.py"]
    name = "plugin-inputs-image-check-" + secrets.token_hex(6)
    with tempfile.TemporaryDirectory(prefix="plugin-inputs-synthetic-") as temporary:
        manifest = Path(temporary) / "manifest.json"
        manifest.write_text('{"version":1,"entries":[],"files":[]}\n')
        manifest.chmod(0o644)
        command = ["docker", "run", "--rm", "--pull=never", "--name=" + name,
            "--platform=linux/amd64", "--network=none", "--read-only", "--user=1000:1000",
            "--cap-drop=ALL", "--security-opt=no-new-privileges", "--memory=128m", "--cpus=1",
            "--pids-limit=32", "--tmpfs=/staging:rw,noexec,nosuid,size=8m,mode=0777",
            "--mount", "type=bind,source=" + str(manifest) + ",target=/manifest/manifest.json,readonly",
            "--mount", "type=bind,source=" + str(Path(__file__).resolve()) + ",target=/image-check.py,readonly",
            "--entrypoint=python3", metadata["id"], "-B", "/image-check.py", "--inside"]
        try:
            completed = subprocess.run(command, capture_output=True, text=True, timeout=60)
        except subprocess.TimeoutExpired:
            subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=15)
            raise RuntimeError("Source-image verification exceeded its bounded runtime.") from None
        if completed.returncode:
            raise RuntimeError((completed.stdout + completed.stderr)[-3000:])
        print(completed.stdout.strip())


if __name__ == "__main__":
    main()
