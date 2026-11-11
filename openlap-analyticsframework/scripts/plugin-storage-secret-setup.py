#!/usr/bin/env python3
"""Prepare private deployment env files when explicitly run by the operator."""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import stat
import subprocess
import sys
import tempfile


ROOT_FILE = "openlap-plugin-storage-root.env"
CLIENT_FILE = "openlap-plugin-storage-client.env"
BACKUP_FILE = "openlap-plugin-backup-upload.env"
MAX_CONFIG = 64 * 1024


class SetupError(Exception):
    pass


def require(condition):
    if not condition:
        raise SetupError()


def physical_directory(value):
    path = Path(value)
    require(path.is_absolute() and str(path.resolve()) == str(path))
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        info = os.fstat(fd)
        require(info.st_uid == os.getuid() and stat.S_IMODE(info.st_mode) & 0o022 == 0)
        return path, fd
    except BaseException:
        os.close(fd)
        raise


def identity(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns,
            info.st_ctime_ns, info.st_mode, info.st_uid, info.st_nlink)


def open_config(value):
    path = Path(value)
    require(path.is_absolute() and str(path.resolve()) == str(path))
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        require(stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid()
                and stat.S_IMODE(info.st_mode) in (0o400, 0o600)
                and info.st_nlink == 1 and 0 < info.st_size <= MAX_CONFIG)
        return fd, info
    except BaseException:
        os.close(fd)
        raise


def stop(process):
    if process is not None and process.poll() is None:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()


def encode_config(source, before, destination):
    """Only native base64/tr read config bytes; Python checks file metadata."""
    require(sys.platform == "darwin" or sys.platform.startswith("linux"))
    encoded = filtered = None
    env = {"PATH": "/usr/bin:/bin", "LANG": "C"}
    args = ["/usr/bin/base64"] + (["-b", "0"] if sys.platform == "darwin" else ["-w", "0"])
    prefix = b"RCLONE_CONFIG_BASE64="
    require(os.write(destination, prefix) == len(prefix))
    try:
        encoded = subprocess.Popen(args, stdin=source, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, env=env, start_new_session=True)
        filtered = subprocess.Popen(["/usr/bin/tr", "-d", "\r\n"], stdin=encoded.stdout,
            stdout=destination, stderr=subprocess.DEVNULL, env=env, start_new_session=True)
        encoded.stdout.close()
        require(filtered.wait(timeout=10) == 0 and encoded.wait(timeout=10) == 0)
        require(identity(os.fstat(source)) == identity(before))
        require(os.fstat(destination).st_size == len(prefix) + 4 * ((before.st_size + 2) // 3))
        require(os.write(destination, b"\n") == 1)
        os.fsync(destination)
    finally:
        stop(filtered)
        stop(encoded)
        if encoded is not None and encoded.stdout is not None:
            encoded.stdout.close()


def create_file(directory, name, content=None, config=None):
    fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600,
                 dir_fd=directory)
    try:
        if config is not None:
            encode_config(*config, fd)
        else:
            require(os.write(fd, content) == len(content))
            os.fsync(fd)
        return os.fstat(fd)
    finally:
        os.close(fd)


def prepare(output_directory, rclone_config=None):
    output, parent = physical_directory(output_directory)
    names = [ROOT_FILE, CLIENT_FILE] + ([BACKUP_FILE] if rclone_config is not None else [])
    source = None
    staging = None
    temporary = None
    published = []
    try:
        # Check every target before generating new credentials or opening config.
        for name in names:
            try:
                os.stat(name, dir_fd=parent, follow_symlinks=False)
            except FileNotFoundError:
                continue
            raise SetupError()
        config = None
        if rclone_config is not None:
            source, metadata = open_config(rclone_config)
            config = (source, metadata)
        staging = Path(tempfile.mkdtemp(prefix=".openlap-secret-setup-", dir=output))
        temporary = os.open(staging, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        root_key = "OLR" + "".join(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567") for _ in range(17))
        client_key = "OLA" + "".join(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567") for _ in range(17))
        records = {
            ROOT_FILE: ("ROOT_ACCESS_KEY_ID=" + root_key + "\nROOT_SECRET_ACCESS_KEY="
                        + secrets.token_urlsafe(30) + "\n").encode("ascii"),
            CLIENT_FILE: ("PLUGIN_STORAGE_S3_ACCESS_KEY=" + client_key
                          + "\nPLUGIN_STORAGE_S3_SECRET_KEY=" + secrets.token_urlsafe(30) + "\n").encode("ascii"),
        }
        identities = {}
        for name in names:
            identities[name] = create_file(temporary, name, records.get(name),
                                          config if name == BACKUP_FILE else None)
        os.fsync(temporary)
        for name in names:
            os.link(name, name, src_dir_fd=temporary, dst_dir_fd=parent, follow_symlinks=False)
            published.append(name)
        os.fsync(parent)
        return {"schemaVersion": 1, "status": "PRIVATE_ENV_FILES_PREPARED", "files": names,
                "deployed": False, "serviceAccessVerified": False}
    except BaseException:
        # Roll back only our newly linked inodes, never a pre-existing target.
        for name in reversed(published):
            current = os.stat(name, dir_fd=parent, follow_symlinks=False)
            original = identities[name]
            if (current.st_dev, current.st_ino) == (original.st_dev, original.st_ino):
                os.unlink(name, dir_fd=parent)
        if published:
            os.fsync(parent)
        raise
    finally:
        if source is not None:
            os.close(source)
        if temporary is not None:
            os.close(temporary)
        if staging is not None:
            shutil.rmtree(staging)
        os.close(parent)


class Arguments(argparse.ArgumentParser):
    def error(self, _message):
        raise SetupError()


def main():
    try:
        parser = Arguments(description=__doc__)
        parser.add_argument("--prepare", action="store_true")
        parser.add_argument("--output-directory", type=Path)
        parser.add_argument("--rclone-config", type=Path)
        args = parser.parse_args()
        require(args.prepare and args.output_directory is not None)
        result = prepare(args.output_directory, args.rclone_config)
        print(json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)
        return 0
    except (Exception, KeyboardInterrupt):
        try:
            print("Secret setup did not complete. No values were printed. Check existing files privately before retrying.",
                  file=sys.stderr, flush=True)
        except OSError:
            pass
        return 1


if __name__ == "__main__":
    sys.exit(main())
