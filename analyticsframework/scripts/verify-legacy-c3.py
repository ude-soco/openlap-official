#!/usr/bin/env python3
"""Verify historical C3 generation against a local migration or application image, offline."""

import argparse
import hashlib
import importlib.util
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

COMMIT = "4768ec732c667940e00dfc5a87e0300ed0a7ef75"
SHA256 = "ba08d00b3a26d7d5e6b127a55b1a965c08dd3e1bfd5da6ef865134f78d380033"
SIZE_BYTES = 60130
CHARTS = {"Area", "Bar", "Donut", "GroupedArea", "Line", "MultiLine", "Pie", "ScatterPlot", "StackedArea"}


def read_jar(path):
    if path.suffix.lower() != ".jar" or not hasattr(os, "O_NOFOLLOW"):
        raise RuntimeError("An explicit .jar file and POSIX no-follow support are required.")
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_size != SIZE_BYTES:
        raise RuntimeError("Historical C3 must be a regular, non-symlink file of exactly 60130 bytes.")
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "rb") as source:
        info = os.fstat(source.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size != SIZE_BYTES:
            raise RuntimeError("Historical C3 changed before its bounded read.")
        binary = source.read(SIZE_BYTES + 1)
    if len(binary) != SIZE_BYTES:
        raise RuntimeError("Historical C3 changed during its bounded read.")
    return binary


def prepared_jar(directory):
    spec = importlib.util.spec_from_file_location("plugin_recovery", Path(__file__).with_name("prepare-plugin-recovery.py"))
    recovery = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recovery)
    try:
        bundle = recovery.prepare(Path(__file__).resolve().parents[2], directory / "prepared")
    except recovery.RecoveryError as error:
        raise RuntimeError("Historical C3 preparation failed: " + str(error)) from None
    return bundle / "jars/visualizations/Visualizer-C3-1.0-SNAPSHOT.jar"


def verify(options):
    if not shutil.which("docker"):
        raise RuntimeError("Docker is required; the image must already exist locally.")
    probe = Path(__file__).with_name("LegacyC3RenderProbe.java").resolve()
    name = "openlap-c3-probe-" + secrets.token_hex(6)
    with tempfile.TemporaryDirectory(prefix="openlap-c3-fixture-") as temporary:
        directory = Path(temporary).resolve()
        binary = read_jar(options.jar if options.jar else prepared_jar(directory))
        if hashlib.sha256(binary).hexdigest() != SHA256:
            raise RuntimeError("Historical C3 SHA256 mismatch; no plugin was executed.")
        image = subprocess.check_output(["docker", "image", "inspect", "--format", "{{.Id}}", options.image],
                                        stderr=subprocess.PIPE, text=True, timeout=30).strip()
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", image):
            raise RuntimeError("The inspected image did not provide a complete SHA256 image ID.")
        jar = directory / "historical-c3.jar"
        jar.write_bytes(binary)
        jar.chmod(0o644)
        command = ["docker", "run", "--rm", "--pull=never", "--name=" + name, "--platform=linux/amd64",
                   "--network=none", "--read-only", "--user=1000:1000", "--cap-drop=ALL",
                   "--security-opt=no-new-privileges", "--memory=" + ("1g" if options.runtime_layout == "spring-boot" else "512m"),
                   "--cpus=1", "--pids-limit=64",
                   "--tmpfs=/tmp:rw,noexec,nosuid,size=64m,mode=1777",
                   "--mount", "type=bind,source=" + str(jar) + ",target=/probe/plugin.jar,readonly",
                   "--mount", "type=bind,source=" + str(probe) + ",target=/probe/LegacyC3RenderProbe.java,readonly"]
        if options.runtime_layout == "spring-boot":
            # Unpack only the already-built application inside an ephemeral, isolated container.
            # Do not start Spring, its HTTP server, account initialization or database clients.
            command += ["--tmpfs=/runtime:rw,noexec,nosuid,size=512m,mode=1777",
                        "--entrypoint=/bin/sh", image, "-ec",
                        'cd /runtime; jar -xf /opt/app/analyticsframework.jar; '
                        'exec java -Xmx256m --source 11 '
                        '--class-path "/runtime/BOOT-INF/classes:/runtime/BOOT-INF/lib/*" '
                        '/probe/LegacyC3RenderProbe.java /probe/plugin.jar']
        else:
            command += ["--entrypoint=java", image, "-Xmx256m",
                        "-Dlogback.configurationFile=/opt/plugin-migration/logback.xml", "--source", "11",
                        "--class-path", "/opt/plugin-migration/classes:/opt/plugin-migration/lib/*",
                        "/probe/LegacyC3RenderProbe.java", "/probe/plugin.jar"]
        try:
            completed = subprocess.run(command, capture_output=True, timeout=90)
        except subprocess.TimeoutExpired:
            subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=20)
            raise RuntimeError("Historical C3 fixture exceeded its 90-second limit.") from None
    lines = [line for line in completed.stdout.splitlines() if line.startswith(b"C3_RENDER_RESULT=")]
    if len(lines) != 1:
        raise RuntimeError("The Java source fixture did not produce its report: "
                           + completed.stderr.decode(errors="replace")[-3000:])
    report = json.loads(lines[0].removeprefix(b"C3_RENDER_RESULT="))
    expected = {(chart, scenario) for chart in CHARTS for scenario in ("defaults", "customized", "escaped")}
    expected.add(("Bar", "filtered"))
    rows = report.get("results", [])
    actual = {(row.get("chart"), row.get("scenario")) for row in rows}
    coverage_valid = report.get("historicalSha256") == SHA256 and len(rows) == len(expected) and actual == expected
    failures = [row for row in rows if row.get("status") != "PASS" or row.get("assertions", 0) < 13]
    passed = coverage_valid and not completed.returncode and report.get("passed") == len(expected) and not failures
    report.update(image=image, historicalCommit=COMMIT, runtimeLayout=options.runtime_layout,
                  status="PASS" if passed else "FAIL", containerExitCode=completed.returncode,
                  probeSha256=hashlib.sha256(probe.read_bytes()).hexdigest(),
                  scope="Java generator output assertions only; no browser, script downloads, services or credentials")
    if options.output:
        descriptor = os.open(options.output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(report, stream, indent=2)
            stream.write("\n")
    if not coverage_valid:
        raise RuntimeError("Historical C3 fixture coverage is incomplete or duplicated.")
    if not passed:
        raise RuntimeError("Historical C3 generator assertions failed: " + json.dumps(failures))
    assertions = sum(row["assertions"] for row in rows)
    print(f"PASS: 9 historical C3 types, {len(rows)} default/customized/filter/escaped-text fixtures, {assertions} generator assertions; browser rendering was not exercised.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="Already built local image ID or reference")
    parser.add_argument("--runtime-layout", choices=("migration", "spring-boot"), default="migration",
                        help="Use the migration classpath or the actual packaged application JAR")
    parser.add_argument("--jar", type=Path, help="Verified historical JAR; otherwise read the pinned local Git blob")
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
