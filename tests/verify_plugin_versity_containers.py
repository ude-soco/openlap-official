#!/usr/bin/env python3
"""Qualify only task-owned disposable containers; never reads operator credentials."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
SYNTHETIC = {
    "ROOT_ACCESS_KEY_ID": "SYNTHETICROOTACCESS01",
    "ROOT_SECRET_ACCESS_KEY": "synthetic-root-secret-for-isolated-fixtures-only-12345",
    "PLUGIN_STORAGE_S3_ACCESS_KEY": "SYNTHETICAPPACCESS001",
    "PLUGIN_STORAGE_S3_SECRET_KEY": "synthetic-app-secret-for-isolated-fixtures-only-67890",
}


def require(value, message="Container qualification failed."):
    if not value:
        raise RuntimeError(message)


def run(arguments, success=True, timeout=60):
    result = subprocess.run(["docker", *arguments], capture_output=True, timeout=timeout)
    if success:
        diagnostic = result.stderr.decode("utf-8", errors="replace")[-2048:]
        for value in SYNTHETIC.values():
            diagnostic = diagnostic.replace(value, "[synthetic]")
        require(result.returncode == 0, "Task-owned Docker operation failed: " + " ".join(arguments[:3]) + "\n" + diagnostic)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True)
    options = parser.parse_args()
    require(re.fullmatch(r"sha256:[a-f0-9]{64}", options.image) is not None)
    token = "openlap-versity-qualification-" + uuid.uuid4().hex[:12]
    volume, network, server = token + "-data", token + "-network", token + "-server"
    created_volume = created_network = created_server = False
    checks = []
    with tempfile.TemporaryDirectory(prefix="openlap-versity-fixtures-") as temporary:
        fixture = Path(temporary)
        for role, names in {"root": ["ROOT_ACCESS_KEY_ID", "ROOT_SECRET_ACCESS_KEY"],
                            "client": ["PLUGIN_STORAGE_S3_ACCESS_KEY", "PLUGIN_STORAGE_S3_SECRET_KEY"]}.items():
            directory = fixture / role
            directory.mkdir(mode=0o755)
            os.chmod(directory, 0o755)
            for name in names:
                (directory / name).write_text(SYNTHETIC[name])
                os.chmod(directory / name, 0o444)
        common = ["--platform=linux/amd64", "--user=1000:1000", "--read-only", "--cap-drop=ALL",
                  "--security-opt=no-new-privileges", "--tmpfs=/tmp:rw,size=64m,mode=1777",
                  "--env=PLUGIN_STORAGE_S3_BUCKET=openlap-qualification", "--env=PLUGIN_STORAGE_S3_REGION=us-east-1",
                  "--mount=type=bind,source=" + str(fixture / "client") + ",target=/run/openlap-client,readonly"]
        root_secret = ["--mount=type=bind,source=" + str(fixture / "root") + ",target=/run/openlap-root,readonly"]
        source_mount = ["--mount=type=bind,source=" + str(ROOT / "tests" / "fixtures") + ",target=/fixture,readonly"]
        readonly_data = ["--mount=type=volume,source=" + volume + ",target=/storage,readonly",
                         "--mount=type=volume,source=" + volume + ",target=/objects,volume-subpath=objects",
                         "--mount=type=volume,source=" + volume + ",target=/lease,volume-subpath=lease"]
        fixture_script = ("umask 077\n"
                          "javac -cp '/opt/openlap-storage/classes:/opt/openlap-storage/lib/*' -d /tmp /fixture/VersityStorageQualification.java\n"
                          "exec java -Dlogback.configurationFile=/opt/openlap-storage/logback.xml "
                          "-cp '/tmp:/opt/openlap-storage/classes:/opt/openlap-storage/lib/*' "
                          "com.openlap.plugins.storage.VersityStorageQualification \"$@\"")
        def java_fixture(mode=None, data=(), root=False, net="none"):
            return run(["run", "--rm", "--network=" + net, *common, *(root_secret if root else []),
                        *source_mount, *data, "--env=PLUGIN_STORAGE_S3_ENDPOINT=http://gateway:9000",
                        "--entrypoint=/bin/sh", options.image, "-ceu", fixture_script, "fixture", *([mode] if mode else [])])
        try:
            result = run(["run", "--rm", "--network=none", *common, options.image], success=False)
            require(result.returncode != 0 and b"Storage operation failed during argument validation." in result.stderr)
            checks.append("unconfigured action fails before mounting data/root identity")
            run(["volume", "create", "--label=com.openlap.test=versity-qualification", volume]); created_volume = True
            # Only this newly created empty fixture volume is prepared. Production has no root repair initializer.
            run(["run", "--rm", "--network=none", "--user=0:0", "--entrypoint=/bin/sh",
                 "--mount=type=volume,source=" + volume + ",target=/storage", options.image,
                 "-ceu", "chown 1000:1000 /storage; chmod 0700 /storage"])
            result = run(["run", "--rm", "--network=none", *common, *root_secret,
                          "--mount=type=volume,source=" + volume + ",target=/storage", options.image, "--bootstrap-fresh"], timeout=90)
            report = json.loads(result.stdout)
            require(report == {"schemaVersion": 1, "status": "FRESH_STORAGE_INITIALIZED"})
            checks.append("fresh bootstrap through official signer and root-owned private bucket")
            repeat = run(["run", "--rm", "--network=none", *common, *root_secret,
                          "--mount=type=volume,source=" + volume + ",target=/storage", options.image, "--bootstrap-fresh"], success=False)
            require(repeat.returncode != 0)
            checks.append("repeat fresh bootstrap refuses retained state")
            result = run(["run", "--rm", "--network=none", *common, *root_secret, *readonly_data,
                          options.image, "--check-state"])
            require(json.loads(result.stdout)["status"] == "STORAGE_STATE_VERIFIED")
            checks.append("retained state verifies with read-only IAM/root mount")
            java_fixture("--fsync-error")
            checks.append("unsupported filesystem sync propagates as failure")
            java_fixture("--state-negatives", data=["--mount=type=volume,source=" + volume + ",target=/storage"], root=True)
            checks.append("missing/corrupt IAM, partial marker, policy/owner drift and forged admin state rejected")
            run(["network", "create", "--internal", "--label=com.openlap.test=versity-qualification", network]); created_network = True
            run(["run", "--detach", "--name", server, "--network=" + network, "--network-alias=gateway",
                 *common, *root_secret, *source_mount, *readonly_data, options.image, "--serve"]); created_server = True
            for _ in range(30):
                logs = run(["logs", server]).stdout
                if b'"STORAGE_SERVING"' in logs:
                    break
                time.sleep(0.2)
            else:
                raise RuntimeError("Task-owned gateway did not become ready.")
            second = run(["run", "--rm", "--network=none", *common, *root_secret, *readonly_data,
                          options.image, "--serve"], success=False)
            require(second.returncode != 0 and b"exclusive storage lease" in second.stderr)
            checks.append("second serving process cannot acquire the storage lease")
            run(["exec", "--user=1000:1000", server, "/bin/sh", "-ceu", fixture_script, "fixture", "--iam-readonly"])
            checks.append("root Admin API cannot mutate the read-only IAM store")
            command_lines = run(["exec", server, "/bin/sh", "-ceu", "cat /proc/1/cmdline; for p in /proc/[0-9]*/cmdline; do cat \"$p\" 2>/dev/null || :; done"]).stdout
            require(not any(value.encode() in command_lines for value in SYNTHETIC.values()))
            checks.append("gateway and wrapper arguments contain no synthetic credentials")
            result = run(["run", "--rm", "--network=" + network, *common,
                          "--env=PLUGIN_STORAGE_S3_ENDPOINT=http://gateway:9000", options.image, "--probe"])
            report = json.loads(result.stdout)
            require(report["status"] == "APPLICATION_STORAGE_PROBE_VERIFIED"
                    and report["roundtripVerified"] and report["syntheticObjectRemoved"]
                    and not report["catalogChanged"] and not report["pluginExecuted"])
            require(not any(value.encode() in result.stdout + result.stderr for value in SYNTHETIC.values()))
            checks.append("real application SDK absent404/put/get/metadata/delete without root identity")
            fixture_source = ROOT / "tests" / "fixtures" / "VersityStorageQualification.java"
            require(fixture_source.is_file())
            result = java_fixture(net=network)
            require(result.stdout.strip() == b"Application permission and persistence fixtures passed.")
            checks.append("nonowner permission boundaries and persistent application artifact")
            run(["kill", "--signal=KILL", server])
            run(["start", server])
            for _ in range(30):
                status = json.loads(run(["inspect", "--format={{json .State}}", server]).stdout)
                require(status["Running"])
                time.sleep(0.2)
                try:
                    java_fixture("--read-persisted", net=network)
                    break
                except RuntimeError:
                    pass
            else:
                raise RuntimeError("Cold restart did not retain the application artifact.")
            checks.append("abrupt gateway kill and cold Java process retain acknowledged bytes/metadata and static IAM")
            print(json.dumps({"schemaVersion": 1, "image": options.image, "checksPassed": checks}, indent=2))
        finally:
            if created_server: run(["rm", "--force", server], success=False)
            if created_network: run(["network", "rm", network], success=False)
            if created_volume: run(["volume", "rm", volume], success=False)


if __name__ == "__main__":
    main()
