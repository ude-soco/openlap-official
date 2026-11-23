#!/usr/bin/env python3
"""Download and verify the local E5 model and tokenizer used for Indicator Pool search."""

import argparse
import hashlib
from pathlib import Path
import shutil
import tempfile
from urllib.request import urlopen


REVISION = "ffb93f3bd4047442299a41ebb6fa998a38507c52"
SOURCE = f"https://huggingface.co/intfloat/e5-small-v2/resolve/{REVISION}"
FILES = {
    "model.onnx": "4b8205be2a3c5fc53c6534d76a2012064f7309c162b806f2889c6ec8ec4fdcba",
    "tokenizer.json": "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66",
}
DEFAULT = Path(__file__).resolve().parents[1] / "artifacts/semantic-search/e5-small-v2"


def digest(path):
    checksum = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            checksum.update(chunk)
    return checksum.hexdigest()


def prepare(directory):
    directory.mkdir(exist_ok=True, parents=True)
    for name, checksum in FILES.items():
        target = directory / name
        if target.is_file() and digest(target) == checksum:
            continue
        with tempfile.TemporaryDirectory(dir=directory) as stage:
            downloaded = Path(stage) / name
            with urlopen(f"{SOURCE}/{name}", timeout=90) as response, downloaded.open("wb") as output:
                shutil.copyfileobj(response, output)
            if digest(downloaded) != checksum:
                raise ValueError(f"Checksum mismatch for {name}")
            downloaded.replace(target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=DEFAULT, help="Model directory")
    arguments = parser.parse_args()
    prepare(arguments.directory)
    print(f"Verified E5 model and tokenizer in {arguments.directory.resolve()}")
