#!/usr/bin/env python3
"""Verify pinned historical Apex generation against an already-built local image, offline."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tempfile

COMMIT = "acd1751d1ad256ec4b6e91d8e4321a23f33745fa"
GIT_PATH = "openlap-analyticsframework/jars/visualization_methods/ApexCharts-1.0-SNAPSHOT-jar-with-dependencies.jar"
BLOB = "a2bcc936e01f8927a2501b39970d6a56d0534983"
SHA256 = "46615516ff62cfc7c7978acf9a4385d9f3f31490265877408d9dc674bbe11029"
SIZE_BYTES = 7258904
CHARTS = {"Area", "Bar", "Donut", "Line", "Pie", "ScatterPlot"}


def read_jar(path):
    if path.suffix.lower() != ".jar" or not hasattr(os, "O_NOFOLLOW"):
        raise RuntimeError("An explicit .jar file and POSIX no-follow support are required.")
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_size != SIZE_BYTES:
        raise RuntimeError("Historical Apex must be a regular, non-symlink file of exactly 7258904 bytes.")
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "rb") as source:
        info = os.fstat(source.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size != SIZE_BYTES:
            raise RuntimeError("Historical Apex changed before its bounded read.")
        binary = source.read(SIZE_BYTES + 1)
    if len(binary) != SIZE_BYTES:
        raise RuntimeError("Historical Apex changed during its bounded read.")
    return binary


def historical_jar():
    repository = Path(__file__).resolve().parents[2]
    def git(*arguments):
        return subprocess.check_output(["git", "-C", str(repository), *arguments],
                                       stderr=subprocess.PIPE, timeout=30)
    try:
        blob = git("rev-parse", COMMIT + ":" + GIT_PATH).decode().strip()
        if blob != BLOB or git("cat-file", "-t", BLOB).strip() != b"blob":
            raise RuntimeError("The historical Apex Git object does not match its pinned blob.")
        if git("cat-file", "-s", BLOB).strip() != str(SIZE_BYTES).encode():
            raise RuntimeError("The historical Apex Git blob has an unexpected size.")
        binary = git("cat-file", "blob", BLOB)
    except subprocess.CalledProcessError:
        raise RuntimeError("Pinned historical Apex is unavailable locally. Fetch commit " + COMMIT
                           + " from the app repository, or supply the exact checksum-verified --jar; no plugin was executed.") from None
    if len(binary) != SIZE_BYTES:
        raise RuntimeError("The historical Apex Git blob changed during its bounded read.")
    return binary


def verify(options):
    if not shutil.which("docker"):
        raise RuntimeError("Docker is required; the image must already exist locally.")
    probe = Path(__file__).with_name("LegacyApexRenderProbe.java").resolve()
    name = "openlap-apex-probe-" + secrets.token_hex(6)
    with tempfile.TemporaryDirectory(prefix="openlap-apex-fixture-") as temporary:
        directory = Path(temporary).resolve()
        binary = read_jar(options.jar) if options.jar else historical_jar()
        if hashlib.sha256(binary).hexdigest() != SHA256:
            raise RuntimeError("Historical Apex SHA256 mismatch; no plugin was executed.")
        image = subprocess.check_output(["docker", "image", "inspect", "--format", "{{.Id}}", options.image],
                                        stderr=subprocess.PIPE, text=True, timeout=30).strip()
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", image):
            raise RuntimeError("The inspected image did not provide a complete SHA256 image ID.")
        jar = directory / "historical-apex.jar"
        jar.write_bytes(binary)
        jar.chmod(0o644)
        command = ["docker", "run", "--rm", "--pull=never", "--name=" + name, "--platform=linux/amd64",
                   "--network=none", "--read-only", "--user=1000:1000", "--cap-drop=ALL",
                   "--security-opt=no-new-privileges", "--memory=" + ("1g" if options.runtime_layout == "spring-boot" else "512m"),
                   "--cpus=1", "--pids-limit=64",
                   "--tmpfs=/tmp:rw,noexec,nosuid,size=64m,mode=1777",
                   "--mount", "type=bind,source=" + str(jar) + ",target=/probe/plugin.jar,readonly",
                   "--mount", "type=bind,source=" + str(probe) + ",target=/probe/LegacyApexRenderProbe.java,readonly"]
        if options.runtime_layout == "spring-boot":
            # Extract the already-built app only; never start Spring, HTTP services or database clients.
            command += ["--tmpfs=/runtime:rw,noexec,nosuid,size=512m,mode=1777",
                        "--entrypoint=/bin/sh", image, "-ec",
                        'cd /runtime; jar -xf /opt/app/analyticsframework.jar; '
                        'exec java -Xmx256m --source 11 '
                        '--class-path "/runtime/BOOT-INF/classes:/runtime/BOOT-INF/lib/*" '
                        '/probe/LegacyApexRenderProbe.java /probe/plugin.jar']
        else:
            command += ["--entrypoint=java", image, "-Xmx256m",
                        "-Dlogback.configurationFile=/opt/plugin-migration/logback.xml", "--source", "11",
                        "--class-path", "/opt/plugin-migration/classes:/opt/plugin-migration/lib/*",
                        "/probe/LegacyApexRenderProbe.java", "/probe/plugin.jar"]
        try:
            completed = subprocess.run(command, capture_output=True, timeout=90)
        except subprocess.TimeoutExpired:
            subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=20)
            raise RuntimeError("Historical Apex fixture exceeded its 90-second limit.") from None
    lines = [line for line in completed.stdout.splitlines() if line.startswith(b"APEX_RENDER_RESULT=")]
    if len(lines) != 1:
        raise RuntimeError("The Java source fixture did not produce its report: "
                           + completed.stderr.decode(errors="replace")[-3000:])
    report = json.loads(lines[0].removeprefix(b"APEX_RENDER_RESULT="))
    expected = {(chart, scenario) for chart in CHARTS for scenario in ("defaults", "customized")}
    expected.add(("Bar", "filtered"))
    rows = report.get("results", [])
    actual = {(row.get("chart"), row.get("scenario")) for row in rows}
    coverage_valid = report.get("historicalSha256") == SHA256 and len(rows) == len(expected) and actual == expected
    failures = [row for row in rows if row.get("status") != "PASS" or row.get("assertions", 0) < 16]
    passed = coverage_valid and not completed.returncode and report.get("passed") == len(expected) and not failures
    report.update(image=image, historicalCommit=COMMIT, historicalPath=GIT_PATH, historicalBlob=BLOB,
                  historicalSize=SIZE_BYTES, runtimeLayout=options.runtime_layout,
                  status="PASS" if passed else "FAIL", containerExitCode=completed.returncode,
                  probeSha256=hashlib.sha256(probe.read_bytes()).hexdigest(),
                  scope="Java generator output assertions only; no browser, script downloads, services or credentials")
    if options.output:
        descriptor = os.open(options.output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(report, stream, indent=2)
            stream.write("\n")
    if not coverage_valid:
        raise RuntimeError("Historical Apex fixture coverage is incomplete or duplicated.")
    if not passed:
        raise RuntimeError("Historical Apex generator assertions failed: " + json.dumps(failures))
    assertions = sum(row["assertions"] for row in rows)
    print(f"PASS: 6 historical Apex types, {len(rows)} default/customized/filter fixtures, {assertions} generator assertions; browser rendering was not exercised.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="Already built local image ID or reference")
    parser.add_argument("--runtime-layout", choices=("migration", "spring-boot"), default="spring-boot",
                        help="Use the migration classpath or the actual packaged application JAR")
    parser.add_argument("--jar", type=Path, help="Exact historical JAR; otherwise read the pinned local Git blob")
    parser.add_argument("--output", type=Path, help="New JSON report path; existing files are never overwritten")
    options = parser.parse_args()
    try:
        verify(options)
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
