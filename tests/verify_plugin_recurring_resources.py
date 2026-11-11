"""Public suspended/default-unconfigured backup composition; never reads a live overlay."""
import argparse
from pathlib import Path
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[1]
MIB = 1024 * 1024


def render(option, validator=None):
    data = subprocess.check_output(["kubectl", "--kubeconfig=/dev/null", "kustomize", str(ROOT / ".k8s/maintenance" / option)], timeout=30)
    if validator:
        subprocess.run([str(validator), "-strict", "-summary", "-kubernetes-version", "1.35.0"], input=data, check=True, timeout=60)
    return list(yaml.safe_load_all(data))


def check(resource, online):
    if online:
        spec = resource["spec"]
        assert resource["kind"] == "CronJob" and spec["suspend"] is True and spec["concurrencyPolicy"] == "Forbid"
        assert spec["timeZone"] == "Etc/UTC" and spec["startingDeadlineSeconds"] == 300
        job = spec["jobTemplate"]["spec"]
        assert job["backoffLimit"] == 1
    else:
        assert resource["kind"] == "Job"; job = resource["spec"]; assert job["backoffLimit"] == 0
    pod = job["template"]["spec"]
    assert pod["restartPolicy"] == "Never" and pod["automountServiceAccountToken"] is False
    assert pod["nodeSelector"] == {"kubernetes.io/os": "linux", "kubernetes.io/arch": "amd64"}
    security = pod["securityContext"]
    assert security == {"runAsNonRoot": True, "runAsUser": 1000, "runAsGroup": 1000, "fsGroup": 1000, "seccompProfile": {"type": "RuntimeDefault"}}
    assert [container["name"] for container in pod["initContainers"]] == ["capture", "index", "export"]
    assert [container["name"] for container in pod["containers"]] == ["uploader"]
    assert not any("persistentVolumeClaim" in volume for volume in pod["volumes"])
    assert all(set(volume) <= {"name", "emptyDir", "secret"} for volume in pod["volumes"])
    volumes = {volume["name"]: volume for volume in pod["volumes"]}
    assert volumes["workspace"]["emptyDir"]["sizeLimit"] == "1280Mi" and volumes["scratch"]["emptyDir"]["sizeLimit"] == "768Mi"
    mode = "online" if online else "frozen"
    containers = pod["initContainers"] + pod["containers"]
    for container, action in zip(containers, ("capture", "index", "export-recurring", "upload-recurring")):
        assert container["args"] == ["--" + action + "-" + mode]
        assert container["securityContext"] == {"readOnlyRootFilesystem": True, "allowPrivilegeEscalation": False, "capabilities": {"drop": ["ALL"]}}
        env = {row["name"]: row for row in container["env"]}
        assert env["BACKUP_POD_UID"]["valueFrom"]["fieldRef"]["fieldPath"] == "metadata.uid"
        assert env["BACKUP_DESTINATION_APPROVED"]["value"] == "false" and env["BACKUP_DESTINATION_VALID_UNTIL"]["value"] == ""
        assert int(env["BACKUP_MINIMUM_DESTINATION_VALIDITY_SECONDS"]["value"]) == (604800 if online else 3600)
        payload = int(env["BACKUP_MAX_BYTES"]["value"]); files = int(env["BACKUP_MAX_FILES"]["value"])
        peak = 4 * payload + 3 * ((files + 4) * 2048 + MIB) + 2 * 4 * MIB + 4 * MIB
        assert peak <= int(env["BACKUP_WORKSPACE_MAX_BYTES"]["value"]) == 1280 * MIB
        assert container["resources"]["limits"]["ephemeral-storage"] == "2304Mi"
        if action != "capture": assert "MONGODB_PRIMARY_URI" not in env and "OPENLAP_MONGODB_DB" not in env
        mounted = {mount["mountPath"]: mount for mount in container["volumeMounts"]}
        for target in ("/control", "/inputs", "/checkpoint", "/indexes", "/sources"):
            if target in mounted: assert mounted[target]["readOnly"] is True
        assert "/run/openlap-root" not in mounted
        if action in ("capture", "index"):
            assert "/run/openlap-client" not in mounted and "/run/plugin-backup-config" not in mounted
            archive = int(env["CHECKPOINT_MAX_ARCHIVE_MIB"]["value"]); restore = int(env["CHECKPOINT_MAX_RESTORE_MIB"]["value"])
            assert (restore + 2 * archive + 32) * MIB <= int(env["BACKUP_SCRATCH_MAX_BYTES"]["value"]) == 768 * MIB
        if action == "export-recurring": assert "/run/openlap-client" in mounted and "/run/plugin-backup-config" not in mounted
        if action == "upload-recurring": assert "/run/plugin-backup-config" in mounted and "/run/openlap-client" not in mounted
    capture_env = {row["name"]: row for row in containers[0]["env"]}
    assert capture_env["MONGODB_PRIMARY_URI"]["value"] == ""
    if online: assert "CHECKPOINT_FREEZE_EVIDENCE" not in capture_env and capture_env["CHECKPOINT_REPLICA_SET"]["value"] == ""
    else: assert capture_env["CHECKPOINT_FREEZE_EVIDENCE"]["value"] == "" and "CHECKPOINT_REPLICA_SET" not in capture_env


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument("--validator", type=Path); options = parser.parse_args()
    for online, option in ((True, "plugin-recurring-backup"), (False, "plugin-frozen-backup")):
        resources = render(option, options.validator)
        assert len(resources) == 2 and {row["kind"] for row in resources} == {"CronJob" if online else "Job", "NetworkPolicy"}
        check(next(row for row in resources if row["kind"] != "NetworkPolicy"), online)
        policy = next(row for row in resources if row["kind"] == "NetworkPolicy")
        assert policy["spec"]["ingress"] == [] and policy["spec"]["egress"] == []
    print("PASS: recurring/frozen defaults, coherent budgets, fresh retry and scoped stage inputs")


if __name__ == "__main__": main()
