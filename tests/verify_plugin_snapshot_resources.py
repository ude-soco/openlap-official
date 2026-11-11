"""Check public opt-in resources and a generated, credential-free A/C composition."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

import yaml

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ".k8s/maintenance/plugin-object-snapshot-export"
OUTPUT = ".k8s/maintenance/plugin-checkpoint-output"
REHEARSAL = ".k8s/maintenance/plugin-checkpoint-rehearsal"
UPLOAD = ".k8s/maintenance/plugin-backup-upload"
CLIENT = ".k8s/storage/plugin-versity-credentials"
BACKUP = ".k8s/maintenance/plugin-backup-upload-credentials"
IMAGE = "ghcr.io/ude-soco/openlap-official-plugin-storage-versity"


def render(path, validator):
    result = subprocess.run(["kubectl", "--kubeconfig=/dev/null", "kustomize", str(path)],
                            check=True, capture_output=True, timeout=20).stdout
    if validator:
        subprocess.run([str(validator), "-strict", "-summary", "-kubernetes-version", "1.35.0"],
                       input=result, check=True, timeout=60)
    documents = list(yaml.safe_load_all(result))
    assert all(isinstance(doc, dict) for doc in documents)
    identities = [(doc["kind"], doc["metadata"]["name"]) for doc in documents]
    assert len(set(identities)) == len(identities)
    return documents


def one(documents, kind, component=None):
    matches = [doc for doc in documents if doc["kind"] == kind and
               (component is None or doc["metadata"]["name"].startswith("fixture-openlap-plugin-" + component))]
    assert len(matches) == 1, (kind, component)
    return matches[0]


def pod(job):
    return job["spec"]["template"]["spec"]


def volumes(job):
    return {item["name"]: item for item in pod(job)["volumes"]}


def claims(job):
    return {name: volume["persistentVolumeClaim"]["claimName"] for name, volume in volumes(job).items()
            if "persistentVolumeClaim" in volume}


def mounts(job):
    return {mount["name"]: mount for mount in pod(job)["containers"][0]["volumeMounts"]}


def private_job(job):
    spec = pod(job)
    assert spec["automountServiceAccountToken"] is False
    assert spec["restartPolicy"] == "Never" and job["spec"]["backoffLimit"] == 0
    assert "serviceAccountName" not in spec and "initContainers" not in spec
    assert spec["nodeSelector"] == {"kubernetes.io/os": "linux", "kubernetes.io/arch": "amd64"}
    assert spec["securityContext"] == {"runAsNonRoot": True, "runAsUser": 1000, "runAsGroup": 1000,
                                       "seccompProfile": {"type": "RuntimeDefault"}}
    assert len(spec["containers"]) == 1
    assert spec["containers"][0]["securityContext"] == {"readOnlyRootFilesystem": True,
        "allowPrivilegeEscalation": False, "capabilities": {"drop": ["ALL"]}}


def replace(path, value):
    return {"op": "replace", "path": path, "value": value}


def patch(name, operations):
    return {"target": {"kind": "Job", "name": name}, "patch": json.dumps(operations)}


def composition(root):
    resources = [EXPORT, OUTPUT, REHEARSAL, UPLOAD, CLIENT, BACKUP,
                 ".k8s/maintenance/plugin-preservation/volume.yaml", ".k8s/storage/plugin-versity/volume.yaml"]
    for resource in resources:
        source = ROOT / resource
        target = root / resource
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    a = "openlap-plugin-preservation"
    c = "openlap-plugin-checkpoint-output"
    frozen = "1" * 64
    index = "2" * 64
    operations = [replace("/spec/template/spec/containers/0/args", ["--export",
                  "/inputs/new-index/artifact-index.json", index, frozen, "/outputs/new-snapshot"]),
                  replace("/spec/template/spec/volumes/0/persistentVolumeClaim/claimName", a),
                  replace("/spec/template/spec/volumes/1/persistentVolumeClaim/claimName", c)]
    for ordinal, value in enumerate(["synthetic-plugins", "fixture-1", "http://fixture-storage:9000"]):
        operations.append(replace("/spec/template/spec/containers/0/env/" + str(ordinal) + "/value", value))
    config = {"apiVersion": "kustomize.config.k8s.io/v1beta1", "kind": "Kustomization",
        "namespace": "synthetic-release", "namePrefix": "fixture-", "resources": resources,
        # Empty generators test reference merging without credential values.
        "secretGenerator": [{"name": name, "behavior": "merge"} for name in
                            ["openlap-plugin-storage-client", "openlap-plugin-backup-upload"]],
        "images": [{"name": IMAGE, "digest": "sha256:" + "a" * 64}],
        "patches": [patch("openlap-plugin-object-snapshot-export", operations),
            patch("openlap-plugin-checkpoint-rehearsal", [
                replace("/spec/template/spec/containers/0/args", ["--index-plugin-artifacts"]),
                replace("/spec/template/spec/volumes/0/persistentVolumeClaim/claimName", c),
                replace("/spec/template/spec/volumes/1/persistentVolumeClaim/claimName", a)]),
            patch("openlap-plugin-backup-upload", [
                replace("/spec/template/spec/volumes/0/persistentVolumeClaim/claimName", c),
                replace("/spec/template/spec/volumes/1/persistentVolumeClaim/claimName", c),
                replace("/spec/template/spec/volumes/2/persistentVolumeClaim/claimName", a),
                replace("/spec/template/spec/volumes/3/secret/secretName", "openlap-plugin-backup-upload")])]}
    (root / "kustomization.yaml").write_text(json.dumps(config))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schema-validator", type=Path,
                        help="Optional trusted kubeconform binary for strict Kubernetes 1.35 validation")
    options = parser.parse_args()
    default = render(ROOT / EXPORT, options.schema_validator)
    assert sorted(doc["kind"] for doc in default) == ["Job", "NetworkPolicy"]
    job = one(default, "Job")
    private_job(job)
    assert job["spec"]["activeDeadlineSeconds"] == 1200
    container = pod(job)["containers"][0]
    assert container["command"] == ["/usr/local/bin/openlap-object-snapshot"]
    assert container["args"] == ["--configure-export"]
    assert container["image"] == IMAGE + ":configure-reviewed-digest"
    assert container["env"] == [{"name": name, "value": ""} for name in
        ["PLUGIN_STORAGE_S3_BUCKET", "PLUGIN_STORAGE_S3_REGION", "PLUGIN_STORAGE_S3_ENDPOINT"]]
    assert claims(job) == {"inputs": "configure-readonly-verified-index-volume",
                           "outputs": "configure-separate-protected-snapshot-volume"}
    assert mounts(job)["inputs"] == {"name": "inputs", "mountPath": "/inputs", "readOnly": True}
    assert volumes(job)["inputs"]["persistentVolumeClaim"]["readOnly"] is True
    assert mounts(job)["outputs"] == {"name": "outputs", "mountPath": "/outputs"}
    secret = volumes(job)["client-credentials"]["secret"]
    assert secret == {"secretName": "openlap-plugin-storage-client", "defaultMode": 292,
                      "items": [{"key": key, "path": key} for key in
                      ["PLUGIN_STORAGE_S3_ACCESS_KEY", "PLUGIN_STORAGE_S3_SECRET_KEY"]]}
    assert len([v for v in volumes(job).values() if "secret" in v]) == 1
    network = one(default, "NetworkPolicy")["spec"]
    assert network == {"podSelector": {"matchLabels": job["spec"]["template"]["metadata"]["labels"]},
                       "policyTypes": ["Ingress", "Egress"], "ingress": [], "egress": []}
    output = render(ROOT / OUTPUT, options.schema_validator)
    pvc = one(output, "PersistentVolumeClaim")
    assert len(output) == 1 and pvc["metadata"]["name"] == "openlap-plugin-checkpoint-output"
    assert pvc["spec"] == {"accessModes": ["ReadWriteOnce"], "resources": {"requests": {"storage": "5Gi"}}}
    assert all("annotations" not in doc["metadata"] for doc in default + output)
    print("PASS: three opt-in resources; fail-closed action, bounded unprivileged export, client-only input and separate workspace.")

    with tempfile.TemporaryDirectory(prefix="plugin-snapshot-resources-") as temporary:
        root = Path(temporary)
        composition(root)
        docs = render(root, options.schema_validator)
    export = one(docs, "Job", "object-snapshot-export")
    rehearsal = one(docs, "Job", "checkpoint-rehearsal")
    upload = one(docs, "Job", "backup-upload")
    for item in [export, rehearsal, upload]:
        private_job(item)
    a = "fixture-openlap-plugin-preservation"
    b = "fixture-openlap-plugin-versity"
    c = "fixture-openlap-plugin-checkpoint-output"
    assert {doc["metadata"]["name"] for doc in docs if doc["kind"] == "PersistentVolumeClaim"} == {a, b, c}
    assert claims(rehearsal) == {"inputs": c, "outputs": a} and mounts(rehearsal)["inputs"]["readOnly"] is True
    assert claims(export) == {"inputs": a, "outputs": c} and mounts(export)["inputs"]["readOnly"] is True
    assert claims(upload) == {"checkpoint": c, "sources": c, "outputs": a}
    assert all(mounts(upload)[name]["readOnly"] is True for name in ["checkpoint", "sources"])
    secrets = {doc["metadata"]["name"] for doc in docs if doc["kind"] == "Secret"}
    for item, volume in [(export, "client-credentials"), (upload, "config")]:
        reference = volumes(item)[volume]["secret"]["secretName"]
        assert reference in secrets and reference.startswith("fixture-openlap-plugin-")
    assert pod(export)["containers"][0]["image"] == IMAGE + "@sha256:" + "a" * 64
    assert pod(export)["containers"][0]["args"] == ["--export", "/inputs/new-index/artifact-index.json",
        "2" * 64, "1" * 64, "/outputs/new-snapshot"]
    assert all(doc["metadata"]["namespace"] == "synthetic-release" for doc in docs)
    assert not any(doc["kind"] in ["Role", "RoleBinding", "ServiceAccount", "Deployment"] for doc in docs)
    optional = {(doc["kind"], doc["metadata"]["name"]) for doc in default + output}
    base = {(doc["kind"], doc["metadata"]["name"]) for doc in render(ROOT / ".k8s/base", None)}
    assert optional.isdisjoint(base)
    print("PASS: default-loader A/C flow, three distinct claims, generated Secret references, immutable image override and unchanged application base.")


if __name__ == "__main__":
    main()
