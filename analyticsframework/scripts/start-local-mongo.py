#!/usr/bin/env python3
"""Start only local Compose Mongo after checking an explicitly selected volume."""

import argparse
import json
import os
from pathlib import Path
import re
import selectors
import shutil
import signal
import subprocess
import sys
import time


MODULE = Path(__file__).resolve().parents[1]
PROJECTS = ("analyticsframework", "openlap-official")
MAX_OUTPUT_BYTES = 64 * 1024
INSPECT_TIMEOUT = 15
START_TIMEOUT = 120


class StartupError(Exception):
    pass


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise StartupError("Only --project analyticsframework or --project openlap-official is supported.")


def docker_call(docker, arguments, timeout):
    """Keep Docker diagnostics private and bound both execution time and output."""
    process = None
    try:
        process = subprocess.Popen(
            [docker, *arguments], cwd=MODULE, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, start_new_session=True,
        )
        output = bytearray()
        deadline = time.monotonic() + timeout
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            while selector.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise StartupError("Docker timed out. Check Docker Desktop and retry; no automatic cleanup was attempted.")
                for key, _event in selector.select(min(remaining, 0.25)):
                    chunk = os.read(key.fd, min(8192, MAX_OUTPUT_BYTES + 1 - len(output)))
                    if not chunk:
                        selector.unregister(key.fileobj)
                    else:
                        output.extend(chunk)
                        if len(output) > MAX_OUTPUT_BYTES:
                            raise StartupError("Docker returned excessive output; startup was stopped. Inspect the selected volume manually.")
        if process.wait(timeout=max(0, deadline - time.monotonic())):
            raise StartupError("Docker could not complete the requested check or startup. Verify the selected existing volume and Docker Desktop, then retry.")
        return output.decode("utf-8")
    except (OSError, UnicodeError, subprocess.TimeoutExpired):
        raise StartupError("Docker could not complete safely. Check Docker Desktop and the selected existing volume, then retry.") from None
    finally:
        if process is not None:
            if process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait(timeout=5)
            process.stdout.close()


def start(project):
    volume = os.environ.get("OPENLAP_MONGO_VOLUME", "")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,254}", volume):
        raise StartupError("Set OPENLAP_MONGO_VOLUME to one explicit existing Docker volume name. Create a separate fresh development volume yourself if needed.")
    docker = shutil.which("docker")
    if docker is None:
        raise StartupError("Docker is unavailable. Start Docker Desktop and retry.")

    selected = docker_call(docker, ["volume", "inspect", "--format={{.Name}}", "--", volume], INSPECT_TIMEOUT)
    if selected.strip() != volume:
        raise StartupError("The selected existing volume could not be verified; no volume was created or adopted.")
    owners = docker_call(docker, ["ps", "--no-trunc", "--filter=volume=" + volume, "--format={{.ID}}"], INSPECT_TIMEOUT).splitlines()
    if len(owners) > 1:
        raise StartupError("Multiple running containers use the selected volume. Stop them explicitly before starting local MongoDB.")
    if owners:
        if not re.fullmatch(r"[a-f0-9]{64}", owners[0]):
            raise StartupError("The selected volume's running owner could not be verified; startup was stopped.")
        # Project/service/state and the selected volume's data mount are the only
        # inspected container fields. Never request its environment or full config.
        template = (
            '{{json (index .Config.Labels "com.docker.compose.project")}}\n'
            '{{json (index .Config.Labels "com.docker.compose.service")}}\n'
            '{{json .State.Running}}\n'
            '{{range .Mounts}}{{if and (eq .Type "volume") (eq .Name "' + volume + '")}}'
            '[{{json .Destination}},{{json .RW}}]\n{{end}}{{end}}'
        )
        description = docker_call(docker, ["inspect", "--type=container", "--format=" + template, "--", owners[0]], INSPECT_TIMEOUT)
        try:
            owner = [json.loads(line) for line in description.splitlines()]
        except ValueError:
            owner = []
        if owner != [project, "mongo", True, ["/data/db", True]]:
            raise StartupError("Another or unverified running container uses the selected volume. Stop the old stack explicitly without deleting its volume, then retry.")

    # The external volume must already exist. No create/copy/stop/down operation
    # is issued. MongoDB's own data-directory lock remains the final race guard.
    docker_call(docker, ["compose", "--project-name", project,
                        "-f", str(MODULE / "compose.yaml"),
                        "-f", str(MODULE / "compose.dev.yaml"),
                        "up", "-d", "mongo"], START_TIMEOUT)


def main(arguments=None):
    try:
        parser = Parser(description=__doc__)
        parser.add_argument("--project", choices=PROJECTS, default=PROJECTS[0])
        options = parser.parse_args(arguments)
        start(options.project)
    except StartupError as error:
        print(str(error), file=sys.stderr)
        return 1
    print("MongoDB startup completed using the explicitly selected existing volume.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
