#!/usr/bin/env python3
"""Preserve plugin JARs and MongoDB through an explicitly scoped Kubernetes client.

Only POSIX shell builtins and cat are required in application containers. Credentials,
database contents, and raw client stderr are never included in diagnostic messages.
"""
import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import gzip
import hashlib
import ipaddress
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile
import threading


# Each recursive call has its own shell scope. Globs also include hidden directories;
# NUL separation preserves spaces without evaluating filenames as shell code.
LIST_JARS = r'''
cd -P "$1" || exit 40
[ "$(pwd -P)" = "$1" ] || exit 41
walk() (
    [ "$2" -le 32 ] || exit 42
    for item in "$1"/* "$1"/.[!.]* "$1"/..?*; do
        [ ! -L "$item" ] || exit 43
        if [ -d "$item" ]; then
            walk "$item" "$(( $2 + 1 ))" || exit $?
        elif [ -f "$item" ]; then
            case "$item" in *.jar) printf '%s\000' "$item" ;; esac
        fi
    done
)
walk . 0
'''
READ_JAR = r'''[ ! -L "$1" ] && [ -f "$1" ] || exit 43; exec cat -- "$1"'''
POD_FIELDS = ('{.metadata.uid}{"\t"}{.spec.nodeName}{"\t"}'
              '{range .status.containerStatuses[*]}{.name}{"|"}{.imageID}{"|"}'
              '{.restartCount}{"|"}{.ready}{";"}{end}')


class CaptureError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise CaptureError(message)


