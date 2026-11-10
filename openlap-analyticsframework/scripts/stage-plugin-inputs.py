#!/usr/bin/env python3
"""Stage only pinned public JARs and one SHA-approved private manifest; never execute them."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys

SOURCE_ROOT = Path("/opt/plugin-inputs/jars")
SOURCE_COMMIT = "4768ec732c667940e00dfc5a87e0300ed0a7ef75"
MAX_ARTIFACT_BYTES = 128 * 1024
MAX_MANIFEST_BYTES = 64 * 1024
ARTIFACTS = (
    {"path": "analytics/AnalyticsMethods-Prototypes-1.0-SNAPSHOT.jar", "size": 87176,
     "sha256": "5ed1a34bee570f1a8fc209a55f2ff69ff90c5c686c4a7b7fa35a6c010fff68c7"},
    {"path": "visualizations/Visualizer-C3-1.0-SNAPSHOT.jar", "size": 60130,
     "sha256": "ba08d00b3a26d7d5e6b127a55b1a965c08dd3e1bfd5da6ef865134f78d380033"},
)


class StageError(Exception):
    """Fixed, bounded diagnostics never include private file contents or paths."""


def _require(condition, message):
    if not condition:
        raise StageError(message)


def _directory(path):
    path = Path(path)
    _require(os.name == "posix" and hasattr(os, "O_NOFOLLOW"), "POSIX no-follow support is required.")
    _require(".." not in path.parts, "Parent traversal is not supported.")
    path = Path(os.path.abspath(path))
    descriptor = os.open(path.anchor, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in path.parts[1:]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def _private(descriptor, directory=False):
    info = os.fstat(descriptor)
    _require(info.st_uid == os.geteuid() and info.st_gid == os.getegid(), "Staged inputs have unexpected ownership.")
    _require(stat.S_IMODE(info.st_mode) == (0o700 if directory else 0o600), "Staged inputs are not private.")
    if not directory:
        _require(info.st_nlink == 1, "Hard-linked staged inputs are not supported.")


def _read(directory, name, maximum, size=None, digest=None, private=False):
    descriptor = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
    with os.fdopen(descriptor, "rb") as source:
        info = os.fstat(source.fileno())
        _require(stat.S_ISREG(info.st_mode) and 0 < info.st_size <= maximum, "An input is not a bounded regular file.")
        _require(size is None or info.st_size == size, "An input has an unexpected size.")
        if private:
            _private(source.fileno())
        data = source.read(maximum + 1)
    _require(0 < len(data) <= maximum and (size is None or len(data) == size), "An input changed during its bounded read.")
    _require(digest is None or hashlib.sha256(data).hexdigest() == digest, "An input checksum does not match its approved identity.")
    return data


def _file(path, maximum, digest=None):
    path = Path(path)
    parent = _directory(path.parent)
    try:
        return _read(parent, path.name, maximum, digest=digest)
    finally:
        os.close(parent)


def verified_sources(source_root=SOURCE_ROOT):
    sources = []
    for artifact in ARTIFACTS:
        path = Path(source_root) / artifact["path"]
        parent = _directory(path.parent)
        try:
            data = _read(parent, path.name, MAX_ARTIFACT_BYTES, artifact["size"], artifact["sha256"])
            sources.append((artifact, data))
        finally:
            os.close(parent)
    return sources


def _write(directory, name, data):
    descriptor = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=directory)
    with os.fdopen(descriptor, "wb") as output:
        output.write(data)
        output.flush()
        os.fsync(output.fileno())
        _private(output.fileno())
    _read(directory, name, len(data), len(data), hashlib.sha256(data).hexdigest(), private=True)


def _child(parent, name, create=False):
    if create:
        os.mkdir(name, 0o700, dir_fd=parent)
    child = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
    try:
        if create:
            os.fchmod(child, 0o700)  # Only this newly created directory; clear inherited setgid.
        _private(child, directory=True)
        return child
    except BaseException:
        os.close(child)
        raise


def _same(parent, name, descriptor):
    linked = os.stat(name, dir_fd=parent, follow_symlinks=False)
    opened = os.fstat(descriptor)
    _require(stat.S_ISDIR(linked.st_mode) and (linked.st_dev, linked.st_ino) == (opened.st_dev, opened.st_ino),
             "A staged directory was replaced during the operation.")


def _provenance(manifest_sha256, manifest_size):
    return {"version": 1, "sourceCommit": SOURCE_COMMIT, "artifacts": list(ARTIFACTS),
            "manifestSha256": manifest_sha256, "manifestSizeBytes": manifest_size}


def _verify(destination, manifest_sha256):
    parent = _directory(Path(destination).parent)
    root = jars = None
    try:
        root = _child(parent, Path(destination).name)
        _require(set(os.listdir(root)) == {"jars", "manifest.json", "staging-provenance.json"}, "The completed input directory has missing or unexpected entries.")
        manifest = _read(root, "manifest.json", MAX_MANIFEST_BYTES, digest=manifest_sha256, private=True)
        jars = _child(root, "jars")
        _require(set(os.listdir(jars)) == {Path(item["path"]).parent.name for item in ARTIFACTS}, "The staged JAR directory has unexpected entries.")
        for artifact in ARTIFACTS:
            relative = Path(artifact["path"])
            kind = _child(jars, relative.parent.name)
            try:
                _require(os.listdir(kind) == [relative.name], "A staged artifact directory has unexpected entries.")
                _read(kind, relative.name, MAX_ARTIFACT_BYTES, artifact["size"], artifact["sha256"], private=True)
                _same(jars, relative.parent.name, kind)
            finally:
                os.close(kind)
        record = json.loads(_read(root, "staging-provenance.json", MAX_MANIFEST_BYTES, private=True))
        _require(record == _provenance(manifest_sha256, len(manifest)), "Staging completion provenance does not match the approved inputs.")
        _same(root, "jars", jars)
        _same(parent, Path(destination).name, root)
    finally:
        for descriptor in (jars, root, parent):
            if descriptor is not None:
                os.close(descriptor)


def stage(manifest, manifest_sha256, destination, source_root=SOURCE_ROOT, verify=False):
    _require(os.geteuid() != 0, "Staging must run without root privileges.")
    _require(bool(re.fullmatch(r"[a-f0-9]{64}", manifest_sha256 or "")), "Supply the complete approved manifest SHA256.")
    destination = Path(destination)
    _require(destination.name and ".." not in destination.parts, "Supply an explicit destination without parent traversal.")
    try:
        if verify:
            _verify(destination, manifest_sha256)
            return
        _require(Path(manifest).suffix.lower() == ".json", "The approved private manifest must be a JSON file.")
        manifest_data = _file(manifest, MAX_MANIFEST_BYTES, digest=manifest_sha256)
        sources = verified_sources(source_root)
        parent = _directory(destination.parent)
        root = jars = None
        marker_identity = None
        published = False
        try:
            root = _child(parent, destination.name, create=True)
            _write(root, "manifest.json", manifest_data)
            jars = _child(root, "jars", create=True)
            for artifact, data in sources:
                relative = Path(artifact["path"])
                kind = _child(jars, relative.parent.name, create=True)
                try:
                    _write(kind, relative.name, data)
                    os.fsync(kind)
                    _same(jars, relative.parent.name, kind)
                finally:
                    os.close(kind)
            os.fsync(jars)
            _same(root, "jars", jars)
            _same(parent, destination.name, root)
            encoded = (json.dumps(_provenance(manifest_sha256, len(manifest_data)), sort_keys=True) + "\n").encode()
            partial = ".staging-provenance.partial"
            _write(root, partial, encoded)
            info = os.stat(partial, dir_fd=root, follow_symlinks=False)
            marker_identity = (info.st_dev, info.st_ino)
            os.fsync(root)
            os.fsync(parent)
            os.link(partial, "staging-provenance.json", src_dir_fd=root, dst_dir_fd=root, follow_symlinks=False)
            published = True
            os.unlink(partial, dir_fd=root)
            os.fsync(root)
            _same(parent, destination.name, root)
        except BaseException:
            if published:
                try:
                    info = os.stat("staging-provenance.json", dir_fd=root, follow_symlinks=False)
                    if (info.st_dev, info.st_ino) == marker_identity:
                        os.unlink("staging-provenance.json", dir_fd=root)
                except OSError:
                    pass
            raise
        finally:
            for descriptor in (jars, root, parent):
                if descriptor is not None:
                    os.close(descriptor)
    except (OSError, ValueError):
        raise StageError("Input staging or verification failed; retain partial data and use a fresh destination. No existing files were replaced.") from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--manifest-sha256", required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    try:
        _require(os.geteuid() == 1000 and os.getegid() == 1000, "The staging image requires UID/GID 1000.")
        os.umask(0o077)
        stage(args.manifest, args.manifest_sha256, args.destination, verify=args.verify)
    except StageError as error:
        print(str(error), file=sys.stderr)
        return 1
    print("Verified protected plugin inputs." if args.verify else "Staged two verified public JARs and the approved private manifest; existing inputs were not modified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
