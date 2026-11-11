"""Prepare a checksum-pinned official Linux client without receiving an API identity."""
import hashlib
import os
from pathlib import Path
import platform
import sys
import urllib.request

VERSION = "v1.35.10"
SHA256 = {
    "x86_64": ("amd64", "c49a28f1f4efc4d475ed05f47f2ce8e563bf7bef69ed77fe1b924ea6d83b6327"),
    "aarch64": ("arm64", "283f1be6a46b3695b625e25030106b8ffe18bd0d3a900f5b65c259ca407f04f5"),
}


def install(stream, target, expected):
    pending = target.with_name(target.name + ".pending")
    digest = hashlib.sha256(); size = 0
    with pending.open("xb") as output:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            size += len(block)
            if size > 100 * 1024 * 1024:
                raise ValueError("Oversized client")
            digest.update(block); output.write(block)
        output.flush(); os.fsync(output.fileno())
    if digest.hexdigest() != expected:
        raise ValueError("Client checksum mismatch")
    pending.chmod(0o500)
    os.link(pending, target)
    pending.unlink()


def main():
    try:
        architecture, expected = SHA256[platform.machine()]
        url = f"https://dl.k8s.io/release/{VERSION}/bin/linux/{architecture}/kubectl"
        with urllib.request.urlopen(url, timeout=90) as response:
            install(response, Path("/tools/kubectl"), expected)
        print("Official Kubernetes client verified; no API identity was used during preparation.")
        return 0
    except (OSError, ValueError, KeyError):
        print("Client preparation failed; capture has not started.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