def identifier(value):
    require(bool(re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?", value or "")),
            "Invalid Kubernetes resource name.")
    return value


def source_root(value):
    path = PurePosixPath(value)
    require(path.is_absolute() and str(path) == value and ".." not in path.parts
            and not any(ord(c) < 32 for c in value), "Use an absolute, normalized JAR root.")
    return value


def paths_from_listing(data):
    require(len(data) <= 4 * 1024 * 1024 and data.endswith(b"\0"),
            "JAR inventory is empty, incomplete or too large.")
    try:
        paths = [p.decode("utf-8") for p in data[:-1].split(b"\0")]
    except UnicodeError:
        raise CaptureError("A source filename needs manual review.") from None
    for name in paths:
        path = PurePosixPath(name)
        require(name.startswith("./") and str(path) == name[2:] and ".." not in path.parts
                and name.endswith(".jar") and "\\" not in name
                and not any(ord(c) < 32 for c in name), "Unsafe or unsupported source filename.")
    require(len(paths) <= 10000 and len(paths) == len(set(paths)), "Ambiguous JAR inventory.")
    return sorted(p[2:] for p in paths)


def failure(stage, stderr=b"", timed_out=False):
    # Classify fixed client phrases; never forward arbitrary server/container text.
    if timed_out or any(p in stderr for p in [b"i/o timeout", b"context deadline exceeded", b"TLS handshake timeout"]):
        category = "connection timeout"
    elif b"(Forbidden)" in stderr:
        category = "permission denied"
    elif b"(Unauthorized)" in stderr or b"must be logged in" in stderr:
        category = "authentication failed"
    elif b"x509:" in stderr:
        category = "certificate verification failed"
    elif b"exit code 43" in stderr:
        category = "source contains a symlink or is no longer a regular file"
    elif any(p in stderr for p in [b"exit code 127", b"executable file not found", b"command not found"]):
        category = "required container command unavailable"
    elif b"exit code 40" in stderr or b"exit code 41" in stderr:
        category = "source root unavailable or indirect"
    elif b"exit code 42" in stderr:
        category = "source directory depth exceeds limit"
    else:
        category = "request failed"
    return CaptureError(f"Preservation stopped during {stage}: {category}. Raw client output was withheld.")


@dataclass(frozen=True)
class Pod:
    name: str
    container: str
    uid: str
    node: str
    image: str
    restarts: int


class Kubernetes:
    def __init__(self, namespace, connection, cache_dir):
        self.command = ["kubectl", "--namespace=" + identifier(namespace),
                        "--cache-dir=" + str(cache_dir)] + connection

    def read(self, stage, *args):
        try:
            result = subprocess.run(self.command + ["--request-timeout=25s"] + list(args),
                                    capture_output=True, timeout=35, check=False)
        except subprocess.TimeoutExpired:
            raise failure(stage, timed_out=True) from None
        except OSError:
            raise CaptureError("The Kubernetes client could not be started.") from None
        if result.returncode:
            raise failure(stage, result.stderr[:8192])
        return result.stdout

    def pod(self, name, container):
        identifier(name); identifier(container)
        data = self.read("pod identity check", "get", "pod", name, "-o", "jsonpath=" + POD_FIELDS)
        try:
            uid, node, statuses = data.decode().split("\t")
            matches = [s.split("|") for s in statuses.rstrip(";").split(";") if s.startswith(container + "|")]
            require(bool(uid) and bool(node) and len(matches) == 1, "Incomplete source pod identity.")
            _, image, restarts, ready = matches[0]
            require(ready == "true", "A source container is not ready.")
            return Pod(name, container, uid, node, image, int(restarts))
        except (ValueError, UnicodeError):
            raise CaptureError("Incomplete source pod identity.") from None

    def inventory(self, pod, root):
        data = self.read("JAR inventory", "exec", pod.name, "-c", pod.container, "--",
                         "/bin/sh", "-ceu", LIST_JARS, "preserve", root)
        return paths_from_listing(data)

    def stream(self, stage, args, target=None, maximum=256 * 1024 * 1024):
        digest = hashlib.sha256(); size = 0; expired = threading.Event()
        with tempfile.TemporaryFile() as errors:
            try:
                process = subprocess.Popen(self.command + ["--request-timeout=600s"] + list(args),
                                           stdout=subprocess.PIPE, stderr=errors)
            except OSError:
                raise CaptureError("The Kubernetes client could not be started.") from None
            def expire():
                expired.set()
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
            timer = threading.Timer(610, expire); timer.daemon = True; timer.start()
            try:
                while True:
                    block = process.stdout.read(1024 * 1024)
                    if not block:
                        break
                    size += len(block)
                    require(size <= maximum, "Capture exceeds its reviewed storage limit; partial data retained.")
                    digest.update(block)
                    if target:
                        target.write(block)
                process.wait()
                if process.returncode or expired.is_set():
                    errors.seek(0)
                    raise failure(stage, errors.read(8192), expired.is_set())
                require(size > 0, "A source stream was empty; preservation is incomplete.")
                return digest.hexdigest(), size
            finally:
                timer.cancel()
                if process.poll() is None:
                    process.kill(); process.wait()
                process.stdout.close()

    @staticmethod
    def jar_args(pod, path):
        return ["exec", pod.name, "-c", pod.container, "--", "/bin/sh", "-ceu", READ_JAR, "preserve", path]


def write_copy(kube, path, stage, args, maximum):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    partial = path.with_name(path.name + ".partial")
    descriptor = os.open(partial, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, "wb") as output:
        digest, size = kube.stream(stage, args, output, maximum)
        output.flush(); os.fsync(output.fileno())
    os.link(partial, path)  # Exclusive publication; neither completed nor partial copies are overwritten.
    partial.unlink()
    return digest, size


def capture(kube, namespace, backends, database, root, database_name, expected_digest, output,
            maximum=1800 * 1024 * 1024):
    root = source_root(root)
    require(bool(re.fullmatch(r"[A-Za-z0-9_-]{1,63}", database_name)), "Invalid database name.")
    require(bool(re.fullmatch(r"sha256:[a-f0-9]{64}", expected_digest)), "Supply the reviewed backend digest.")
    names = [p[0] for p in backends] + [database[0]]
    require(len(names) == len(set(names)) and len(backends) > 0, "Source pod identities must be distinct.")
    require(not output.exists() and not output.is_symlink(), "Checkpoint already exists; preserve it and choose a new destination.")
    require(not any((parent / ".git").exists() for parent in [output.parent, *output.parents]),
            "Keep preservation data outside Git working trees.")
    sources = [kube.pod(*p) for p in backends]
    mongo = kube.pod(*database)
    require(all(p.image.endswith(expected_digest) for p in sources), "A backend differs from the reviewed image.")
    listings = [kube.inventory(pod, root) for pod in sources]
    output.mkdir(mode=0o700, parents=False, exist_ok=False)
    report = {"namespace": namespace, "capturedAt": datetime.now(timezone.utc).isoformat(),
              "pods": [p.__dict__ for p in sources + [mongo]], "files": [],
              "consistency": "online preparation; write-paused checkpoint and restore rehearsal still required"}
    remaining = maximum
    for pod, files in zip(sources, listings):
        records = []
        for relative in files:
            path = output / "replicas" / pod.name / relative
            args = kube.jar_args(pod, root + "/" + relative)
            digest, size = write_copy(kube, path, "JAR copy", args, min(remaining, 256 * 1024 * 1024))
            remaining -= size
            records.append({"pod": pod.name, "recordedPath": root + "/" + relative,
                            "sourcePath": str(path.resolve()), "sha256": digest, "sizeBytes": size})
        # A separate full read verifies source bytes without requiring hashing tools in the backend.
        for row in records:
            digest, size = kube.stream("JAR source verification", kube.jar_args(pod, row["recordedPath"]),
                                       maximum=row["sizeBytes"])
            require((digest, size) == (row["sha256"], row["sizeBytes"]), "A source JAR changed during capture.")
        require(kube.inventory(pod, root) == files, "The source JAR inventory changed during capture.")
        report["files"].extend(records)
    archive = output / "database.archive.gz"
    args = ["exec", mongo.name, "-c", mongo.container, "--", "mongodump", "--host=127.0.0.1",
            "--db=" + database_name, "--archive", "--gzip", "--quiet"]
    digest, size = write_copy(kube, archive, "database backup", args, remaining)
    with gzip.open(archive, "rb") as stream:
        while stream.read(1024 * 1024):
            pass
    report["databaseBackup"] = {"path": str(archive.resolve()), "sha256": digest, "sizeBytes": size}
    require([kube.pod(*p) for p in backends] + [kube.pod(*database)] == sources + [mongo],
            "A source pod identity, image or restart count changed during capture.")
    manifest = output / "preservation.json"
    pending = output / "preservation.json.partial"
    with os.fdopen(os.open(pending, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as target:
        json.dump(report, target, indent=2); target.write("\n"); target.flush(); os.fsync(target.fileno())
    os.link(pending, manifest)
    pending.unlink()
    print(f"Verified {len(report['files'])} JAR copies from {len(sources)} stable backend replicas and a gzip-checked database archive.")
    print("Online preparation only: a write-paused checkpoint and restore rehearsal remain required.")
    return report


def cluster_connection(work):
    address = ipaddress.ip_address(os.environ["KUBERNETES_SERVICE_HOST"])
    port = int(os.environ.get("KUBERNETES_SERVICE_PORT_HTTPS", "443"))
    require(0 < port < 65536, "Invalid Kubernetes service port.")
    host = f"[{address}]" if address.version == 6 else str(address)
    account = "/var/run/secrets/kubernetes.io/serviceaccount/"
    config = {"apiVersion": "v1", "kind": "Config", "current-context": "preserve",
              "clusters": [{"name": "cluster", "cluster": {"server": f"https://{host}:{port}", "certificate-authority": account + "ca.crt"}}],
              "users": [{"name": "operator", "user": {"tokenFile": account + "token"}}],
              "contexts": [{"name": "preserve", "context": {"cluster": "cluster", "user": "operator"}}]}
    path = work / "client.json"
    with os.fdopen(os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as target:
        json.dump(config, target)
    return ["--kubeconfig=" + str(path)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    connection = parser.add_mutually_exclusive_group(required=True)
    connection.add_argument("--context")
    connection.add_argument("--kubeconfig", type=Path)
    connection.add_argument("--in-cluster", action="store_true")
    parser.add_argument("--namespace", default=os.environ.get("POD_NAMESPACE"))
    parser.add_argument("--backend-pod", action="append")
    parser.add_argument("--database-pod", default=os.environ.get("DATABASE_POD"))
    parser.add_argument("--backend-container", default="web")
    parser.add_argument("--database-container", default="mongo")
    parser.add_argument("--database", default=os.environ.get("DATABASE_NAME"))
    parser.add_argument("--jar-root", default="/opt/app/data/jars")
    parser.add_argument("--expected-backend-digest", default=os.environ.get("EXPECTED_BACKEND_DIGEST"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        namespace = identifier(args.namespace)
        pods = args.backend_pod or os.environ.get("BACKEND_PODS", "").split(",")
        backends = [(identifier(p), identifier(args.backend_container)) for p in pods]
        database = (identifier(args.database_pod), identifier(args.database_container))
        output = args.output
        if args.in_cluster:
            checkpoint = os.environ.get("CHECKPOINT_ID", "")
            require(bool(re.fullmatch(r"[A-Za-z0-9_-]{1,80}", checkpoint)), "Set an explicit, new checkpoint identifier.")
            require(output is None, "In-cluster output is fixed to the protected backup mount.")
            output = Path("/backup") / checkpoint
        require(output is not None, "Supply a new private output directory.")
        with tempfile.TemporaryDirectory(prefix="plugin-preserve-") as temporary:
            work = Path(temporary)
            selected = cluster_connection(work) if args.in_cluster else (
                ["--context=" + args.context] if args.context else ["--kubeconfig=" + str(args.kubeconfig)])
            capture(Kubernetes(namespace, selected, work / "cache"), namespace, backends, database,
                    args.jar_root, args.database or "", args.expected_backend_digest or "", output)
        return 0
    except CaptureError as error:
        print(str(error), file=sys.stderr)
    except (OSError, ValueError, KeyError, EOFError):
        print("Preservation incomplete: local storage, archive, or configuration check failed; partial data retained.", file=sys.stderr)
    print("No successful preservation inventory was published. Keep source pods intact.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
