"""Verify only public reader sources and synthetic metadata in its exact runtime image."""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "python@sha256:e064671ca452259bab50e8e2c7bd896e39e9a343bb06ca25234adf6fe18d0fc7"
FILES = ["report.py", "job.yaml", "network.yaml", "kustomization.yaml"]


def manifests(component):
    rendered = subprocess.run(["kubectl", "--kubeconfig=/dev/null", "kustomize", str(component)],
                              check=True, capture_output=True, timeout=20).stdout.decode()
    parts = rendered.split("\n---\n")
    kinds = [re.search(r"^kind: (\S+)$", part, re.MULTILINE).group(1) for part in parts]
    assert sorted(kinds) == ["ConfigMap", "Job", "NetworkPolicy"]
    documents = dict(zip(kinds, parts))
    job = documents["Job"]; network = documents["NetworkPolicy"]
    for forbidden in ["fsGroup:", "fsGroupChangePolicy:", "serviceAccountName:", "projected:",
                      "secretRef:", "secretKeyRef:", "emptyDir:", "initContainers:"]:
        assert forbidden not in job, forbidden
    for required in ["automountServiceAccountToken: false", "runAsNonRoot: true", "runAsUser: 1000",
                     "runAsGroup: 1000", "readOnlyRootFilesystem: true", "allowPrivilegeEscalation: false",
                     "backoffLimit: 0", "activeDeadlineSeconds: 120", "restartPolicy: Never",
                     "claimName: configure-reviewed-preservation-volume", "image: " + IMAGE]:
        assert required in job, required
    assert job.count("readOnly: true") == 3
    assert "- ALL" in job
    assert "egress: []" in network and "ingress: []" in network
    assert "plugin-preservation-report" in network and "plugin-preservation-report" in job
    name = re.search(r"^  name: (openlap-plugin-preservation-report-code-[a-z0-9]+)$",
                     documents["ConfigMap"], re.MULTILINE).group(1)
    assert "name: " + name in job
    return rendered


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schema-validator", type=Path,
                        help="Optional trusted kubeconform binary for strict Kubernetes 1.35 schema validation")
    options = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="preservation-report-fixtures-") as temporary:
        staged = Path(temporary)
        component = staged / ".k8s/maintenance/plugin-preservation-report"
        component.mkdir(parents=True)
        for name in FILES:
            shutil.copyfile(ROOT / ".k8s/maintenance/plugin-preservation-report" / name, component / name)
        tests = staged / "tests"; tests.mkdir()
        shutil.copyfile(ROOT / "tests/test_plugin_preservation_report.py", tests / "test_plugin_preservation_report.py")
        shutil.copyfile(ROOT / "tests/test_plugin_preservation.py", tests / "test_plugin_preservation.py")
        producer = staged / ".k8s/maintenance/plugin-preservation-code"; producer.mkdir()
        for name in ["capture.py", "client.py"]:
            shutil.copyfile(ROOT / ".k8s/maintenance/plugin-preservation-code" / name, producer / name)
        for path in [staged, *staged.rglob("*")]:
            path.chmod(0o755 if path.is_dir() else 0o644)
        rendered = manifests(component)
        print("PASS: default-loader three-resource render; isolated identity, code reference and read-only retained-volume contract.", flush=True)
        if options.schema_validator:
            subprocess.run([str(options.schema_validator), "-strict", "-summary", "-kubernetes-version", "1.35.0"],
                           input=rendered.encode(), check=True, timeout=30)
        command = ["docker", "run", "--rm", "--network=none", "--read-only", "--user=1000:1000",
            "--cap-drop=ALL", "--security-opt=no-new-privileges", "--tmpfs=/tmp:rw,noexec,nosuid,size=16m,mode=1777",
            "--mount", "type=bind,source=" + str(staged) + ",target=/verification,readonly"]
        subprocess.run(command + [IMAGE,
            "python3", "-B", "-m", "unittest", "discover", "-s", "/verification/tests",
            "-p", "test_plugin_preservation_report.py", "-v"], check=True, timeout=180)
        # A disposable volume models a provisioner-prepared UID1000 claim. The
        # reader itself receives only its read-only mount, never the initializer.
        volume = "openlap-preservation-report-test-" + uuid.uuid4().hex
        subprocess.run(["docker", "volume", "create", volume], check=True, capture_output=True, timeout=20)
        try:
            subprocess.run(["docker", "run", "--rm", "--network=none", "--read-only", "--user=0:0",
                "--cap-drop=ALL", "--cap-add=CHOWN", "--security-opt=no-new-privileges", "--mount",
                "type=volume,source=" + volume + ",target=/backup", IMAGE, "python3", "-B", "-c",
                "import os; os.chmod('/backup',0o700); os.chown('/backup',1000,1000)"], check=True, timeout=60)
            prepare = ("import contextlib,io,os,stat,sys;from pathlib import Path;sys.path.insert(0,'/verification/tests');"
                "from test_plugin_preservation import SourceFixture,capture,DIGEST;"
                "os.chmod('/backup',0o2700);fixture=SourceFixture();fixture.data={};"
                "silence=io.StringIO();"
                "\nwith contextlib.redirect_stdout(silence):"
                " capture.capture(fixture,'fixture',[('replica-a','web'),('replica-b','web')],"
                "('database','mongo'),'/plugins','fixture',DIGEST,Path('/backup/sample'))"
                "\nassert stat.S_IMODE(Path('/backup/sample').stat().st_mode)==0o2700")
            subprocess.run(command + ["--mount", "type=volume,source=" + volume + ",target=/backup",
                IMAGE, "python3", "-B", "-c", prepare], check=True, timeout=60)
            result = subprocess.run(command + ["--mount", "type=volume,source=" + volume + ",target=/backup,readonly",
                IMAGE, "python3", "-B", "/verification/.k8s/maintenance/plugin-preservation-report/report.py",
                "--backup-root", "/backup", "--checkpoint-id", "sample"], check=True, capture_output=True, timeout=60)
            lines = result.stdout.decode().splitlines()
            assert len(lines) == 3 and lines[0] == "OPENLAP-PRESERVATION-METADATA-V1"
            assert lines[-1] == "OPENLAP-PRESERVATION-METADATA-END-V1"
            summary = json.loads(lines[1])
            assert summary["emptySourceRootCount"] == 2 and summary["backupBytesVerified"] is False
        finally:
            subprocess.run(["docker", "volume", "rm", volume], check=True, capture_output=True, timeout=20)
        print("PASS: real producer SGID-directory inheritance; UID1000 reader on its genuinely read-only volume, no ownership repair/network/capabilities.")


if __name__ == "__main__":
    main()
