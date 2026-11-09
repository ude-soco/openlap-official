"""Opt-in Docker checks; only allowlisted source files and synthetic data are mounted."""
import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / ".k8s/maintenance/plugin-preservation"
BASE_IMAGE = "amazoncorretto@sha256:019e58087ba4c114c817094f70d3d522bcd13e80ce9edbba6e1c67e5700bad63"
CAPTURE_IMAGE = "python@sha256:e064671ca452259bab50e8e2c7bd896e39e9a343bb06ca25234adf6fe18d0fc7"
spec = importlib.util.spec_from_file_location("container_capture", COMPONENT / "capture.py")
capture = importlib.util.module_from_spec(spec); sys.modules[spec.name] = capture; spec.loader.exec_module(capture)


def readable_tree(root):
    for path in [root, *root.rglob("*")]:
        path.chmod(0o755 if path.is_dir() else 0o644)


def main():
    with tempfile.TemporaryDirectory(prefix="plugin-preserve-containers-") as temporary:
        root = Path(temporary)
        fixture = root / "synthetic"; fixture.mkdir()
        binaries = {"first.jar": bytes(range(256)) * 512,
                    "UPPER.JAR": b"case-insensitive extension matches application upload rules",
                    "space dir/quoted '$()`.jar": b"second synthetic JAR",
                    ".hidden/third.jar": b"hidden synthetic JAR"}
        for name, content in binaries.items():
            path = fixture / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(content)
        readable_tree(root)
        common = ["docker", "run", "--rm", "--platform=linux/amd64", "--network=none", "--read-only",
                  "--user=1000:1000", "--cap-drop=ALL", "--security-opt=no-new-privileges",
                  "--mount", "type=bind,source=" + str(fixture) + ",target=/fixtures,readonly",
                  "--entrypoint=/bin/sh", BASE_IMAGE]
        missing = subprocess.run(common + ["-c", "command -v find"], capture_output=True, timeout=120)
        if missing.returncode == 0:
            raise AssertionError("The minimal-base regression fixture unexpectedly supplies find")
        result = subprocess.run(common + ["-ceu", capture.LIST_JARS, "preserve", "/fixtures"],
                                capture_output=True, check=True, timeout=120)
        assert capture.paths_from_listing(result.stdout) == sorted(binaries)
        for name, content in binaries.items():
            result = subprocess.run(common + ["-ceu", capture.READ_JAR, "preserve", "/fixtures/" + name],
                                    capture_output=True, check=True, timeout=120)
            assert result.stdout == content
            assert hashlib.sha256(result.stdout).digest() == hashlib.sha256(content).digest()
        print("PASS: real minimal Corretto image lacks find; builtin inventory and binary reads succeed.", flush=True)

        staged = root / "source"
        (staged / "tests").mkdir(parents=True)
        code = staged / ".k8s/maintenance/plugin-preservation"; code.mkdir(parents=True)
        for name in ["capture.py", "client.py"]:
            shutil.copyfile(COMPONENT / name, code / name)
        shutil.copyfile(ROOT / "tests/test_plugin_preservation.py", staged / "tests/test_plugin_preservation.py")
        readable_tree(staged)
        command = ["docker", "run", "--rm", "--read-only", "--user=1000:1000", "--cap-drop=ALL",
                   "--security-opt=no-new-privileges", "--tmpfs=/tools:rw,exec,size=128m,mode=0777",
                   "--tmpfs=/tmp:rw,size=128m,mode=1777", "--mount",
                   "type=bind,source=" + str(staged) + ",target=/verification,readonly",
                   "--env=PATH=/tools:/usr/local/bin:/usr/bin:/bin", CAPTURE_IMAGE,
                   "/bin/sh", "-ec", "python3 -B /verification/.k8s/maintenance/plugin-preservation/client.py; "
                   "kubectl version --client; python3 -B -m unittest discover -s /verification/tests -p test_plugin_preservation.py"]
        subprocess.run(command, check=True, timeout=180)
        print("PASS: complete regressions in the pinned maintenance image with its verified client.")


if __name__ == "__main__":
    main()
