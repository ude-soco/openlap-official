"""Prepare a checksum-pinned official Linux client without receiving an API identity."""
import hashlib
import os
from pathlib import Path
import platform
import sys
import urllib.request

VERSION = "v1.31.14"
SHA256 = {
    "x86_64": ("amd64", "8791ec7c8966b61420d55103a5fb948de9f0ca3d7306d789734975ad9704bdb0"),
    "aarch64": ("arm64", "3abb0c2d7121e1833831f56fd857a93de386e76d14b64baf86220d0afe495209"),
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
