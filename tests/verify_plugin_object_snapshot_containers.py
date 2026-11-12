"""Generated logical snapshot fixtures on task-owned disposable Docker storage only."""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("gateway_fixture", ROOT / "tests/verify_plugin_versity_containers.py")
gateway = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True)
    parser.add_argument("--compile-snapshot-source", action="store_true",
                        help="Development only: compile snapshot source against a foundation image instead of testing its packaged class")
    options = parser.parse_args()
    gateway.require(gateway.re.fullmatch(r"sha256:[a-f0-9]{64}", options.image) is not None)
    token = "openlap-object-snapshot-" + uuid.uuid4().hex[:12]
    network = token + "-network"
    volumes, servers = [], []
    created_network = False
    checks = []
    with tempfile.TemporaryDirectory(prefix="openlap-object-snapshot-fixtures-") as temporary:
        staging = Path(temporary)
        # Only these public sources and generated dummy identities enter containers.
        public_sources = [ROOT / "tests/fixtures/PluginObjectSnapshotQualification.java"]
        if options.compile_snapshot_source:
            public_sources.append(ROOT / "analyticsframework/src/main/java/com/openlap/plugins/storage/PluginObjectSnapshotApplication.java")
        for source in public_sources:
            shutil.copyfile(source, staging / source.name)
        for role, names in {"root": ["ROOT_ACCESS_KEY_ID", "ROOT_SECRET_ACCESS_KEY"],
                            "client": ["PLUGIN_STORAGE_S3_ACCESS_KEY", "PLUGIN_STORAGE_S3_SECRET_KEY"]}.items():
            directory = staging / role
            directory.mkdir(mode=0o755)
            for name in names:
                path = directory / name
                path.write_text(gateway.SYNTHETIC[name])
                path.chmod(0o444)
        for path in [staging, *staging.rglob("*")]:
            path.chmod(0o755 if path.is_dir() else 0o444)
        common = ["--platform=linux/amd64", "--user=1000:1000", "--read-only", "--cap-drop=ALL",
                  "--security-opt=no-new-privileges", "--tmpfs=/tmp:rw,size=64m,mode=1777",
                  "--env=PLUGIN_STORAGE_S3_BUCKET=openlap-qualification", "--env=PLUGIN_STORAGE_S3_REGION=us-east-1",
                  "--mount=type=bind,source=" + str(staging / "client") + ",target=/run/openlap-client,readonly"]
        root_secret = ["--mount=type=bind,source=" + str(staging / "root") + ",target=/run/openlap-root,readonly"]
        sources = ["--mount=type=bind,source=" + str(staging) + ",target=/fixture,readonly"]
        packaged = "/opt/openlap-storage/classes/com/openlap/plugins/storage/PluginObjectSnapshotApplication.class"
        compile_inputs = ("/fixture/PluginObjectSnapshotApplication.java " if options.compile_snapshot_source else "")
        script = ("umask 077\n" + ("" if options.compile_snapshot_source else "test -f " + packaged + "\n")
                  + "javac -cp '/opt/openlap-storage/classes:/opt/openlap-storage/lib/*' -d /tmp "
                  + compile_inputs + "/fixture/PluginObjectSnapshotQualification.java\n"
                  "exec java -Dlogback.configurationFile=/opt/openlap-storage/logback.xml "
                  "-cp '/tmp:/opt/openlap-storage/classes:/opt/openlap-storage/lib/*' \"$@\"")

        def volume(suffix):
            name = token + "-" + suffix
            gateway.run(["volume", "create", "--label=com.openlap.test=object-snapshot", name])
            volumes.append(name)
            gateway.run(["run", "--rm", "--network=none", "--user=0:0", "--entrypoint=/bin/sh",
                         "--mount=type=volume,source=" + name + ",target=/fresh", options.image, "-ceu",
                         "chown 0:1000 /fresh\nchmod 2770 /fresh"])
            return name

        def java(class_name, arguments, mounts, root=False, net="none", success=True):
            return gateway.run(["run", "--rm", "--network=" + net, *common, *(root_secret if root else []), *sources, *mounts,
                                "--env=PLUGIN_STORAGE_S3_ENDPOINT=http://gateway:9000", "--entrypoint=/bin/sh", options.image,
                                "-ceu", script, "fixture", "com.openlap.plugins.storage." + class_name, *arguments], success=success, timeout=60)

        try:
            if not options.compile_snapshot_source:
                unconfigured = gateway.run(["run", "--rm", "--network=none", *common,
                                            "--entrypoint=/usr/local/bin/openlap-object-snapshot", options.image], success=False)
                gateway.require(unconfigured.returncode != 0 and b"snapshot failed during argument validation" in unconfigured.stderr)
            gateway.run(["network", "create", "--internal", "--label=com.openlap.test=object-snapshot", network])
            created_network = True
            for empty in [False, True]:
                case = "empty" if empty else "versions"
                data, backup, restored = volume(case + "-source"), volume(case + "-snapshot"), volume(case + "-restore")
                source_mount = ["--mount=type=volume,source=" + data + ",target=/storage"]
                gateway.run(["run", "--rm", "--network=none", *common, *root_secret, *source_mount, options.image, "--bootstrap-fresh"], timeout=60)
                server = token + "-" + case + "-server"
                read_only_iam = ["--mount=type=volume,source=" + data + ",target=/storage,readonly",
                                 "--mount=type=volume,source=" + data + ",target=/objects,volume-subpath=objects",
                                 "--mount=type=volume,source=" + data + ",target=/lease,volume-subpath=lease"]
                gateway.run(["run", "--detach", "--name", server, "--network=" + network, "--network-alias=gateway",
                             *common, *root_secret, *read_only_iam, options.image, "--serve"])
                servers.append(server)
                for _ in range(40):
                    if b'"STORAGE_SERVING"' in gateway.run(["logs", server]).stdout:
                        break
                    time.sleep(0.2)
                else:
                    raise RuntimeError("Generated source provider did not start.")
                writable_backup = ["--mount=type=volume,source=" + backup + ",target=/backup"]
                prepared = java("PluginObjectSnapshotQualification", ["--prepare-empty" if empty else "--prepare-source"], writable_backup, net=network)
                fixture = json.loads(prepared.stdout)
                exported = java("PluginObjectSnapshotApplication", ["--export", "/backup/trusted-index.json", fixture["artifactIndexSha256"],
                                fixture["originalCheckpointReportSha256"], "/backup/export"], writable_backup, net=network)
                snapshot = json.loads(exported.stdout)
                gateway.require(snapshot["status"] == "PLUGIN_OBJECT_SNAPSHOT_EXPORTED"
                                and snapshot["objectCount"] == fixture["expectedObjectCount"] and snapshot["recoveryVerified"] is False)
                java("PluginObjectSnapshotQualification", ["--validate-snapshot"], writable_backup)
                immutable_backup = ["--mount=type=volume,source=" + backup + ",target=/backup,readonly"]
                destination = ["--mount=type=volume,source=" + restored + ",target=/storage"]
                java("PluginObjectSnapshotQualification", ["--validate-before-write"], [*immutable_backup, *destination], root=True)
                args = ["--restore-fresh", "/backup/export", snapshot["manifestSha256"], fixture["artifactIndexSha256"],
                        fixture["originalCheckpointReportSha256"], "/backup/regenerated-index.json"]
                recovered = java("PluginObjectSnapshotApplication", args, [*immutable_backup, *destination], root=True)
                result = json.loads(recovered.stdout.splitlines()[-1])
                gateway.require(result["status"] == "FRESH_LOCAL_PLUGIN_OBJECT_RESTORE_VERIFIED"
                                and result["objectCount"] == fixture["expectedObjectCount"] and result["coldReadbackVerified"]
                                and result["databaseIndexMatched"])
                repeat = java("PluginObjectSnapshotApplication", args, [*immutable_backup, *destination], root=True, success=False)
                gateway.require(repeat.returncode != 0 and b"fresh local restore validation" in repeat.stderr)
                checks.append(case + ": export, immutable snapshot validation, fresh local restore, cold readback, retained-state refusal")
                print("PASS: generated " + case + " snapshot and fresh local restore", flush=True)
                gateway.run(["rm", "--force", server])
                servers.remove(server)
            print(json.dumps({"schemaVersion": 1, "image": options.image, "checksPassed": checks,
                              "snapshotClassSource": "development-scratch-compilation" if options.compile_snapshot_source else "packaged-image-class",
                              "databaseFixtureScope": "Generated index consumer contract only; no real database rehearsal claimed."}, indent=2))
        finally:
            for server in servers:
                gateway.run(["rm", "--force", server], success=False)
            if created_network:
                gateway.run(["network", "rm", network], success=False)
            for name in volumes:
                gateway.run(["volume", "rm", name], success=False)


if __name__ == "__main__":
    main()
