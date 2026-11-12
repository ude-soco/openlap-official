#!/usr/bin/env python3
"""Prepare two reviewed historical JARs from local Git objects; never fetch or execute them."""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import selectors
import shutil
import stat
import subprocess
import sys
import time
import zipfile


REPOSITORY = "https://github.com/ude-soco/openlap-official"
COMMIT = "4768ec732c667940e00dfc5a87e0300ed0a7ef75"
MAX_BLOB_BYTES = 128 * 1024
MAX_UNCOMPRESSED_BYTES = 16 * 1024 * 1024
MAX_ENTRY_BYTES = 4 * 1024 * 1024
MAX_ENTRIES = 256
PINNED_MANIFEST = {
    "version": 1,
    "repository": REPOSITORY,
    "commit": COMMIT,
    "artifacts": [
        {
            "kind": "analytics",
            "git_path": "openlap-analyticsframework/jars/analytics_techniques/AnalyticsMethods-Prototypes-1.0-SNAPSHOT.jar",
            "git_blob": "086084d815143e880aea942bc843e6d72c3652f0",
            "sha256": "5ed1a34bee570f1a8fc209a55f2ff69ff90c5c686c4a7b7fa35a6c010fff68c7",
            "size_bytes": 87176,
            "output_path": "jars/analytics/AnalyticsMethods-Prototypes-1.0-SNAPSHOT.jar",
        },
        {
            "kind": "visualizations",
            "git_path": "openlap-analyticsframework/jars/visualization_methods/Visualizer-C3-1.0-SNAPSHOT.jar",
            "git_blob": "0c5774f0ea0df6aba2346dfa6e920f994a6b16bd",
            "sha256": "ba08d00b3a26d7d5e6b127a55b1a965c08dd3e1bfd5da6ef865134f78d380033",
            "size_bytes": 60130,
            "output_path": "jars/visualizations/Visualizer-C3-1.0-SNAPSHOT.jar",
        },
    ],
}


class RecoveryError(Exception):
    """A bounded diagnostic that contains no Git stderr or credential configuration."""


def _absolute(path):
    path = Path(path)
    if ".." in path.parts or not path.name:
        raise RecoveryError("Parent traversal and empty paths are not allowed.")
    return Path(os.path.abspath(path))


