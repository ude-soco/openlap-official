"""Opt-in Docker checks; only allowlisted source files and synthetic data are mounted."""
import argparse
import hashlib
import importlib.util
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / ".k8s/maintenance/plugin-preservation-code"
BASE_IMAGE = "amazoncorretto@sha256:019e58087ba4c114c817094f70d3d522bcd13e80ce9edbba6e1c67e5700bad63"
CAPTURE_IMAGE = "python@sha256:e064671ca452259bab50e8e2c7bd896e39e9a343bb06ca25234adf6fe18d0fc7"
spec = importlib.util.spec_from_file_location("container_capture", COMPONENT / "capture.py")
capture = importlib.util.module_from_spec(spec); sys.modules[spec.name] = capture; spec.loader.exec_module(capture)
client_spec = importlib.util.spec_from_file_location("container_client", COMPONENT / "client.py")
client = importlib.util.module_from_spec(client_spec); client_spec.loader.exec_module(client)


def readable_tree(root):
    for path in [root, *root.rglob("*")]:
        path.chmod(0o755 if path.is_dir() else 0o644)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kubectl", type=Path, help="Optional official Linux client; exact reviewed architecture/SHA verified before use")
    options = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="plugin-preserve-containers-") as temporary:
        root = Path(temporary)
        fixture = root / "synthetic"; fixture.mkdir()
        binaries = {"first.jar": bytes(range(256)) * 512,
                    "UPPER.JAR": b"case-insensitive extension matches application upload rules",
                    "MiXeD.JaR": b"mixed-case extension",
                    "space dir/quoted '$()`.jar": b"second synthetic JAR",
                    ".hidden/third.jar": b"hidden synthetic JAR",
                    ".single.jar": b"hidden JAR",
                    "..double.jar": b"double-dot JAR",
                    "...triple.jar": b"triple-dot JAR",
                    "..hidden/fourth.jar": b"double-dot directory",
                    "...hidden/fifth.jar": b"triple-dot directory"}
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
        empty = fixture / "empty"; empty.mkdir(); empty.chmod(0o755)
        result = subprocess.run(common + ["-ceu", capture.LIST_JARS, "preserve", "/fixtures/empty"],
                                capture_output=True, check=True, timeout=120)
        assert capture.paths_from_listing(result.stdout) == []
        restricted = fixture / "restricted"; restricted.mkdir()
        (restricted / "present.jar").write_bytes(b"inaccessible synthetic JAR")
        # Linux tmpfs permissions avoid Docker Desktop host-share access emulation.
        permission_common = common[:-1] + ["--tmpfs=/permission-fixtures:rw,noexec,nosuid,size=1m,mode=0777", BASE_IMAGE]
        permission_fixture = r'''
root=/permission-fixtures/source
directory="$root"
[ "$2" != nested ] || directory="$root/nested"
mkdir -p "$directory"
printf '%s' 'inaccessible synthetic JAR' > "$directory/present.jar"
chmod "$1" "$directory"
exec /bin/sh -ceu "$3" preserve "$root"
'''
        for nested in [False, True]:
            for mode in [0o111, 0o444, 0o000]:
                result = subprocess.run(permission_common + ["-ceu", permission_fixture, "fixture", format(mode, "o"),
                                                             "nested" if nested else "root", capture.LIST_JARS],
                                        capture_output=True, timeout=120)
                assert result.returncode == (40 if not nested and mode != 0o111 else 44), (nested, mode, result.returncode)
                try:
                    capture.paths_from_listing(result.stdout)
                except capture.CaptureError:
                    pass
                else:
                    raise AssertionError("An inaccessible directory produced a completed inventory")
        prefix = 'printf() { case "$2" in ./restricted/*) return 1 ;; esac; command printf "$@"; }\n'
        result = subprocess.run(common + ["-ceu", prefix + capture.LIST_JARS, "preserve", "/fixtures"],
                                capture_output=True, timeout=120)
        assert result.returncode == 45
        try:
            capture.paths_from_listing(result.stdout)
        except capture.CaptureError:
            pass
        else:
            raise AssertionError("A failed nested inventory write produced completion framing")
        print("PASS: pinned minimal Corretto lacks find; framed inventory, binary reads, permissions and write failures verified as UID 1000.", flush=True)

        staged = root / "source"
        (staged / "tests").mkdir(parents=True)
        code = staged / ".k8s/maintenance/plugin-preservation-code"; code.mkdir(parents=True)
        for name in ["capture.py", "client.py"]:
            shutil.copyfile(COMPONENT / name, code / name)
        launchers = staged / ".k8s/maintenance/plugin-preservation"; launchers.mkdir()
        for name in ["capture.py", "client.py"]:
            shutil.copyfile(ROOT / ".k8s/maintenance/plugin-preservation" / name, launchers / name)
        for component, names in {
                "plugin-preservation": ["kustomization.yaml", "access.yaml", "job.yaml", "network.yaml", "volume.yaml"],
                "plugin-preservation-code": ["kustomization.yaml"],
                "plugin-preservation-compatibility": ["kustomization.yaml", "account.yaml", "job.yaml", "network.yaml"]}.items():
            destination = staged / ".k8s/maintenance" / component
            destination.mkdir(exist_ok=True)
            for name in names:
                shutil.copyfile(ROOT / ".k8s/maintenance" / component / name, destination / name)
        shutil.copyfile(ROOT / "tests/test_plugin_preservation.py", staged / "tests/test_plugin_preservation.py")
        prepare = "python3 -B /verification/.k8s/maintenance/plugin-preservation/client.py"
        offline = []
        if options.kubectl:
            if options.kubectl.is_symlink() or not options.kubectl.is_file():
                raise ValueError("The offline client must be a regular file")
            architecture, expected = client.SHA256[{"arm64": "aarch64"}.get(platform.machine(), platform.machine())]
            with options.kubectl.open("rb") as stream:
                client.install(stream, staged / "kubectl", expected)
            prepare = ("python3 -B -c 'import sys; from pathlib import Path; import platform; "
                       "sys.path.insert(0,\"/verification/.k8s/maintenance/plugin-preservation-code\"); "
                       "import client; client.install(open(\"/verification/kubectl\",\"rb\"),"
                       "Path(\"/tools/kubectl\"),client.SHA256[platform.machine()][1])'")
            offline = ["--pull=never", "--network=none", "--platform=linux/" + architecture]
        readable_tree(staged)
        command = ["docker", "run", "--rm"] + offline + ["--read-only", "--user=1000:1000", "--cap-drop=ALL",
                   "--security-opt=no-new-privileges", "--tmpfs=/tools:rw,exec,size=128m,mode=0777",
                   "--tmpfs=/tmp:rw,size=128m,mode=1777", "--mount",
                   "type=bind,source=" + str(staged) + ",target=/verification,readonly",
                   "--env=PLUGIN_PRESERVATION_EXPECT_PIN=1",
                   "--env=PATH=/tools:/usr/local/bin:/usr/bin:/bin", CAPTURE_IMAGE,
                   "/bin/sh", "-ec", prepare + "; "
                   "kubectl version --client; python3 -B -m unittest discover -s /verification/tests -p test_plugin_preservation.py"]
        subprocess.run(command, check=True, timeout=180)
        print("PASS: complete regressions in the pinned maintenance image with its verified client.")


if __name__ == "__main__":
    main()