def _directory_fd(path):
    """Walk existing directories without following symlinks, retaining a directory handle."""
    if os.name != "posix" or not hasattr(os, "O_NOFOLLOW"):
        raise RecoveryError("POSIX directory and permission support is required.")
    path = _absolute(path)
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    descriptor = os.open(path.anchor, flags)
    try:
        for part in path.parts[1:]:
            child = os.open(part, flags, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        return descriptor
    except OSError:
        os.close(descriptor)
        raise RecoveryError("An existing directory is unavailable or contains a symlink.") from None


def _validate_manifest(manifest):
    if not isinstance(manifest, dict) or set(manifest) != set(PINNED_MANIFEST):
        raise RecoveryError("The recovery manifest has an unsupported schema.")
    if type(manifest["version"]) is not int or manifest["version"] != 1 or manifest["repository"] != REPOSITORY:
        raise RecoveryError("The recovery manifest must identify the reviewed public repository.")
    if not isinstance(manifest["commit"], str) or not re.fullmatch(r"[a-f0-9]{40}", manifest["commit"]):
        raise RecoveryError("A complete immutable Git commit is required.")
    artifacts = manifest["artifacts"]
    if not isinstance(artifacts, list) or len(artifacts) != 2:
        raise RecoveryError("Exactly the two reviewed artifact paths are required.")
    for artifact, approved in zip(artifacts, PINNED_MANIFEST["artifacts"]):
        if not isinstance(artifact, dict) or set(artifact) != set(approved):
            raise RecoveryError("An artifact has an unsupported schema.")
        if any(artifact[key] != approved[key] for key in ("kind", "git_path", "output_path")):
            raise RecoveryError("Only the two reviewed source and output paths are allowed.")
        for key, length in (("git_blob", 40), ("sha256", 64)):
            if not isinstance(artifact[key], str) or not re.fullmatch(r"[a-f0-9]{%d}" % length, artifact[key]):
                raise RecoveryError("Every artifact needs complete immutable hash identities.")
        if type(artifact["size_bytes"]) is not int or not 0 < artifact["size_bytes"] <= MAX_BLOB_BYTES:
            raise RecoveryError("An artifact exceeds the bounded recovery size.")


def load_manifest():
    """The CLI policy is shipped with this tool, never read from the source repository argument."""
    directory = Path(__file__).resolve().parents[2] / "docs"
    descriptor = _directory_fd(directory)
    try:
        policy_fd = os.open("plugin-recovery-artifacts.json", os.O_RDONLY | os.O_NOFOLLOW, dir_fd=descriptor)
        with os.fdopen(policy_fd, "rb") as source:
            data = source.read(16 * 1024 + 1)
        if len(data) > 16 * 1024:
            raise RecoveryError("The recovery policy exceeds its size limit.")
        manifest = json.loads(data)
    except (OSError, ValueError):
        raise RecoveryError("The reviewed recovery policy could not be read.") from None
    finally:
        os.close(descriptor)
    _validate_manifest(manifest)
    if manifest != PINNED_MANIFEST:
        raise RecoveryError("The shipped recovery policy differs from the approved historical identities.")
    return manifest


def _git(repo, *arguments):
    git = shutil.which("git")
    if git is None:
        raise RecoveryError("Git is required to read the existing local public objects.")
    environment = {
        "PATH": os.defpath,
        "LANG": "C",
        "LC_ALL": "C",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
    }
    process = None
    try:
        process = subprocess.Popen(
            [git, "--no-pager", "--no-replace-objects", "-c", "protocol.allow=never", "-C", str(repo), *arguments],
            env=environment, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        )
        data = bytearray()
        deadline = time.monotonic() + 30
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            while True:
                if not selector.select(max(0, deadline - time.monotonic())):
                    raise RecoveryError("Reading the pinned local Git object exceeded its time limit.")
                block = os.read(process.stdout.fileno(), min(64 * 1024, MAX_BLOB_BYTES + 1 - len(data)))
                if not block:
                    break
                data.extend(block)
                if len(data) > MAX_BLOB_BYTES:
                    raise RecoveryError("The local Git object exceeds the recovery output limit.")
        process.wait(timeout=max(0, deadline - time.monotonic()))
        if process.returncode:
            raise RecoveryError("The pinned local Git object is unavailable; obtain the approved public history separately.")
        return bytes(data)
    except (OSError, subprocess.TimeoutExpired):
        raise RecoveryError("The pinned local Git object could not be read; no fetch was attempted.") from None
    finally:
        if process is not None:
            if process.poll() is None:
                process.kill()
                process.wait()
            process.stdout.close()


def validate_jar(data):
    """Inspect ZIP structure and CRCs only. Class contents are never loaded or executed."""
    if not 0 < len(data) <= MAX_BLOB_BYTES:
        raise RecoveryError("The JAR exceeds its recovery size limit.")
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            if not 0 < len(entries) <= MAX_ENTRIES:
                raise RecoveryError("The JAR has an invalid archive entry count.")
            names = set()
            total = 0
            for entry in entries:
                name = entry.filename
                parts = name.rstrip("/").split("/")
                mode = entry.external_attr >> 16
                # These pinned Maven archives use an unset (-1) Unix mode on empty metadata directories.
                legacy_directory = entry.is_dir() and entry.file_size == 0 and mode == 0xffff
                if (not name or len(name) > 1024 or name.startswith("/") or "\\" in name or ":" in name
                        or any(part in ("", ".", "..") for part in parts) or name in names
                        or "\x00" in entry.orig_filename or stat.S_ISLNK(mode)
                        or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR) and not legacy_directory)):
                    raise RecoveryError("The JAR contains an unsafe or duplicate archive path.")
                if entry.flag_bits & 1 or entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                    raise RecoveryError("Encrypted or unsupported ZIP entries are not accepted.")
                total += entry.file_size
                if entry.file_size > MAX_ENTRY_BYTES or total > MAX_UNCOMPRESSED_BYTES:
                    raise RecoveryError("The JAR exceeds its uncompressed size limits.")
                names.add(name)
                if not entry.is_dir():
                    with archive.open(entry) as source:
                        while source.read(64 * 1024):
                            pass
            if "META-INF/MANIFEST.MF" not in names or not any(name.endswith(".class") for name in names):
                raise RecoveryError("The archive must contain JAR metadata and class entries.")
    except (zipfile.BadZipFile, OSError, RuntimeError, NotImplementedError):
        raise RecoveryError("The historical artifact is not a valid bounded JAR archive.") from None


def _read_artifact(repo, commit, artifact):
    path = artifact["git_path"]
    blob = artifact["git_blob"]
    expected_tree = ("100644 blob " + blob + "\t" + path + "\0").encode("ascii")
    if _git(repo, "ls-tree", "-z", commit, "--", path) != expected_tree:
        raise RecoveryError("The pinned commit does not bind the approved path to the approved Git blob.")
    if _git(repo, "cat-file", "-s", blob).strip() != str(artifact["size_bytes"]).encode("ascii"):
        raise RecoveryError("The local Git blob does not have its approved size.")
    data = _git(repo, "cat-file", "blob", blob)
    git_hash = hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()
    if (len(data) != artifact["size_bytes"] or git_hash != blob
            or hashlib.sha256(data).hexdigest() != artifact["sha256"]):
        raise RecoveryError("The historical artifact failed Git identity, SHA-256 or size verification.")
    validate_jar(data)
    return data


def _write_private(directory, name, data):
    descriptor = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=directory)
    with os.fdopen(descriptor, "wb") as output:
        output.write(data)
        output.flush()
        os.fsync(output.fileno())


def prepare(repo, output, manifest=None):
    """Retain partial output on failure; publish provenance only after both artifacts verify."""
    manifest = load_manifest() if manifest is None else manifest
    _validate_manifest(manifest)
    repo = _absolute(repo)
    repo_fd = _directory_fd(repo)
    os.close(repo_fd)
    output = _absolute(output)
    parent_fd = _directory_fd(output.parent)
    output_fd = None
    jars_fd = None
    try:
        os.mkdir(output.name, 0o700, dir_fd=parent_fd)
        os.fsync(parent_fd)
        output_fd = os.open(output.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent_fd)
        os.mkdir("jars", 0o700, dir_fd=output_fd)
        jars_fd = os.open("jars", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=output_fd)
        for artifact in manifest["artifacts"]:
            data = _read_artifact(repo, manifest["commit"], artifact)
            kind = artifact["kind"]
            os.mkdir(kind, 0o700, dir_fd=jars_fd)
            kind_fd = os.open(kind, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=jars_fd)
            try:
                _write_private(kind_fd, Path(artifact["output_path"]).name, data)
                os.fsync(kind_fd)
            finally:
                os.close(kind_fd)
        provenance = dict(manifest, verification={
            "git_commit_path_binding": True, "git_blob_sha1": True,
            "sha256": True, "size_bytes": True, "jar_zip_structure": True,
        })
        encoded = (json.dumps(provenance, indent=2, sort_keys=True) + "\n").encode("utf-8")
        _write_private(output_fd, "provenance.json.partial", encoded)
        os.fsync(jars_fd)
        os.fsync(output_fd)
        # A hard link publishes the completed report atomically without replacing any existing path.
        os.link("provenance.json.partial", "provenance.json", src_dir_fd=output_fd, dst_dir_fd=output_fd, follow_symlinks=False)
        try:
            os.unlink("provenance.json.partial", dir_fd=output_fd)
        except OSError:
            pass  # Both files contain the already-complete success record.
        os.fsync(output_fd)
        os.fsync(parent_fd)
    except OSError:
        if output_fd is not None:
            try:
                os.unlink("provenance.json", dir_fd=output_fd)
                os.fsync(output_fd)
            except OSError:
                pass
        raise RecoveryError("Output could not be created exclusively with private permissions; any partial output was retained.") from None
    finally:
        for descriptor in (jars_fd, output_fd, parent_fd):
            if descriptor is not None:
                os.close(descriptor)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2], help="Existing local public Git history; never fetched.")
    parser.add_argument("--output", type=Path, required=True, help="New private output directory; its parent must already exist.")
    args = parser.parse_args()
    try:
        prepare(args.repo, args.output)
    except RecoveryError as error:
        print("Recovery preparation failed: " + str(error), file=sys.stderr)
        return 1
    print("Prepared two verified historical plugin JARs and provenance.json.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
